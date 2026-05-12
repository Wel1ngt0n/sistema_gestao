import os
import json
import logging
from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from app.models import db, ZenviaWebhookEvent, SystemConfig
from app.services.security_service import require_auth, require_permission

webhook_bp = Blueprint('webhook_bp', __name__)
logger = logging.getLogger(__name__)

@webhook_bp.route('/api/webhooks/zenvia', methods=['POST'])
def zenvia_webhook():
    # 1. Validacao do token de seguranca.
    token = request.headers.get("X-Zenvia-Token")
    
    # Busca o token no banco ou usa variavel de ambiente como fallback.
    db_token = SystemConfig.query.filter_by(key='webhook_token').first()
    valid_token = db_token.value if db_token and db_token.value else os.environ.get("ZENVIA_WEBHOOK_TOKEN", "my-secret-token")
    if os.environ.get("FLASK_ENV") == "production" and valid_token == "my-secret-token":
        logger.error("[Zenvia Webhook] Token default detectado em producao. Configure ZENVIA_WEBHOOK_TOKEN.")
        return jsonify({"error": "Webhook nao configurado"}), 503
    
    if token != valid_token:
        return jsonify({"error": "Nao autorizado"}), 401
    
    payload = request.json
    if not payload:
        return jsonify({"error": "Payload ausente"}), 400

    # Formato esperado pela Zenvia: id, type, subscriptionId, timestamp e channel.
    event_id = payload.get('id')
    event_type = payload.get('type')
    
    if not event_id or not event_type:
        return jsonify({"error": "Missing event id or type"}), 400
        
    subscription_id = payload.get('subscriptionId')
    channel = payload.get('channel')
    timestamp_str = payload.get('timestamp')
    
    # 2. Persiste rapido e garante idempotencia por event_id.
    try:
        new_event = ZenviaWebhookEvent(
            event_id=event_id,
            event_type=event_type,
            subscription_id=subscription_id,
            channel=channel,
            timestamp=timestamp_str,
            raw_payload=json.dumps(payload),
            created_at=datetime.utcnow()
        )
        db.session.add(new_event)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # Evento duplicado: retorna 200 para a Zenvia parar novas tentativas.
        return jsonify({"message": "Evento ja processado"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"[Zenvia Webhook] Erro ao salvar evento: {str(e)}")
        return jsonify({"error": "Erro interno do servidor"}), 500

    # 3. O processador em lote trata eventos pendentes com processed_at=None.
    
    return jsonify({"message": "Evento recebido com sucesso"}), 200

@webhook_bp.route('/api/webhooks/events', methods=['GET'])
@require_auth
@require_permission("webhooks:view")
def get_webhook_events(_payload):
    # Retorna os ultimos eventos recebidos para diagnostico no dashboard.
    events = ZenviaWebhookEvent.query.order_by(ZenviaWebhookEvent.id.desc()).limit(20).all()
    return jsonify([{
        "id": e.id,
        "payload_type": e.event_type or 'Unknown',
        "received_at": e.created_at.strftime('%d/%m %H:%M:%S') if e.created_at else '---',
        "processed_at": e.processed_at.strftime('%d/%m %H:%M:%S') if e.processed_at else None,
        "status": "Processado" if e.processed_at else "Pendente"
    } for e in events])
