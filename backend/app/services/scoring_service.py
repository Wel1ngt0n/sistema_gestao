
class ScoringService:
    @staticmethod
    def calculate_risk_score(store):
        """
        Calcula o Score de Risco Matemático (0-100) baseado em 4 pilares:
        - Prazo (45%)
        - Idle/Ociosidade (25%)
        - Financeiro (20%)
        - Qualidade (10%)
        """
        
        # 1. R_PRAZO: Risco de Estouro de SLA
        # Base: dias_em_progresso / tempo_contrato
        r_prazo = 0
        days_progress = store.dias_em_progresso or 0
        contract_days = store.tempo_contrato or 90
        
        progress_ratio = days_progress / contract_days if contract_days > 0 else 1.5
        
        if progress_ratio < 0.60:
            r_prazo = 10
        elif progress_ratio < 0.80:
            r_prazo = 30
        elif progress_ratio < 1.00:
            r_prazo = 60
        elif progress_ratio < 1.20:
            r_prazo = 85
        else:
            r_prazo = 100
            
        # 2. R_IDLE: Risco de Ociosidade
        r_idle = 0
        idle_days = store.idle_days or 0
        
        if idle_days <= 2:
            r_idle = 0
        elif idle_days <= 5:
            r_idle = 25
        elif idle_days <= 10:
            r_idle = 60
        elif idle_days <= 20:
            r_idle = 85
        else:
            r_idle = 100
            
        # Multiplicadores de Ociosidade (Regra do Cliente/Terceiro) - Futuro
        # Por enquanto, mantemos x1.0 pois não temos o campo 'idle_reason' mapeado ainda
        
        # 3. R_FINANCEIRO: Risco de Inadimplência
        r_financeiro = 0
        fin_status = store.financeiro_status or 'EM_DIA'
        
        if fin_status == 'EM_DIA' or fin_status == 'Pago':
            r_financeiro = 0
        elif fin_status == 'NAO_PAGA_AINDA': # Pending
            r_financeiro = 20
        elif 'Devendo' in fin_status:
            r_financeiro = 70
            # Se já concluiu e está devendo, é gravíssimo
            if store.status_norm == 'DONE':
                r_financeiro = 90
                
        # 4. R_QUALIDADE: Risco Técnico
        r_qualidade = 0
        if store.teve_retrabalho:
            r_qualidade = 60
        
        if store.delivered_with_quality:
            r_qualidade = 0 # Zera se foi marcado entregue com qualidade explicitamente
            
        # Composição Final (Normalizada)
        total_score = (
            (r_prazo * 0.45) +
            (r_idle * 0.25) +
            (r_financeiro * 0.20) +
            (r_qualidade * 0.10)
        )
        
        # Arredondar
        total_score = round(total_score, 1)
        
        # Classificação Visual
        risk_level = 'LOW'
        if total_score >= 75: risk_level = 'CRITICAL'
        elif total_score >= 50: risk_level = 'HIGH'
        elif total_score >= 25: risk_level = 'MEDIUM'
        
        return {
            "total": total_score,
            "level": risk_level,
            "breakdown": {
                "prazo": r_prazo,
                "idle": r_idle,
                "financeiro": r_financeiro,
                "qualidade": r_qualidade
            }
        }
