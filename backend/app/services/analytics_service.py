from app.models import db, Store, TaskStep, MetricsSnapshot, MetricsSnapshotDaily, SystemConfig
from sqlalchemy import func, case, desc, and_, or_
from datetime import datetime, timedelta, date
import collections
from app.services.scoring_service import ScoringService

class AnalyticsService:
    @staticmethod
    def get_kpi_cards(start_date=None, end_date=None, implantador=None):
        """
        Calcula os 'Big Numbers' para o topo do dashboard.
        """
        query = db.session.query(Store)
        if implantador:
            query = query.filter(Store.implantador == implantador)
        
        # Filtros básicos de Data (considerando data_fim para concluídas)
        if start_date and end_date:
            # Para throughput, usamos finished_at
            pass 

        # 1. Throughput (Concluídas no período)
        # Lógica: status_norm = 'DONE' OU manual_finished_at preenchido
        throughput_query = query.filter(or_(Store.status_norm == 'DONE', Store.manual_finished_at.isnot(None)))
        if start_date:
            throughput_query = throughput_query.filter(
                or_(
                    and_(Store.manual_finished_at.isnot(None), Store.manual_finished_at >= start_date),
                    and_(Store.manual_finished_at.is_(None), Store.finished_at >= start_date)
                )
            )
        if end_date:
            throughput_query = throughput_query.filter(
                or_(
                    and_(Store.manual_finished_at.isnot(None), Store.manual_finished_at <= end_date),
                    and_(Store.manual_finished_at.is_(None), Store.finished_at <= end_date)
                )
            )
        
        throughput_count = throughput_query.count()
        
        # 2. WIP (Em Progresso Agora)
        wip_query = query.filter(Store.status_norm == 'IN_PROGRESS', Store.manual_finished_at.is_(None))
        wip_count = wip_query.count()
        
        # 3. Backlog MRR (Soma valor_mensalidade das WIP)
        # func.sum pode retornar None, então usamos `or 0`
        mrr_backlog_query = db.session.query(func.sum(Store.valor_mensalidade))\
            .filter(Store.status_norm == 'IN_PROGRESS', Store.manual_finished_at.is_(None))
        if implantador:
            mrr_backlog_query = mrr_backlog_query.filter(Store.implantador == implantador)
        mrr_backlog = mrr_backlog_query.scalar() or 0.0
        
        # 4. MRR Concluído no Período
        mrr_done = throughput_query.with_entities(func.sum(Store.valor_mensalidade)).scalar() or 0.0
        
        # 5. Cycle Time Médio (apenas das concluídas no período)
        # dias_em_progresso é property, então não dá pra agregar direto no SQL facilmente sem field calculado.
        # Mas podemos pegar dados brutos e calcular no python se o volume não for gigante,
        # OU (melhor) usar a diferença de datas no banco se possível.
        # Store tem start_real_at e end_real_at.
        
        cycle_time_avg = 0
        otd_percentage = 0
        
        # Para performance, vamos buscar apenas as colunas necessárias das concluídas
        done_stores = throughput_query.with_entities(
            Store.start_real_at, 
            Store.end_real_at, 
            Store.tempo_contrato,
            Store.created_at,
            Store.finished_at,
            Store.manual_finished_at
        ).all()
        
        if done_stores:
            total_days = 0
            on_time_count = 0
            
            for s in done_stores:
                # Resolver datas efetivas (igual na property do model)
                end = s.manual_finished_at or s.end_real_at or s.finished_at or datetime.now()
                start = s.start_real_at or s.created_at
                
                if start and end:
                    days = (end - start).days
                    total_days += max(0, days)
                    
                    # OTD Check
                    contract_days = s.tempo_contrato or 90
                    target_date = start + timedelta(days=contract_days)
                    if end <= target_date:
                        on_time_count += 1
            
            cycle_time_avg = round(total_days / len(done_stores), 1)
            otd_percentage = round((on_time_count / len(done_stores)) * 100, 1)

        # 6. Idle Stores (Lojas paradas > 5 dias, por exemplo)
        # Store.idle_days é coluna real? Sim, linha 53 models.py
        idle_stores_count = query.filter(
            Store.idle_days > 5, 
            Store.status_norm == 'IN_PROGRESS',
            Store.manual_finished_at.is_(None)
        ).count()
        
        # 7. Risco Médio (Calculado em Python pois não é coluna do banco)
        in_progress_stores = query.filter(
            Store.status_norm == 'IN_PROGRESS',
            Store.manual_finished_at.is_(None)
        ).all()
        # 7. Risco Médio (Calculado via ScoringService)
        in_progress_stores = query.filter(
            Store.status_norm == 'IN_PROGRESS',
            Store.manual_finished_at.is_(None)
        ).all()
        avg_risk = 0
        if in_progress_stores:
            total_risk = 0
            for s in in_progress_stores:
                risk_data = ScoringService.calculate_risk_score(s)
                total_risk += risk_data['total']
            avg_risk = round(total_risk / len(in_progress_stores), 1)

        # 8. Contagem Matriz vs Filial (WIP)
        matrix_count = query.filter(
            Store.status_norm == 'IN_PROGRESS',
            Store.manual_finished_at.is_(None),
            Store.tipo_loja == 'Matriz'
        ).count()
        
        filial_count = query.filter(
            Store.status_norm == 'IN_PROGRESS',
            Store.manual_finished_at.is_(None),
            Store.tipo_loja == 'Filial'
        ).count()

        # 9. Cálculo de Pontos (Entregues vs WIP)
        w_matriz = 1.0
        w_filial = 0.7
        try:
            cfg_m = SystemConfig.query.filter_by(key='weight_matriz').first()
            cfg_f = SystemConfig.query.filter_by(key='weight_filial').first()
            if cfg_m: w_matriz = float(cfg_m.value)
            if cfg_f: w_filial = float(cfg_f.value)
        except: pass

        total_points_done = 0
        done_types = throughput_query.with_entities(Store.tipo_loja).all()
        for s in done_types:
            total_points_done += w_matriz if s.tipo_loja == 'Matriz' else w_filial

        total_points_wip = 0
        wip_types = query.filter(Store.status_norm == 'IN_PROGRESS', Store.manual_finished_at.is_(None)).with_entities(Store.tipo_loja).all()
        for s in wip_types:
            total_points_wip += w_matriz if s.tipo_loja == 'Matriz' else w_filial

        return {
            "wip_stores": wip_count,
            "throughput_period": throughput_count,
            "mrr_backlog": float(mrr_backlog),
            "mrr_done_period": float(mrr_done),
            "cycle_time_avg": cycle_time_avg,
            "otd_percentage": otd_percentage,
            "idle_stores_count": idle_stores_count,
            "avg_risk_score": round(float(avg_risk), 1),
            "matrix_count": matrix_count,
            "filial_count": filial_count,
            "total_points_done": round(total_points_done, 1),
            "total_points_wip": round(total_points_wip, 1)
        }

    @staticmethod
    def get_monthly_trends(months=6, implantador=None):
        """
        Retorna evolução mensal de Throughput, OTD e Backlog.
        Agrupado por mês de conclusão.
        Garante que todos os meses do período sejam retornados, mesmo sem dados.
        """
        from dateutil.relativedelta import relativedelta

        # 1. Gerar lista de todos os meses do período (do mais antigo para o atual)
        # Vamos pegar até o mês atual inclusive
        end_date_ref = datetime.now()
        # Começamos (months - 1) meses atrás para ter total de 'months' pontos
        start_date_ref = end_date_ref - relativedelta(months=months-1)
        
        # Ajustar para o primeiro dia do mês inicial
        current_cursor = start_date_ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Dicionário base com todos os meses inicializados
        trends = collections.OrderedDict()
        
        # Loop para criar as chaves (YYYY-MM)
        for _ in range(months):
            key = current_cursor.strftime('%Y-%m')
            trends[key] = {
                'count': 0, 
                'total_days': 0, 
                'on_time': 0, 
                'total_points': 0.0, 
                'total_mrr': 0.0
            }
            current_cursor += relativedelta(months=1)

        # Data de corte para query (pode ser um pouco antes do primeiro dia do mês inicial para margem)
        query_start_date = start_date_ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # 2. Buscar lojas concluídas desde a data de corte
        finished_stores = db.session.query(Store).filter(
            or_(Store.status_norm == 'DONE', Store.manual_finished_at.isnot(None))
        )

        if implantador:
            finished_stores = finished_stores.filter(Store.implantador == implantador)
        
        finished_stores = finished_stores.filter(
            or_(
                and_(Store.manual_finished_at.isnot(None), Store.manual_finished_at >= query_start_date),
                and_(Store.manual_finished_at.is_(None), Store.status_norm == 'DONE', Store.finished_at >= query_start_date)
            )
        ).with_entities(
            Store.finished_at,
            Store.manual_finished_at,
            Store.end_real_at,
            Store.start_real_at,
            Store.created_at,
            Store.tempo_contrato,
            Store.tipo_loja,
            Store.valor_mensalidade
        ).all()
        
        # 3. Buscar Pesos
        w_matriz = 1.0
        w_filial = 0.7
        try:
            cfg_m = SystemConfig.query.filter_by(key='weight_matriz').first()
            cfg_f = SystemConfig.query.filter_by(key='weight_filial').first()
            if cfg_m: w_matriz = float(cfg_m.value)
            if cfg_f: w_filial = float(cfg_f.value)
        except: pass

        # 4. Popular dados
        for s in finished_stores:
            end = s.manual_finished_at or s.end_real_at or s.finished_at
            if not end: continue
            
            month_key = end.strftime('%Y-%m')
            
            # Se a loja caiu num mês que está no nosso range, contabiliza
            if month_key in trends:
                trends[month_key]['count'] += 1
                trends[month_key]['total_mrr'] += float(s.valor_mensalidade or 0)
                
                # Pontos
                weight = w_matriz if s.tipo_loja == 'Matriz' else w_filial
                trends[month_key]['total_points'] += weight
                
                # Cycle Time
                start = s.start_real_at or s.created_at
                if start:
                    days = (end - start).days
                    trends[month_key]['total_days'] += max(0, days)
                    
                    # OTD
                    contract = s.tempo_contrato or 90
                    if days <= contract:
                        trends[month_key]['on_time'] += 1

        # 5. Formatar para lista final
        result = []
        for key, data in trends.items():
            count = data['count']
            result.append({
                "month": key,
                "throughput": count,
                "total_points": round(data['total_points'], 1),
                "total_mrr": round(data['total_mrr'], 1),
                "cycle_time_avg": round(data['total_days'] / count, 1) if count > 0 else 0,
                "otd_percentage": round((data['on_time'] / count) * 100, 1) if count > 0 else 0
            })
            
        return result

    @staticmethod
    def get_performance_ranking(implantador=None):
        """
        Retorna métricas por implantador.
        """
        query = db.session.query(
            Store.implantador,
            Store.status_norm,
            Store.finished_at,
            Store.start_real_at,
            Store.created_at,
            Store.manual_finished_at,
            Store.end_real_at,
            Store.tempo_contrato,
            Store.valor_mensalidade,
            Store.teve_retrabalho,
            Store.tipo_loja
        ).filter(Store.implantador.isnot(None))

        if implantador:
            query = query.filter(Store.implantador == implantador)
            
        stores = query.all()
        
        # Buscar Pesos
        w_matriz = 1.0
        w_filial = 0.7
        try:
            cfg_m = SystemConfig.query.filter_by(key='weight_matriz').first()
            cfg_f = SystemConfig.query.filter_by(key='weight_filial').first()
            if cfg_m: w_matriz = float(cfg_m.value)
            if cfg_f: w_filial = float(cfg_f.value)
        except: pass

        ranking = collections.defaultdict(lambda: {
            'wip': 0, 'done': 0, 'total_days': 0, 'on_time': 0, 
            'mrr_done': 0, 'rework_count': 0, 'quality_count': 0,
            'points': 0.0
        })
        
        for s in stores:
            imp = s.implantador
            if not imp: continue
            
            # Pontuação (considerando Matriz vs Filial)
            weight = w_matriz if s.tipo_loja == 'Matriz' else w_filial

            if s.status_norm == 'IN_PROGRESS' and not s.manual_finished_at:
                ranking[imp]['wip'] += 1
            
            elif s.status_norm == 'DONE' or s.manual_finished_at:
                ranking[imp]['done'] += 1
                ranking[imp]['mrr_done'] += (s.valor_mensalidade or 0)
                ranking[imp]['points'] += weight
                
                # Qualidade
                if s.teve_retrabalho: ranking[imp]['rework_count'] += 1
                
                # Tempo
                end = s.manual_finished_at or s.end_real_at or s.finished_at
                start = s.start_real_at or s.created_at
                
                if start and end:
                    days = (end - start).days
                    ranking[imp]['total_days'] += max(0, days)
                    
                    contract = s.tempo_contrato or 90
                    if days <= contract:
                        ranking[imp]['on_time'] += 1

        # Calcular Média Global de Tempo (para normalização)
        global_avg_time = 90
        all_done_times = []
        for imp, data in ranking.items():
            if data['done'] > 0:
                all_done_times.append(data['total_days'] / data['done'])
        if all_done_times:
            global_avg_time = sum(all_done_times) / len(all_done_times)

        # Formatar lista
        final_list = []
        for imp, data in ranking.items():
            done = data['done']
            otd = 0
            avg_time = 0
            rework_pct = 0
            quality_pct = 0
            
            if done > 0:
                otd = round((data['on_time'] / done) * 100, 1)
                avg_time = round(data['total_days'] / done, 1)
                rework_pct = round((data['rework_count'] / done) * 100, 1)
                quality_pct = 100 - rework_pct 
            
            # Score de Performance Ponderado (Novo)
            # Score = 0.40 * Volume + 0.30 * OTD + 0.20 * Quality + 0.10 * Time
            
            # Normalizar Volume (ex: quem tem mais entregas ganha 100, outros proporcional)
            # Como não temos o max aqui fácil, vamos usar um cap razoável. 
            # Ou, melhor, manter o Volume como peso bruto mas limitado a 100 pontos?
            # O user pediu: 0.40 * Volume_Concluidas.
            # Se a pessoa entregar 100 lojas, 40 pontos. Se entregar 1, 0.4.
            # Parece pouco para baixo volume. Vamos assumir que Volume é normalizado pelo MAX do período.
            
            # Normalização de Tempo: Global / Individual (se individual < global -> >1 -> multiplica por 100)
            time_score = 0
            if avg_time > 0:
                time_score = min(100, (global_avg_time / avg_time) * 100)
            elif done > 0:
                time_score = 100 # Se tempo é 0 (impossível mas ok), é 100

            # Como não temos o MAX volume aqui, vamos calcular o score parcial e depois normalizar o volume na ordenação?
            # NÃO, vamos usar um sistema de pontos simples: Cada entrega vale 1 ponto no sub-score de volume, até max 100?
            # O user disse "0.40 * Volume_Concluidas". Vamos interpretar literalmente por enquanto, mas adicionando um fator.
            # Melhor: Normalizar pelo maior volume da lista atual.
            
            raw_score_components = {
                'volume': done,
                'otd': otd,
                'quality': quality_pct,
                'time_score': time_score
            }
            
            final_list.append({
                "implantador": imp,
                "wip": data['wip'],
                "done": done,
                "otd_percentage": otd,
                "avg_cycle_time": avg_time,
                "mrr_done": data['mrr_done'],
                "rework_percentage": rework_pct,
                "quality_percentage": quality_pct,
                "_raw_components": raw_score_components, # Temp para calculo final
                "points": round(data['points'], 1)
            })

        # Calcular Max Volume para normalização
        max_vol = 1
        for item in final_list:
            if item['_raw_components']['volume'] > max_vol:
                max_vol = item['_raw_components']['volume']
        
        # Calcular Score Final
        for item in final_list:
            comps = item['_raw_components']
            
            # Normalizar Volume (0-100)
            vol_norm = (comps['volume'] / max_vol) * 100
            
            # Fórmula Final
            final_score = (
                (vol_norm * 0.40) +
                (comps['otd'] * 0.30) +
                (comps['quality'] * 0.20) +
                (comps['time_score'] * 0.10)
            )
            item['score'] = round(final_score, 1)
            item['score'] = round(final_score, 1)
            item['breakdown'] = raw_score_components # Expose for UI
            # del item['_raw_components'] # Cleanup -> Now we keep it as breakdown

        return sorted(final_list, key=lambda x: x['score'], reverse=True)

    @staticmethod
    def get_implantador_details(implantador_name):
        """
        Retorna o detalhamento de todas as lojas que compõem a pontuação do implantador
        e o breakdown do Score Composto.
        """
        stores = Store.query.filter_by(implantador=implantador_name).all()
        
        # Buscar Pesos
        w_matriz = 1.0
        w_filial = 0.7
        try:
            from app.models import SystemConfig
            cfg_m = SystemConfig.query.filter_by(key='weight_matriz').first()
            cfg_f = SystemConfig.query.filter_by(key='weight_filial').first()
            if cfg_m: w_matriz = float(cfg_m.value)
            if cfg_f: w_filial = float(cfg_f.value)
        except: pass

        # Calcular Métricas Agregadas para o Score
        stats = {
            'wip': 0, 'done': 0, 'total_days': 0, 'on_time': 0, 
            'rework_count': 0, 'quality_count': 0,
            'points': 0.0
        }

        details = []
        for s in stores:
            is_done = s.status_norm == 'DONE' or s.manual_finished_at is not None
            weight = w_matriz if s.tipo_loja == 'Matriz' else w_filial
            
            # Motivos individuais
            reasons = []
            if s.teve_retrabalho: reasons.append("Retrabalho")
            
            # Tempo
            days = 0
            if is_done:
                end = s.manual_finished_at or s.end_real_at or s.finished_at
                start = s.start_real_at or s.created_at
                if start and end:
                    days = (end - start).days
                    contract = s.tempo_contrato or 90
                    if days <= contract: 
                        reasons.append("No Prazo")
                    else:
                        reasons.append(f"Atraso ({days-contract}d)")
            
            # Add stats
            if s.status_norm == 'IN_PROGRESS' and not s.manual_finished_at:
                stats['wip'] += 1
            elif is_done:
                stats['done'] += 1
                stats['points'] += weight
                if s.teve_retrabalho: stats['rework_count'] += 1
                stats['total_days'] += max(0, days)
                contract = s.tempo_contrato or 90
                if days <= contract: stats['on_time'] += 1

            details.append({
                "id": s.id,
                "name": s.store_name,
                "tipo": s.tipo_loja or 'Filial',
                "status": s.status,
                "is_done": is_done,
                "points": float(weight) if is_done else 0.0,
                "potential_points": float(weight) if not is_done else 0.0,
                "finished_at": (s.manual_finished_at or s.finished_at).strftime('%d/%m/%Y') if (s.manual_finished_at or s.finished_at) else None,
                "reasons": reasons # Motivos para o frontend
            })
            
        # Calcular Média Global de Tempo (para normalização)
        # Em vez de recalcular lógica diferente aqui, vamos buscar o Score Oficial do ScoringService
        # Isso garante consistência com o widget de Ranking.
        
        official_ranking = ScoringService.get_performance_ranking()
        implantador_stats = next((item for item in official_ranking if item['implantador'] == implantador_name), None)
        
        final_score = 0
        otd = 0
        time_score = 0
        volume_count = stats['done'] # Fallback
        
        if implantador_stats:
            final_score = implantador_stats['score']
            otd = implantador_stats['otd_percentage']
            
            # Tentar extrair componentes se disponíveis no breakdown
            if 'breakdown' in implantador_stats:
                bd = implantador_stats['breakdown']
                # 'efficiency' -> {score, value}. Score é a pontuação (0-100 * peso?). 
                # Se queremos exibir apenas o score bruto 0-100 de tempo, talvez seja melhor pegar avg_days?
                # O modal espera 'time_score'.
                if isinstance(bd.get('efficiency'), dict):
                    time_score = bd['efficiency'].get('score', 0)
                else:
                    time_score = 0
                
                # Para volume, mantemos stats['done'] (contagem), pois o breakdown traz info ponderada complexa
                volume_count = stats['done']

        # Recalcular variáveis auxiliares para Gamificação
        done = stats['done']
        rework_pct = round((stats['rework_count'] / done) * 100, 1) if done > 0 else 0
        quality_pct = 100 - rework_pct
        
        # CALCULAR IMPACTO POR LOJA (GAMIFICAÇÃO)
        # Distribuir os pontos ganhos de volta para as lojas
        unit_otd = 30.0 / done if done > 0 else 0
        unit_qual = 20.0 / done if done > 0 else 0
        unit_vol = 0.8 # 2 pts * 0.40
        
        # Atualizar details com o impacto calculado
        for d in details:
            impact = 0.0
            impact_breakdown = []
            
            if d['is_done']:
                # Volume (Sempre ganha)
                impact += unit_vol
                impact_breakdown.append(f"Vol: +{unit_vol:.1f}")
                
                # OTD (Se estiver nos motivos 'No Prazo')
                if "No Prazo" in d['reasons']:
                    impact += unit_otd
                    impact_breakdown.append(f"OTD: +{unit_otd:.1f}")
                else:
                    impact_breakdown.append(f"OTD: -{unit_otd:.1f}") # Mostra perda
                    
                # Qualidade (Se NÃO tiver 'Retrabalho' nos motivos)
                if "Retrabalho" not in d['reasons']:
                    impact += unit_qual
                    impact_breakdown.append(f"Qual: +{unit_qual:.1f}")
                else:
                    impact_breakdown.append(f"Qual: -{unit_qual:.1f}") # Mostra perda
                    
                d['impact_score'] = round(impact, 1)
                d['impact_breakdown'] = ", ".join(impact_breakdown)
            else:
                d['impact_score'] = 0.0
                d['impact_breakdown'] = "WIP"

        return {
            "implantador": implantador_name,
            "stores": details,
            "total_done_points": round(sum(d['points'] for d in details), 1),
            "total_wip_points": round(sum(d['potential_points'] for d in details), 1),
            "score_breakdown": {
                "total": round(final_score, 1),
                "volume": volume_count,
                "otd": otd,
                "quality": quality_pct or 100, # Fallback
                "time_score": round(time_score, 1)
            }
        }

    @staticmethod
    def get_bottlenecks(implantador=None):
        """
        Retorna as etapas com maior tempo acumulado.
        """
        # Agregação via SQL direto na tabela TaskStep
        # Top 10 etapas por tempo total
        query = db.session.query(
            TaskStep.step_name,
            func.sum(TaskStep.total_time_days).label('total_days'),
            func.avg(TaskStep.total_time_days).label('avg_days'),
            func.sum(TaskStep.reopen_count).label('total_reopens')
        )

        if implantador:
            query = query.join(Store).filter(Store.implantador == implantador)

        results = query.group_by(TaskStep.step_name)\
         .order_by(desc('total_days'))\
         .limit(15).all()
         
        return [
            {
                "step_name": r.step_name,
                "total_days": round(r.total_days or 0, 1),
                "avg_days": round(r.avg_days or 0, 1),
                "reopens": r.total_reopens or 0
            }
            for r in results
        ]

    @staticmethod
    def get_team_capacity():
        """
        Calcula a carga de trabalho atual de cada implantador + Esforço Semestral.
        Regra:
        - Load = Soma (Matriz * W_Matriz) + (Filial * W_Filial) das lojas IN_PROGRESS.
        - Semester Done = Soma das lojas concluídas no semestre atual.
        - Network Check: Agrupar redes.
        """
        # Configs
        w_matriz = 1.0
        w_filial = 0.7
        max_points = 30.0 # Valor default
        
        try:
            cfg_m = SystemConfig.query.filter_by(key='weight_matriz').first()
            cfg_f = SystemConfig.query.filter_by(key='weight_filial').first()
            cfg_max = SystemConfig.query.filter_by(key='default_max_capacity_points').first()
            if cfg_m: w_matriz = float(cfg_m.value)
            if cfg_f: w_filial = float(cfg_f.value)
            if cfg_max: max_points = float(cfg_max.value)
        except: pass

        # 1. Buscar WIP (Lojas em andamento)
        wip_stores = db.session.query(Store).filter(
            Store.status_norm == 'IN_PROGRESS', 
            Store.manual_finished_at.is_(None),
            Store.implantador.isnot(None)
        ).all()
        
        load_map = collections.defaultdict(lambda: {
            'points': 0.0, 'store_count': 0, 'networks': set(), 
            'finished_points': 0.0, 'finished_count': 0
        })
        
        for s in wip_stores:
            imp = s.implantador
            weight = w_matriz if s.tipo_loja == 'Matriz' else w_filial
            load_map[imp]['points'] += weight
            load_map[imp]['store_count'] += 1
            if s.rede:
                load_map[imp]['networks'].add(s.rede)

        # 2. Buscar Concluídas no Semestre (Esforço Acumulado)
        today = datetime.now()
        semester_start = datetime(today.year, 1, 1) if today.month <= 6 else datetime(today.year, 7, 1)
        
        finished_semester = db.session.query(Store).filter(
            or_(Store.status_norm == 'DONE', Store.manual_finished_at.isnot(None)),
            Store.implantador.isnot(None),
            or_(
                and_(Store.manual_finished_at.isnot(None), Store.manual_finished_at >= semester_start),
                and_(Store.manual_finished_at.is_(None), Store.finished_at >= semester_start)
            )
        ).all()
        
        for s in finished_semester:
            imp = s.implantador
            weight = w_matriz if s.tipo_loja == 'Matriz' else w_filial
            load_map[imp]['finished_points'] += weight
            load_map[imp]['finished_count'] += 1

        # Formatar saída
        capacity_data = []
        for imp, data in load_map.items():
            curr_points = round(data['points'], 1)
            finished_pts = round(data['finished_points'], 1)
            total_semester = round(curr_points + finished_pts, 1)
            
            # Utilization baseada apenas no WIP (Capacidade momentânea)
            utilization = round((curr_points / max_points) * 100, 1)
            
            # Risk Level
            risk = 'NORMAL'
            if utilization > 110: risk = 'CRITICAL'
            elif utilization > 90: risk = 'HIGH'
            elif utilization < 40: risk = 'LOW'
            
            capacity_data.append({
                'implantador': imp,
                'current_points': curr_points,
                'finished_points_semester': finished_pts,
                'total_semester_points': total_semester,
                'max_points': max_points,
                'store_count': data['store_count'],
                'finished_count_semester': data['finished_count'],
                'utilization_pct': utilization,
                'risk_level': risk,
                'active_networks': list(data['networks'])
            })
            
        # Ordenar por TOTAL SEMESTRE (equilibrar carga a longo prazo)
        # Inverter para que quem tem MAIS pontos fique em cima? O user quer equilibrar.
        # Geralmente lista de capacidade mostra quem está mais cheio primeiro.
        return sorted(capacity_data, key=lambda x: x['total_semester_points'], reverse=True)

    @staticmethod
    def get_financial_forecast(months=6):
        """
        Projeta o MRR futuro (Forecast).
        - Realizado: MRR de lojas concluídas em cada mês.
        - Projetado: MRR de lojas em progresso, alocado no mês estimado de conclusão.
          Estimativa = Data Inicio + CycleTime Médio (ou Contrato).
        """
        from dateutil.relativedelta import relativedelta
        
        # 1. Calcular Cycle Time Médio Recente (Últimos 90 dias) para projeção
        cutoff_90d = datetime.now() - timedelta(days=90)
        recent_done = db.session.query(Store).filter(
            or_(Store.status_norm == 'DONE', Store.manual_finished_at.isnot(None)),
            or_(Store.finished_at >= cutoff_90d, Store.manual_finished_at >= cutoff_90d)
        ).all()
        
        avg_cycle_days = 90 # Default fallback
        if recent_done:
            total_days = 0
            count = 0
            for s in recent_done:
                end = s.manual_finished_at or s.finished_at
                start = s.effective_started_at
                if start and end:
                    total_days += (end - start).days
                    count += 1
            if count > 0:
                avg_cycle_days = int(total_days / count)
        
        # 2. Estrutura de Meses (Current Mês até +months)
        today = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        forecast_map = {}
        
        # Inicializar keys para X meses no futuro e Y meses no passado (para ver tendência)
        # Vamos pegar -3 meses (histórico) e +months (futuro)
        start_range = today - relativedelta(months=3)
        end_range = today + relativedelta(months=months)
        
        curr = start_range
        while curr <= end_range:
            key = curr.strftime('%Y-%m')
            forecast_map[key] = {'realized': 0.0, 'projected': 0.0}
            curr += relativedelta(months=1)
            
        # 3. Preencher REALIZADO (Histórico)
        # Buscar todas lojas concluídas no range
        done_stores = db.session.query(Store).filter(
            or_(Store.status_norm == 'DONE', Store.manual_finished_at.isnot(None))
        ).all()
        
        for s in done_stores:
            end = s.manual_finished_at or s.finished_at
            if not end: continue
            key = end.strftime('%Y-%m')
            if key in forecast_map:
                forecast_map[key]['realized'] += float(s.valor_mensalidade or 0)
                
        # 4. Preencher PROJETADO (Futuro)
        wip_stores = db.session.query(Store).filter(
            Store.status_norm == 'IN_PROGRESS', 
            Store.manual_finished_at.is_(None)
        ).all()
        
        for s in wip_stores:
            start = s.effective_started_at or datetime.now()
            # Estimativa de conclusão
            # Se já passou do prazo, assume "Mês que vem" ou "Este mês"? 
            # Vamos assumir: Data Início + Avg Cycle Time. Se cair no passado, joga para "Este Mês + 1" (risco de atraso)
            
            projected_end = start + timedelta(days=avg_cycle_days)
            if projected_end < datetime.now():
                projected_end = datetime.now() + timedelta(days=15) # Reprograma para breve
                
            key = projected_end.strftime('%Y-%m')
            
            # Se cair dentro do range de visão, soma
            if key in forecast_map:
                forecast_map[key]['projected'] += float(s.valor_mensalidade or 0)
            elif projected_end > end_range:
                # Opcional: Acumular em "Futuro Distante" ou ignorar
                pass

        # Formatar lista ordenada
        result = []
        for key in sorted(forecast_map.keys()):
            # Flag para frontend saber onde é passado e onde é futuro
            is_future = key >= today.strftime('%Y-%m')
            result.append({
                'month': key,
                'realized': round(forecast_map[key]['realized'], 2),
                'projected': round(forecast_map[key]['projected'], 2),
                'is_future': is_future,
                'total_accumulated': 0 # Frontend pode calcular ou calculamos aqui
            })
            
        return result

    @staticmethod
    def export_analytics_excel(start_date=None, end_date=None, implantador=None):
        """
        Gera um arquivo Excel (.xlsx) com duas abas:
        1. Resumo Gerencial (KPIs Consolidos)
        2. Base Detalhada (Lista de Lojas)
        """
        import pandas as pd
        import io
        
        # --- ABA 1: RESUMO GERENCIAL ---
        
        # 1.1 Big Numbers
        kpis = AnalyticsService.get_kpi_cards(start_date, end_date, implantador)
        big_numbers_data = [
            {"Métrica": "WIP (Lojas em Progresso)", "Valor": kpis['wip_stores']},
            {"Métrica": "Entregas no Período", "Valor": kpis['throughput_period']},
            {"Métrica": "Cycle Time Médio (dias)", "Valor": kpis['cycle_time_avg']},
            {"Métrica": "OTD % (No Prazo)", "Valor": f"{kpis['otd_percentage']}%"},
            {"Métrica": "MRR em Backlog", "Valor": f"R$ {kpis['mrr_backlog']:.2f}"},
            {"Métrica": "MRR Ativado", "Valor": f"R$ {kpis['mrr_done_period']:.2f}"},
            {"Métrica": "Pontos Entregues", "Valor": kpis['total_points_done']},
            {"Métrica": "Risco Médio (Score)", "Valor": kpis['avg_risk_score']},
        ]
        df_big_numbers = pd.DataFrame(big_numbers_data)
        
        # 1.2 Ranking de Implantadores (Se não houver filtro de implantador único)
        ranking_data = AnalyticsService.get_performance_ranking(implantador)
        # Simplificar dados para exportação
        simple_ranking = []
        for r in ranking_data:
            simple_ranking.append({
                "Implantador": r['implantador'],
                "Entregues": r['done'],
                "WIP": r['wip'],
                "OTD %": f"{r['otd_percentage']}%",
                "Pontos": r['points'],
                "Score Geral": r['score'],
                "MRR Entregue": f"R$ {r['mrr_done']:.2f}"
            })
        df_ranking = pd.DataFrame(simple_ranking)

        # --- ABA 2: BASE DETALHADA ---
        
        query = db.session.query(Store)
        if implantador:
            query = query.filter(Store.implantador == implantador)
        
        if start_date:
            query = query.filter(or_(Store.created_at >= start_date, Store.manual_finished_at >= start_date))
        if end_date:
            query = query.filter(or_(Store.created_at <= end_date, Store.manual_finished_at <= end_date))
            
        stores = query.all()
        
        # Buscar Pesos
        w_matriz = 1.0
        w_filial = 0.7
        try:
            cfg_m = SystemConfig.query.filter_by(key='weight_matriz').first()
            cfg_f = SystemConfig.query.filter_by(key='weight_filial').first()
            if cfg_m: w_matriz = float(cfg_m.value)
            if cfg_f: w_filial = float(cfg_f.value)
        except: pass

        detailed_data = []
        for s in stores:
            end = s.manual_finished_at or s.end_real_at or s.finished_at
            start = s.effective_started_at
            
            # OTD Logic
            otd = "N/D"
            days = 0
            if start and end:
                days = (end - start).days
                contract = s.tempo_contrato or 90
                otd = "SIM" if days <= contract else "NÃO"
            elif start:
                days = (datetime.now() - start).days
                contract = s.tempo_contrato or 90
                otd = "EM DIA" if days <= contract else "ATRASADO (WIP)"
            
            # Pontos
            points = 0.0
            is_done = s.status_norm == 'DONE' or s.manual_finished_at is not None
            if is_done:
                points = w_matriz if s.tipo_loja == 'Matriz' else w_filial

            # Risk Score (ScoringService)
            risk_data = ScoringService.calculate_risk_score(s)
            risk = risk_data['total']
            # Breakdown não cabe bem no excel simples, mantemos só o total ou adicionamos colunas?
            # Vamos adicionar colunas de sub-score
            r_bk = risk_data['breakdown']

            detailed_data.append({
                'ID': s.custom_store_id or s.id,
                'Nome da Loja': s.store_name,
                'Rede': s.rede or '',
                'Tipo': s.tipo_loja or 'Filial',
                'Implantador': s.implantador or 'N/D',
                'Status Norm': s.status_norm,
                'Data Início': start.strftime('%d/%m/%Y') if start else '',
                'Data Fim (Efetiva)': end.strftime('%d/%m/%Y') if end else '',
                'Cycle Time (Dias)': s.dias_em_progresso,
                'Contrato (SLA)': s.tempo_contrato or 90,
                'No Prazo (OTD)': otd,
                'MRR': float(s.valor_mensalidade or 0),
                'Valor Implantação': float(s.valor_implantacao or 0),
                'Pontos': points,
                'Pontos': points,
                'Score Risco': risk,
                'Risco Prazo': r_bk['prazo'],
                'Risco Idle': r_bk['idle'],
                'Risco Fin': r_bk['financeiro'],
                'Dias Inativo': s.idle_days or 0,
                'Qualidade (Entregue)': "SIM" if s.delivered_with_quality else "NÃO",
                'Houve Retrabalho': "SIM" if s.teve_retrabalho else "NÃO"
            })
            
        df_detailed = pd.DataFrame(detailed_data)

        # Geração do Arquivo Excel na Memória
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Aba 1: Resumo
            df_big_numbers.to_excel(writer, sheet_name='Resumo Gerencial', startrow=0, startcol=0, index=False)
            
            # Escrever o Ranking ao lado ou abaixo? Abaixo é mais seguro para não sobrescrever
            # Vamos pular algumas linhas
            start_row_ranking = len(df_big_numbers) + 4
            writer.book['Resumo Gerencial'].cell(row=start_row_ranking, column=1, value="Ranking de Performance")
            df_ranking.to_excel(writer, sheet_name='Resumo Gerencial', startrow=start_row_ranking, index=False)
            
            # Aba 2: Detalhado
            df_detailed.to_excel(writer, sheet_name='Base Detalhada', index=False)
            
        output.seek(0)
        return output

    @staticmethod
    def get_risk_scatter(target_date=None, implantador=None):
        """
        Retorna dados para o gráfico de Scatter (Risco x Tempo).
        Lê da tabela MetricsSnapshotDaily para performance extrema.
        Se não tiver snapshot hoje, tenta fallback para cálculo on-the-fly ou dia anterior.
        (Para simplificar V3: lê do snapshot do dia ou retorna vazio se não rodou job)
        """
        if not target_date:
            target_date = date.today()
            
        # Tenta buscar snapshot
        query = db.session.query(MetricsSnapshotDaily).filter(MetricsSnapshotDaily.snapshot_date == target_date)
        
        if implantador:
            query = query.filter(MetricsSnapshotDaily.implantador == implantador)
            
        snapshots = query.all()
        
        # Se não tem dados HOJE, talvez o job não rodou. 
        # Fallback inteligente: buscar do último dia disponível?
        # Por enquanto, retorna vazio para incentivar rodar o job.
        
        data = []
        for s in snapshots:
            # Determinando cor/status para o gráfico
            # Regra simples visual
            status_color = 'Verde'
            if s.risk_score > 80: status_color = 'Crítico'
            elif s.risk_score > 50: status_color = 'Atenção'
            else: status_color = 'Em dia'
            
            data.append([
                s.days_in_stage or 0,    # X: Dias em Progresso (Corrigido)
                s.risk_score or 0,       # Y: Risco
                s.mrr or 0,              # Size: MRR
                f"{s.store.store_name} ({s.rede or 'N/A'})", # Tooltip
                status_color             # Color Group
            ])
            
        return data
