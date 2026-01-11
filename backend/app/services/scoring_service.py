from app.models import db, Store
from app.constants.scoring_constants import (
    RISK_WEIGHTS, RISK_PRAZO_THRESHOLDS, RISK_IDLE_THRESHOLDS,
    RISK_FINANCEIRO_SCORES, RISK_QUALIDADE_SCORES, RISK_LEVELS,
    PERFORMANCE_WEIGHTS, OP_WEIGHTS, SLA_DEFAULT_DAYS, 
    MIN_DELIVERIES_FOR_RANKING, LOAD_LEVELS, DEFAULT_CAPACITY_POINTS
)
import collections
from datetime import datetime

class ScoringService:
    @staticmethod
    def calculate_risk_score(store):
        """
        Calcula o Score de Risco da Loja (0-100) e fornece dicas de melhoria.
        """
        # 0. Cálculo Preliminar de Predição (Necessário para ajustar R_PRAZO)
        days_late_predicted = 0
        due_date = store.data_previsao_implantacao
        if due_date:
            if store.effective_finished_at:
                days_late_predicted = (store.effective_finished_at - due_date).days
            else:
                days_late_predicted = (datetime.now() - due_date).days
        if days_late_predicted < 0: days_late_predicted = 0

        # 1. R_PRAZO
        r_prazo = 0
        days_progress = store.dias_em_progresso or 0
        contract_days = store.tempo_contrato or SLA_DEFAULT_DAYS
        progress_ratio = days_progress / contract_days if contract_days > 0 else 1.5
        
        for limit, score in RISK_PRAZO_THRESHOLDS:
            if progress_ratio < limit:
                r_prazo = score
                break
        
        # Override R_PRAZO com base na predição (Se atraso for real/iminente)
        if days_late_predicted > 30:
            r_prazo = 100 # Crítico Garantido
        elif days_late_predicted > 15:
            r_prazo = max(r_prazo, 85) # Alto Risco
        elif days_late_predicted > 7:
            r_prazo = max(r_prazo, 60) # Atenção

        # 2. R_IDLE
        r_idle = 0
        idle_days = store.idle_days or 0
        for limit, score in RISK_IDLE_THRESHOLDS:
            if idle_days <= limit:
                r_idle = score
                break
                
        # 3. R_FINANCEIRO
        r_financeiro = 0
        fin_status = (store.financeiro_status or 'EM_DIA').upper().replace(' ', '_')
        
        # Mapeamento Flexível
        if 'DEVENDO' in fin_status or 'INADIMPLENTE' in fin_status:
            r_financeiro = RISK_FINANCEIRO_SCORES['DEVENDO']
            if store.status_norm == 'DONE':
                r_financeiro = RISK_FINANCEIRO_SCORES['DEVENDO_DONE']
        elif 'PENDENTE' in fin_status or 'NAO_PAGA' in fin_status:
            r_financeiro = RISK_FINANCEIRO_SCORES['PENDENTE']
        else:
            r_financeiro = 0

        # Data Quality Check (Se vazio e não mapeado como Ok, alerta?) - Por enquanto assume 0
        
        # 4. R_QUALIDADE
        r_qualidade = 0
        if store.teve_retrabalho:
            r_qualidade = RISK_QUALIDADE_SCORES['COM_RETRABALHO']
            
        # Cálculo Final Ponderado
        total_score = (
            (r_prazo * RISK_WEIGHTS['PRAZO']) +
            (r_idle * RISK_WEIGHTS['IDLE']) +
            (r_financeiro * RISK_WEIGHTS['FINANCEIRO']) +
            (r_qualidade * RISK_WEIGHTS['QUALIDADE'])
        )
        total_score = round(total_score, 1)
        
        # Classificação Visual (Regra Base)
        risk_level = 'SAUDAVEL' # Default
        for level, (min_v, max_v) in RISK_LEVELS.items():
            if min_v <= total_score <= max_v:
                risk_level = level
                break
        
        # --- Lógica de Risco IA (Qualitativo & Preditivo) ---
        ai_risk_level = risk_level
        ai_boost = 0
        
        # Calcular atraso estimado (Proxy de IA Simples)
        days_late_predicted = 0
        due_date = store.data_previsao_implantacao
        if due_date:
            if store.effective_finished_at:
                days_late_predicted = (store.effective_finished_at - due_date).days
            else:
                days_late_predicted = (datetime.now() - due_date).days
        
        if days_late_predicted < 0: days_late_predicted = 0
        
        # Se houver predição de atraso significativo, o risco IA sobe
        if days_late_predicted > 0:
            ai_boost += days_late_predicted * 2 # Boost de prioridade
            
            if days_late_predicted > 14:
                ai_risk_level = 'CRITICO'
            elif days_late_predicted > 7 and ai_risk_level != 'CRITICO':
                ai_risk_level = 'ALTO'
            elif ai_risk_level == 'SAUDAVEL':
                ai_risk_level = 'ATENCAO'

        # Boost por falta de atualização (Idle)
        if r_idle > 0:
            ai_boost += r_idle * 0.5

        # Gerar Dicas "Como Melhorar"
        hints = []
        if r_idle > 25:
            hints.append("Mova o card ou comente no ClickUp para zerar o Idle.")
        if r_financeiro > 0:
            hints.append("Verifique a pendência financeira com o cliente.")
        if r_qualidade > 0:
            hints.append("Aprenda com o retrabalho para evitar na próxima.")
        if r_prazo > 60:
            hints.append("Acelere etapas críticas para compensar o atraso.")
        if days_late_predicted > 5:
             hints.append(f"IA prevê +{int(days_late_predicted)} dias de atraso. Revise o cronograma.")
            
        return {
            "total": total_score,
            "level": risk_level,
            "ai_risk_level": ai_risk_level,
            "ai_boost": round(ai_boost, 1),
            "hints": hints,
            "breakdown": {
                "prazo": {"score": r_prazo, "value": f"{int(progress_ratio*100)}%"},
                "idle": {"score": r_idle, "value": f"{idle_days}d"},
                "financeiro": {"score": r_financeiro, "value": store.financeiro_status or "N/A"},
                "qualidade": {"score": r_qualidade, "value": "Sim" if store.teve_retrabalho else "Não"}
            }
        }

    @staticmethod
    def get_performance_ranking(start_date=None, end_date=None):
        """
        Gera Ranking de Performance dos Implantadores.
        Performance = (Vol*0.4) + (OTD*0.3) + (Qual*0.2) + (Eff*0.1)
        Inclui contagem de WIP e Flags de Qualidade de Dados.
        """
        # Buscar Lojas Concluídas no Período (DONE)
        query_done = db.session.query(Store).filter(
            (Store.status_norm == 'DONE') | (Store.manual_finished_at.isnot(None))
        )
        if start_date:
            query_done = query_done.filter(
                ((Store.manual_finished_at >= start_date) | 
                 (Store.manual_finished_at.is_(None) & (Store.finished_at >= start_date)))
            )
        if end_date:
            query_done = query_done.filter(
                ((Store.manual_finished_at <= end_date) | 
                 (Store.manual_finished_at.is_(None) & (Store.finished_at <= end_date)))
            )
        stores_done = query_done.all()
        
        # Buscar Lojas em Andamento (WIP) - Snapshot atual
        stores_wip = db.session.query(Store).filter(Store.status_norm == 'IN_PROGRESS').all()
        
        # Estrutura de Stats
        stats = collections.defaultdict(lambda: {
            'weighted_vol': 0.0, 'raw_vol': 0, 
            'on_time': 0, 'rework': 0, 'total_days': 0,
            'wip': 0,
            'missing_financial': 0, 'missing_rework': 0
        })

        global_days_sum = 0
        global_count = 0

        # Processar WIP (Apenas contagem e Data Quality)
        for s in stores_wip:
            if not s.implantador: continue
            stats[s.implantador]['wip'] += 1
            
            # Data Quality Check (WIP também importa)
            if not s.financeiro_status and s.tempo_contrato and s.dias_em_transito > 15: # Só flag se já correu tempo
                stats[s.implantador]['missing_financial'] += 1

        # Processar DONE (Score + Data Quality)
        for s in stores_done:
            if not s.implantador: continue
            imp = s.implantador
            
            # Volume Ponderado
            w = OP_WEIGHTS['MATRIZ'] if s.tipo_loja == 'Matriz' else OP_WEIGHTS['FILIAL']
            stats[imp]['weighted_vol'] += w
            stats[imp]['raw_vol'] += 1
            
            # Qualidade (Flag de Retrabalho Explícito ou Vazio?)
            # Assumimos que se 'teve_retrabalho' é False, está OK.
            # Mas se quisermos flagar dados faltantes, precisaríamos saber se foi preenchido.
            if s.teve_retrabalho: stats[imp]['rework'] += 1
            
            # Data Quality Check (DONE)
            if not s.financeiro_status:
                stats[imp]['missing_financial'] += 1
            
            # Tempo e OTD
            end = s.manual_finished_at or s.end_real_at or s.finished_at
            start = s.start_real_at or s.created_at
            if start and end:
                days = (end - start).days
                if days < 0: days = 0
                
                stats[imp]['total_days'] += days
                global_days_sum += days
                global_count += 1
                
                contract = s.tempo_contrato or SLA_DEFAULT_DAYS
                if days <= contract:
                    stats[imp]['on_time'] += 1

        # Média Global (para Eficiência)
        global_avg_days = global_days_sum / global_count if global_count > 0 else SLA_DEFAULT_DAYS

        # Calcular Scores Finais
        ranking = []
        max_vol = 0
        for imp in stats:
            if stats[imp]['weighted_vol'] > max_vol:
                max_vol = stats[imp]['weighted_vol']
        if max_vol == 0: max_vol = 1

        for imp, data in stats.items():
            count = data['raw_vol']
            
            # Se não tem entregas, score é 0, mas mostramos WIP
            if count == 0:
                ranking.append({
                    "implantador": imp,
                    "score": 0,
                    "points": 0,
                    "done": 0,
                    "wip": data['wip'],
                    "otd_percentage": 0,
                    "avg_cycle_time": 0,
                    "volume_weighted": 0,
                    "quality_score": 0,
                    "breakdown": {},
                    "data_quality_flags": {
                        "missing_financial": data['missing_financial'],
                        "missing_rework": data['missing_rework']
                    }
                })
                continue

            # 1. Volume Score (0-100)
            vol_score = (data['weighted_vol'] / max_vol) * 100
            
            # 2. OTD Score (0-100)
            otd_pct = (data['on_time'] / count) * 100
            
            # 3. Qualidade Score (0-100)
            rework_pct = (data['rework'] / count) * 100
            qual_score = 100 - rework_pct
            
            # 4. Eficiência Score (0-100)
            avg_days = data['total_days'] / count
            eff_score = 100
            if avg_days > global_avg_days * 1.2:
                eff_score = 40
            elif avg_days > global_avg_days:
                eff_score = 70
            
            # Fórmula Final
            final_score = (
                (vol_score * PERFORMANCE_WEIGHTS['VOLUME']) +
                (otd_pct * PERFORMANCE_WEIGHTS['OTD']) +
                (qual_score * PERFORMANCE_WEIGHTS['QUALIDADE']) +
                (eff_score * PERFORMANCE_WEIGHTS['EFICIENCIA'])
            )
            
            ranking.append({
                "implantador": imp,
                "score": round(final_score, 1),
                "points": round(final_score, 1), # Usando mesmo valor por enquanto, ou usar weighted_vol
                "done": count,
                "wip": data['wip'],
                "otd_percentage": round(otd_pct, 1),
                "avg_cycle_time": round(avg_days, 1),
                "volume_weighted": round(data['weighted_vol'], 1),
                "quality_score": round(qual_score, 1),
                "breakdown": {
                    "volume": {"score": round(vol_score, 1), "value": round(data['weighted_vol'], 1)},
                    "otd": {"score": round(otd_pct, 1), "value": f"{otd_pct:.0f}%"},
                    "quality": {"score": round(qual_score, 1), "value": f"{rework_pct:.0f}% Retrabalho"},
                    "efficiency": {"score": eff_score, "value": f"{int(avg_days)}d (Global {int(global_avg_days)}d)"}
                },
                "data_quality_flags": {
                    "missing_financial": data['missing_financial'],
                    "missing_rework": data['missing_rework']
                }
            })
            
        return sorted(ranking, key=lambda x: x['score'], reverse=True)

    @staticmethod
    def get_team_capacity():
        """
        Calcula Carga de Trabalho (Team Load).
        Mostra quem está com 'prato cheio' baseado em lojas ativas.
        """
        active_stores = Store.query.filter(
            Store.status_norm == 'IN_PROGRESS',
            Store.manual_finished_at.is_(None),
            Store.implantador.isnot(None)
        ).all()
        
        load_map = collections.defaultdict(float)
        count_map = collections.defaultdict(int)
        
        for s in active_stores:
            imp = s.implantador
            w = OP_WEIGHTS['MATRIZ'] if s.tipo_loja == 'Matriz' else OP_WEIGHTS['FILIAL']
            load_map[imp] += w
            count_map[imp] += 1
            
        result = []
        for imp, points in load_map.items():
            utilization = (points / DEFAULT_CAPACITY_POINTS) * 100
            
            # Mapeamento de Nível (Frontend expects English keys usually, or we adapt)
            # Frontend: 'NORMAL' | 'HIGH' | 'CRITICAL' | 'LOW'
            risk_level = 'LOW'
            if utilization >= LOAD_LEVELS['CRITICO']: risk_level = 'CRITICAL'
            elif utilization >= LOAD_LEVELS['ALTO']: risk_level = 'HIGH'
            elif utilization >= LOAD_LEVELS['BAIXO']: risk_level = 'NORMAL'
            
            # Redes Ativas
            networks = list(set([s.rede for s in active_stores if s.implantador == imp and s.rede]))
            
            result.append({
                "implantador": imp,
                "current_points": round(points, 1), # Frontend expects current_points
                "load_points": round(points, 1),
                "max_points": DEFAULT_CAPACITY_POINTS,
                "store_count": count_map[imp],
                "utilization_pct": round(utilization, 1),
                "risk_level": risk_level,
                "level": risk_level, # Alias
                "active_networks": networks[:3] # Top 3 only to avoid bloat
            })
            
        return sorted(result, key=lambda x: x['utilization_pct'], reverse=True)
