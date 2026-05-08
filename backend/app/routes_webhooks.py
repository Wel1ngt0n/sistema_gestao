import os
import json
from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from app.models import db, ZenviaWebhookEvent, SystemConfig

webhook_bp = Blueprint('webhook_bp', __name__)

@webhook_bp.route('/api/webhooks/zenvia', methods=['POST'])
def zenvia_webhook():
    # 1. Validação do Token de Segurança
    token = request.headers.get("X-Zenvia-Token")
    
    # Busca o token no DB ou usa a env var como fallback
    db_token = SystemConfig.query.filter_by(key='webhook_token').first()
    valid_token = db_token.value if db_token and db_token.value else os.environ.get("ZENVIA_WEBHOOK_TOKEN", "my-secret-token")
    
    if token != valid_token:
        return jsonify({"error": "Unauthorized"}), 401
    
    payload = request.json
    if not payload:
        return jsonify({"error": "No payload"}), 400

    # O formato da Zenvia para webhooks geralmente tem 'id', 'type', 'subscriptionId', 'timestamp', 'channel'
    event_id = payload.get('id')
    event_type = payload.get('type')
    
    if not event_id or not event_type:
        return jsonify({"error": "Missing event id or type"}), 400
        
    subscription_id = payload.get('subscriptionId')
    channel = payload.get('channel')
    timestamp_str = payload.get('timestamp')
    
    # 2. Persistir no banco rapidamente (Idempotência por event_id)
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
        # Evento já processado/duplicado, retornamos 200 para a Zenvia parar de enviar
        return jsonify({"message": "Event already processed"}), 200
    except Exception as e:
        db.session.rollback()
        # Logar erro mas idealmente tentar não falhar o webhook para evitar quebra. 
        # Em producao, melhor usar logger.
        print(f"[Zenvia Webhook] Erro ao salvar evento: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500

    # 3. Disparar processamento assíncrono (ou delegar para cron job depois)
    # Por agora, para o MVP com performance e sem filas, o dado foi salvo de forma rápida.
    # O event_processor.py processará de forma assíncrona/batch os eventos com processed_at=None.
    
    return jsonify({"message": "Event received successfully"}), 200
