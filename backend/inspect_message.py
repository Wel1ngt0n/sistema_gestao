from app import create_app
from app.models import ZenviaWebhookEvent
import json

app = create_app()
with app.app_context():
    e = ZenviaWebhookEvent.query.filter_by(event_type='MESSAGE').first()
    if e:
        print(f"Tipo: {e.event_type}")
        print(f"Payload: {e.raw_payload}")
    else:
        print("Nenhum evento MESSAGE encontrado.")
