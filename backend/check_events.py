from app import create_app
from app.models import ZenviaWebhookEvent, SupportConversation, SupportMessage, SupportContact

app = create_app()
with app.app_context():
    events = ZenviaWebhookEvent.query.all()
    print(f"Total eventos recebidos: {len(events)}")
    for e in events:
        print(f" - [{e.event_type}] Recebido em: {e.received_at}")

    convs = SupportConversation.query.all()
    print(f"\nTotal Conversas: {len(convs)}")
    
    msgs = SupportMessage.query.all()
    print(f"Total Mensagens: {len(msgs)}")
