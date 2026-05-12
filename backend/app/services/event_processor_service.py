from datetime import datetime
import json
import logging
from app.models import db, ZenviaWebhookEvent, SupportConversation, SupportMessage, SupportContact

logger = logging.getLogger(__name__)

def process_pending_zenvia_events():
    """
    Processa webhooks brutos da Zenvia e popula tabelas relacionais.
    """
    events = ZenviaWebhookEvent.query.filter_by(processed_at=None).all()
    stats = {"processed_count": 0, "new_conversations_count": 0, "errors_count": 0}
    
    for event in events:
        try:
            payload = json.loads(event.raw_payload)
            if event.event_type in ['MESSAGE', 'CONVERSATION_MESSAGE']:
                created = _process_message(payload, event.channel, event.timestamp)
                if created:
                    stats["new_conversations_count"] += 1
            elif event.event_type == 'MESSAGE_STATUS':
                _process_message_status(payload)
            elif event.event_type == 'CONVERSATION_STATUS':
                _process_conversation_status(payload, event.channel)
            
            event.processed_at = datetime.utcnow()
            db.session.commit()
            stats["processed_count"] += 1
        except Exception as e:
            db.session.rollback()
            stats["errors_count"] += 1
            logger.error(f"Erro ao processar evento Zenvia {event.id}: {str(e)}")
            
    return stats

def _parse_payload_datetime(*values):
    for value in values:
        if not value:
            continue
        for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(str(value), fmt)
            except Exception:
                pass
    return datetime.utcnow()

def _process_message(payload, channel, event_timestamp=None):
    # No evento MESSAGE, os dados estao dentro de payload['message']
    msg_data = payload.get('message', {})
    msg_id = msg_data.get('id') or payload.get('messageId')
    direction = msg_data.get('direction', 'IN')
    
    # Extrair contato
    from_num = msg_data.get('from')
    to_num = msg_data.get('to')
    contact_phone = from_num if direction == 'IN' else to_num
    
    if not contact_phone or not msg_id:
        return False # Nao processa se nao houver telefone/id de mensagem

    visitor = msg_data.get('visitor', {})
    visitor_name = visitor.get('name') or f"{visitor.get('firstName', '')} {visitor.get('lastName', '')}".strip() or "Desconhecido"
    
    contact = SupportContact.query.filter_by(phone=contact_phone).first()
    if not contact:
        contact = SupportContact(zenvia_contact_id=contact_phone, phone=contact_phone, name=visitor_name)
        db.session.add(contact)
        db.session.flush()
    elif contact.name == "Desconhecido" and visitor_name != "Desconhecido":
        contact.name = visitor_name

    # Usa o ID de conversa do payload quando existir; senao cria uma chave estavel.
    conv_data = payload.get('conversation', {})
    conv_id_str = conv_data.get('id') or payload.get('conversationId') or f"conv_{contact_phone}"
    message_ts = _parse_payload_datetime(msg_data.get('timestamp'), payload.get('timestamp'), event_timestamp)
    
    conversation = SupportConversation.query.filter_by(zenvia_conversation_id=conv_id_str).first()
    created_conversation = False
    if not conversation:
        conversation = SupportConversation(
            zenvia_conversation_id=conv_id_str,
            contact_id=contact.id,
            channel=channel,
            from_number=from_num,
            to_number=to_num,
            status="OPEN",
            created_at_zenvia=message_ts,
            last_message_at=message_ts
        )
        db.session.add(conversation)
        db.session.flush()
        created_conversation = True
    else:
        if not conversation.created_at_zenvia:
            conversation.created_at_zenvia = message_ts
        conversation.last_message_at = message_ts
        conversation.from_number = conversation.from_number or from_num
        conversation.to_number = conversation.to_number or to_num

    msg = SupportMessage.query.filter_by(zenvia_message_id=msg_id).first()
    if not msg:
        contents = msg_data.get('contents', [{}])
        content_type = contents[0].get('type', 'text')
        text = contents[0].get('text', '')
        msg = SupportMessage(
            zenvia_message_id=msg_id,
            conversation_id=conversation.id,
            direction=direction,
            channel=channel,
            content_type=content_type,
            text=text,
            status="SENT" if direction == "OUT" else "RECEIVED",
            timestamp=message_ts
        )
        db.session.add(msg)
    return created_conversation

def _process_message_status(payload):
    msg_id = payload.get('messageId')
    status_code = payload.get('messageStatus', {}).get('code')
    if msg_id:
        msg = SupportMessage.query.filter_by(zenvia_message_id=msg_id).first()
        if msg:
            msg.status = status_code

def _process_conversation_status(payload, channel):
    conv_id_str = payload.get('conversationId')
    status = payload.get('status')
    status_ts = _parse_payload_datetime(payload.get('timestamp'))
    if conv_id_str:
        conversation = SupportConversation.query.filter_by(zenvia_conversation_id=conv_id_str).first()
        if conversation:
            conversation.status = status
            if status == "CLOSED":
                conversation.closed_at = status_ts
                if conversation.created_at_zenvia:
                    conversation.resolution_time_seconds = int((status_ts - conversation.created_at_zenvia).total_seconds())
