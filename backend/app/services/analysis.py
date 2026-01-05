from app.models import db, TaskStep, Store
from config import Config
from datetime import datetime
from datetime import datetime, timedelta
import statistics
import numpy as np # Se nao tiver numpy, fazemos manual com statistics.quantiles

class AnalysisService:
    def __init__(self):
        self.step_stats = {} # { 'TREINAMENTO': { 'avg': 5.0, 'std': 1.2 } }
        self.ensure_stats_loaded()

    def ensure_stats_loaded(self):
        """
        Carrega dados históricos, remove outliers e calcula estatísticas ajustadas.
        """
        # We only look at closed steps for training
        steps = TaskStep.query.filter(TaskStep.total_time_days > 0).all()
        
        # Group by list name
        grouped = {}
        for s in steps:
            if not s.step_list_name: continue
            if s.step_list_name not in grouped: grouped[s.step_list_name] = []
            grouped[s.step_list_name].append(s.total_time_days)
            
        # Calcular estatísticas
        for name, values in grouped.items():
            if len(values) < 5:
                # Dados insuficientes, fallback seguro
                avg = sum(values)/len(values) if values else 5.0
                std = 0.0
                p50, p75 = avg, avg * 1.2
            else:
                # 1. Filtro de Outliers (IQR Method ou 2*STD)
                # Vamos usar corte simples: remover quem for > 2x a média inicial se a média for alta
                # Ou usar quantiles
                try:
                    quantiles = statistics.quantiles(values, n=4)
                    q1 = quantiles[0]
                    q3 = quantiles[2]
                    iqr = q3 - q1
                    upper_bound = q3 + (1.5 * iqr)
                    
                    # Filtered values
                    clean_values = [v for v in values if v <= upper_bound]
                    if not clean_values: clean_values = values # Fallback
                    
                    avg = statistics.mean(clean_values)
                    std = statistics.stdev(clean_values) if len(clean_values) > 1 else 0
                    
                    # Recalcular quantiles nos dados limpos para P50/P75
                    clean_quantiles = statistics.quantiles(clean_values, n=4)
                    p50 = clean_quantiles[1] # Median
                    p75 = clean_quantiles[2]
                except:
                   # Fallback se statistics.quantiles falhar (py < 3.8) ou erro math
                   avg = statistics.mean(values)
                   std = statistics.stdev(values) if len(values) > 1 else 0
                   p50 = avg
                   p75 = avg + std
                
            self.step_stats[name] = {
                'avg': avg,
                'std': std,
                'p50': p50,
                'p75': p75,
                'count': len(values)
            }

    def predict_store_completion(self, store_id):
        """
        Prevê a data de conclusão e o perfil de risco para uma loja.
        """
        store = Store.query.get(store_id)
        if not store: return None
        if store.effective_finished_at: 
            return {
                "is_concluded": True,
                "predicted_date": store.effective_finished_at.strftime('%Y-%m-%d'),
                "risk_level": "LOW",
                "days_late_predicted": 0
            }

        # Refresh stats just in case (or rely on cached self.step_stats)
        if not self.step_stats: self.ensure_stats_loaded()

        remaining_days = 0
        details = []

        # Definição Padrão do Processo (Pode ser ajustada)
        # Assumimos que todas as listas configuradas em Config são 'fases'
        required_steps = Config.LIST_IDS_STEPS.keys()

        # Build map of current store steps
        store_steps_map = { s.step_list_name: s for s in store.steps }

        for step_name in required_steps:
            stats = self.step_stats.get(step_name, {'avg': 5.0, 'std': 1.0, 'p50': 5.0, 'p75': 6.0})
            
            # Check if store has this step
            current_step = store_steps_map.get(step_name)
            
            # Determine Status
            status = "TODO"
            if current_step:
                if current_step.end_real_at: status = "DONE"
                elif current_step.start_real_at: status = "IN_PROGRESS"

            # Ajuste de Previsão baseado em Faixa (P50 vs P75)
            # Para P50 (Realista/Otimista) usamos a mediana ou média ajustada
            contribution_p50 = stats.get('p50', stats['avg'])
            # Para P75 (Conservador) usamos o 3º quartil
            contribution_p75 = stats.get('p75', stats['avg'] * 1.2)
            
            # Se já começou, descontamos o decorrido, mas respeitando um mínimo restante
            elapsed = 0
            if current_step and current_step.start_real_at and not current_step.end_real_at:
                 elapsed = (datetime.utcnow() - current_step.start_real_at).days
            elif current_step and current_step.end_real_at:
                 # Já acabou, contribuição zero para o futuro
                 contribution_p50 = 0
                 contribution_p75 = 0
            
            # Idle Penalty apenas se ainda não acabou
            idle_penalty = 0
            if contribution_p50 > 0 and current_step and current_step.idle_days and current_step.idle_days > 5:
                 idle_penalty = current_step.idle_days * 0.5

            remaining_p50 = max(0, contribution_p50 - elapsed) + idle_penalty
            remaining_p75 = max(0, contribution_p75 - elapsed) + idle_penalty
            
            # Se já começou e o tempo decorrido > previsto, assumimos 1 ou 2 dias min
            if contribution_p50 > 0 and remaining_p50 < 1: remaining_p50 = 1
            if contribution_p75 > 0 and remaining_p75 < 2: remaining_p75 = 2.5
            
            details.append({
                "step": step_name,
                "status": status,
                "contribution_p50": round(remaining_p50, 1),
                "contribution_p75": round(remaining_p75, 1)
            })
            
        # Totalizar
        total_rem_p50 = sum(d['contribution_p50'] for d in details)
        total_rem_p75 = sum(d['contribution_p75'] for d in details)
        
        # Calcular Datas
        date_p50 = datetime.utcnow() + timedelta(days=total_rem_p50)
        date_p75 = datetime.utcnow() + timedelta(days=total_rem_p75)

        # Calcular Confiança da Previsão
        # Baseada na contagem de amostras da estatística
        # Se maioria dos steps teve count < 5 -> Baixa
        confidence = "HIGH"
        low_data_steps = sum(1 for d in details if self.step_stats.get(d['step'], {}).get('count', 0) < 10)
        if low_data_steps > len(details) / 2: confidence = "LOW"
        elif low_data_steps > 0: confidence = "MEDIUM"

        # Calcular Previsão
        # predicted_date = datetime.utcnow() + timedelta(days=remaining_days) # Old logic
        predicted_date = date_p50 # P50 is the main one
        
        # Calcular Risco contra Contrato
        contract_days = store.tempo_contrato or 90
        start_date = store.effective_started_at or datetime.utcnow()
        contract_due_date = start_date + timedelta(days=contract_days)
        
        days_late = (predicted_date - contract_due_date).days
        
        risk_level = "LOW"
        if days_late > 0: risk_level = "MEDIUM"
        if days_late > 15: risk_level = "HIGH"
        if days_late > 30: risk_level = "CRITICAL"

        return {
            "predicted_date": predicted_date.strftime('%Y-%m-%d'),
            "predicted_date_p75": date_p75.strftime('%Y-%m-%d'), 
            "contract_due": contract_due_date.strftime('%Y-%m-%d'),
            "remaining_days_predicted": round(total_rem_p50, 1),
            "days_late_predicted": round(days_late, 1),
            "risk_level": risk_level,
            "confidence": confidence,
            "breakdown": details
        }
