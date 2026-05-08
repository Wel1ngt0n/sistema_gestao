from flask import Blueprint, jsonify, request
from app.models import SupportConversation, SupportMessage, SupportContact, SupportAgentPerformance, SystemConfig, db
from datetime import datetime
import os
import glob
from app.services.event_processor_service import process_pending_zenvia_events
from app.services.support_importer import (
    import_zenvia_activities_csv,
    enrich_contacts_from_conversations_csv,
    import_agent_performance_csv,
    import_agents_status_csv,
    calculate_agent_nps
)

support_bp = Blueprint('support_bp', __name__)

@support_bp.route('/api/support/kpis', methods=['GET'])
def get_kpis():
    period = request.args.get('period', datetime.now().strftime('%Y-%m'))
    
    # Filtro por mês para conversas e mensagens
    # Busca por string prefixo (YYYY-MM) no created_at_zenvia
    open_convs = SupportConversation.query.filter_by(status='OPEN').count()
    
    # Para dados históricos, filtramos pelo mês
    closed_convs = SupportConversation.query.filter(
        SupportConversation.status == 'CLOSED',
        db.cast(SupportConversation.created_at_zenvia, db.String).like(f"{period}%")
    ).count()
    
    msgs_in = SupportMessage.query.filter(
        SupportMessage.direction == 'IN',
        db.cast(SupportMessage.timestamp, db.String).like(f"{period}%")
    ).count()
    
    msgs_out = SupportMessage.query.filter(
        SupportMessage.direction == 'OUT',
        db.cast(SupportMessage.timestamp, db.String).like(f"{period}%")
    ).count()
    
    # Busca o último sync nas configurações
    last_sync = SystemConfig.query.filter_by(key='last_support_sync').first()
    
    return jsonify({
        "open_conversations": open_convs,
        "closed_conversations": closed_convs,
        "messages_in": msgs_in,
        "messages_out": msgs_out,
        "avg_response_time": "15m", # Placeholder for MVP
        "last_sync": last_sync.value if last_sync else "Nunca"
    })

@support_bp.route('/api/support/orphans', methods=['GET'])
def get_orphans():
    # Retorna contatos que não têm store_id (sistema) nem linked_store_name (legado)
    contacts = SupportContact.query.filter(
        SupportContact.store_id.is_(None),
        SupportContact.linked_store_name.is_(None)
    ).all()
    return jsonify([{
        "id": c.id, 
        "phone": c.phone, 
        "name": c.name,
        "created_at": c.created_at_zenvia.isoformat() if c.created_at_zenvia else None
    } for c in contacts])

@support_bp.route('/api/support/messages', methods=['GET'])
def get_recent_messages():
    # Pega as últimas 50 mensagens por timestamp
    messages = SupportMessage.query.order_by(SupportMessage.timestamp.desc()).limit(50).all()
    result = []
    for m in messages:
        contact_name = "Desconhecido"
        try:
            if m.conversation and m.conversation.contact:
                contact_name = m.conversation.contact.name or "Desconhecido"
        except:
            pass
        result.append({
            "id": m.id,
            "text": m.text,
            "direction": m.direction,
            "status": m.status,
            "contact_name": contact_name,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None
        })
    return jsonify(result)

@support_bp.route('/api/support/link-store', methods=['POST'])
def link_store():
    data = request.json
    contact_id = data.get('contact_id')
    store_name = data.get('store_name')
    
    contact = SupportContact.query.get(contact_id)
    if contact:
        contact.linked_store_name = store_name
        db.session.commit()
        return jsonify({"status": "success", "message": f"Contato vinculado à loja {store_name}"})
    
    return jsonify({"status": "error", "message": "Contato não encontrado"}), 404

@support_bp.route('/api/support/sync', methods=['POST'])
def sync_data():
    try:
        results = process_pending_zenvia_events()
        
        # Salva o horário do último sync no DB
        sync_time = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        config = SystemConfig.query.filter_by(key='last_support_sync').first()
        if config:
            config.value = sync_time
        else:
            config = SystemConfig(key='last_support_sync', value=sync_time, category='webhooks', description='Última sincronização manual de eventos de suporte')
            db.session.add(config)
        
        db.session.commit()

        return jsonify({
            "status": "success", 
            "processed": results.get('processed_count', 0),
            "conversations": results.get('new_conversations_count', 0),
            "last_sync": sync_time
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@support_bp.route('/api/support/import-csv', methods=['POST', 'OPTIONS'])
def import_csv():
    """
    Orquestra a importação de múltiplos arquivos CSV enviados pelo usuário.
    Ordem: Conversas → Atividades → Performance → Agentes → Cálculo NPS
    """
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    try:
        # Debug logs para Render
        print(f"--- IMPORT CSV DEBUG ---")
        print(f"FILES KEYS: {list(request.files.keys())}")
        print(f"FORM KEYS: {list(request.form.keys())}")

        # Pega todos os arquivos enviados (independente da chave) para validar se há algo
        if not request.files:
            print("ERROR: No files in request.files")
            return jsonify({"status": "error", "message": "Nenhum arquivo enviado."}), 400

        # Pega o período manual (YYYY-MM) se enviado, senão usa o atual
        period = request.form.get('period')
        if not period:
            period = datetime.now().strftime('%Y-%m')
        
        print(f"IMPORT PERIOD: {period}")

        results = []
        
        # 1. Processar planilhas de Cadastro (NPS e Contatos)
        conversas_files = request.files.getlist('conversas')
        for f in conversas_files:
            stats = enrich_contacts_from_conversations_csv(f, period=period)
            results.append({"file": f.filename, "type": "contact_enrichment", "stats": stats})

        # 2. Processar planilhas de Atividades (Mensagens)
        activities_files = request.files.getlist('activities')
        for f in activities_files:
            stats = import_zenvia_activities_csv(f, period=period)
            results.append({"file": f.filename, "type": "message_import", "stats": stats})

        # 3. Processar planilhas de Performance (KPIs Agregados)
        performance_files = request.files.getlist('performance')
        for f in performance_files:
            stats = import_agent_performance_csv(f, period=period)
            results.append({"file": f.filename, "type": "agent_performance", "stats": stats})

        # 4. Processar planilha de Agentes (Estado Atual)
        agents_files = request.files.getlist('agents')
        for f in agents_files:
            stats = import_agents_status_csv(f, period=period)
            results.append({"file": f.filename, "type": "agent_status", "stats": stats})

        # 5. Calcular NPS por Atendente (Pós-processamento)
        nps_stats = calculate_agent_nps(period=period)
        results.append({"file": "NPS Calculation", "type": "nps_calculation", "stats": nps_stats})

        if not results:
            return jsonify({"status": "error", "message": "Nenhum arquivo compatível encontrado entre os enviados."}), 400
            
        # Salva timestamp da última importação
        sync_time = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        config = SystemConfig.query.filter_by(key='last_support_import').first()
        if config:
            config.value = sync_time
        else:
            db.session.add(SystemConfig(key='last_support_import', value=sync_time, category='import', description='Última importação de CSV'))
        db.session.commit()

        return jsonify({"status": "success", "results": results})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@support_bp.route('/api/support/periods', methods=['GET'])
def get_periods():
    """
    Retorna a lista de meses únicos (YYYY-MM) que possuem dados de performance.
    """
    periods = db.session.query(SupportAgentPerformance.period).distinct().order_by(SupportAgentPerformance.period.desc()).all()
    result = [p.period for p in periods if p.period]
    
    # Se não houver períodos no banco, retorna o mês atual como fallback
    if not result:
        result = [datetime.now().strftime('%Y-%m')]
        
    return jsonify(result)

# ============================================================
# NOVOS ENDPOINTS: PERFORMANCE DA EQUIPE
# ============================================================

@support_bp.route('/api/support/agent-performance', methods=['GET'])
def get_agent_performance():
    """
    Retorna os dados de performance de todos os atendentes.
    Query params: ?period=2026-05 (opcional, default=mês atual)
    """
    period = request.args.get('period', datetime.now().strftime('%Y-%m'))
    
    agents = SupportAgentPerformance.query.filter_by(period=period).all()
    
    # Se não houver dados no período solicitado (ex: mês atual), busca o período mais recente disponível
    if not agents:
        latest_perf = SupportAgentPerformance.query.order_by(SupportAgentPerformance.period.desc()).first()
        if latest_perf:
            period = latest_perf.period
            agents = SupportAgentPerformance.query.filter_by(period=period).all()
    
    return jsonify([{
        "id": a.id,
        "agent_name": a.agent_name,
        "period": a.period,
        "group_name": a.group_name,
        "total_contacts": a.total_contacts,
        "total_conversations": a.total_conversations,
        "new_conversations": a.new_conversations,
        "closed_conversations": a.closed_conversations,
        "total_messages_sent": a.total_messages_sent,
        "avg_response_time_seconds": a.avg_response_time_seconds,
        "avg_close_time_seconds": a.avg_close_time_seconds,
        "avg_nps": a.avg_nps,
        "nps_count": a.nps_count,
        "last_activity_at": a.last_activity_at.isoformat() if a.last_activity_at else None,
        "activities_today": a.activities_today,
        "pending_tickets": a.pending_tickets,
        "open_tickets": a.open_tickets
    } for a in agents])

@support_bp.route('/api/support/nps-feedbacks', methods=['GET'])
def get_nps_feedbacks():
    """
    Retorna as últimas conversas que tiveram NPS atribuído, com nome do atendente.
    """
    convs = SupportConversation.query.filter(
        SupportConversation.nps_score.isnot(None)
    ).order_by(SupportConversation.created_at_zenvia.desc()).limit(50).all()
    
    return jsonify([{
        "id": c.id,
        "agent_name": c.agent_name,
        "nps_score": c.nps_score,
        "nps_comment": c.nps_comment,
        "contact_name": c.contact.name if c.contact else "Desconhecido",
        "date": c.created_at_zenvia.isoformat() if c.created_at_zenvia else None
    } for c in convs])
