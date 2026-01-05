from app.models import db, TaskStep, Store
from config import Config
from datetime import datetime
import statistics

class AnalysisService:
    def __init__(self):
        self.step_stats = {} # { 'TREINAMENTO': { 'avg': 5.0, 'std': 1.2 } }
        self.ensure_stats_loaded()

    def ensure_stats_loaded(self):
        """
        Carrega dados históricos para calcular médias para cada tipo de etapa.
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
            if len(values) < 3:
                # Dados insuficientes, assumir padrão ou pular
                avg = sum(values)/len(values) if values else 5.0
                std = 0.0
            else:
                avg = statistics.mean(values)
                std = statistics.stdev(values)
                
            self.step_stats[name] = {
                'avg': avg,
                'std': std,
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
            stats = self.step_stats.get(step_name, {'avg': 5.0, 'std': 1.0})
            avg_duration = stats['avg']
            
            # Check if store has this step
            current_step = store_steps_map.get(step_name)
            
            if current_step and current_step.end_real_at:
                # Already done, 0 remaining
                step_contribution = 0
                status = "DONE"
            elif current_step and current_step.start_real_at:
                # Em andamento
                # Restante = Média - TempoGastoAteAgora
                # Se TempoGasto > Média, assumimos que terminará "em breve" mas é arriscado.
                # Digamos que o mínimo restante é 1 dia.                
                elapsed = (datetime.utcnow() - current_step.start_real_at).days
                
                # If idle for too long, add penalty
                idle_penalty = 0
                if current_step.idle_days and current_step.idle_days > 5:
                    idle_penalty = current_step.idle_days * 0.5
                
                base_remaining = max(1, avg_duration - elapsed)
                step_contribution = base_remaining + idle_penalty
                status = "IN_PROGRESS"
            else:
                # Not started yet
                step_contribution = avg_duration
                status = "TODO"
            
            remaining_days += step_contribution
            details.append({
                "step": step_name,
                "status": status,
                "contribution": round(step_contribution, 1)
            })

        # Calcular Previsão
        from datetime import timedelta
        predicted_date = datetime.utcnow() + timedelta(days=remaining_days)
        
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
            "contract_due": contract_due_date.strftime('%Y-%m-%d'),
            "remaining_days_predicted": round(remaining_days, 1),
            "days_late_predicted": round(days_late, 1),
            "risk_level": risk_level,
            "breakdown": details
        }
