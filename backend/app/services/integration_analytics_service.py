from app.models import db, Store, IntegrationMetric, TaskStep
from sqlalchemy import func, or_, and_, desc
from datetime import datetime
import collections
from dateutil.relativedelta import relativedelta
import pandas as pd
import io

class IntegrationAnalyticsService:
    @staticmethod
    def get_kpi_cards(start_date=None, end_date=None):
        """
        Calcula os 'Big Numbers' para o Dashboard de Integração.
        """
        # Universo de lojas (base de implantação)
        all_stores = Store.query.all()
        active_stores_global = [s for s in all_stores if not s.effective_finished_at and not s.is_scheduled]
        concluded_stores_global = [s for s in all_stores if s.effective_finished_at and s.effective_finished_at.year >= 2026]
        universe_stores = active_stores_global + concluded_stores_global
        
        store_ids = [s.id for s in universe_stores]
        
        # Filtros de data (baseado em end_date para concluídas)
        if start_date:
            pass # Implementar se necessário filtro global
            
        # Precisamos buscar métricas e TaskSteps para poder usar fallback
        metrics_query = IntegrationMetric.query.filter(IntegrationMetric.store_id.in_(store_ids)).all()
        metrics_by_store = {m.store_id: m for m in metrics_query}

        steps_query = TaskStep.query.filter(TaskStep.store_id.in_(store_ids), TaskStep.step_list_name == 'INTEGRACAO').all()
        steps_by_store = {step.store_id: step for step in steps_query}
        
        total_volume = len(universe_stores)
        ongoing = 0
        done = 0
        sla_ok = 0
        total_finished_sla = 0
        quality_ok = 0
        churn_risk_count = 0
        
        for s in universe_stores:
            m = metrics_by_store.get(s.id)
            step = steps_by_store.get(s.id)
            current_step_status = step.status if step else None

            # Lógica robusta de datas
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

            if eff_end_date:
                done += 1
                total_finished_sla += 1
                if eff_start_date:
                    days = (eff_end_date - eff_start_date).days
                    if days <= 60:
                        sla_ok += 1
                if m and m.post_go_live_bugs == 0:
                    quality_ok += 1
            else:
                ongoing += 1
                if m and m.churn_risk:
                    churn_risk_count += 1
                    
        sla_pct = (sla_ok / total_finished_sla * 100) if total_finished_sla > 0 else 100.0
        quality_pct = (quality_ok / done * 100) if done > 0 else 100.0

        return {
            "total_volume": total_volume,
            "ongoing": ongoing,
            "done": done,
            "sla_pct": round(sla_pct, 1),
            "quality_pct": round(quality_pct, 1),
            "churn_risk_count": churn_risk_count
        }

    @staticmethod
    def get_monthly_trends(months=6):
        """
        Retorna evolução mensal de Integrações Concluídas e Volume de Tickets (Bugs).
        """
        end_date_ref = datetime.now()
        start_date_ref = end_date_ref - relativedelta(months=months-1)
        
        # Inicializar meses
        current_cursor = start_date_ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        trends = collections.OrderedDict()
        
        for _ in range(months):
            key = current_cursor.strftime('%Y-%m')
            trends[key] = {
                'done_count': 0,
                'bugs_count': 0,
                'avg_lead_time': 0
            }
            current_cursor += relativedelta(months=1)
            
        # Buscar dados
        query_start = start_date_ref.replace(day=1)
        metrics = IntegrationMetric.query.filter(IntegrationMetric.end_date >= query_start).all()
        
        for m in metrics:
            if not m.end_date: continue
            key = m.end_date.strftime('%Y-%m')
            
            if key in trends:
                trends[key]['done_count'] += 1
                trends[key]['bugs_count'] += (m.post_go_live_bugs or 0)
                
                # Lead Time
                if m.start_date:
                    days = (m.end_date - m.start_date).days
                    # Acumular dias para média posterior
                    trends[key]['_sum_days'] = trends[key].get('_sum_days', 0) + days

        # Calcular Médias e Formatar
        result = []
        for key, data in trends.items():
            count = data['done_count']
            avg_time = 0
            if count > 0:
                avg_time = data.get('_sum_days', 0) / count
            
            result.append({
                "month": key,
                "done_count": count,
                "bugs_count": data['bugs_count'],
                "avg_lead_time": round(avg_time, 1)
            })
            
        return result

    @staticmethod
    def export_integration_excel():
        """
        Gera arquivo Excel com dados de todas as integrações.
        """
        metrics = IntegrationMetric.query.join(Store).all()
        
        data = []
        for m in metrics:
            data.append({
                "ID Loja": m.store.id,
                "Nome Loja": m.store.store_name,
                "Rede": m.store.rede,
                "Integrador": m.store.integrador,
                "Data Início": m.start_date.strftime('%d/%m/%Y') if m.start_date else None,
                "Data Fim": m.end_date.strftime('%d/%m/%Y') if m.end_date else None,
                "Status Doc": m.documentation_status,
                "Bugs Pós-Live": m.post_go_live_bugs,
                "Risco Churn": "SIM" if m.churn_risk else "NÃO",
                "Lead Time (Dias)": (m.end_date - m.start_date).days if (m.start_date and m.end_date) else None
            })
            
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Integrações')
            
        output.seek(0)
        return output
