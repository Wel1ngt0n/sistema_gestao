from flask import Blueprint, jsonify, request
from app.models import SupportConversation, SupportMessage, SupportContact, db
from app.services.event_processor_service import process_pending_zenvia_events

support_bp = Blueprint('support_bp', __name__)

@support_bp.route('/api/support/kpis', methods=['GET'])
def get_kpis():
    open_convs = SupportConversation.query.filter_by(status='OPEN').count()
    closed_convs = SupportConversation.query.filter_by(status='CLOSED').count()
    msgs_in = SupportMessage.query.filter_by(direction='IN').count()
    msgs_out = SupportMessage.query.filter_by(direction='OUT').count()
    
    return jsonify({
        "open_conversations": open_convs,
        "closed_conversations": closed_convs,
        "messages_in": msgs_in,
        "messages_out": msgs_out,
        "avg_response_time": "15m" # Placeholder for MVP
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
    # Pega as últimas 50 mensagens
    messages = SupportMessage.query.order_by(SupportMessage.id.desc()).limit(50).all()
    return jsonify([{
        "id": m.id,
        "text": m.text,
        "direction": m.direction,
        "status": m.status,
        "contact_name": m.conversation.contact.name,
        "timestamp": m.timestamp.isoformat() if m.timestamp else None
    } for m in messages])

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
        return jsonify({
            "status": "success", 
            "processed": results.get('processed_count', 0),
            "conversations": results.get('new_conversations_count', 0)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
