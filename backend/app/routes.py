from flask import Blueprint, jsonify, request, Response, stream_with_context
from app.models import db, Store
from app.services.metrics import MetricsService
from app.services.sync_service import SyncService
from datetime import datetime
from sqlalchemy import func, case

# Blueprint principal mantido para health checks e estrutura futura
main_bp = Blueprint('main', __name__)
api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Rotas da API (Backend React V2.5) ---

@api_bp.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    from app.models import SystemConfig
    from app.services.scoring_service import ScoringService
    
    # Carregar Pesos
    w_matriz = 1.0
    w_filial = 0.7
    
    try:
        cfg_m = SystemConfig.query.filter_by(key='weight_matriz').first()
        cfg_f = SystemConfig.query.filter_by(key='weight_filial').first()
        if cfg_m: w_matriz = float(cfg_m.value)
        if cfg_f: w_filial = float(cfg_f.value)
    except: pass

    all_stores = Store.query.all()
    active_stores = [s for s in all_stores if not s.effective_finished_at]
    concluded_stores = [s for s in all_stores if s.effective_finished_at]
    
    # 1. KPIs
    count_wip = len(active_stores)
    count_done = len(concluded_stores)
    
    # Calcular Pontos (WIP)
    total_points_wip = 0.0
    for s in active_stores:
        if s.tipo_loja == 'Matriz':
            total_points_wip += w_matriz
        else: # Filial
            total_points_wip += w_filial
            
    # Calcular Pontos (DONE)
    total_points_done = 0.0
    for s in concluded_stores:
        if s.tipo_loja == 'Matriz':
            total_points_done += w_matriz
        else:
            total_points_done += w_filial
    
    # % Prazo (Apenas concluídas)
    on_time = sum(1 for s in concluded_stores if s.dias_totais_implantacao <= (s.tempo_contrato or 90))
    pct_prazo = (on_time / count_done * 100) if count_done > 0 else 0
    
    # Métricas de MRR
    mrr_implantacao = sum(s.valor_mensalidade for s in active_stores if s.valor_mensalidade and s.status_norm != 'DONE')
    mrr_ja_pagando = sum(s.valor_mensalidade for s in all_stores if s.financeiro_status in ['Pago', 'Em dia'] and s.valor_mensalidade)
    mrr_devendo = sum(s.valor_mensalidade for s in all_stores if s.financeiro_status == 'Devendo' and s.valor_mensalidade)
    current_year = datetime.now().year
    mrr_concluidas_ano = sum(s.valor_mensalidade for s in concluded_stores if s.effective_finished_at and s.effective_finished_at.year == current_year and s.valor_mensalidade)

    # 2. Rankings (Implantador)
    kpi_by_imp = {}
    for s in active_stores:
        imp = s.implantador or 'N/A'
        if imp not in kpi_by_imp: kpi_by_imp[imp] = {"wip": 0, "done": 0, "on_time": 0}
        kpi_by_imp[imp]["wip"] += 1
        
    for s in concluded_stores:
        imp = s.implantador or 'N/A'
        if imp not in kpi_by_imp: kpi_by_imp[imp] = {"wip": 0, "done": 0, "on_time": 0}
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

    # 3. Top 10 Risco
    risk_list = []
    for s in active_stores:
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
            "etapa_parada": active_step_name, # Novo Campo
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
    for s in concluded_stores:
        if s.effective_finished_at:
            m_key = s.effective_finished_at.strftime('%m/%Y')
            evo_map[m_key] += 1
            
    # Ordenar por data (Mês/Ano)
    # Por segurança, usamos chaves datetime primeiro
    date_map = defaultdict(int) 
    for s in concluded_stores:
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
def get_stores():
    stores = Store.query.order_by(Store.created_at.desc()).all()
    
    # Helpers para o Frontend saber quem é Matriz
    matrices = [{'id': s.id, 'name': s.store_name} for s in stores if s.tipo_loja == 'Matriz']
    
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
            'dias_em_transito': s.dias_em_progresso, 
            'idle_days': s.idle_days,
            'risk_score': risk_score,
            'risk_breakdown': risk_data['breakdown'], # Novo
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
            'deep_sync_status': deep_status,
            'rede': s.rede,
            'tipo_loja': s.tipo_loja,
            'parent_id': s.parent_id,
            'parent_name': s.matriz.store_name if s.matriz else None,
            'delivered_with_quality': s.delivered_with_quality,
            'ai_prediction': analyzer.predict_store_completion(s.id)
        })
    return jsonify({"stores": results, "matrices": matrices})

@api_bp.route('/stores/<int:id>', methods=['DELETE'])
def delete_store(id):
    try:
        store = Store.query.get_or_404(id)
        
        # 1. Manual Cleanup of Dependencies without Cascade
        from app.models import MetricsSnapshotDaily
        MetricsSnapshotDaily.query.filter_by(store_id=id).delete()
        
        # 2. Delete Store (Cascades steps, logs, deep_sync, etc.)
        db.session.delete(store)
        db.session.commit()
        
        return jsonify({"status": "deleted", "id": id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api_bp.route('/store/<int:id>', methods=['PUT'])
def update_store(id):
    store = Store.query.get_or_404(id)
    data = request.json
    if not data: return jsonify({"error": "No data"}), 400
        
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
    
    if 'manual_finished_at' in data:
        date_str = data['manual_finished_at']
        old_val = store.manual_finished_at.strftime('%Y-%m-%d') if store.manual_finished_at else None
        if date_str:
            try: 
                new_date = datetime.strptime(date_str, '%Y-%m-%d')
                if old_val != date_str:
                    service.log_change(store, 'fim_manual', old_val, date_str, source='manual')
                store.manual_finished_at = new_date
            except: pass
        else:
            if old_val is not None:
                service.log_change(store, 'fim_manual', old_val, None, source='manual')
            store.manual_finished_at = None
            
    db.session.commit()
    return jsonify({"status": "success"})

@api_bp.route('/sync', methods=['POST'])
def sync_clickup():
    service = SyncService()
    result = service.run_sync()
    return jsonify(result)

@api_bp.route('/stores/bulk-link', methods=['POST'])
def bulk_link_stores():
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
def bulk_update_stores():
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
def get_store_logs(id):
    try:
        from app.models import StoreSyncLog
        logs = StoreSyncLog.query.filter_by(store_id=id).order_by(StoreSyncLog.changed_at.desc()).all()
        return jsonify([{
            'id': l.id,
            'field': l.field_name,
            'old': l.old_value,
            'new': l.new_value,
            'at': l.changed_at.strftime('%d/%m/%Y %H:%M'),
            'source': l.source
        } for l in logs]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/deep-sync/store/<int:id>', methods=['POST'])
def deep_sync_store(id):
    service = SyncService()
    result = service.run_deep_sync(id)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@api_bp.route('/sync/stream', methods=['GET'])
def sync_stream():
    service = SyncService()
    return Response(stream_with_context(service.run_sync_stream()), mimetype='text/event-stream')

@api_bp.route('/analyze/store/<int:id>', methods=['POST'])
def analyze_store(id):
    from app.services.llm_service import LLMService
    from app.models import Store
    from app.services.clickup import ClickUpService
    
    store = Store.query.get_or_404(id)
    
    # Fetch Comments from ClickUp
    clickup = ClickUpService()
    comments_list = []
    if store.clickup_task_id:
        try:
            raw_comments = clickup.get_task_comments(store.clickup_task_id)
            # Take last 15 comments to provide context
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
    
    return jsonify(result)

@api_bp.route('/steps', methods=['GET'])
def get_steps():
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
def get_store_steps(store_id):
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
            "start_date": s.start_real_at.strftime('%d/%m/%Y') if s.start_real_at else None,
            "end_date": s.end_real_at.strftime('%d/%m/%Y') if s.end_real_at else None,
            "duration": s.total_time_days,
            "idle": s.idle_days
        })
    return jsonify(results)

@main_bp.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

# --- Rotas de Configuração (Super Admin) ---
@api_bp.route('/config', methods=['GET'])
def get_config():
    from app.models import SystemConfig
    configs = SystemConfig.query.all()
    return jsonify({c.key: c.value for c in configs})

@api_bp.route('/config', methods=['POST'])
def update_config():
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
