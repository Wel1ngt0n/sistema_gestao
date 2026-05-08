from app import create_app
from app.models import db, ZenviaWebhookEvent, SupportConversation, SupportMessage
from app.services.event_processor_service import process_pending_zenvia_events

app = create_app()
with app.app_context():
    print("Iniciando processamento de eventos pendentes...")
    process_pending_zenvia_events()
    print("Processamento concluído.")
    
    convs = SupportConversation.query.count()
    msgs = SupportMessage.query.count()
    print(f"\nResultado final:")
    print(f"- Conversas criadas: {convs}")
    print(f"- Mensagens processadas: {msgs}")
