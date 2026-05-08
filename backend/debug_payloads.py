from app import create_app
from app.models import ZenviaWebhookEvent
import json

app = create_app()
with app.app_context():
    events = ZenviaWebhookEvent.query.all()
    print(f"Total eventos: {len(events)}")
    for e in events[:5]:
        print(f"\nID: {e.id} | Tipo: {e.event_type}")
        print(f"Payload: {e.raw_payload[:200]}...")
