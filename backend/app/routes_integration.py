from flask import Blueprint, jsonify, request
from app.models import db, Store, IntegrationMetric, TaskStep
from app.services.security_service import require_auth, require_permission
from sqlalchemy import desc, func, case
from datetime import datetime, date

integration_bp = Blueprint('integration', __name__, url_prefix='/api/integration')

@integration_bp.route('/dashboard', methods=['GET'])
@require_auth
def get_integration_dashboard(payload):
    """
    Retorna KPIs e Lista de Integrações.
    Aceita filtros: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD (para KPIs de volume)
    """
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # 1. Pegar o universo de lojas (base de implantação)
    all_stores = Store.query.all()
    active_stores_global = [s for s in all_stores if not s.effective_finished_at and not s.is_scheduled]
    concluded_stores_global = [s for s in all_stores if s.effective_finished_at and s.effective_finished_at.year >= 2026]
    universe_stores = active_stores_global + concluded_stores_global

    store_ids = [s.id for s in universe_stores]

    # Vamos buscar as métricas de integração dessas lojas
    metrics_query = IntegrationMetric.query.filter(IntegrationMetric.store_id.in_(store_ids)).all()
    metrics_by_store = {m.store_id: m for m in metrics_query}
    
    steps_query = TaskStep.query.filter(TaskStep.store_id.in_(store_ids), TaskStep.step_list_name == 'INTEGRACAO').all()
    steps_by_store = {step.store_id: step for step in steps_query}

    # KPIs
    total_points = 0.0
    completed_in_sla = 0
    total_completed = 0
    quality_success = 0
    doc_success = 0

    results = []

    for s in universe_stores:
        m = metrics_by_store.get(s.id)
        step = steps_by_store.get(s.id)
        current_step_status = step.status if step else None

        # Lógica robusta de datas com fallbacks
        eff_start_date = m.start_date if m and m.start_date else None
        eff_end_date = m.end_date if m and m.end_date else None

        if not eff_end_date and current_step_status and current_step_status.upper() in ['DONE', 'CONCLUIDO', 'CONCLUÍDO', 'FINALIZADO', 'FINALIZADA']:
            eff_end_date = step.end_real_at or step.closed_at
        
        if not eff_end_date and s.effective_finished_at:
            eff_end_date = s.effective_finished_at

        if not eff_start_date and step:
            eff_start_date = step.start_real_at or step.created_at
            
        if not eff_start_date:
            eff_start_date = s.effective_started_at

        is_done = eff_end_date is not None
        
        sla = m.sla_days if m and m.sla_days else 0
        if not sla and eff_start_date and eff_end_date:
            sla = (eff_end_date - eff_start_date).days
        elif not sla and eff_start_date and not eff_end_date:
            sla = (datetime.now() - eff_start_date).days
            
        on_time = sla <= 60 if is_done else None
        
        is_matriz = s.tipo_loja == 'Matriz'
        points = 1.0 if is_matriz else 0.7

        if is_done:
            total_completed += 1
            if sla <= 60:
                completed_in_sla += 1
            if m and m.post_go_live_bugs == 0:
                quality_success += 1
            total_points += points
        else:
            # Também calculamos pontos em WIP
            total_points += points

        doc_status = m.documentation_status if m else 'PENDING'
        if doc_status == 'DONE':
            doc_success += 1

        results.append({
            "id": s.id,
            "name": s.store_name,
            "store_name": s.store_name,
            "task_id": s.custom_store_id or s.clickup_task_id or str(s.id),
            "integrador": s.integrador or "Não Atribuído",
            "assignee": s.integrador or "Não Atribuído",
            "rede": s.rede,
            "tipo": s.tipo_loja,
            "start_date": eff_start_date.isoformat() if eff_start_date else None,
            "end_date": eff_end_date.isoformat() if eff_end_date else None,
            "sla_days": sla,
            "status": "CONCLUÍDO" if is_done else ("ARQUIVADA" if s.status_norm == 'ARCHIVED' else "EM ANDAMENTO"),
            "current_status": current_step_status,
            "doc_status": doc_status,
            "bugs": m.post_go_live_bugs if m else 0,
            "churn_risk": m.churn_risk if m else False,
            "has_blocking_issue": m.has_blocking_issue if m else False,
            "on_time": on_time
        })
        
    sla_pct = (completed_in_sla / total_completed * 100) if total_completed > 0 else 100.0
    quality_pct = (quality_success / total_completed * 100) if total_completed > 0 else 100.0
    total_docs = len(universe_stores)
    doc_pct = (doc_success / total_docs * 100) if total_docs > 0 else 0.0

    # Ordenar por status (Em andamento primeiro) e depois por data início
    results.sort(key=lambda x: (x['status'] == 'CONCLUÍDO', x['start_date'] or ''))

    return jsonify({
        "kpis": {
            "volume_points": round(total_points, 1),
            "volume_goal": 80.0,
            "sla_pct": round(sla_pct, 1),
            "quality_pct": round(quality_pct, 1),
            "doc_pct": round(doc_pct, 1)
        },
        "integrations": results
    })

@integration_bp.route('/metrics/<int:store_id>', methods=['POST'])
@require_auth
def update_integration_metric(payload, store_id):
    """
    Atualiza métricas manuais de integração (Doc, Bugs, Churn, Dates).
    Payload: { field: value }
    Fields: integrador, start_date, end_date, documentation_status, post_go_live_bugs, churn_risk
    """
    data = request.json
    store = Store.query.get_or_404(store_id)
    metric = IntegrationMetric.query.filter_by(store_id=store.id).first()
    
    if not metric:
        metric = IntegrationMetric(store_id=store.id, snapshot_date=date.today())
        db.session.add(metric)
    
    # Atualizar campos na Tabela Store
    if 'integrador' in data:
        store.integrador = data['integrador']
        
    # Atualizar campos na Tabela Metric
    if 'documentation_status' in data:
        metric.documentation_status = data['documentation_status']
        
    if 'post_go_live_bugs' in data:
        metric.post_go_live_bugs = int(data['post_go_live_bugs'])
        
    if 'churn_risk' in data:
        metric.churn_risk = bool(data['churn_risk'])
        
    if 'start_date' in data:
        metric.start_date = datetime.fromisoformat(data['start_date']) if data['start_date'] else None
        
    if 'end_date' in data:
        metric.end_date = datetime.fromisoformat(data['end_date']) if data['end_date'] else None
        
        # Recalcular SLA se tiver ambas as datas
        if metric.start_date and metric.end_date:
            metric.sla_days = (metric.end_date - metric.start_date).days
            
    try:
        db.session.commit()
        return jsonify({"message": "Métrica atualizada com sucesso"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@integration_bp.route('/analytics/kpi-cards', methods=['GET'])
@require_auth
def get_integration_kpis(payload):
    """
    Retorna Big Numbers para o Dashboard.
    """
    from app.services.integration_analytics_service import IntegrationAnalyticsService
    try:
        data = IntegrationAnalyticsService.get_kpi_cards()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integration_bp.route('/analytics/trends', methods=['GET'])
@require_auth
def get_integration_trends(payload):
    """
    Retorna gráfico de evolução mensal.
    """
    from app.services.integration_analytics_service import IntegrationAnalyticsService
    try:
        months = int(request.args.get('months', 6))
        data = IntegrationAnalyticsService.get_monthly_trends(months)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integration_bp.route('/reports/monthly', methods=['GET'])
@require_auth
def get_monthly_integration_report(payload):
    """
    Retorna dados agrupados de integrações concluidas por mês (JSON).
    Espelha a estrutura do relatório mensal de implantações.
    """
    from collections import defaultdict
    import statistics
    import math
    from app.models import Store, IntegrationMetric, SystemConfig
    
    try:
        # ── Configurações de meta (SystemConfig) ──
        mrr_target = 180000.0
        stores_target = 180
        try:
            cfg_mrr = SystemConfig.query.filter_by(key='annual_mrr_target').first()
            cfg_stores = SystemConfig.query.filter_by(key='annual_stores_target').first()
            if cfg_mrr: mrr_target = float(cfg_mrr.value)
            if cfg_stores: stores_target = int(cfg_stores.value)
        except: pass
        
        SLA_TARGET = 60
        try:
            cfg_sla = SystemConfig.query.filter_by(key='sla_integration_days').first()
            if cfg_sla: SLA_TARGET = int(cfg_sla.value)
        except: pass

        w_matriz, w_filial = 1.0, 0.7
        try:
            cfg_m = SystemConfig.query.filter_by(key='weight_matriz').first()
            cfg_f = SystemConfig.query.filter_by(key='weight_filial').first()
            if cfg_m: w_matriz = float(cfg_m.value)
            if cfg_f: w_filial = float(cfg_f.value)
        except: pass

        # ── Buscar métricas concluídas em 2026+ ──
        metrics = IntegrationMetric.query.join(Store).filter(
            IntegrationMetric.end_date.isnot(None)
        ).all()
        
        finished_metrics = [m for m in metrics if m.end_date.year >= 2026]
        
        # ── Agrupar por mês ──
        grouped = defaultdict(list)
        for m in finished_metrics:
            s = m.store
            key = m.end_date.strftime('%Y-%m')
            
            points = w_matriz if s.tipo_loja == 'Matriz' else w_filial
            days = 0
            if m.start_date:
                days = (m.end_date - m.start_date).days
            on_time = 1 if days <= SLA_TARGET else 0
            
            grouped[key].append({
                "id": s.id,
                "name": s.store_name,
                "integrador": s.integrador or "N/A",
                "rede": s.rede or "Sem Rede",
                "finished_at": m.end_date.strftime('%Y-%m-%d'),
                "mrr": s.valor_mensalidade or 0.0,
                "days": days,
                "points": points,
                "tipo": s.tipo_loja or "Filial",
                "on_time": on_time,
                "doc_status": m.documentation_status,
                "bugs": m.post_go_live_bugs or 0,
                "churn_risk": m.churn_risk
            })
            
        sorted_months = sorted(grouped.keys(), reverse=True)
        
        # ── YTD Acumulados ──
        ytd_mrr = sum(s['mrr'] for month in grouped.values() for s in month)
        ytd_stores = sum(len(month) for month in grouped.values())
        ytd_points = sum(s['points'] for month in grouped.values() for s in month)
        months_elapsed = len(sorted_months)
        
        avg_mrr_per_month = ytd_mrr / max(months_elapsed, 1)
        avg_stores_per_month = ytd_stores / max(months_elapsed, 1)
        
        mrr_remaining = max(0, mrr_target - ytd_mrr)
        stores_remaining = max(0, stores_target - ytd_stores)
        
        months_to_mrr_goal = math.ceil(mrr_remaining / avg_mrr_per_month) if avg_mrr_per_month > 0 else 0
        months_to_stores_goal = math.ceil(stores_remaining / avg_stores_per_month) if avg_stores_per_month > 0 else 0
        
        from datetime import datetime
        from dateutil.relativedelta import relativedelta
        now = datetime.now()
        est_mrr_date = (now + relativedelta(months=months_to_mrr_goal)).strftime('%Y-%m') if months_to_mrr_goal > 0 else now.strftime('%Y-%m')
        est_stores_date = (now + relativedelta(months=months_to_stores_goal)).strftime('%Y-%m') if months_to_stores_goal > 0 else now.strftime('%Y-%m')
        
        # ── WIP Overview ──
        wip_metrics = IntegrationMetric.query.join(Store).filter(
            IntegrationMetric.end_date.is_(None),
            Store.status_norm == 'DONE' # Lojas implantadas mas não integradas
        ).all()
        
        wip_count = len(wip_metrics)
        mrr_backlog = sum(m.store.valor_mensalidade or 0 for m in wip_metrics)
        
        board_stages = defaultdict(int)
        for m in wip_metrics:
            stage_name = 'Integração em Andamento' if m.start_date else 'Aguardando Integração'
            board_stages[stage_name] += 1
            
        board_stages_list = [{"stage": k, "count": v} for k, v in sorted(board_stages.items(), key=lambda x: -x[1])]
        
        # ── Construir dados por mês ──
        results = []
        prev_month_data = None
        
        for month in reversed(sorted_months):
            stores = grouped[month]
            stores.sort(key=lambda x: (x['finished_at'], x['name']))
            
            total_mrr = sum(s['mrr'] for s in stores)
            total_stores = len(stores)
            total_points = sum(s['points'] for s in stores)
            total_bugs = sum(s['bugs'] for s in stores)
            
            days_list = [s['days'] for s in stores]
            avg_days = statistics.mean(days_list) if days_list else 0
            median_days = statistics.median(days_list) if days_list else 0
            ticket_medio = round(total_mrr / max(total_stores, 1), 2)
            
            on_time_count = sum(1 for s in stores if s['on_time'])
            on_time_pct = round((on_time_count / max(total_stores, 1)) * 100, 1)
            
            # Breakdown por Tipo
            matriz_stores = [s for s in stores if s['tipo'] == 'Matriz']
            filial_stores = [s for s in stores if s['tipo'] != 'Matriz']
            
            type_breakdown = {
                "matriz_count": len(matriz_stores),
                "filial_count": len(filial_stores),
                "matriz_mrr": round(sum(s['mrr'] for s in matriz_stores), 2),
                "filial_mrr": round(sum(s['mrr'] for s in filial_stores), 2),
                "matriz_avg_days": round(statistics.mean([s['days'] for s in matriz_stores]), 1) if matriz_stores else 0,
                "filial_avg_days": round(statistics.mean([s['days'] for s in filial_stores]), 1) if filial_stores else 0,
            }
            
            # MRR por Rede
            rede_map = defaultdict(lambda: {"mrr": 0.0, "count": 0, "names": []})
            for s in stores:
                rede = s['rede']
                rede_map[rede]["mrr"] += s['mrr']
                rede_map[rede]["count"] += 1
                rede_map[rede]["names"].append(s['name'])
            
            mrr_by_rede = [{"rede": k, "mrr": round(v["mrr"], 2), "count": v["count"], "store_names": v["names"]} 
                           for k, v in sorted(rede_map.items(), key=lambda x: -x[1]["mrr"])]
            
            # Destaques
            sorted_by_days = sorted(stores, key=lambda x: x['days'])
            sorted_by_mrr = sorted(stores, key=lambda x: x['mrr'], reverse=True)
            
            highlights = {
                "fastest": {"name": sorted_by_days[0]['name'], "days": sorted_by_days[0]['days']} if stores else None,
                "slowest": {"name": sorted_by_days[-1]['name'], "days": sorted_by_days[-1]['days']} if stores else None,
                "top_mrr": {"name": sorted_by_mrr[0]['name'], "mrr": sorted_by_mrr[0]['mrr']} if stores else None,
                "late_stores": [{"name": s['name'], "days": s['days']} for s in stores if not s['on_time']],
                "total_bugs": total_bugs
            }
            
            # Ranking Integradores
            integ_map = defaultdict(lambda: {"stores": 0, "mrr": 0.0, "points": 0.0, "days_list": [], "on_time": 0, "bugs": 0})
            for s in stores:
                imp = s['integrador']
                integ_map[imp]["stores"] += 1
                integ_map[imp]["mrr"] += s['mrr']
                integ_map[imp]["points"] += s['points']
                integ_map[imp]["days_list"].append(s['days'])
                integ_map[imp]["on_time"] += s['on_time']
                integ_map[imp]["bugs"] += s['bugs']
                
            integradores = []
            for name, d in integ_map.items():
                avg_i = statistics.mean(d["days_list"]) if d["days_list"] else 0
                ot_pct = round((d["on_time"] / max(d["stores"], 1)) * 100, 1)
                integradores.append({
                    "name": name,
                    "stores": d["stores"],
                    "mrr": round(d["mrr"], 2),
                    "points": round(d["points"], 1),
                    "avg_days": round(avg_i, 1),
                    "on_time_pct": ot_pct,
                    "bugs": d["bugs"]
                })
            integradores.sort(key=lambda x: (-x['stores'], -x['mrr']))
            
            # Var vs Prev Month
            var_stores = var_mrr = var_days = 0
            if prev_month_data:
                p = prev_month_data
                var_stores = round(((total_stores - p['stores']) / max(p['stores'], 1)) * 100, 1)
                var_mrr = round(((total_mrr - p['mrr']) / max(p['mrr'], 1)) * 100, 1)
                var_days = round(((avg_days - p['days']) / max(p['days'], 1)) * 100, 1)
            
            prev_month_data = {
                "stores": total_stores,
                "mrr": total_mrr,
                "days": avg_days
            }
            
            results.append({
                "month": month,
                "stats": {
                    "total_stores": total_stores,
                    "total_mrr": round(total_mrr, 2),
                    "total_points": round(total_points, 1),
                    "avg_days": round(avg_days, 1),
                    "median_days": round(median_days, 1),
                    "ticket_medio": ticket_medio,
                    "on_time_count": on_time_count,
                    "on_time_pct": on_time_pct,
                    "total_bugs": total_bugs
                },
                "variation": {
                    "stores_pct": var_stores,
                    "mrr_pct": var_mrr,
                    "days_pct": var_days
                },
                "type_breakdown": type_breakdown,
                "mrr_by_rede": mrr_by_rede,
                "highlights": highlights,
                "integradores": integradores,
                "stores": sorted(stores, key=lambda x: x['finished_at'], reverse=True)
            })
            
        # Reverter para apresentar do mais recente pro mais antigo
        results.reverse()
        
        final_payload = {
            "annual_goals": {
                "mrr_target": mrr_target,
                "mrr_ytd": round(ytd_mrr, 2),
                "mrr_pct": round((ytd_mrr / max(mrr_target, 1)) * 100, 1),
                "projection_mrr": est_mrr_date,
                
                "stores_target": stores_target,
                "stores_ytd": ytd_stores,
                "stores_pct": round((ytd_stores / max(stores_target, 1)) * 100, 1),
                "projection_stores": est_stores_date,
                
                "points_ytd": round(ytd_points, 1)
            },
            "wip_overview": {
                "wip_count": wip_count,
                "mrr_backlog": round(mrr_backlog, 2),
                "board_stages": board_stages_list
            },
            "months": results
        }
        
        return jsonify(final_payload), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integration_bp.route('/reports/export', methods=['GET'])
@require_auth
def export_integration_report(payload):
    """
    Exporta Excel com todas as integrações.
    """
    from app.services.integration_analytics_service import IntegrationAnalyticsService
    from flask import send_file
    
    try:
        excel_file = IntegrationAnalyticsService.export_integration_excel()
        filename = f"integration_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        return send_file(
            excel_file,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integration_bp.route('/sync', methods=['POST'])
@require_auth
@require_permission('manage_sync')
def sync_integration_tasks(payload):
    """
    Dispara sincronização manual apenas da fase de Integração.
    """
    from app.services.sync_service import SyncService
    service = SyncService()
    try:
        result = service.run_integration_sync()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
