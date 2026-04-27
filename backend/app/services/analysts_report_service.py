from app.models import db, Store, SystemConfig
from sqlalchemy import func, or_
from datetime import datetime, timedelta
import json

class AnalystsReportService:
    # Corte: Considerar apenas lojas a partir de 01/01/2026
    CUTOFF_DATE = datetime(2026, 1, 1)

    @staticmethod
    def _get_goal_metrics():
        annual_mrr = 180000.0
        config_mrr = SystemConfig.query.filter_by(key='annual_mrr_target').first()
        if config_mrr:
            try:
                annual_mrr = float(config_mrr.value)
            except ValueError:
                pass
        meta_semestral_mrr = annual_mrr / 2.0

        implantadores_query = db.session.query(Store.implantador).distinct().filter(
            Store.implantador.isnot(None), 
            Store.implantador != '',
            Store.status_norm != 'CANCELED'
        ).filter(
            or_(
                Store.status_norm != 'DONE',
                Store.manual_finished_at >= AnalystsReportService.CUTOFF_DATE,
                Store.end_real_at >= AnalystsReportService.CUTOFF_DATE,
                Store.finished_at >= AnalystsReportService.CUTOFF_DATE,
                Store.created_at >= AnalystsReportService.CUTOFF_DATE
            )
        )
        qtd_analistas = implantadores_query.count() or 1
        
        concluidas_2026 = Store.query.filter(
            Store.status_norm == 'DONE',
            or_(
                Store.manual_finished_at >= AnalystsReportService.CUTOFF_DATE,
                Store.end_real_at >= AnalystsReportService.CUTOFF_DATE,
                Store.finished_at >= AnalystsReportService.CUTOFF_DATE
            )
        ).all()
        count_concluidas = len(concluidas_2026)
        ticket_medio = sum((s.valor_mensalidade or 0.0) for s in concluidas_2026) / count_concluidas if count_concluidas > 0 else 1000.0
        if ticket_medio == 0:
            ticket_medio = 1000.0
        
        meta_semestral_lojas = meta_semestral_mrr / ticket_medio
        meta_individual_semestral = meta_semestral_lojas / qtd_analistas
        meta_individual_mensal = meta_individual_semestral / 6.0
        if meta_individual_mensal <= 0:
            meta_individual_mensal = 1.0

        return {
            "meta_semestral_mrr": meta_semestral_mrr,
            "ticket_medio": round(ticket_medio, 2),
            "meta_individual_mensal_lojas": round(meta_individual_mensal, 2),
            "meta_individual_semestral_lojas": round(meta_individual_semestral, 2)
        }

    @staticmethod
    def _calculate_score(metrics, goal_metrics):
        pct_sla_c = metrics.get('pct_sla_concluidas', 0)
        pct_sla_a = metrics.get('pct_sla_ativas', 0)
        
        idle_inv = max(0, 100 - (metrics.get('idle_medio', 0) * 10))
        
        meta_mensal = goal_metrics.get('meta_individual_mensal_lojas', 1) if isinstance(goal_metrics, dict) else goal_metrics
        if meta_mensal <= 0:
            meta_mensal = 1
        
        entregas_norm = min(100, (metrics.get('entregas_mes', 0) / meta_mensal) * 100)
        
        retrabalho = metrics.get('pct_retrabalho', 0)
        # Inversão de Retrabalho: 0% retrabalho = 100 pontos, 50%+ retrabalho = 0 pontos
        retrabalho_inv = max(0, 100 - (retrabalho * 2))
        
        # Qualidade na Entrega: Média de lojas entregues com qualidade (0 ou 100)
        qualidade_entrega = metrics.get('pct_qualidade', 100)
        
        # Eixo Qualidade Consolidado (50% Retrabalho Inv + 50% Qualidade Entrega)
        eixo_qualidade = (retrabalho_inv * 0.5) + (qualidade_entrega * 0.5)
        
        score = (
            (pct_sla_c * 0.30) +
            (pct_sla_a * 0.20) +
            (idle_inv * 0.15) +
            (entregas_norm * 0.15) +
            (eixo_qualidade * 0.20)
        )
        return {
            "score_final": round(score, 1),
            "eixos": {
                "sla_concluidas": round(pct_sla_c, 1),
                "sla_ativas": round(pct_sla_a, 1),
                "idle_invertido": round(idle_inv, 1),
                "entregas": round(entregas_norm, 1),
                "qualidade": round(eixo_qualidade, 1)
            }
        }

    @staticmethod
    def get_team_cockpit(start_date=None, end_date=None):
        """
        Retorna os dados processados para o Cockpit Jarvis (Visão Gerencial v3.5).
        Inclui heurísticas de performance, tendências e alertas proativos.
        """
        resume_data = AnalystsReportService.get_team_resume(start_date, end_date)
        if not resume_data:
            return {"alerts": [], "analysts": [], "summary": {}}

        # 1. Calcular Médias do Time para Contexto
        analysts_list = resume_data.get('data', [])
        total_ativos = sum(a.get('ativos', 0) for a in analysts_list)
        total_entregues_mes = sum(a.get('entregas_mes', 0) for a in analysts_list)
        avg_sla = sum(a.get('pct_sla_concluidas', 0) for a in analysts_list) / len(analysts_list) if analysts_list else 0
        avg_throughput = total_entregues_mes / len(analysts_list) if analysts_list else 0

        cockpit_analysts = []
        alerts = []

        for analyst in analysts_list:
            # Heurísticas Jarvis
            # Calculando média de idle
            status = "HEALTHY"
            recommendation = "Manter acompanhamento de rotina."
            action_priority = "low"

            # 🚨 ALERTA: Sobrecarga Crítica
            if analyst.get('carga_ponderada', 0) > 15 and analyst.get('entregas_mes', 0) < (avg_throughput * 0.5):
                status = "OVERLOADED"
                recommendation = "Redistribuir novas lojas. Analista com carga alta e baixa vazão."
                action_priority = "high"
                alerts.append({
                    "type": "danger",
                    "msg": f"{analyst['implantador']} está com sobrecarga crítica ({analyst['carga_ponderada']} pts)."
                })

            # 🚀 ALERTA: Alta Performance
            elif analyst.get('entregas_mes', 0) > avg_throughput and analyst.get('pct_sla_concluidas', 0) >= 85:
                status = "HIGH_PERFORMANCE"
                recommendation = "Reconhecer performance. Potencial para mentorar outros membros."
                action_priority = "low"

            # ⚠️ ALERTA: Idle/Estagnação
            elif analyst.get('idle_medio', 0) > 7:
                status = "WARNING"
                recommendation = "Verificar bloqueios técnicos ou falta de engajamento do cliente."
                action_priority = "medium"
                alerts.append({
                    "type": "warning",
                    "msg": f"{analyst['implantador']} possui lojas paradas há mais de 7 dias em média."
                })

            # 📉 ALERTA: Baixa Entrega
            elif analyst.get('entregas_mes', 0) == 0 and analyst.get('ativos', 0) > 0:
                status = "CRITICAL_IDLE"
                recommendation = "Ação imediata: Cobrar entregas ou entender motivo da trava total."
                action_priority = "high"

            cockpit_analysts.append({
                **analyst,
                "jarvis_status": status,
                "recommendation": recommendation,
                "action_priority": action_priority,
                "is_top_performer": status == "HIGH_PERFORMANCE"
            })

        # Build structured team_actions (top 3 decision priorities)
        team_actions = []

        overloaded = [a for a in cockpit_analysts if a['action_priority'] == 'high'
                      and a['jarvis_status'] == 'OVERLOADED']
        critical_idle = [a for a in cockpit_analysts if a['jarvis_status'] == 'CRITICAL_IDLE']
        warning_idle = [a for a in cockpit_analysts if a['jarvis_status'] == 'WARNING']

        if overloaded:
            team_actions.append({
                "priority": 1,
                "type": "overload",
                "title": "Redistribuir Carga",
                "description": f"{len(overloaded)} analista(s) com sobrecarga e baixa vazão de entregas.",
                "affected": [a['implantador'] for a in overloaded],
                "impact": "alto"
            })

        if critical_idle:
            team_actions.append({
                "priority": 2 if not overloaded else 1,
                "type": "idle",
                "title": "Lojas sem Entrega",
                "description": f"{len(critical_idle)} analista(s) com lojas ativas e zero entregas no período.",
                "affected": [a['implantador'] for a in critical_idle],
                "impact": "alto"
            })

        if warning_idle:
            team_actions.append({
                "priority": 3,
                "type": "warning",
                "title": "Reduzir Idle Prolongado",
                "description": f"{len(warning_idle)} analista(s) com lojas paradas acima de 7 dias.",
                "affected": [a['implantador'] for a in warning_idle],
                "impact": "medio"
            })

        if avg_sla < 75 and not team_actions:
            team_actions.append({
                "priority": 1,
                "type": "sla",
                "title": "SLA do Time em Risco",
                "description": f"Média do time de {round(avg_sla, 1)}% está abaixo da meta de 85%.",
                "affected": [],
                "impact": "medio"
            })

        # Sort by priority ascending
        team_actions = sorted(team_actions, key=lambda x: x['priority'])[:3]

        avg_carga = sum(a['carga_ponderada'] for a in analysts_list) / len(analysts_list) if analysts_list else 0
        avg_idle = sum(a['idle_medio'] for a in analysts_list) / len(analysts_list) if analysts_list else 0

        return {
            "summary": {
                "total_ativos": total_ativos,
                "total_entregues_mes": total_entregues_mes,
                "avg_sla": round(avg_sla, 1),
                "avg_retrabalho": round(sum(a.get('pct_retrabalho', 0) for a in cockpit_analysts) / len(cockpit_analysts), 1) if cockpit_analysts else 0,
                "team_health": "Good" if avg_sla > 80 else "Attention"
            },
            "avg_metrics": {
                "avg_carga": round(avg_carga, 1),
                "avg_idle": round(avg_idle, 1),
                "avg_throughput": round(avg_throughput, 1),
                "avg_sla": round(avg_sla, 1)
            },
            "alerts": alerts[:5],
            "team_actions": team_actions,
            "analysts": cockpit_analysts
        }


    @staticmethod
    def get_team_resume(start_date=None, end_date=None):
        """
        Retorna a Mesa Comparativa do time.
        Agrega métricas por implantador. Suporta filtros de data.
        """
        if not start_date or start_date < AnalystsReportService.CUTOFF_DATE:
            start_date = AnalystsReportService.CUTOFF_DATE

        cutoff = start_date

        
        # Filtro: Pessoas que têm lojas ATIVAS neste momento OR lojas ENTREGUES no período
        implantadores_query = db.session.query(Store.implantador).distinct().filter(
            Store.implantador.isnot(None), 
            Store.implantador != '',
            Store.status_norm != 'CANCELED'
        ).filter(
            or_(
                Store.status_norm != 'DONE',
                Store.manual_finished_at >= cutoff,
                Store.end_real_at >= cutoff,
                Store.finished_at >= cutoff,
                Store.created_at >= cutoff
            )
        )
        
        implantadores = [i[0] for i in implantadores_query.all()]
        
        report = []
        
        goal_metrics = AnalystsReportService._get_goal_metrics()
        
        now = datetime.now()
        for imp in implantadores:
            # Lojas Totais (Ativas vs Entregues)
            stores = Store.query.filter(
                or_(
                    Store.implantador == imp,
                    Store.implantador_atual == imp
                ),
                Store.status_norm != 'CANCELED'
            ).filter(
                or_(
                    Store.status_norm != 'DONE',
                    Store.manual_finished_at >= cutoff,
                    Store.end_real_at >= cutoff,
                    Store.finished_at >= cutoff,
                    Store.created_at >= cutoff
                )
            ).all()

            ativas = [s for s in stores if s.status_norm != 'DONE' and not s.is_scheduled]
            programadas = [s for s in stores if s.status_norm != 'DONE' and s.is_scheduled]

            concluidas = [s for s in stores if s.status_norm == 'DONE']
            
            # Carga Ponderada (Somente Ativas)
            carga_ponderada = 0.0
            matrizes_ativas = 0
            filiais_ativas = 0
            
            for s in ativas:
                if s.tipo_loja and s.tipo_loja.lower() == 'matriz':
                    carga_ponderada += 1.0
                    matrizes_ativas += 1
                else:
                    carga_ponderada += 0.5
                    filiais_ativas += 1
            
            # MRR Ativo
            mrr_ativo = sum((s.valor_mensalidade or 0.0) for s in ativas)
            
            # Entregas Periodo (De acordo com filtro)
            if start_date and end_date:
                concluidas_mes = [s for s in concluidas if s.effective_finished_at and start_date <= s.effective_finished_at <= end_date]
            else:
                first_day_of_month = datetime(now.year, now.month, 1)
                concluidas_mes = [s for s in concluidas if s.effective_finished_at and s.effective_finished_at >= first_day_of_month]
                
            throughput_mes = len(concluidas_mes)
            
            # Se for buscar as SLA concluídas, queremos olhar apenas paras lojas concluídas NO PERÍODO.
            if start_date and end_date:
                concluidas = concluidas_mes
            
            # 1. SLA Concluídas
            sla_ok_concluidas = 0
            sla_total_concluidas = 0
            for s in concluidas:
                if not s.considerar_tempo_implantacao:
                    continue
                if not s.effective_started_at:
                    continue
                sla_total_concluidas += 1
                sla_limit = s.tempo_contrato or 90
                dias = s.dias_totais_implantacao or 0
                if dias > 0 and dias <= sla_limit:
                    sla_ok_concluidas += 1
            
            pct_sla_concluidas = (sla_ok_concluidas / sla_total_concluidas * 100) if sla_total_concluidas > 0 else 0

            # 2. SLA Ativas (Saúde da Carteira)
            sla_ok_ativas = 0
            sla_total_ativas = 0
            for s in ativas:
                if not s.considerar_tempo_implantacao:
                    continue
                if not s.effective_started_at:
                    continue
                sla_total_ativas += 1
                sla_limit = s.tempo_contrato or 90
                dias = s.dias_em_progresso or 0
                if dias <= sla_limit:
                    sla_ok_ativas += 1
            
            pct_sla_ativas = (sla_ok_ativas / sla_total_ativas * 100) if sla_total_ativas > 0 else 0
            
            
            # Qualidade (Somente nas FINALIZADAS do período)
            base_concluidas = concluidas if (start_date and end_date) else concluidas_mes
            retrabalho_count = sum(1 for s in base_concluidas if s.teve_retrabalho)
            pct_retrabalho = (retrabalho_count / len(base_concluidas) * 100) if len(base_concluidas) > 0 else 0
            
            # Idle (Apenas ativas)
            idles = [s.idle_days for s in ativas if s.idle_days is not None]
            idle_medio = (sum(idles) / len(idles)) if len(idles) > 0 else 0
            idle_critico_count = sum(1 for i in idles if i > 7) # Mais de 7 dias sem atualização
            
            # Calculo de Gargalos (Desvios) - Simplificado na Visão 1
            metrics_for_score = {
                'pct_sla_concluidas': pct_sla_concluidas,
                'pct_sla_ativas': pct_sla_ativas,
                'idle_medio': idle_medio,
                'entregas_mes': throughput_mes,
                'pct_retrabalho': pct_retrabalho
            }
            score = AnalystsReportService._calculate_score(metrics_for_score, goal_metrics)
            
            report.append({
                "implantador": imp,
                "ativos": len(ativas),
                "programadas": len(programadas),
                "entregues": len(concluidas),
                "carga_ponderada": carga_ponderada,
                "matrizes_ativas": matrizes_ativas,
                "filiais_ativas": filiais_ativas,
                "mrr_ativo": mrr_ativo,
                "entregas_mes": throughput_mes,
                "pct_sla_concluidas": round(pct_sla_concluidas, 1),
                "pct_sla_ativas": round(pct_sla_ativas, 1),
                "pct_retrabalho": pct_retrabalho,
                "idle_medio": round(idle_medio, 1),
                "idle_critico_count": idle_critico_count,
                "score": score
            })
            
        # Sort by Carga Ponderada Descending by default
        report.sort(key=lambda x: x['carga_ponderada'], reverse=True)
        
        # Para calculo geral de MRR da empresa no período selecionado:
        effective_finished = func.coalesce(Store.manual_finished_at, Store.end_real_at, Store.finished_at)

        # 1. Churn MRR
        churn_query = Store.query.filter(Store.status_norm == 'CANCELED')
        if start_date:
             churn_query = churn_query.filter(effective_finished >= start_date)
        if end_date:
             churn_query = churn_query.filter(effective_finished <= end_date)
        churn_stores = churn_query.all()
        churn_mrr = sum(s.valor_mensalidade or 0.0 for s in churn_stores)

        # 2. Entregue MRR
        delivered_query = Store.query.filter(Store.status_norm == 'DONE')
        if start_date:
             delivered_query = delivered_query.filter(effective_finished >= start_date)
        if end_date:
             delivered_query = delivered_query.filter(effective_finished <= end_date)
        delivered_stores = delivered_query.all()
        delivered_mrr = sum(s.valor_mensalidade or 0.0 for s in delivered_stores)
        
        # 3. Projetado MRR (Lojas ativas que tem data prevista DESTE periodo)
        # Reutilizar lógica de previsão. Se a loja está IN_PROGRESS, e go_live_date cai no período
        from dateutil.relativedelta import relativedelta
        projected_mrr = 0.0
        todas_ativas = Store.query.filter(Store.status_norm != 'CANCELED', Store.status_norm != 'DONE', Store.include_in_forecast).all()
        for s in todas_ativas:
            go_live_date = s.manual_go_live_date
            if not go_live_date and s.effective_started_at:
                days = s.tempo_contrato or 90
                go_live_date = s.effective_started_at + relativedelta(days=days)
            
            if go_live_date:
                # Checar se go_live_date cai no periodo
                in_period = True
                if start_date and go_live_date < start_date:
                    in_period = False
                if end_date and go_live_date > end_date:
                    in_period = False
                
                if in_period:
                     projected_mrr += (s.valor_mensalidade or 0.0)

        # Buscar Limit/Meta
        c_target = SystemConfig.query.filter_by(key="annual_mrr_target").first()
        cs_target = SystemConfig.query.filter_by(key="monthly_cs_churn_limit").first()
        
        net_mrr_target = float(c_target.value) / 2 if c_target else 100000.0 # Ex: Semestral 100k
        
        cs_churn_monthly_limit = float(cs_target.value) if cs_target else 5000.0
        # Adaptar churn target pelo período. (Se mensal, assume cs_churn_monthly_limit.)
        # Por simplificação, passamos o base e o frontend calcula ou ajustamos por dt.
        months_in_period = 1
        if start_date and end_date:
            delta = end_date - start_date
            months_in_period = max(1, round(delta.days / 30.0))
        else:
            months_in_period = 6 # Default semestral
            
        period_churn_limit = cs_churn_monthly_limit * months_in_period

        net_mrr_result = (delivered_mrr + projected_mrr) - churn_mrr

        company_projection = {
             "delivered_mrr": delivered_mrr,
             "projected_mrr": projected_mrr,
             "churn_mrr": churn_mrr,
             "net_mrr_result": net_mrr_result,
             "net_mrr_target": net_mrr_target,
             "churn_limit": period_churn_limit,
             "months_in_period": months_in_period
        }

        # Sumarização do Time
        summary = {
            "total_ativos": sum(item.get('ativos', 0) for item in report),
            "total_programadas": sum(item['programadas'] for item in report),
            "total_entregues": sum(item['entregas_mes'] for item in report),
            "mrr_total_ativo": sum(item['mrr_ativo'] for item in report),
            "carga_media": (sum(item['carga_ponderada'] for item in report) / len(report)) if report else 0
        }

        return {
            "data": report,
            "summary": summary,
            "company_projection": company_projection
        }

    @staticmethod
    def get_analyst_details(implantador_name, start_date=None, end_date=None):
        """
        Retorna o Drill-down Individual do Implantador (Aba 3).
        """
        if not start_date or start_date < AnalystsReportService.CUTOFF_DATE:
            start_date = AnalystsReportService.CUTOFF_DATE
            
        last_ai_analysis = None

        # Obter todas as lojas do analista
        stores = Store.query.filter(
            or_(
                Store.implantador == implantador_name,
                Store.implantador_atual == implantador_name
            ),
            Store.status_norm != 'CANCELED'
        ).filter(
            or_(
                Store.status_norm != 'DONE',
                Store.manual_finished_at >= AnalystsReportService.CUTOFF_DATE,
                Store.end_real_at >= AnalystsReportService.CUTOFF_DATE,
                Store.finished_at >= AnalystsReportService.CUTOFF_DATE,
                Store.created_at >= AnalystsReportService.CUTOFF_DATE
            )
        ).all()


        
        ativas = [s for s in stores if s.status_norm != 'DONE' and not s.is_scheduled]
        programadas = [s for s in stores if s.status_norm != 'DONE' and s.is_scheduled]
        concluidas = [s for s in stores if s.status_norm == 'DONE']
        
        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)
        
        if start_date and end_date:
            concluidas_30d = [s for s in concluidas if s.effective_finished_at and start_date <= s.effective_finished_at <= end_date]
            # Override concluidas to only analyze stores delivered in this period
            concluidas = concluidas_30d
        else:
            concluidas_30d = [s for s in concluidas if s.effective_finished_at and s.effective_finished_at >= thirty_days_ago]
        
        carga_ponderada = sum(1.0 if (s.tipo_loja and s.tipo_loja.lower() == 'matriz') else 0.5 for s in ativas)
        mrr_ativo = sum((s.valor_mensalidade or 0.0) for s in ativas)
        
        # 1. SLA Concluídas
        sla_total_concluidas = 0
        sla_ok_concluidas = 0
        for s in concluidas:
            if not s.considerar_tempo_implantacao:
                continue
            if not s.effective_started_at:
                continue
            sla_total_concluidas += 1
            sla_limit = s.tempo_contrato or 90
            dias = s.dias_totais_implantacao or 0
            if dias > 0 and dias <= sla_limit:
                sla_ok_concluidas += 1
        pct_sla_concluidas = (sla_ok_concluidas / sla_total_concluidas * 100) if sla_total_concluidas > 0 else 0

        # 2. SLA Ativas
        sla_total_ativas = 0
        sla_ok_ativas = 0
        for s in ativas:
            if not s.considerar_tempo_implantacao:
                continue
            if not s.effective_started_at:
                continue
            sla_total_ativas += 1
            sla_limit = s.tempo_contrato or 90
            dias = s.dias_em_progresso or 0
            if dias <= sla_limit:
                sla_ok_ativas += 1
        pct_sla_ativas = (sla_ok_ativas / sla_total_ativas * 100) if sla_total_ativas > 0 else 0
        
        
        # Qualidade (Somente nas lojas FINALIZADAS do período)
        base_concluidas = concluidas if (start_date and end_date) else concluidas_30d
        
        retrabalho_count = sum(1 for s in base_concluidas if s.teve_retrabalho)
        pct_retrabalho = (retrabalho_count / len(base_concluidas) * 100) if len(base_concluidas) > 0 else 0
        
        qualidade_count = sum(1 for s in base_concluidas if s.delivered_with_quality)
        pct_qualidade = (qualidade_count / len(base_concluidas) * 100) if len(base_concluidas) > 0 else 100
        
        # Detalhes das lojas ativas para exibir na UI
        carteira_atual = []
        for s in ativas:
            carteira_atual.append({
                "id": s.id,
                "name": s.store_name,
                "status_name": s.status,
                "tipo_loja": s.tipo_loja,
                "idle_days": s.idle_days,
                "dias_em_progresso": s.dias_em_progresso,
                "tempo_contrato": s.tempo_contrato or 90,
                "valor_mensalidade": s.valor_mensalidade,
                "teve_retrabalho": s.teve_retrabalho,
                "delivered_with_quality": s.delivered_with_quality,
                "considerar_tempo_implantacao": s.considerar_tempo_implantacao,
                "observacoes": s.observacoes,
                "is_scheduled": False
            })
            
        programadas_list = []
        for s in programadas:
            programadas_list.append({
                "id": s.id,
                "name": s.store_name,
                "status_name": "Programada",
                "tipo_loja": s.tipo_loja,
                "manual_start_date": s.manual_start_date.strftime('%d/%m/%Y') if s.manual_start_date else None,
                "effective_started_at": s.effective_started_at.strftime('%d/%m/%Y') if s.effective_started_at else None,
                "valor_mensalidade": s.valor_mensalidade,
                "is_scheduled": True
            })

        carteira_atual.sort(key=lambda x: x['idle_days'] or 0, reverse=True)
            
        # Tempos Médios por Etapa:
        # Agrupar TaskSteps das lojas para ver gargalos por etapa
        steps_stats = {}
        total_work_days = 0
        total_idle_days = 0
        
        for s in ativas:
            total_work_days += (s.dias_em_progresso or 0)
            total_idle_days += (s.idle_days or 0)
            for step in s.steps:
                name = (step.step_list_name or "Geral").upper()
                if name not in steps_stats:
                    steps_stats[name] = []
                # Considerar tempo total do step se fechado, ou tempo ate agora
                val = step.total_time_days or 0
                steps_stats[name].append(val)
        
        avg_etapas = {k: round(sum(v)/len(v), 1) for k, v in steps_stats.items() if len(v) > 0}
        
        # Proporção Execução vs Espera
        exec_pct = 100
        wait_pct = 0
        if total_work_days > 0:
            wait_pct = round((total_idle_days / total_work_days) * 100, 1)
            exec_pct = 100 - wait_pct

        # Diagnóstico de Causa (Backend heurístico para enviar para IA)
        causas_imp = {"CLIENTE": 0, "IMPLANTADOR": 0, "FLUXO": 0, "CARGA": 0}
        for s in ativas:
            c = AnalystsReportService._classify_store_delay(s, carga_ponderada)
            if c in causas_imp:
                causas_imp[c] += 1

        # Lojas Concluídas no Mês/Período
        concluidas_mes_list = []
        for s in concluidas:
            in_period = False
            if start_date and end_date:
                if s.effective_finished_at and start_date <= s.effective_finished_at <= end_date:
                    in_period = True
            else:
                if s.effective_finished_at and s.effective_finished_at.year == now.year and s.effective_finished_at.month == now.month:
                    in_period = True
            
            if in_period:
                concluidas_mes_list.append({
                    "id": s.id,
                    "name": s.store_name,
                    "tipo_loja": s.tipo_loja,
                    "tempo_total": s.dias_totais_implantacao,
                    "valor_mensalidade": s.valor_mensalidade,
                    "finished_at": s.effective_finished_at.strftime('%d/%m/%Y') if s.effective_finished_at else "-"
                })

        # Buscar última análise da IA salva (Cache)
        from app.models import AILongTermMemory
        last_memory = AILongTermMemory.query.filter(
            AILongTermMemory.analysis_type == "individual_diagnostic",
            AILongTermMemory.query_prompt.ilike(f"%{implantador_name}%")
        ).order_by(AILongTermMemory.created_at.desc()).first()
        
        last_ai_analysis = None
        if last_memory:
            try:
                last_ai_analysis = json.loads(last_memory.ai_response)
            except Exception:
                pass

        goal_metrics = AnalystsReportService._get_goal_metrics()
        
        metrics_for_score = {
            "pct_sla_concluidas": pct_sla_concluidas,
            "pct_sla_ativas": pct_sla_ativas,
            "pct_retrabalho": pct_retrabalho,
            "pct_qualidade": pct_qualidade,
            "idle_medio": (total_idle_days / len(ativas)) if len(ativas) > 0 else 0,
            "entregas_mes": len(concluidas_mes_list)
        }
        score = AnalystsReportService._calculate_score(metrics_for_score, goal_metrics)
        
        # Heurística de Ações Pessoais (Cockpit Individial)
        personal_actions = []
        # 1. Idle Crítico
        critical_idle = [s for s in ativas if s.idle_days > 7]
        for s in critical_idle[:2]:
            personal_actions.append({
                "type": "CRITICAL_IDLE",
                "priority": "HIGH",
                "description": f"A loja {s.store_name} está parada há {s.idle_days} dias no status {s.status}.",
                "impact": "Risco de Churn"
            })
        
        # 2. SLA Baixo
        if pct_sla_concluidas < 75:
            personal_actions.append({
                "type": "SLA_ALERT",
                "priority": "HIGH",
                "description": "SLA de entregas está crítico. Analisar motivos de atraso.",
                "impact": "KPI Operacional"
            })
            
        # 3. Sobrecarga
        if carga_ponderada > 15:
            personal_actions.append({
                "type": "OVERLOAD",
                "priority": "MEDIUM",
                "description": "Carga ponderada acima de 15 pontos. Risco de queda na qualidade.",
                "impact": "Saúde do Analista"
            })
        
        return {
            "summary": {
                "implantador": implantador_name,
                "ativos": len(ativas),
                "programadas": len(programadas),
                "entregas_mes": len(concluidas_mes_list),
                "entregues_total": len(concluidas),
                "carga_ponderada": carga_ponderada,
                "mrr_ativo": mrr_ativo,
                "pct_sla_concluidas": round(pct_sla_concluidas, 1),
                "pct_sla_ativas": round(pct_sla_ativas, 1),
                "pct_retrabalho": round(pct_retrabalho, 1),
                "idle_medio": round(metrics_for_score["idle_medio"], 1),
                "tempo": {
                    "execucao_pct": exec_pct,
                    "espera_pct": wait_pct
                },
                "etapas": avg_etapas,
                "diagnostico_causas": causas_imp,
                "score": score,
                "meta_info": goal_metrics,
                "personal_actions": personal_actions
            },
            "carteira_atual": carteira_atual,
            "programadas": programadas_list,
            "concluidas_mes": concluidas_mes_list,
            "ativas": carteira_atual, # Retrocompatibilidade com Frontend
            "entregas": [s.to_dict() for s in concluidas], # Retrocompatibilidade com Frontend
            "last_ai_analysis": last_ai_analysis # Cache para Tela
        }




    @staticmethod
    def _classify_store_delay(store, carga_ponderada):
        if store.status_norm in ['DONE', 'CANCELED']:
            return "SEM_ATRASO"
            
        idle = store.idle_days or 0
        dias = store.dias_em_progresso or 0
        sla = store.tempo_contrato or 90
        
        if dias <= sla and idle <= 5:
            return "NO_PRAZO"
            
        status_lower = (store.status or "").lower()
        
        # 1. Cliente (Pausas formais, status explícito)
        if 'aguardando' in status_lower or 'inadimplente' in status_lower or 'cliente' in status_lower or len(store.pauses) > 0:
            return "CLIENTE"
            
        # 2. Carga (Analista com carga acima de 15 pontos)
        if carga_ponderada > 15:
            return "CARGA"
            
        # 3. Implantador (Idle alto, s/ justificativa formal)
        if idle > 7:
            return "IMPLANTADOR"
            
        # 4. Etapa (Restante - Demora natural do processo ou complexidade da etapa atual)
        return "ETAPA"

    @staticmethod
    def get_diagnostics():
        """
        Retorna o dashboard e agregados macro de causas do time (Aba 2).
        """
        # Regra V6: Diagnóstico foca apenas no que está ATIVO (Ignora programadas e canceladas/concluídas)
        all_potential = Store.query.filter(
            Store.status_norm != 'CANCELED', 
            Store.status_norm != 'DONE', 
            Store.created_at >= AnalystsReportService.CUTOFF_DATE
        ).all()
        stores = [s for s in all_potential if not s.is_scheduled]
        
        # Pré-calcular cargas por implantador para a heurística
        cargas = {}
        for s in stores:
            imp = s.implantador or 'Sem Dono'
            if imp not in cargas:
                cargas[imp] = 0
            cargas[imp] += 1.0 if (s.tipo_loja and s.tipo_loja.lower() == 'matriz') else 0.5
            
        causas = {
            "CLIENTE": 0,
            "IMPLANTADOR": 0,
            "CARGA": 0,
            "ETAPA": 0,
            "NO_PRAZO": 0
        }
        
        gargalos_etapa = {}
        
        for s in stores:
            imp = s.implantador or 'Sem Dono'
            carga = cargas.get(imp, 0)
            
            causa = AnalystsReportService._classify_store_delay(s, carga)
            if causa in causas:
                causas[causa] += 1
                
            if causa == "ETAPA":
                step_name = s.status or "Desconhecido"
                gargalos_etapa[step_name] = gargalos_etapa.get(step_name, 0) + 1
                
        # Format top gargalos
        top_gargalos = [{"etapa": k, "count": v} for k, v in gargalos_etapa.items()]
        top_gargalos.sort(key=lambda x: x['count'], reverse=True)
        
        return {
            "causas_distribuicao": causas,
            "top_gargalos_etapa": top_gargalos[:10],
            "total_analisado": len(stores)
        }

    @staticmethod
    def build_team_csv():
        import io
        import csv
        
        data = AnalystsReportService.get_team_resume()
        team_data = data.get("team", [])
        
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        
        # Header
        writer.writerow([
            "Implantador", "Carga Ponderada", "Lojas Ativas", "Matrizes", "Filiais", 
            "Entregas (30D)", "% SLA", "% Retrabalho", "Idle Medio", "Idle Criticos", "MRR Ativo"
        ])
        
        for item in team_data:
            writer.writerow([
                item.get('implantador', '-'),
                str(item.get('carga_ponderada', 0)).replace('.', ','),
                item.get('ativos', 0),
                item.get('matrizes_ativas', 0),
                item.get('filiais_ativas', 0),
                item.get('entregas_mes', 0),
                str(item.get('pct_sla_concluidas', 0)).replace('.', ','),
                str(item.get('pct_retrabalho', 0)).replace('.', ','),
                str(item['idle_medio']).replace('.', ','),
                item['idle_critico_count'],
                str(item['mrr_ativo']).replace('.', ',')
            ])
            
        return output.getvalue()

    @staticmethod
    def build_individual_csv(implantador_name):
        import io
        import csv
        
        data = AnalystsReportService.get_analyst_details(implantador_name)
        carteira = data.get("carteira_atual", [])
        
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        
        writer.writerow([
            "Loja", "Tipo", "Status", "Dias em Progresso", 
            "Tempo Contrato (SLA)", "Idle (Espera)", "MRR", "Retrabalho"
        ])
        
        for item in carteira:
            writer.writerow([
                item['name'],
                item['tipo_loja'],
                item['status_name'],
                item['dias_em_progresso'],
                item['tempo_contrato'],
                item['idle_days'],
                str(item['valor_mensalidade']).replace('.', ','),
                "SIM" if item['teve_retrabalho'] else "NAO"
            ])
            
        return output.getvalue()

    @staticmethod
    def generate_ai_analysis(implantador_name):
        """Gera análise consultiva via OpenAI (GPT-4o) para um implantador individual."""
        from app.services.llm_service import LLMService
        import json
        
        details = AnalystsReportService.get_analyst_details(implantador_name)
        summ = details.get("summary", {})
        ativas = details.get("ativas", [])
        
        lojas_criticas = sorted(ativas, key=lambda x: x.get('idle_days', 0), reverse=True)[:10]
        
        payload = {
            "implantador": implantador_name,
            "resumo": {
                "lojas_ativas": summ.get('ativos', 0),
                "lojas_concluidas_mes": summ.get('entregas_mes', 0),
                "percentual_sla": summ.get('pct_sla_concluidas', 0),
                "idle_medio": summ.get('idle_medio', 0),
                "lojas_idle_alto": len([s for s in ativas if (s.get('idle_days') or 0) > 7])
            },
            "carga": {
                "carga_ponderada": summ.get('carga_ponderada', 0),
                "mrr": summ.get('mrr_ativo', 0)
            },
            "tempo": {
                "tempo_execucao_percentual": summ.get('tempo', {}).get('exec_pct', 100),
                "tempo_espera_percentual": summ.get('tempo', {}).get('wait_pct', 0)
            },
            "qualidade": {
                "retrabalho_percentual": summ.get('pct_retrabalho', 0),
                "entrega_com_qualidade_percentual": summ.get('pct_qualidade', 100)
            },
            "etapas": summ.get('etapas', {}),
            "diagnostico_backend": summ.get('diagnostico_causas', {}),
            "lojas_criticas": [
                {
                    "nome": loja.get('name'),
                    "etapa": loja.get('status_name'),
                    "idle_dias": loja.get('idle_days'),
                    "tempo_total": loja.get('dias_em_progresso'),
                    "tempo_limite": loja.get('tempo_contrato'),
                    "contexto_verbal": {
                        "descricao": loja.get('description'),
                        "ultimos_comentarios": loja.get('last_comments'),
                        "observacoes_privadas": loja.get('observacoes')
                    },
                    "operacional": {
                        "qualidade_completa": loja.get('delivered_with_quality'),
                        "teve_retrabalho": loja.get('teve_retrabalho'),
                        "considerar_sla": loja.get('considerar_tempo_implantacao')
                    }
                } for loja in lojas_criticas
            ],
            "feed_comentarios_recentes": [
                s.last_comments for s in (Store.query.filter(Store.implantador == implantador_name, Store.status_norm != 'DONE').order_by(Store.idle_days.desc()).limit(5).all())
                if s.last_comments
            ]
        }


        prompt = f"""📋 OBJETIVO
A partir dos dados fornecidos, você deve:
- Identificar padrões de desempenho
- Detectar gargalos operacionais
- Separar causas dos problemas
- Sugerir ações práticas para o gestor

A sua análise deve permitir responder:
"Onde está o problema e o que eu faço com isso?"

⚠️ REGRAS CRÍTICAS
- NÃO faça julgamentos pessoais (ex: "bom", "ruim", "fraco")
- NÃO resuma os dados sem análise
- NÃO use linguagem vaga ou genérica
- NÃO invente hipóteses sem base nos dados
- NÃO repita métricas sem interpretar
- SEMPRE:
  * explique causas (não só sintomas)
  * conecte os dados entre si
  * destaque o que realmente importa
  * priorize clareza e objetividade

🧠 FOCO DA ANÁLISE
Você deve focar principalmente em:
- Cadência de execução (idle, movimentação)
- Distribuição de carga (volume vs capacidade)
- Risco da carteira
- Padrões de atraso
- Diferença entre tempo em espera vs execução
- Concentração de problemas em etapas específicas

🔍 DIAGNÓSTICO DE CAUSA (OBRIGATÓRIO)
Você deve classificar e explicar os problemas considerando:
- CLIENTE: espera, dependência externa, bloqueios
- EXECUÇÃO INTERNA: baixa cadência, idle sem justificativa
- CARGA: volume excessivo sob responsabilidade
- ETAPA: gargalo estrutural em fase específica
- CONTROLE OPERACIONAL: avalie as 'observacoes_privadas' e as flags de qualidade/retrabalho para entender o contexto real de cada loja.

Use os dados fornecidos (inclusive diagnóstico do backend, se houver).
Se houver ambiguidade, deixe claro.

DADOS PARA ANÁLISE (ANALISTA INDIVIDUAL):
{json.dumps(payload, indent=2)}

📊 ESTRUTURA DA RESPOSTA (JSON OBRIGATÓRIO)
{{
  "resumo_executivo": "1. Resumo Executivo: Explique em 3–5 linhas o cenário geral da operação do analista.",
  "padroes_identificados": ["Alta permanência de idle em lojas sem pausa formal", "Concentração de atrasos na etapa X", "..."],
  "diagnostico_causa": {{
      "cliente": "Explique se há impacto externo, espera ou dependências do cliente...",
      "execucao_interna": "Explique se há baixa cadência, idle sem justificativa ou ineficiência...",
      "carga": "Explique se o volume está acima da capacidade ou mal distribuído...",
      "etapa": "Identifique se há bloqueios em alguma fase específica do fluxo..."
  }},
  "gargalos_operacionais": ["Onde trava (ex: etapa específica, falta de avanço, acúmulo de risco)"],
  "riscos_identificados": ["Atraso de SLA", "Acúmulo de fila", "Queda de throughput", "MRR travado"],
  "acoes_recomendadas": ["Cobrar avanço em lojas sem movimentação", "Atuar nos clientes com alto tempo de espera", "..."],
  "auditoria_raio_x": {{
      "qualidade_documentacao": "Qualidade dos comentários no ClickUp baseada nos dados verbais.",
      "bloqueios_identificados": ["Lista de problemas específicos extraídos dos comentários"],
      "conformidade_etapas": "Se os produtos estão fluindo na cadência correta."
  }}
}}
Responda APENAS o JSON válido.
"""

        llm = LLMService()
        result = llm.call_openai_diagnostic(prompt)

        # Salvar em Memória de Longo Prazo para Auditoria e PDF
        try:
            from app.models import AILongTermMemory
            from app import db
            
            # Guardar como análise de perfil do implantador
            memory = AILongTermMemory(
                analysis_type="individual_diagnostic",
                query_prompt=f"Implantador: {implantador_name}",
                ai_response=json.dumps(result),
                context_snapshot=json.dumps(payload)
            )
            db.session.add(memory)
            db.session.commit()
        except Exception as mem_e:
            print(f"Erro ao salvar memória de IA: {mem_e}")

        return result



    @staticmethod
    def generate_team_ai_analysis():
        """
        JARVIS: Diagnóstico consultivo do time para o gestor.
        """
        import json
        from app.services.llm_service import LLMService
        
        cockpit_data = AnalystsReportService.get_team_cockpit()
        
        prompt = f"""
Você é o JARVIS, o copiloto de inteligência operacional da Instabuy.
Analise os dados do Cockpit e atue como um consultor estratégico de operações.

DADOS DO COCKPIT:
{json.dumps(cockpit_data, indent=2)}

Sua missão:
1. Identificar padrões de sobrecarga ou ociosidade.
2. Sugerir movimentos práticos de gestão (Xadrez Operacional).
3. Avaliar o clima de performance do time.

Sua saída DEVE ser um JSON:
{{
  "jarvis_briefing": "Breve resumo executivo",
  "insumos_decisao": [
      {{ "titulo": "...", "descricao": "...", "impacto": "Alto/Médio" }}
  ],
  "xadrez_operacional": ["ação 1", "ação 2"],
  "radar_de_risco": {{ "tecnico": "...", "financeiro": "...", "pessoas": "..." }},
  "frase_do_copiloto": "Frase de encerramento estilo Jarvis"

}}
Responda APENAS o JSON válido.
"""
        llm = LLMService()
        result = llm.call_openai_diagnostic(prompt, system_role="Você é o JARVIS, copiloto de operações.")
        return result

    @staticmethod
    def build_team_pdf():
        """Gera PDF executivo do time para apresentacao gerencial."""
        import io
        from fpdf import FPDF
        
        data = AnalystsReportService.get_team_resume()
        team = data.get("team", [])
        diagnostics = AnalystsReportService.get_diagnostics()
        causas = diagnostics.get("causas_distribuicao", {})
        total = diagnostics.get("total_analisado", 0)
        
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        # Title
        pdf.set_font("Helvetica", "B", 20)
        pdf.cell(0, 12, "Diagnostico Operacional do Time", ln=True, align="C")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(0, 8, f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="C")
        pdf.ln(8)
        
        # Visão Executiva JARVIS
        cockpit = AnalystsReportService.get_team_cockpit()
        summary = cockpit.get("summary", {})
        alerts = cockpit.get("alerts", [])
        
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(255, 102, 0) # Orange
        pdf.cell(0, 10, "Visao Executiva JARVIS", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(0, 0, 0)
        
        # Summary KPI line
        pdf.cell(0, 6, f"Saude do Time: {summary.get('team_health')} | SLA Medio: {summary.get('avg_sla')}% | Entregas Mes: {summary.get('total_entregues_mes')}", ln=True)
        pdf.ln(2)
        
        if alerts:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 8, "Alertas Criticos de Gestao:", ln=True)
            pdf.set_font("Helvetica", "", 9)
            for a in alerts:
                pdf.cell(0, 6, f"  [!] {a['msg']}", ln=True)
        pdf.ln(8)
        
        # Diagnostico de Causas
        
        labels = {
            "CLIENTE": "Cliente / Fator Externo",
            "IMPLANTADOR": "Analista / Fator Interno",
            "CARGA": "Sobrecarga de Trabalho",
            "ETAPA": "Demora Natural / Processo",
            "NO_PRAZO": "Em Fluxo Normal"
        }
        
        pdf.set_font("Helvetica", "", 10)
        for key, label in labels.items():
            val = causas.get(key, 0)
            pct = (val / total * 100) if total > 0 else 0
            pdf.cell(80, 7, f"  {label}:", 0, 0)
            pdf.cell(30, 7, f"{val} lojas ({pct:.0f}%)", 0, 1)
        
        pdf.ln(8)
        
        # Mesa Comparativa
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, "Mesa Comparativa do Time", ln=True)
        pdf.ln(2)
        
        # Table Header
        col_widths = [36, 16, 16, 16, 16, 16, 20, 20, 20, 22]
        headers = ["Implantador", "Carga", "Ativas", "Entr.Mes", "Idle", "Crit.", "SLA Ent.", "SLA Car.", "Retr.%", "MRR"]
        
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_fill_color(240, 240, 240)
        for i, h in enumerate(headers):
            pdf.cell(col_widths[i], 7, h, 1, 0, "C", True)
        pdf.ln()
        
        # Table Body
        pdf.set_font("Helvetica", "", 8)
        pdf.set_font("Helvetica", "", 7)
        for t in team:
            pdf.cell(col_widths[0], 6, str(t['implantador'])[:18], 1, 0)
            pdf.cell(col_widths[1], 6, f"{t['carga_ponderada']:.1f}", 1, 0, "C")
            pdf.cell(col_widths[2], 6, str(t['ativos']), 1, 0, "C")
            pdf.cell(col_widths[3], 6, str(t['entregas_mes']), 1, 0, "C")
            pdf.cell(col_widths[4], 6, f"{t['idle_medio']:.0f}d", 1, 0, "C")
            pdf.cell(col_widths[5], 6, str(t['idle_critico_count']), 1, 0, "C")
            pdf.cell(col_widths[6], 6, f"{t['pct_sla_concluidas']:.0f}%", 1, 0, "C")
            pdf.cell(col_widths[7], 6, f"{t['pct_sla_ativas']:.0f}%", 1, 0, "C")
            pdf.cell(col_widths[8], 6, f"{t['pct_retrabalho']:.0f}%", 1, 0, "C")
            pdf.cell(col_widths[9], 6, f"R${t['mrr_ativo']:.0f}", 1, 0, "R")
            pdf.ln()
        
        # Footer
        pdf.ln(10)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 6, "CRM Instabuy - Modulo de Diagnostico Gerencial", 0, 0, "C")
        
        output = io.BytesIO()
        pdf.output(output)
        output.seek(0)
        return output

    @staticmethod
    def build_individual_pdf(implantador_name):
        """Gera PDF executivo individual completo com Tabelas e Parecer de IA."""
        import io
        from fpdf import FPDF
        import json
        
        details = AnalystsReportService.get_analyst_details(implantador_name)
        summary = details.get("summary", {})
        carteira = details.get("carteira_atual", [])
        entregas_data = details.get("entregas", []) # Corrigido: Variável faltante

        
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        # --- CABEÇALHO ---
        pdf.set_font("Helvetica", "B", 18)
        pdf.cell(0, 12, f"Perfil Analitico: {implantador_name}", ln=True, align="C")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(0, 8, f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="C")
        pdf.ln(8)
        
        # --- KPIs ---
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 10, "Indicadores Principais", ln=True)
        pdf.set_font("Helvetica", "", 10)
        
        kpis = [
            ("Lojas Ativas", str(summary.get('ativos', 0))),
            ("Entregas (Mes Atual)", str(summary.get('entregas_mes', 0))),
            ("Entregas (Total 2026)", str(summary.get('entregues_total', 0))),
            ("Carga Ponderada", f"{summary.get('carga_ponderada', 0):.1f} pts"),
            ("MRR Ativo (Em Implante)", f"R$ {summary.get('mrr_ativo', 0):,.2f}"),
            ("% SLA Concluidas", f"{summary.get('pct_sla_concluidas', 0):.1f}%"),
            ("% SLA Ativas", f"{summary.get('pct_sla_ativas', 0):.1f}%"),
            ("% Retrabalho", f"{summary.get('pct_retrabalho', 0):.0f}%"),
        ]
        
        for label, val in kpis:
            pdf.cell(70, 7, f"  {label}:", 0, 0)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(60, 7, val, 0, 1)
            pdf.set_font("Helvetica", "", 10)
        
        pdf.ln(6)
        
        # --- TABELA: CARTEIRA ATIVA ---
        if carteira:
            pdf.set_font("Helvetica", "B", 13)
            pdf.cell(0, 10, f"Carteira Ativa ({len(carteira)} Projetos)", ln=True)
            pdf.ln(2)
            col_widths = [50, 18, 35, 20, 18, 25]
            headers = ["Loja", "Tipo", "Status", "Dias", "Idle", "MRR"]
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_fill_color(240, 240, 240)
            for i, h in enumerate(headers):
                pdf.cell(col_widths[i], 7, h, 1, 0, "C", True)
            pdf.ln()
            pdf.set_font("Helvetica", "", 7)
            for loja in carteira:
                pdf.cell(col_widths[0], 6, str(loja['name'])[:28], 1, 0)
                pdf.cell(col_widths[1], 6, str(loja.get('tipo_loja', '-'))[:10], 1, 0, "C")
                pdf.cell(col_widths[2], 6, str(loja.get('status_name', '-'))[:25], 1, 0)
                pdf.cell(col_widths[3], 6, f"{loja['dias_em_progresso']}d", 1, 0, "C")
                pdf.cell(col_widths[4], 6, f"{loja['idle_days']}d", 1, 0, "C")
                pdf.cell(col_widths[5], 6, f"R${loja.get('valor_mensalidade', 0) or 0:.0f}", 1, 0, "R")
                pdf.ln()
            pdf.ln(5)

        # --- TABELA: HISTÓRICO DE ENTREGAS (2026) ---
        if entregas_data:
            pdf.set_font("Helvetica", "B", 13)
            # pdf.add_page() # Opcional: quebrar página se necessário
            pdf.cell(0, 10, f"Historico de Entregas (Desde 2026) - {len(entregas_data)} Lojas", ln=True)
            pdf.ln(2)
            col_widths = [55, 20, 30, 30, 25, 30]
            headers = ["Loja", "Tipo", "Status", "Tempo", "Data", "MRR"]
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_fill_color(240, 255, 240) # Verde clarinho
            for i, h in enumerate(headers):
                pdf.cell(col_widths[i], 7, h, 1, 0, "C", True)
            pdf.ln()
            pdf.set_font("Helvetica", "", 7)
            for loja in entregas_data:
                pdf.cell(col_widths[0], 6, str(loja['name'])[:30], 1, 0)
                pdf.cell(col_widths[1], 6, str(loja.get('tipo_loja', '-')), 1, 0, "C")
                pdf.cell(col_widths[2], 6, str(loja.get('status_name', 'Concluido'))[:25], 1, 0)
                pdf.cell(col_widths[3], 6, f"{loja['dias_em_progresso']}d / {loja['tempo_contrato']}d", 1, 0, "C")
                pdf.cell(col_widths[4], 6, str(loja['finished_at'])[:10] if loja['finished_at'] else "-", 1, 0, "C")
                pdf.cell(col_widths[5], 6, f"R${loja.get('valor_mensalidade', 0) or 0:.0f}", 1, 0, "R")
                pdf.ln()
            pdf.ln(5)


        # --- PARECER COMPLETO DA IA (RAIO-X) ---
        try:
            from app.models import AILongTermMemory
            memory = AILongTermMemory.query.filter(
                AILongTermMemory.analysis_type == "individual_diagnostic",
                AILongTermMemory.query_prompt.ilike(f"%{implantador_name}%")
            ).order_by(AILongTermMemory.created_at.desc()).first()
            
            if memory:
                ai_data = json.loads(memory.ai_response)
                pdf.add_page()
                
                # Title IA
                pdf.set_font("Helvetica", "B", 16)
                pdf.set_text_color(0, 51, 102)
                pdf.cell(0, 12, "Parecer Detalhado da IA (Raio-X)", ln=True)
                pdf.ln(4)
                
                # 1. Resumo Executivo
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(0, 0, 0)
                pdf.cell(0, 8, "1. Resumo Executivo:", ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.multi_cell(0, 6, ai_data.get('resumo_executivo', '-'))
                pdf.ln(2)

                # 2. Padroes
                if ai_data.get('padroes_identificados'):
                    pdf.set_font("Helvetica", "B", 11)
                    pdf.cell(0, 8, "2. Principais Padroes Identificados:", ln=True)
                    pdf.set_font("Helvetica", "", 10)
                    for p in ai_data.get('padroes_identificados', []):
                        pdf.multi_cell(0, 6, f"  * {p}")
                    pdf.ln(2)

                # 3. Causas
                causa = ai_data.get('diagnostico_causa', {})
                if causa:
                    pdf.set_font("Helvetica", "B", 11)
                    pdf.cell(0, 8, "3. Diagnostico de Causa:", ln=True)
                    pdf.set_font("Helvetica", "", 10)
                    for k, v in causa.items():
                        pdf.set_font("Helvetica", "B", 9)
                        pdf.cell(0, 6, f"  {k.replace('_', ' ').upper()}:", ln=True)
                        pdf.set_font("Helvetica", "", 10)
                        pdf.multi_cell(0, 6, f"    {v}")
                    pdf.ln(2)

                # 4/5. Gargalos e Riscos
                pdf.set_font("Helvetica", "B", 11)
                pdf.cell(0, 8, "4. Gargalos e Riscos Criticos:", ln=True)
                pdf.set_font("Helvetica", "", 10)
                bullets = ai_data.get('gargalos_operacionais', []) + ai_data.get('riscos_identificados', [])
                for b in bullets:
                    pdf.multi_cell(0, 6, f"  ! {b}")
                pdf.ln(2)

                # ClickUp Audit
                raio_x = ai_data.get('auditoria_raio_x', {})
                if raio_x:
                    pdf.set_font("Helvetica", "B", 11)
                    pdf.set_text_color(102, 51, 0)
                    pdf.cell(0, 8, "Auditoria Qualitativa (Evidencias ClickUp):", ln=True)
                    pdf.set_font("Helvetica", "", 10)
                    pdf.set_text_color(0, 0, 0)
                    pdf.multi_cell(0, 6, f"DOCUMENTACAO: {raio_x.get('qualidade_documentacao', '-')}")
                    pdf.multi_cell(0, 6, f"CONFORMIDADE: {raio_x.get('conformidade_etapas', '-')}")
                    if raio_x.get('bloqueios_identificados'):
                        pdf.cell(0, 6, "  BLOQUEIOS:", ln=True)
                        for bl in raio_x.get('bloqueios_identificados', []):
                            pdf.multi_cell(0, 6, f"    - {bl}")
                    pdf.ln(2)

                # 6. Ações
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(153, 0, 0)
                pdf.cell(0, 8, "6. Plano de Acao Recomendado:", ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(0, 0, 0)
                for a in ai_data.get('acoes_recomendadas', []):
                    pdf.multi_cell(0, 6, f"  [ ] {a}")

        except Exception as pdf_ai_e:
            print(f"Erro ao incluir IA no PDF: {pdf_ai_e}")

        # Footer
        pdf.set_y(-15)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 10, f"CRM Instabuy v3.0 - Diagnostico Gerencial de {implantador_name}", 0, 0, "C")
        
        output = io.BytesIO()
        pdf.output(output)
        output.seek(0)
        return output


