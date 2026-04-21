from flask import Blueprint, jsonify, request, Response, stream_with_context
from app.models import db, Store, StoreSyncLog, SystemConfig
from app.services.metrics import MetricsService
from app.services.sync_service import SyncService
from app.services.security_service import require_auth, require_permission, log_audit
from datetime import datetime
from sqlalchemy import func

# Blueprint principal mantido para health checks e estrutura futura
main_bp = Blueprint('main', __name__)
api_bp = Blueprint('api', __name__, url_prefix='/api')
# from app.routes_forecast import forecast_bp # REMOVED: unused

# --- Rotas da API (Backend React V2.5) ---

@api_bp.route('/dashboard', methods=['GET'])
@require_auth
def get_dashboard_data(payload):
    from app.services.scoring_service import ScoringService
    
    # Filtro de Status (Query Param)
    # Opções: 'active' (padrão), 'concluded', 'all'
    status_filter = request.args.get('status', 'active')

    # Carregar Pesos
    w_matriz = 1.0
    w_filial = 0.7
    
    try:
        cfg_m = SystemConfig.query.filter_by(key='weight_matriz').first()
        cfg_f = SystemConfig.query.filter_by(key='weight_filial').first()
        if cfg_m:
            w_matriz = float(cfg_m.value)
        if cfg_f:
            w_filial = float(cfg_f.value)
    except Exception:
        pass

    all_stores = Store.query.all()
    
    # Listas Globais para Cálculo de KPI
    # Regra V6: Ativas = Não concluídas E Início <= Hoje (ou detectado)
    active_stores_global = [s for s in all_stores if not s.effective_finished_at and not s.is_scheduled]
    
    # Filtrar entregas: somente a partir de 2026
    concluded_stores_global = [s for s in all_stores if s.effective_finished_at and s.effective_finished_at.year >= 2026]

    # Escopo Filtrado para Exibição (Risco, Listas de MRR, etc)
    if status_filter == 'active':
        scope_stores = active_stores_global
    elif status_filter == 'concluded':
        scope_stores = concluded_stores_global
    else: # all
        scope_stores = all_stores
    
    # 1. KPIs
    count_wip = len(active_stores_global)
    count_done = len(concluded_stores_global)
    
    # Calcular Pontos (WIP) - Baseado no Global para manter consistência dos top cards fixos?
    # O usuário pediu: "É importante o sistema desconsiderar nas demais métricas de risco lojas que já foram concluídas"
    # Entendo que os Cards de "Lojas em Progresso" e "Entregas Totais" são contadores absolutos do sistema.
    # Mas o MRR em implantação e MRR que deve ser cobrado (financeiro) deve respeitar o filtro?
    # O pedido diz: "lojas em progresso ativo como padrão... mostramos a quantidade de ativos... atrasadas e em risco que de fato ainda estão em progresso"
    # Assim, os KPIs de topo (Cards) devem refletir a Visão Geral ou o Filtro?
    # Geralmente Cards de Topo são "Big Numbers".
    # WIP e DONE Total são "Big Numbers".
    # Mas Risco e Listas abaixo respeitarão o scope_stores.
    
    total_points_wip = 0.0
    for s in active_stores_global:
        if s.tipo_loja == 'Matriz':
            total_points_wip += w_matriz
        else: # Filial
            total_points_wip += w_filial
            
    total_points_done = 0.0
    for s in concluded_stores_global:
        if s.tipo_loja == 'Matriz':
            total_points_done += w_matriz
        else:
            total_points_done += w_filial
    
    # % Prazo (Apenas concluídas) - KPI Global
    on_time = sum(1 for s in concluded_stores_global if s.dias_totais_implantacao <= (s.tempo_contrato or 90))
    pct_prazo = (on_time / count_done * 100) if count_done > 0 else 0
    
    # Métricas de MRR (Respeitando o Filtro para visualização operacional?)
    # Se filtro = active, mostramos MRR em implantação.
    # Se filtro = concluded, mostramos MRR entregue?
    # O Card diz "MRR em Implantação". Se eu filtrar concluídas, mostrar 0 seria estranho se o label é fixo.
    # Então KPIs fixos continuarão globais para dar contexto.
    # AS LISTAS (Risco, Tabelas) respeitarão o scope_stores.

    mrr_implantacao = sum(s.valor_mensalidade for s in active_stores_global if s.valor_mensalidade and s.status_norm != 'DONE')
    mrr_ja_pagando = sum(s.valor_mensalidade for s in all_stores if s.financeiro_status in ['Pago', 'Em dia'] and s.valor_mensalidade)
    mrr_devendo = sum(s.valor_mensalidade for s in scope_stores if s.financeiro_status == 'Devendo' and s.valor_mensalidade) # Esse ajustado ao filtro
    
    current_year = datetime.now().year
    mrr_concluidas_ano = sum(s.valor_mensalidade for s in concluded_stores_global if s.effective_finished_at and s.effective_finished_at.year == current_year and s.valor_mensalidade)

    # 2. Rankings (Implantador) - Apenas implantadores com lojas ativas
    # Identificar implantadores que têm pelo menos 1 loja ativa
    active_implantadores = set()
    for s in active_stores_global:
        if s.implantador:
            active_implantadores.add(s.implantador)

    kpi_by_imp = {}
    for s in active_stores_global:
        imp = s.implantador
        if not imp or imp not in active_implantadores:
            continue
        if imp not in kpi_by_imp:
            kpi_by_imp[imp] = {"wip": 0, "done": 0, "on_time": 0}
        
        if not s.effective_finished_at:
             kpi_by_imp[imp]["wip"] += 1

    # Contabilizar entregas 2026+ para implantadores ativos
    for s in concluded_stores_global:
        imp = s.implantador
        if not imp or imp not in active_implantadores:
            continue
        if imp not in kpi_by_imp:
            kpi_by_imp[imp] = {"wip": 0, "done": 0, "on_time": 0}
        kpi_by_imp[imp]["done"] += 1
        if s.dias_totais_implantacao <= (s.tempo_contrato or 90):
            kpi_by_imp[imp]["on_time"] += 1
            
    rankings = []
    for imp, data in kpi_by_imp.items():
        total_done = data['done']
        pct = (data['on_time'] / total_done * 100) if total_done > 0 else 0
        rankings.append({
            "implantador": imp,
            "wip": data['wip'],
            "done": data['done'],
            "pct_prazo": round(pct, 1)
        })
    rankings.sort(key=lambda x: x['done'], reverse=True)

    # 3. Top 10 Risco (Respeitando Filtro 'status')
    # Se filtro for 'concluded', risco não faz muito sentido, mas mostraremos se houver pendências
    risk_list = []
    for s in scope_stores:
        # Se filter=active -> pega stores abertas. Se filter=concluded -> pega fechadas.
        if status_filter == 'active' and s.effective_finished_at:
            continue
        if status_filter == 'concluded' and not s.effective_finished_at:
            continue
        
        risk_data = ScoringService.calculate_risk_score(s)
        
        # Buscar Etapa Ativa (Gargalo)
        active_step_name = "N/A"
        for step in s.steps:
            if step.start_real_at and not step.end_real_at:
                active_step_name = step.step_name
                break
        
        risk_list.append({
            "id": s.id,
            "name": s.store_name,
            "implantador": s.implantador,
            "status": s.status,
            "etapa_parada": active_step_name, 
            "score": risk_data['total'],
            "breakdown": risk_data['breakdown'], 
            "dias": s.dias_em_progresso,
            "idle": s.idle_days,
            "financeiro": s.financeiro_status
        })
    risk_list.sort(key=lambda x: x['score'], reverse=True)
    top_risk = risk_list[:10]

    # 4. Dados dos Gráficos
    # 4.1 Volume por Implantador (Em Andamento) - Top 15
    sorted_imps = sorted(kpi_by_imp.items(), key=lambda x: x[1]['wip'], reverse=True)
    impl_labels = [item[0] for item in sorted_imps[:15]]
    impl_values = [item[1]['wip'] for item in sorted_imps[:15]]
    
    # 4.2 Evolução (Últimos 6 meses OU Todos disponíveis se menos)
    from collections import defaultdict
    evo_map = defaultdict(int)
    for s in concluded_stores_global:
        if s.effective_finished_at:
            m_key = s.effective_finished_at.strftime('%m/%Y')
            evo_map[m_key] += 1
            
    # Ordenar por data (Mês/Ano)
    # Por segurança, usamos chaves datetime primeiro
    date_map = defaultdict(int) 
    for s in concluded_stores_global:
        if s.effective_finished_at:
            # truncate to month start
            dt = s.effective_finished_at.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            date_map[dt] += 1
            
    sorted_dates = sorted(date_map.keys())
    # Pegar os últimos 6
    sorted_dates = sorted_dates[-6:]
    
    evo_labels = [d.strftime('%m/%Y') for d in sorted_dates]
    evo_values = [date_map[d] for d in sorted_dates]

    return jsonify({
        "kpis": {
            "wip": count_wip,
            "done_total": count_done,
            "pct_prazo": round(pct_prazo, 1),
            "mrr_implantacao": mrr_implantacao,
            "mrr_pagando": mrr_ja_pagando,
            "mrr_devendo": mrr_devendo,
            "mrr_concluidas_ano": mrr_concluidas_ano,
            "points_wip": round(total_points_wip, 1),
            "points_done": round(total_points_done, 1)
        },
        "charts": {
            "impl_labels": impl_labels,
            "impl_values": impl_values,
            "evo_labels": evo_labels,
            "evo_values": evo_values
        },
        "rankings": rankings,
        "risk_stores": top_risk
    })

@api_bp.route('/stores', methods=['GET'])
@require_auth
def get_stores(payload):
    from sqlalchemy import or_, and_
    status_filter = request.args.get('status', 'active') # Default active
    
    query = Store.query
    today = datetime.now().date()
    
    if status_filter == 'active':
        # Active = Não concluídas E (sem data manual ou data manual <= hoje)
        query = query.filter(Store.manual_finished_at.is_(None), Store.end_real_at.is_(None), Store.finished_at.is_(None))
        query = query.filter(or_(Store.manual_start_date.is_(None), func.date(Store.manual_start_date) <= today))
    elif status_filter == 'scheduled':
        # Scheduled = Não concluídas E data início manual no futuro
        query = query.filter(Store.manual_finished_at.is_(None), Store.end_real_at.is_(None), Store.finished_at.is_(None))
        query = query.filter(Store.manual_start_date.isnot(None), func.date(Store.manual_start_date) > today)
    elif status_filter == 'concluded':
        # Concluded = Pelo menos uma data de fim preenchida, somente 2026+
        cutoff = datetime(2026, 1, 1)
        query = query.filter(
            or_(Store.manual_finished_at.isnot(None), Store.end_real_at.isnot(None), Store.finished_at.isnot(None))
        ).filter(
            or_(
                and_(Store.manual_finished_at.isnot(None), Store.manual_finished_at >= cutoff),
                and_(Store.manual_finished_at.is_(None), Store.finished_at.isnot(None), Store.finished_at >= cutoff),
                and_(Store.manual_finished_at.is_(None), Store.finished_at.is_(None), Store.end_real_at.isnot(None), Store.end_real_at >= cutoff)
            )
        )
        
    page = request.args.get('page', type=int)
    limit = request.args.get('limit', type=int)
    
    if page and limit:
        # Se for active ou scheduled, precisamos filtrar em Python por causa das properties
        if status_filter in ['active', 'scheduled']:
            all_potential = query.order_by(Store.created_at.desc()).all()
            if status_filter == 'active':
                filtered = [s for s in all_potential if not s.is_scheduled]
            else:
                filtered = [s for s in all_potential if s.is_scheduled]
            
            total = len(filtered)
            start = (page - 1) * limit
            end = start + limit
            stores = filtered[start:end]
            meta = {
                "total": total,
                "pages": (total + limit - 1) // limit,
                "page": page,
                "limit": limit
            }
        else:
            pagination = query.order_by(Store.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)
            stores = pagination.items
            meta = {
                "total": pagination.total,
                "pages": pagination.pages,
                "page": page,
                "limit": limit
            }
    else:
        all_stores = query.order_by(Store.created_at.desc()).all()
        if status_filter == 'active':
            stores = [s for s in all_stores if not s.is_scheduled]
        elif status_filter == 'scheduled':
            stores = [s for s in all_stores if s.is_scheduled]
        else:
            stores = all_stores
            
        meta = {
            "total": len(stores),
            "pages": 1,
            "page": 1,
            "limit": len(stores)
        }
    
    # Helpers para o Frontend saber quem é Matriz (Busca independente para não quebrar dropdowns)
    all_matrices = Store.query.filter_by(tipo_loja='Matriz').all()
    matrices = [{'id': s.id, 'name': s.store_name} for s in all_matrices]

    
    results = []
    
    # Inicializar Serviço de Análise de IA
    from app.services.analysis import AnalysisService
    from app.services.scoring_service import ScoringService
    analyzer = AnalysisService()

    def fmt_date(d):
        return d.strftime('%Y-%m-%d') if d else None
        
    for s in stores:
        risk_data = ScoringService.calculate_risk_score(s)
        risk_score = risk_data['total']
        
        deep_status = "NEVER"
        if s.deep_sync_state:
            deep_status = s.deep_sync_state.sync_status
            
        results.append({
            'id': s.id,
            'name': s.store_name,
            'custom_id': s.custom_store_id,
            'clickup_id': s.clickup_task_id,
            'clickup_url': s.clickup_url,
            'status': s.status,
            'status_norm': s.status_norm,
            'implantador': s.implantador,
            'data_inicio': fmt_date(s.effective_started_at),
            'data_fim': fmt_date(s.effective_finished_at),
            'data_previsao': fmt_date(s.data_previsao_implantacao),
            'dias_em_transito': s.dias_em_progresso, 
            'idle_days': s.idle_days,
            'risk_score': risk_score,
            'risk_level': risk_data['level'],
            'ai_risk_level': risk_data.get('ai_risk_level', risk_data['level']),
            'ai_boost': risk_data.get('ai_boost', 0),
            'risk_breakdown': risk_data['breakdown'],
            'risk_hints': risk_data['hints'],
            'valor_mensalidade': s.valor_mensalidade,
            'tempo_contrato': s.tempo_contrato or 90,
            'financeiro_status': s.financeiro_status,
            'teve_retrabalho': s.teve_retrabalho,
            'observacoes': s.observacoes,
            'manual_finished_at': fmt_date(s.manual_finished_at),
            'considerar_tempo': s.considerar_tempo_implantacao, 
            'justificativa_tempo': s.justificativa_tempo_implantacao,
            'erp': s.erp,
            'cnpj': s.cnpj,
            'crm': s.crm,
            'valor_implantacao': s.valor_implantacao,
            'deep_sync_status': deep_status,
            'rede': s.rede,
            'tipo_loja': s.tipo_loja,
            'parent_id': s.parent_id,
            'parent_name': s.matriz.store_name if s.matriz else None,
            'delivered_with_quality': s.delivered_with_quality,
            'is_manual_start_date': s.is_manual_start_date,
            'is_scheduled': s.is_scheduled,
            'clickup_created_at': fmt_date(s.created_at),
            'manual_start_date': fmt_date(s.manual_start_date),
            'total_paused_days': sum([(p.end_date - p.start_date).days for p in s.pauses if p.end_date]) if s.pauses else 0,
            'ai_prediction': analyzer.predict_store_completion(s.id),
            'dias_na_etapa': (datetime.now() - (
                StoreSyncLog.query.filter_by(store_id=s.id, field_name='status')
                .order_by(StoreSyncLog.changed_at.desc())
                .with_entities(StoreSyncLog.changed_at)
                .first()[0] 
                if StoreSyncLog.query.filter_by(store_id=s.id, field_name='status').first() 
                else s.effective_started_at or datetime.now()
            )).days if s.effective_started_at else 0
        })

    return jsonify({"stores": results, "matrices": matrices, "meta": meta})

@api_bp.route('/stores/<int:id>', methods=['DELETE'])
@require_auth
def delete_store(payload, id):
    try:
        store = Store.query.get_or_404(id)
        
        # 1. Limpeza Manual de Dependências sem Cascade
        from app.models import MetricsSnapshotDaily
        MetricsSnapshotDaily.query.filter_by(store_id=id).delete()
        
        # 2. Deletar Loja (Cascades steps, logs, deep_sync, etc.)
        store_name = store.store_name
        db.session.delete(store)
        db.session.commit()
        
        log_audit(
            action="DELETE_STORE",
            resource_type="Store",
            resource_id=id,
            details=f"Loja '{store_name}' deletada permanentemente",
            user_id=payload['sub']
        )
        
        return jsonify({"status": "deleted", "id": id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/store/<int:id>', methods=['PUT'])
@require_auth
def update_store(payload, id):
    store = Store.query.get_or_404(id)
    data = request.json
    if not data:
        return jsonify({"error": "No data"}), 400
        
    service = MetricsService()
        
    if 'observacoes' in data: 
        service.log_change(store, 'observacoes', store.observacoes, data['observacoes'], source='manual')
        store.observacoes = data['observacoes']
        
    if 'financeiro_status' in data: 
        service.log_change(store, 'financeiro_status', store.financeiro_status, data['financeiro_status'], source='manual')
        store.financeiro_status = data['financeiro_status']
        
    if 'tempo_contrato' in data: 
        service.log_change(store, 'tempo_contrato', store.tempo_contrato, data['tempo_contrato'], source='manual')
        store.tempo_contrato = int(data['tempo_contrato'] or 90)
        
    if 'teve_retrabalho' in data: 
        service.log_change(store, 'teve_retrabalho', store.teve_retrabalho, data['teve_retrabalho'], source='manual')
        store.teve_retrabalho = bool(data['teve_retrabalho'])
        
    if 'delivered_with_quality' in data:
        service.log_change(store, 'delivered_with_quality', store.delivered_with_quality, data['delivered_with_quality'], source='manual')
        store.delivered_with_quality = bool(data['delivered_with_quality'])
        
    if 'considerar_tempo' in data: 
        service.log_change(store, 'considerar_sla', store.considerar_tempo_implantacao, data['considerar_tempo'], source='manual')
        store.considerar_tempo_implantacao = bool(data['considerar_tempo'])
        
    if 'justificativa_tempo' in data: 
        service.log_change(store, 'justificativa_sla', store.justificativa_tempo_implantacao, data['justificativa_tempo'], source='manual')
        store.justificativa_tempo_implantacao = data['justificativa_tempo']
        
    if 'rede' in data: 
        service.log_change(store, 'rede', store.rede, data['rede'], source='manual')
        store.rede = data['rede']
        
    if 'tipo_loja' in data: 
        service.log_change(store, 'tipo_loja', store.tipo_loja, data['tipo_loja'], source='manual')
        store.tipo_loja = data['tipo_loja']
        
    if 'parent_id' in data: 
        service.log_change(store, 'matriz_id', store.parent_id, data['parent_id'], source='manual')
        store.parent_id = int(data['parent_id']) if data['parent_id'] else None

    # Nova Lógica de Data Manual (V6)
    if 'data_inicio' in data:
        date_str = data['data_inicio']
        old_val = store.manual_start_date.strftime('%Y-%m-%d') if store.manual_start_date else None
        
        if date_str:
            try:
                new_date = datetime.strptime(date_str, '%Y-%m-%d')
                if old_val != date_str:
                     service.log_change(store, 'inicio_manual', old_val, date_str, source='manual')
                
                store.manual_start_date = new_date
                store.is_manual_start_date = True
            except Exception:
                pass
        else:
             if old_val:
                 service.log_change(store, 'inicio_manual', old_val, None, source='manual')
             store.manual_start_date = None
             store.is_manual_start_date = False

    
    if 'manual_finished_at' in data:
        date_str = data['manual_finished_at']
        old_val = store.manual_finished_at.strftime('%Y-%m-%d') if store.manual_finished_at else None
        if date_str:
            try: 
                new_date = datetime.strptime(date_str, '%Y-%m-%d')
                if old_val != date_str:
                    service.log_change(store, 'fim_manual', old_val, date_str, source='manual')
                store.manual_finished_at = new_date
            except Exception:
                pass
        else:
            if old_val is not None:
                service.log_change(store, 'fim_manual', old_val, None, source='manual')
            store.manual_finished_at = None
            
    # FECHAR PAUSAS ABERTAS SE A LOJA ESTIVER SENDO FINALIZADA MANUALMENTE:
    # Corrige bug em que a loja era "morta" com 31/03, mas possuía uma "pausa" em aberto que consumia todos os dias até 31/03.
    if store.manual_finished_at or store.status_norm == 'DONE':
        from app.models import StorePause
        open_pauses = StorePause.query.filter_by(store_id=id, end_date=None).all()
        for p in open_pauses:
            p.end_date = store.manual_finished_at or datetime.now()
            p.reason = f"{(p.reason or '')} (Fechado via Finalização Manual)".strip()
            
    db.session.commit()
    
    log_audit(
        action="UPDATE_STORE_MANUAL",
        resource_type="Store",
        resource_id=id,
        details=f"Atualização manual dos campos: {list(data.keys())}",
        user_id=payload['sub']
    )
    
    return jsonify({"status": "success"})

@api_bp.route('/sync', methods=['POST'])
@require_auth
def sync_clickup(payload):
    full = request.args.get('full', 'false').lower() == 'true'
    service = SyncService()
    result = service.run_sync(force_full=full)
    return jsonify(result)

@api_bp.route('/implantacao/sync', methods=['POST'])
@require_auth
@require_permission('manage_sync')
def sync_implantacao(payload):
    service = SyncService()
    try:
        result = service.run_implantacao_sync()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/stores/bulk-link', methods=['POST'])
@require_auth
def bulk_link_stores(payload):
    try:
        data = request.json
        store_ids = data.get('store_ids', [])
        parent_id = data.get('parent_id')

        if not store_ids or not parent_id:
            return jsonify({'error': 'IDs das lojas e ID da matriz são obrigatórios'}), 400
            
        parent_store = Store.query.get(parent_id)
        if not parent_store:
             return jsonify({'error': 'Matriz não encontrada'}), 404
             
        # Garante que a matriz é do tipo Matriz
        if parent_store.tipo_loja != 'Matriz':
            parent_store.tipo_loja = 'Matriz'
            if not parent_store.rede:
                 parent_store.rede = parent_store.name

        count = 0
        for store_id in store_ids:
            # Evita auto-referência
            if int(store_id) == int(parent_id):
                continue
                
            store = Store.query.get(store_id)
            if store:
                store.parent_id = parent_id
                store.tipo_loja = 'Filial'
                store.rede = parent_store.rede # Herda o nome da rede
                count += 1
        
        db.session.commit()
        return jsonify({'message': f'{count} lojas vinculadas com sucesso', 'count': count}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stores/bulk-update', methods=['POST'])
@require_auth
def bulk_update_stores(payload):
    try:
        data = request.json
        store_ids = data.get('store_ids', [])
        parent_id = data.get('parent_id')
        tipo_loja = data.get('tipo_loja')

        if not store_ids:
            return jsonify({'error': 'IDs das lojas são obrigatórios'}), 400
            
        parent_store = None
        if parent_id:
            parent_store = Store.query.get(parent_id)
            if not parent_store:
                 return jsonify({'error': 'Matriz não encontrada'}), 404
            
            # Se vinculou a uma matriz, garante que ela é do tipo Matriz
            if parent_store.tipo_loja != 'Matriz':
                parent_store.tipo_loja = 'Matriz'

        count = 0
        for store_id in store_ids:
            # Evita auto-referência se houver parent_id
            if parent_id and int(store_id) == int(parent_id):
                continue
                
            store = Store.query.get(store_id)
            if store:
                if tipo_loja:
                    store.tipo_loja = tipo_loja
                
                if parent_id:
                    store.parent_id = parent_id
                    store.tipo_loja = 'Filial' # Forçamos filial se houver vínculo
                    if parent_store and parent_store.rede:
                        store.rede = parent_store.rede
                        
                count += 1
        
        db.session.commit()
        return jsonify({'message': f'{count} lojas atualizadas com sucesso', 'count': count}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stores/<int:id>/logs', methods=['GET'])
@require_auth
def get_store_logs(payload, id):
    try:
        from app.models import Store, StoreSyncLog, TaskStep
        
        # 1. Buscar Logs Físicos
        logs = StoreSyncLog.query.filter_by(store_id=id).all()
        formatted_logs = [{
            'id': f"log_{log.id}",
            'field': log.field_name,
            'old': log.old_value,
            'new': log.new_value,
            'at_dt': log.changed_at,
            'at': log.changed_at.strftime('%d/%m/%Y %H:%M'),
            'source': log.source
        } for log in logs]

        # 2. Buscar Loja para Data de Criação
        store = Store.query.get(id)
        if store and store.created_at:
             formatted_logs.append({
                'id': "created",
                'field': "LIFECYCLE",
                'old': None,
                'new': "Loja Criada / Importada",
                'at_dt': store.created_at,
                'at': store.created_at.strftime('%d/%m/%Y %H:%M'),
                'source': 'system'
            })

        # 3. Buscar Etapas para Logs Virtuais
        steps = TaskStep.query.filter_by(store_id=id).all()
        for s in steps:
            # Apenas Evento de Fim (Solicitação do Usuário: Datas de início são frequentemente apenas datas de criação)
            if s.end_real_at:
                 formatted_logs.append({
                    'id': f"step_end_{s.id}",
                    'field': "ETAPA CONCLUÍDA",
                    'old': None,
                    'new': s.step_name,
                    'at_dt': s.end_real_at,
                    'at': s.end_real_at.strftime('%d/%m/%Y %H:%M'),
                    'source': 'clickup'
                })

        # Ordenar por Data Decrescente
        formatted_logs.sort(key=lambda x: x['at_dt'], reverse=True)
        
        # Remover objeto auxiliar
        for log in formatted_logs:
            del log['at_dt']

        return jsonify(formatted_logs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/deep-sync/store/<int:id>', methods=['POST'])
@require_auth
def deep_sync_store(payload, id):
    service = SyncService()
    result = service.run_deep_sync(id)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@api_bp.route('/sync/stream', methods=['GET'])
@require_auth
@require_permission('manage_sync')
def sync_stream(payload):
    full = request.args.get('full', 'false').lower() == 'true'
    service = SyncService()
    return Response(stream_with_context(service.run_sync_stream(force_full=full)), mimetype='text/event-stream')

@api_bp.route('/analyze/store/<int:id>', methods=['POST'])
@require_auth
def analyze_store(payload, id):
    from app.services.llm_service import LLMService
    from app.models import Store
    from app.services.clickup import ClickUpService
    import json
    
    store = Store.query.get_or_404(id)
    force = request.args.get('force', 'false').lower() == 'true'

    # 1. Verificar Cache
    if not force and store.ai_summary:
        try:
            cached_data = json.loads(store.ai_summary)
            # Adicionar metadados para dizer que é cache
            cached_data['_cached'] = True
            cached_data['_analyzed_at'] = store.ai_analyzed_at.strftime('%d/%m/%Y %H:%M') if store.ai_analyzed_at else None
            return jsonify(cached_data)
        except Exception:
             pass # Falha ao analisar cache, regenerar

    # 2. Buscar Comentários do ClickUp
    clickup = ClickUpService()
    comments_list = []
    if store.clickup_task_id:
        try:
            raw_comments = clickup.get_task_comments(store.clickup_task_id)
            # Pegar os últimos 15 comentários para fornecer contexto
            for c in raw_comments[:15]: 
                user = c.get('user', {}).get('username', 'Unknown')
                text = c.get('comment_text', '')
                if text:
                    comments_list.append(f"[LOJA]: {user}: {text}")
        except Exception as e:
            print(f"Error fetching comments: {e}")

    # Buscar Comentários da Subtarefa Ativa (Onde está travado)
    # Procuramos o primeiro passo que está efetivamente EM PROGRESSO (iniciado mas não finalizado)
    active_step = None
    for s in store.steps:
        if s.start_real_at and not s.end_real_at:
            active_step = s
            break
    
    if active_step:
        try:
            sub_comments = clickup.get_task_comments(active_step.clickup_task_id)
            if sub_comments:
                comments_list.append(f"\n--- SUBTAREFA ATUAL: {active_step.step_name} ---")
                for c in sub_comments[:10]:
                    user = c.get('user', {}).get('username', 'Unknown')
                    text = c.get('comment_text', '')
                    if text:
                        comments_list.append(f"[{active_step.step_name}] {user}: {text}")
        except Exception as e:
            print(f"Error fetching subtask comments: {e}")

    comments_str = "\n".join(comments_list) if comments_list else "Nenhum comentário recente."

    # Preparar Contexto de Dados
    # Agregamos os dados para dar ao LLM uma boa visão geral
    data_context = {
        "name": store.store_name,
        "status": store.status,
        "days_in_status": store.idle_days,
        "total_days": store.dias_em_progresso,
        "sla": store.tempo_contrato,
        "idle_days": store.idle_days,
        "financeiro": store.financeiro_status,
        "erp": store.erp,
        "retrabalho": "Sim" if store.teve_retrabalho else "Não",
        "comments": comments_str
    }

    service = LLMService()
    result = service.analyze_store_risks(data_context)
    
    # 3. Salvar no Cache
    try:
        store.ai_summary = json.dumps(result)
        store.ai_analyzed_at = datetime.now()
        db.session.commit()
    except Exception as e:
        print(f"Erro ao salvar cache de IA: {e}")
        db.session.rollback()

    result['_cached'] = False
    result['_analyzed_at'] = datetime.now().strftime('%d/%m/%Y %H:%M')
    
    return jsonify(result)

@api_bp.route('/reports/monthly-implantation', methods=['GET'])
@require_auth
def get_monthly_implantation_report(payload):
    from collections import defaultdict
    import statistics
    import math
    
    # ── Configurações de meta (SystemConfig) ──
    mrr_target = 180000.0
    stores_target = 180
    try:
        cfg_mrr = SystemConfig.query.filter_by(key='annual_mrr_target').first()
        cfg_stores = SystemConfig.query.filter_by(key='annual_stores_target').first()
        if cfg_mrr:
            mrr_target = float(cfg_mrr.value)
        if cfg_stores:
            stores_target = int(cfg_stores.value)
    except Exception:
        pass
    
    w_matriz, w_filial = 1.0, 0.7
    SLA_TARGET = 90
    
    # ── Buscar lojas concluídas em 2026+ ──
    all_stores = Store.query.all()
    finished_stores = [s for s in all_stores if s.effective_finished_at and s.effective_finished_at.year >= 2026]
    
    # ── Agrupar por mês ──
    grouped = defaultdict(list)
    for s in finished_stores:
        key = s.effective_finished_at.strftime('%Y-%m')
        points = w_matriz if s.tipo_loja == 'Matriz' else w_filial
        days = s.dias_totais_implantacao or 0
        on_time = 1 if days <= SLA_TARGET else 0
        
        grouped[key].append({
            "id": s.id,
            "name": s.store_name,
            "implantador": s.implantador or "N/A",
            "rede": s.rede or "Sem Rede",
            "finished_at": s.effective_finished_at.strftime('%Y-%m-%d'),
            "mrr": s.valor_mensalidade or 0.0,
            "days": days,
            "points": points,
            "tipo": s.tipo_loja or "Filial",
            "on_time": on_time
        })
    
    sorted_months = sorted(grouped.keys(), reverse=True)
    
    # ── YTD Acumulados ──
    ytd_mrr = sum(s['mrr'] for month in grouped.values() for s in month)
    ytd_stores = sum(len(month) for month in grouped.values())
    ytd_points = sum(s['points'] for month in grouped.values() for s in month)
    months_elapsed = len(sorted_months)  # meses com entregas
    
    # Projeção: baseada no ritmo médio mensal
    avg_mrr_per_month = ytd_mrr / max(months_elapsed, 1)
    avg_stores_per_month = ytd_stores / max(months_elapsed, 1)
    
    mrr_remaining = max(0, mrr_target - ytd_mrr)
    stores_remaining = max(0, stores_target - ytd_stores)
    
    months_to_mrr_goal = math.ceil(mrr_remaining / avg_mrr_per_month) if avg_mrr_per_month > 0 else 0
    months_to_stores_goal = math.ceil(stores_remaining / avg_stores_per_month) if avg_stores_per_month > 0 else 0
    
    # Calcular mês estimado de atingimento
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    now = datetime.now()
    est_mrr_date = (now + relativedelta(months=months_to_mrr_goal)).strftime('%Y-%m') if months_to_mrr_goal > 0 else now.strftime('%Y-%m')
    est_stores_date = (now + relativedelta(months=months_to_stores_goal)).strftime('%Y-%m') if months_to_stores_goal > 0 else now.strftime('%Y-%m')
    
    # ── WIP Overview (Board Stages) ──
    # Regra V6: WIP ignora programadas
    wip_stores = [s for s in all_stores if s.status_norm == 'IN_PROGRESS' and not s.manual_finished_at and not s.is_scheduled]
    wip_count = len(wip_stores)
    mrr_backlog = sum(s.valor_mensalidade or 0 for s in wip_stores)
    
    quase_entregue_keywords = ["treinamento", "app", "homologação", "homologacao", "valida", "final", "publica"]
    mrr_quase_entregue = 0.0
    mrr_em_risco = 0.0
    
    # Board stages from store status
    board_stages = defaultdict(int)
    for s in wip_stores:
        stage_name = s.status or 'Sem Status'
        board_stages[stage_name] += 1
        
        val = s.valor_mensalidade or 0.0
        stage_lower = stage_name.lower()
        if any(k in stage_lower for k in quase_entregue_keywords):
            mrr_quase_entregue += val
        else:
            mrr_em_risco += val
    
    board_stages_list = [{"stage": k, "count": v} for k, v in sorted(board_stages.items(), key=lambda x: -x[1])]
    
    # ── Construir dados por mês ──
    results = []
    prev_month_data = None
    
    for month in reversed(sorted_months):  # chronological for variation calc
        stores = grouped[month]
        stores.sort(key=lambda x: (x['finished_at'], x['name']))
        
        total_mrr = sum(s['mrr'] for s in stores)
        total_stores = len(stores)
        total_points = sum(s['points'] for s in stores)
        
        days_list = [s['days'] for s in stores]
        avg_days = statistics.mean(days_list) if days_list else 0
        median_days = statistics.median(days_list) if days_list else 0
        ticket_medio = round(total_mrr / max(total_stores, 1), 2)
        
        on_time_count = sum(1 for s in stores if s['on_time'])
        on_time_pct = round((on_time_count / max(total_stores, 1)) * 100, 1)
        
        # ── Breakdown por Tipo ──
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
        
        # ── Histograma de SLAs ──
        sla_histogram = {
            "super_rapidas": 0,
            "padrao": 0,
            "alerta": 0,
            "atrasadas": 0
        }
        for d in days_list:
            if d < 30:
                sla_histogram["super_rapidas"] += 1
            elif d <= 60:
                sla_histogram["padrao"] += 1
            elif d <= 90:
                sla_histogram["alerta"] += 1
            else:
                sla_histogram["atrasadas"] += 1
                
        # ── MRR por Rede ──
        rede_map = defaultdict(lambda: {"mrr": 0.0, "count": 0, "names": []})
        for s in stores:
            rede = s['rede']
            rede_map[rede]["mrr"] += s['mrr']
            rede_map[rede]["count"] += 1
            rede_map[rede]["names"].append(s['name'])
        
        mrr_by_rede = [{"rede": k, "mrr": round(v["mrr"], 2), "count": v["count"], "store_names": v["names"]} 
                       for k, v in sorted(rede_map.items(), key=lambda x: -x[1]["mrr"])]
        
        # ── Destaques ──
        sorted_by_days = sorted(stores, key=lambda x: x['days'])
        sorted_by_mrr = sorted(stores, key=lambda x: x['mrr'], reverse=True)
        
        highlights = {
            "fastest": {"name": sorted_by_days[0]['name'], "days": sorted_by_days[0]['days']} if stores else None,
            "slowest": {"name": sorted_by_days[-1]['name'], "days": sorted_by_days[-1]['days']} if stores else None,
            "top_mrr": {"name": sorted_by_mrr[0]['name'], "mrr": sorted_by_mrr[0]['mrr']} if stores else None,
            "late_stores": [{"name": s['name'], "days": s['days']} for s in stores if not s['on_time']],
        }
        
        # ── Variação vs Mês Anterior ──
        variation = None
        if prev_month_data:
            prev_mrr = prev_month_data['total_mrr']
            prev_stores_count = prev_month_data['total_stores']
            variation = {
                "mrr_change": round(total_mrr - prev_mrr, 2),
                "mrr_change_pct": round(((total_mrr - prev_mrr) / max(prev_mrr, 1)) * 100, 1),
                "stores_change": total_stores - prev_stores_count,
                "stores_change_pct": round(((total_stores - prev_stores_count) / max(prev_stores_count, 1)) * 100, 1),
            }
        
        prev_month_data = {"total_mrr": total_mrr, "total_stores": total_stores}
        
        # ── Ranking por Implantador ──
        impl_map = defaultdict(lambda: {"stores": 0, "mrr": 0.0, "days_list": [], "on_time": 0, "points": 0.0, "store_names": []})
        for s in stores:
            imp = s['implantador']
            impl_map[imp]["stores"] += 1
            impl_map[imp]["mrr"] += s['mrr']
            impl_map[imp]["days_list"].append(s['days'])
            impl_map[imp]["on_time"] += s['on_time']
            impl_map[imp]["points"] += s['points']
            impl_map[imp]["store_names"].append(s['name'])
        
        implantadores = []
        for name, d in impl_map.items():
            avg_impl = statistics.mean(d["days_list"]) if d["days_list"] else 0
            impl_on_time_pct = round((d["on_time"] / max(d["stores"], 1)) * 100, 1)
            implantadores.append({
                "name": name,
                "stores": d["stores"],
                "store_names": d["store_names"],
                "mrr": round(d["mrr"], 2),
                "avg_days": round(avg_impl, 1),
                "on_time": d["on_time"],
                "on_time_pct": impl_on_time_pct,
                "points": round(d["points"], 1)
            })
        
        implantadores.sort(key=lambda x: x['mrr'], reverse=True)
        
        results.append({
            "month": month,
            "stats": {
                "total_stores": total_stores,
                "total_mrr": total_mrr,
                "total_points": total_points,
                "avg_days": round(avg_days, 1),
                "median_days": round(median_days, 1),
                "ticket_medio": ticket_medio,
                "on_time_count": on_time_count,
                "on_time_pct": on_time_pct
            },
            "sla_histogram": sla_histogram,
            "type_breakdown": type_breakdown,
            "mrr_by_rede": mrr_by_rede,
            "highlights": highlights,
            "variation": variation,
            "implantadores": implantadores,
            "stores": stores
        })
    
    # Reverter para ordem decrescente (mais recente primeiro)
    results.reverse()
    
    return jsonify({
        "annual_goals": {
            "mrr_target": mrr_target,
            "mrr_ytd": round(ytd_mrr, 2),
            "mrr_pct": round(ytd_mrr / max(mrr_target, 1) * 100, 1),
            "mrr_avg_monthly": round(avg_mrr_per_month, 2),
            "mrr_projection_month": est_mrr_date,
            "stores_target": stores_target,
            "stores_ytd": ytd_stores,
            "stores_pct": round(ytd_stores / max(stores_target, 1) * 100, 1),
            "stores_avg_monthly": round(avg_stores_per_month, 1),
            "stores_projection_month": est_stores_date,
            "points_ytd": round(ytd_points, 1),
        },
        "wip_overview": {
            "total_wip": wip_count,
            "mrr_backlog": round(mrr_backlog, 2),
            "mrr_quase_entregue": round(mrr_quase_entregue, 2),
            "mrr_em_risco": round(mrr_em_risco, 2),
            "board_stages": board_stages_list,
        },
        "months": results
    })

@api_bp.route('/reports/monthly-implantation/export-excel', methods=['POST'])
@require_auth
def export_monthly_excel(payload):
    from app.services.excel_report_service import ExcelReportService
    from flask import send_file
    data = request.json
    try:
        excel_io = ExcelReportService.generate_monthly_implantation_excel(data)
        month_str = data.get('month', 'mensal')
        return send_file(
            excel_io,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"relatorio_implantacao_{month_str}.xlsx"
        )
    except Exception as e:
        print(f"Erro ao exportar excel: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/reports/annual-implantation/export-excel', methods=['POST'])
@require_auth
def export_annual_excel(payload):
    from app.services.excel_report_service import ExcelReportService
    from flask import send_file
    data = request.json
    try:
        excel_io = ExcelReportService.generate_annual_implantation_excel(data)
        from datetime import datetime
        year_str = datetime.now().year
        return send_file(
            excel_io,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"visao_anual_implantacao_{year_str}.xlsx"
        )
    except Exception as e:
        print(f"Erro ao exportar excel anual: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/reports/monthly-implantation/export-pdf', methods=['POST'])
@require_auth
def export_monthly_pdf(payload):
    from app.services.pdf_report_service import PDFReportService
    from flask import send_file
    data = request.json
    try:
        pdf_io = PDFReportService.generate_monthly_implantation_pdf(data)
        month_str = data.get('month', 'mensal')
        return send_file(
            pdf_io,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"relatorio_implantacao_{month_str}.pdf"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/reports/generate-summary', methods=['POST'])
@require_auth
def generate_monthly_summary(payload):
    from app.services.llm_service import LLMService
    data = request.json
    
    # Espera receber o objeto 'stats' e 'month' e talvez top stores?
    # Vamos montar o context_data
    
    context = {
        "month": data.get('month', 'N/A'),
        "total_stores": data.get('stats', {}).get('total_stores', 0),
        "total_mrr": f"{data.get('stats', {}).get('total_mrr', 0):.2f}",
        "avg_time": data.get('stats', {}).get('avg_days', 0),
        "median_time": data.get('stats', {}).get('median_days', 0),
        "total_points": data.get('stats', {}).get('total_points', 0),
        "highlights": data.get('highlights', 'Nenhum destaque enviado.'),
        "stores": data.get('stores', [])
    }
    
    report_format = data.get('format', 'simple')
    
    service = LLMService()
    summary = service.generate_monthly_report_summary(context, format_type=report_format)
    
    return jsonify({"summary": summary})

@api_bp.route('/steps', methods=['GET'])
@require_auth
def get_steps(payload):
    from app.models import TaskStep
    steps = TaskStep.query.order_by(TaskStep.store_id.asc(), TaskStep.start_real_at.asc()).limit(500).all()
    results = []
    
    for s in steps:
        results.append({
            "id": s.id,
            "step_name": s.step_name,
            "list_name": s.step_list_name,
            "store_name": s.store.store_name if s.store else "Unknown",
            "status": s.status,
            "assignee": s.assignee,
            "start_date": s.start_real_at.strftime('%Y-%m-%d') if s.start_real_at else None,
            "end_date": s.end_real_at.strftime('%Y-%m-%d') if s.end_real_at else None,
            "duration": s.total_time_days,
            "idle": s.idle_days
        })
    return jsonify(results)

@api_bp.route('/stores/<int:store_id>/steps', methods=['GET'])
@require_auth
def get_store_steps(payload, store_id):
    from app.models import TaskStep
    steps = TaskStep.query.filter_by(store_id=store_id).order_by(TaskStep.start_real_at.asc()).all()
    results = []
    
    for s in steps:
        results.append({
            "id": s.id,
            "step_name": s.step_name,
            "list_name": s.step_list_name,
            "status": s.status,
            "assignee": s.assignee,
            "start_date": s.start_real_at.strftime('%Y-%m-%d') if s.start_real_at else None,
            "end_date": s.end_real_at.strftime('%Y-%m-%d') if s.end_real_at else None,
            "duration": round(s.total_time_days, 1),
            "idle": s.idle_days
        })
    return jsonify(results)

@api_bp.route('/stores/<int:store_id>/steps/<int:step_id>', methods=['PUT'])
@require_auth
def update_store_step(payload, store_id, step_id):
    from app.models import db, TaskStep, StoreSyncLog
    from datetime import datetime
    
    step = TaskStep.query.filter_by(id=step_id, store_id=store_id).first_or_404()
    data = request.json
    
    if not data:
        return jsonify({"error": "No data"}), 400
        
    try:
        if 'start_date' in data:
            date_str = data['start_date']
            old_str = step.start_real_at.strftime('%Y-%m-%d') if step.start_real_at else None
            if date_str:
                new_date = datetime.strptime(date_str, '%Y-%m-%d')
                if old_str != date_str:
                    log = StoreSyncLog(store_id=store_id, field_name=f'step_start_{step_id}', old_value=old_str, new_value=date_str, source='manual')
                    db.session.add(log)
                step.start_real_at = new_date
            else:
                if old_str:
                    log = StoreSyncLog(store_id=store_id, field_name=f'step_start_{step_id}', old_value=old_str, new_value=None, source='manual')
                    db.session.add(log)
                step.start_real_at = None
                
        if 'end_date' in data:
            date_str = data['end_date']
            old_str = step.end_real_at.strftime('%Y-%m-%d') if step.end_real_at else None
            if date_str:
                new_date = datetime.strptime(date_str, '%Y-%m-%d')
                if old_str != date_str:
                    log = StoreSyncLog(store_id=store_id, field_name=f'step_end_{step_id}', old_value=old_str, new_value=date_str, source='manual')
                    db.session.add(log)
                step.end_real_at = new_date
            else:
                if old_str:
                    log = StoreSyncLog(store_id=store_id, field_name=f'step_end_{step_id}', old_value=old_str, new_value=None, source='manual')
                    db.session.add(log)
                step.end_real_at = None
                
        # Recalcular duração
        if step.start_real_at and step.end_real_at:
            delta = step.end_real_at - step.start_real_at
            step.total_time_days = max(0.0, delta.days + (delta.seconds / 86400.0))
        elif step.start_real_at and not step.end_real_at:
            delta = datetime.now() - step.start_real_at
            step.total_time_days = max(0.0, delta.days + (delta.seconds / 86400.0))
        else:
            step.total_time_days = 0.0
            
        db.session.commit()
        
        # Log da acao como auditoria se o payload possuir email/sub
        log_audit(
            action="UPDATE_STEP_DATES",
            resource_type="TaskStep",
            resource_id=str(step.id),
            details=f"Atualizou a Step '{step.step_name}' ds loja {store_id} manualmente",
            user_id=payload.get('sub')
        )
        return jsonify({"status": "success"})
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"Formato invalido: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@main_bp.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

# --- Rotas de Configuração (Super Admin) ---

DEFAULT_CONFIGS = [
    # Metas Anuais
    {"key": "annual_mrr_target", "value": "180000", "description": "Meta anual de MRR (R$)", "category": "goals"},
    {"key": "annual_stores_target", "value": "180", "description": "Meta anual de lojas entregues", "category": "goals"},
    # Pesos
    {"key": "weight_matriz", "value": "1.0", "description": "Peso de pontuação para Matriz", "category": "weights"},
    {"key": "weight_filial", "value": "0.7", "description": "Peso de pontuação para Filial", "category": "weights"},
    # SLA
    {"key": "sla_implantation_days", "value": "90", "description": "SLA de implantação (dias)", "category": "sla"},
    {"key": "sla_integration_days", "value": "60", "description": "SLA de integração (dias)", "category": "sla"},
    # Notificações
    {"key": "slack_webhook_url", "value": "", "description": "Webhook URL do Slack para notificações", "category": "notifications"},
    {"key": "notify_sla_exceeded", "value": "true", "description": "Alertar quando SLA for ultrapassado", "category": "notifications"},
    {"key": "notify_weekly_summary", "value": "true", "description": "Enviar resumo semanal automático", "category": "notifications"},
    {"key": "notify_goal_achieved", "value": "true", "description": "Alertar quando meta mensal for batida", "category": "notifications"},
]

def seed_default_configs():
    """Insere configs padrão se não existirem."""
    from app.models import SystemConfig
    
    # Ensure category column exists (SQLite migration)
    try:
        db.session.execute(db.text("SELECT category FROM system_config LIMIT 1"))
    except Exception:
        db.session.rollback()
        try:
            db.session.execute(db.text("ALTER TABLE system_config ADD COLUMN category VARCHAR(50) DEFAULT 'general'"))
            db.session.commit()
        except Exception:
            db.session.rollback()
    
    for cfg_data in DEFAULT_CONFIGS:
        existing = SystemConfig.query.filter_by(key=cfg_data["key"]).first()
        if not existing:
            cfg = SystemConfig(
                key=cfg_data["key"],
                value=cfg_data["value"],
                description=cfg_data["description"],
                category=cfg_data.get("category", "general")
            )
            db.session.add(cfg)
        else:
            # Update description and category if missing
            if not existing.description:
                existing.description = cfg_data["description"]
            try:
                if not existing.category:
                    existing.category = cfg_data.get("category", "general")
            except Exception:
                pass
    db.session.commit()

@api_bp.route('/config', methods=['GET'])
@require_auth
def get_config(payload):
    from app.models import SystemConfig
    seed_default_configs()
    configs = SystemConfig.query.all()
    
    result = {}
    for c in configs:
        cat = c.category or 'general'
        if cat not in result:
            result[cat] = []
        result[cat].append({
            "key": c.key,
            "value": c.value,
            "description": c.description or "",
        })
    
    return jsonify(result)

@api_bp.route('/config', methods=['POST'])
@require_auth
@require_permission('manage_system')
def update_config(payload):
    from app.models import SystemConfig
    data = request.json
    
    for key, val in data.items():
        cfg = SystemConfig.query.filter_by(key=key).first()
        if not cfg:
            cfg = SystemConfig(key=key)
            db.session.add(cfg)
        cfg.value = str(val)
        
    db.session.commit()
    return jsonify({"status": "updated"})

# --- Rotas de Pausas (V4) ---

@api_bp.route('/stores/<int:id>/pauses', methods=['GET'])
@require_auth
def get_store_pauses(payload, id):
    from app.models import StorePause
    pauses = StorePause.query.filter_by(store_id=id).order_by(StorePause.start_date.desc()).all()
    
    results = []
    for p in pauses:
        duration = 0
        if p.end_date:
            duration = (p.end_date - p.start_date).days
        else:
            duration = (datetime.now() - p.start_date).days
            
        results.append({
            'id': p.id,
            'start_date': p.start_date.strftime('%Y-%m-%d'),
            'end_date': p.end_date.strftime('%Y-%m-%d') if p.end_date else None,
            'reason': p.reason,
            'duration': duration,
            'is_active': p.end_date is None
        })
    return jsonify(results)

@api_bp.route('/stores/<int:id>/pauses', methods=['POST'])
@require_auth
def add_store_pause(payload, id):
    from app.models import StorePause
    data = request.json
    
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d')
        reason = data.get('reason', 'Motivo não informado')
        
        # Verificar se já existe pausa aberta
        open_pause = StorePause.query.filter_by(store_id=id, end_date=None).first()
        if open_pause:
             return jsonify({'error': 'Já existe uma pausa em aberto para esta loja.'}), 400
             
        pause = StorePause(
            store_id=id,
            start_date=start_date,
            reason=reason
        )
        db.session.add(pause)
        db.session.commit()
        return jsonify({'status': 'created', 'id': pause.id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api_bp.route('/pauses/<int:pause_id>/close', methods=['PUT'])
def close_pause(pause_id):
    from app.models import StorePause
    data = request.json
    try:
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d')
        pause = StorePause.query.get_or_404(pause_id)
        
        if end_date < pause.start_date:
             return jsonify({'error': 'Data de fim deve ser maior que data de início'}), 400
             
        pause.end_date = end_date
        db.session.commit()
        return jsonify({'status': 'closed'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/pauses/<int:pause_id>', methods=['DELETE'])
def delete_pause(pause_id):
    from app.models import StorePause
    try:
        pause = StorePause.query.get_or_404(pause_id)
        db.session.delete(pause)
        db.session.commit()
        return jsonify({'status': 'deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/backup', methods=['POST'])
def manual_backup():
    try:
        from backup_manager import BackupManager
        success = BackupManager.run_backup()
        if success:
            return jsonify({'status': 'backup_created'}), 200
        else:
            return jsonify({'error': 'Backup failed. Check server logs.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

