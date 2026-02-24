from flask import Blueprint, jsonify, request
from app.models import db, Store, IntegrationMetric, TaskStep
from sqlalchemy import desc, func, case
from datetime import datetime, date

integration_bp = Blueprint('integration', __name__, url_prefix='/api/integration')

@integration_bp.route('/dashboard', methods=['GET'])
def get_integration_dashboard():
    """
    Retorna KPIs e Lista de Integrações.
    Aceita filtros: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD (para KPIs de volume)
    """
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # 1. Identificar Lojas na Fase de Integração ou Recém Integradas
    # Critério: Possuem IntegrationMetric OU possuem TaskStep na lista INTEGRACAO
    
    # Vamos buscar todas as métricas de integração existentes
    metrics_query = IntegrationMetric.query.join(Store)
    
    if start_date and end_date:
        # Filtrar por data de fim se concluída, ou qualquer se em andamento?
        # Para volume, usamos data de fim.
        pass 

    metrics = metrics_query.all()
    
    # KPI 1: Volume (Pontos)
    # Matriz = 1.0, Filial = 0.7
    total_points = 0.0
    for m in metrics:
        # Se concluído (tem end_date) e está dentro do período (se especificado)
        # Por enquanto, somamos tudo que tem end_date para simplificar, ou filtramos no frontend
        if m.end_date:
            is_matriz = m.store.tipo_loja == 'Matriz'
            points = 1.0 if is_matriz else 0.7
            total_points += points

    # KPI 2: SLA (< 60 dias)
    completed_in_sla = 0
    total_completed = 0
    for m in metrics:
        if m.end_date and m.start_date:
            total_completed += 1
            days = (m.end_date - m.start_date).days
            if days <= 60:
                completed_in_sla += 1
    
    sla_pct = (completed_in_sla / total_completed * 100) if total_completed > 0 else 100.0

    # KPI 3: Qualidade (Sem bugs críticos em 30 dias)
    # Consideramos sucesso se post_go_live_bugs == 0
    quality_success = sum(1 for m in metrics if m.end_date and m.post_go_live_bugs == 0)
    quality_pct = (quality_success / total_completed * 100) if total_completed > 0 else 100.0

    # KPI 4: Documentação (100% das novas)
    # Consideramos 'DONE' como sucesso
    doc_success = sum(1 for m in metrics if m.documentation_status == 'DONE')
    total_docs = len(metrics) # Considera todas, ou só as novas? Vamos considerar todas no painel
    doc_pct = (doc_success / total_docs * 100) if total_docs > 0 else 0.0

    # Lista Detalhada
    results = []
    for m in metrics:
        results.append({
            "id": m.store.id,
            "name": m.store.store_name,
            "integrador": m.store.integrador or "Não Atribuído",
            "assignee": m.store.integrador or "Não Atribuído",
            "rede": m.store.rede,
            "tipo": m.store.tipo_loja,
            "start_date": m.start_date.isoformat() if m.start_date else None,
            "end_date": m.end_date.isoformat() if m.end_date else None,
            "sla_days": (datetime.now() - m.start_date).days if m.start_date and not m.end_date else m.sla_days,
            "status": "CONCLUÍDO" if m.end_date else "EM ANDAMENTO",
            "doc_status": m.documentation_status,
            "bugs": m.post_go_live_bugs,
            "churn_risk": m.churn_risk
        })
        
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
def update_integration_metric(store_id):
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
def get_integration_kpis():
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
def get_integration_trends():
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
def get_monthly_integration_report():
    """
    Retorna dados agrupados de integrações concluídas por mês (JSON).
    Espelha a estrutura do relatório mensal de implantações.
    """
    from collections import defaultdict
    import statistics
    from app.models import Store, IntegrationMetric
    
    try:
        # Busca integrações concluídas
        metrics = IntegrationMetric.query.join(Store).filter(
            IntegrationMetric.end_date.isnot(None)
        ).all()
        
        grouped = defaultdict(list)
        
        for m in metrics:
            key = m.end_date.strftime('%Y-%m')
            
            days = 0
            if m.start_date:
                days = (m.end_date - m.start_date).days
                
            grouped[key].append({
                "id": m.store.id,
                "name": m.store.store_name,
                "integrador": m.store.integrador or "N/A",
                "rede": m.store.rede,
                "finished_at": m.end_date.strftime('%Y-%m-%d'),
                "doc_status": m.documentation_status,
                "bugs": m.post_go_live_bugs or 0,
                "days": days,
                "churn_risk": m.churn_risk
            })
            
        sorted_months = sorted(grouped.keys(), reverse=True)
        results = []
        
        for month in sorted_months:
            stores = grouped[month]
            total_stores = len(stores)
            total_bugs = sum(s['bugs'] for s in stores)
            
            days_list = [s['days'] for s in stores]
            avg_days = statistics.mean(days_list) if days_list else 0
            median_days = statistics.median(days_list) if days_list else 0
            
            results.append({
                "month": month,
                "stats": {
                    "total_stores": total_stores,
                    "total_bugs": total_bugs,
                    "avg_days": round(avg_days, 1),
                    "median_days": round(median_days, 1)
                },
                "stores": sorted(stores, key=lambda x: x['finished_at'], reverse=True)
            })
            
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@integration_bp.route('/reports/export', methods=['GET'])
def export_integration_report():
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
def sync_integration_tasks():
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
