from app import create_app
from app.models import ZenviaWebhookEvent
import json

app = create_app()
with app.app_context():
    msgs = ZenviaWebhookEvent.query.filter_by(event_type='MESSAGE').all()
    print(f"Total eventos MESSAGE: {len(msgs)}")
    for e in msgs[:2]:
        print(f"\nPayload: {e.raw_payload}")
