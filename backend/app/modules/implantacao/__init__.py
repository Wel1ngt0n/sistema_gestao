from flask import Blueprint, jsonify, request
from app.modules.implantacao.services import sync_implementation_tasks
from app.models.project import Project
from app.models.implementation_logic import ImplementationLogic
from app import db

implantacao_bp = Blueprint('implantacao', __name__, url_prefix='/api/implantacao')

@implantacao_bp.route('/sync', methods=['POST'])
def sync():
    """
    Aciona a sincronização das tarefas do ClickUp.
    """
    result = sync_implementation_tasks()
    status_code = 200 if "error" not in result else 500
    return jsonify(result), status_code

@implantacao_bp.route('/list', methods=['GET'])
def list_projects():
    """
    Retorna a lista de projetos de implantação com todos os campos do Monitor Legado.
    """
    try:
        from datetime import datetime, timedelta
        
        # Join Project + ImplementationLogic
        query = Project.query.join(ImplementationLogic).filter(Project.has_implementation == True)
        
        projects = query.all()
        data = []
        for p in projects:
            impl = p.implementation
            
            # Helper para formatar data ISO
            def fmt_date(d):
                return d.isoformat() if d else None
            
            # Cálculo de Tempo em Trânsito (Start -> Agora)
            dias_em_transito = 0
            if impl.start_real_at:
                dias_em_transito = (datetime.utcnow() - impl.start_real_at).days
            
            # Cálculo Simples de Previsão (Start + SLA)
            data_previsao = None
            if impl.start_real_at and impl.tempo_contrato:
                data_previsao = impl.start_real_at + timedelta(days=impl.tempo_contrato)

            data.append({
                # Identificadores
                "id": p.id,
                "clickup_id": p.id, # Usando ID interno como referencia por enquanto
                "custom_id": str(p.id).zfill(4),
                "clickup_task_id": p.clickup_task_id,
                
                # Principal
                "name": p.name,
                "status": impl.status_norm,
                "risk_score": 0, # TODO: Implementar cálculo real
                
                # Contexto
                "rede": impl.rede,
                "tipo_loja": impl.tipo_loja,
                "parent_name": None, 
                "uf": impl.state_uf, # [NEW]
                "deployment_type": impl.deployment_type, # [NEW]
                
                # Workflow
                "implantador": impl.implantador_name,
                "dias_na_etapa": 0, 
                "dias_em_transito": dias_em_transito,
                "idle_days": impl.idle_days,
                
                # Financeiro
                "financeiro_status": impl.financeiro_status,
                "valor_mensalidade": impl.valor_mensalidade,
                "valor_implantacao": impl.valor_implantacao,
                "tempo_contrato": impl.tempo_contrato,
                
                # Técnico / Contexto Vendas
                "erp": impl.erp,
                "crm": impl.crm,
                "cnpj": impl.cnpj,
                "had_ecommerce": impl.had_ecommerce, # [NEW]
                "previous_platform": impl.previous_platform, # [NEW]
                "projected_orders": impl.projected_orders, # [NEW]
                
                # Datas
                "data_inicio": fmt_date(impl.start_real_at),
                "data_previsao": fmt_date(data_previsao),
                "data_fim": fmt_date(impl.end_real_at),
                "manual_finished_at": fmt_date(impl.manual_finished_at),
                "manual_go_live_date": fmt_date(impl.manual_go_live_date), # [NEW]
                
                # Inteligência
                "previsao_ia": fmt_date(impl.ai_analyzed_at), # Exibindo data da ultima analise como placeholder
                "ai_summary": impl.ai_summary, # [NEW]
                "teve_retrabalho": False,
                "delivered_with_quality": True,
                "considerar_tempo": True,
                "justificativa_tempo": None,
                "observacoes": None,
                "clickup_url": f"https://app.clickup.com/t/{p.clickup_task_id}" if p.clickup_task_id else None
            })
        
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@implantacao_bp.route('/kpi-cards', methods=['GET'])
def kpi_cards():
    """
    Calcula os KPIs básicos para a Dashboard.
    """
    try:
        # WIP (Em Progresso)
        wip_count = ImplementationLogic.query.filter_by(status_norm='IN_PROGRESS').count()
        
        # Done (Concluído) - Total ou você quer período? Vamos fazer total por enquanto
        done_count = ImplementationLogic.query.filter_by(status_norm='DONE').count()
        
        # MRR Backlog (Soma do valor_mensalidade de WIP)
        # MRR Done (Soma do valor_mensalidade de DONE)
        from sqlalchemy import func
        mrr_backlog = ImplementationLogic.query.with_entities(func.sum(ImplementationLogic.valor_mensalidade)).filter_by(status_norm='IN_PROGRESS').scalar() or 0
        mrr_done = ImplementationLogic.query.with_entities(func.sum(ImplementationLogic.valor_mensalidade)).filter_by(status_norm='DONE').scalar() or 0
        
        return jsonify({
            "wip_count": wip_count,
            "done_count": done_count,
            "mrr_backlog": mrr_backlog,
            "mrr_done": mrr_done
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@implantacao_bp.route('/dashboard-charts', methods=['GET'])
def dashboard_charts():
    """
    Retorna dados para os gráficos do Dashboard (Legado V2.5).
    1. Volume por Implantador
    2. Evolução de Entregas (Últimos 6 meses)
    3. Top Riscos (Baseado em dias sem interação)
    """
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta

        # 1. Volume por Implantador (WIP)
        # Agrupa por implantador_name onde status é IN_PROGRESS
        volume_by_implantador = db.session.query(
            ImplementationLogic.implantador_name, 
            func.count(ImplementationLogic.project_id)
        ).filter(
            ImplementationLogic.status_norm == 'IN_PROGRESS'
        ).group_by(
            ImplementationLogic.implantador_name
        ).all()
        
        # Formata para JSON
        volume_data = [
            {"name": name or "Não Atribuído", "value": count} 
            for name, count in volume_by_implantador
        ]
        
        # 2. Evolução de Entregas (Simulação baseada em end_real_at)
        # Nota: Como acabamos de dar sync, pode não ter histórico real. 
        # Vamos retornar dados reais se existirem, ou vazios.
        evolution_data = [] # TODO: Implementar com dados históricos reais
        
        # 3. Top Riscos (Lojas paradas há mais tempo - idle_days)
        # Pega Top 5 onde status é IN_PROGRESS, ordenado por idle_days desc
        top_risks_query = db.session.query(
            Project.name, 
            ImplementationLogic.idle_days,
            ImplementationLogic.implantador_name
        ).select_from(ImplementationLogic).join(Project).filter(
            ImplementationLogic.status_norm == 'IN_PROGRESS'
        ).order_by(
            ImplementationLogic.idle_days.desc()
        ).limit(5).all()
        
        top_risks = [
            {"name": r[0], "idle": r[1], "implantador": r[2]}
            for r in top_risks_query
        ]

        return jsonify({
            "volume_by_implantador": volume_data,
            "evolution": evolution_data, # Retornando vazio por enquanto
            "top_risks": top_risks
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@implantacao_bp.route('/projects/<int:project_id>', methods=['PUT', 'PATCH'])
def update_project(project_id):
    """
    Atualiza dados manuais de um projeto de implantação.
    """
    try:
        data = request.json
        project = Project.query.get(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
            
        impl = project.implementation
        if not impl:
            return jsonify({"error": "Implementation record not found"}), 404
            
        # Campos Atualizáveis
        if 'rede' in data: impl.rede = data['rede']
        if 'tipo_loja' in data: impl.tipo_loja = data['tipo_loja']
        if 'observacoes' in data: impl.observacoes = data['observacoes']
        if 'justificativa_tempo' in data: impl.justificativa_tempo = data['justificativa_tempo']
        
        # Booleanos
        if 'teve_retrabalho' in data: impl.teve_retrabalho = bool(data['teve_retrabalho'])
        if 'delivered_with_quality' in data: impl.delivered_with_quality = bool(data['delivered_with_quality'])
        if 'considerar_tempo' in data: impl.considerar_tempo = bool(data['considerar_tempo'])
        
        # Financeiro
        if 'financeiro_status' in data: impl.financeiro_status = data['financeiro_status']
        if 'valor_mensalidade' in data: impl.valor_mensalidade = float(data.get('valor_mensalidade', 0))
        if 'tempo_contrato' in data: impl.tempo_contrato = int(data.get('tempo_contrato', 90))
        
        # Datas Manuais
        if 'manual_finished_at' in data:
            date_str = data['manual_finished_at']
            if date_str:
                from datetime import datetime
                # Aceita YYYY-MM-DD
                impl.manual_finished_at = datetime.strptime(date_str, "%Y-%m-%d")
            else:
                impl.manual_finished_at = None
                
        if 'data_inicio' in data:
             date_str = data['data_inicio']
             if date_str:
                  from datetime import datetime
                  impl.start_real_at = datetime.strptime(date_str, "%Y-%m-%d")

        db.session.commit()
        return jsonify({"message": "Updated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@implantacao_bp.route('/analytics', methods=['GET'])
def analytics_data():
    """
    Retorna payload completo para a página de Relatórios e Analytics.
    """
    try:
        from sqlalchemy import func, case, extract
        from datetime import datetime, timedelta

        # 1. KPIs GERAIS
        current_date = datetime.utcnow()
        first_day_month = current_date.replace(day=1, hour=0, minute=0, second=0)

        # WIP (Ativos)
        wip_query = ImplementationLogic.query.filter(ImplementationLogic.status_norm == 'IN_PROGRESS')
        wip_count = wip_query.count()
        mrr_backlog = wip_query.with_entities(func.sum(ImplementationLogic.valor_mensalidade)).scalar() or 0
        
        # DONE (Total) - Usar filtro simples por enquanto
        done_query = ImplementationLogic.query.filter(ImplementationLogic.status_norm == 'DONE')
        total_done = done_query.count()

        # DONE (No Período - Mês Atual)
        done_period_query = done_query.filter(ImplementationLogic.end_real_at >= first_day_month)
        done_period_count = done_period_query.count()
        mrr_activated_period = done_period_query.with_entities(func.sum(ImplementationLogic.valor_mensalidade)).scalar() or 0
        
        # Risco & Estagnadas
        idle_stores_count = ImplementationLogic.query.filter(
            ImplementationLogic.status_norm == 'IN_PROGRESS',
            ImplementationLogic.idle_days > 5
        ).count()

        # Matrix vs Filial (WIP)
        matrix_count = wip_query.filter(ImplementationLogic.tipo_loja == 'Matriz').count()
        filial_count = wip_query.filter(ImplementationLogic.tipo_loja == 'Filial').count()

        kpi_data = {
            "wip_stores": wip_count,
            "throughput_period": done_period_count,
            "total_done": total_done,
            "mrr_backlog": float(mrr_backlog),
            "mrr_done_period": float(mrr_activated_period),
            "idle_stores_count": idle_stores_count,
            "matrix_count": matrix_count,
            "filial_count": filial_count,
            "avg_risk_score": 0, # Placeholder
            "otd_percentage": 100 # Placeholder
        }

        # 2. PERFORMANCE POR IMPLANTADOR
        # Agrupa WIP e DONE por implantador
        perf_query = db.session.query(
            ImplementationLogic.implantador_name,
            func.sum(case((ImplementationLogic.status_norm == 'IN_PROGRESS', 1), else_=0)).label('wip'),
            func.sum(case((ImplementationLogic.status_norm == 'DONE', 1), else_=0)).label('done')
        ).group_by(ImplementationLogic.implantador_name).all()

        performance_data = []
        for row in perf_query:
            if row.implantador_name:
                performance_data.append({
                    "implantador": row.implantador_name,
                    "wip": row.wip,
                    "done": row.done,
                    "score": 100, # Placeholder
                    "points": row.done * 10 # Simulação de pontos
                })

        # 3. TENDÊNCIA MENSAL (Últimos 6 meses)
        # Como não temos muitos dados históricos reais "end_real_at", vamos simular ou retornar vazio se não tiver
        trend_data = []
        # Query real seria algo como:
        # db.session.query(func.strftime('%Y-%m', end_real_at), count).group_by...
        
        # 3. RISK DATA (Scatter Plot)
        # Format: [days_in_step, risk_score, mrr, name, status]
        risk_query = db.session.query(
            ImplementationLogic.idle_days,
            ImplementationLogic.valor_mensalidade,
            Project.name,
            ImplementationLogic.status_norm
        ).join(Project).filter(
            ImplementationLogic.status_norm == 'IN_PROGRESS'
        ).all()

        risk_data = []
        for row in risk_query:
            # Simple Risk calc: (idle * 5) capped at 100
            idle = row.idle_days or 0
            score = min(100, idle * 10)
            risk_data.append([
                idle,
                score,
                row.valor_mensalidade or 0,
                row.name,
                row.status_norm
            ])

        # 4. BOTTLENECK DATA (Dummy for now)
        bottleneck_data = [
             {"step_name": "Agendamento Inicial", "total_days": 120, "avg_days": 4, "reopens": 2},
             {"step_name": "Configuração ERP", "total_days": 350, "avg_days": 12, "reopens": 15},
             {"step_name": "Treinamento", "total_days": 80, "avg_days": 3, "reopens": 5},
             {"step_name": "Homologação", "total_days": 200, "avg_days": 8, "reopens": 8},
        ]

        # 5. FORECAST (Real Logic V3.1)
        # 3 months back, 3 months forward
        # Logic: 
        # Realized = Sum(valor_mensalidade) where manual_go_live_date in month (or end_real_at if missing)
        # Projected = Sum(valor_mensalidade) where projected go_live in month aka (start_date + cycle_time) or manual_go_live_date
        
        forecast_data = []
        for i in range(-2, 4):
            month_date = first_day_month + timedelta(days=i*30)
            month_start = month_date.replace(day=1)
            # End of month
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1)
            
            month_label = month_date.strftime("%Y-%m")
            
            # Realized (Historical)
            realized = db.session.query(func.sum(ImplementationLogic.valor_mensalidade))\
                .filter(ImplementationLogic.status_norm == 'DONE')\
                .filter(ImplementationLogic.end_real_at >= month_start)\
                .filter(ImplementationLogic.end_real_at <= month_end)\
                .scalar() or 0
                
            # Projected (Future) 
            # Logic: If manual_go_live_date set, use it. Else, estimate.
            # Simplified: Sum of MRR for "IN_PROGRESS" projects where estimated date falls in this month
            projected = 0
            if i >= 0:
                 # TODO: Improve this with actual date logic
                 # For now, spreading backlog evenly as a heuristic if no dates
                 if i == 0: projected = mrr_backlog * 0.2
                 if i == 1: projected = mrr_backlog * 0.4
                 if i == 2: projected = mrr_backlog * 0.3
            
            forecast_data.append({
                "month": month_label,
                "realized": float(realized),
                "projected": float(projected)
            })

        return jsonify({
            "kpi_data": kpi_data,
            "performance_data": performance_data,
            "trend_data": trend_data,
            "risk_data": risk_data,
            "bottleneck_data": bottleneck_data, 
            "forecast_data": forecast_data 
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
