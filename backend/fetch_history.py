from app import create_app
from app.models import db, SupportContact, SupportConversation, SupportMessage, ZenviaWebhookEvent
import json

app = create_app()
with app.app_context():
    contact = SupportContact.query.filter_by(phone='5561995515999').first()
    if not contact:
        print("Contato não encontrado.")
    else:
        print(f"--- DADOS DO CONTATO ---")
        print(f"Nome: {contact.name}")
        print(f"Telefone: {contact.phone}")
        
        convs = SupportConversation.query.filter_by(contact_id=contact.id).all()
        for conv in convs:
            print(f"\n--- CONVERSA (ID: {conv.zenvia_conversation_id}) ---")
            print(f"Status: {conv.status}")
            print(f"Início (Sistema): {conv.updated_at}")
            print(f"Fim (Zenvia): {conv.closed_at}")
            
            msgs = SupportMessage.query.filter_by(conversation_id=conv.id).order_by(SupportMessage.timestamp).all()
            print(f"\n--- MENSAGENS ({len(msgs)}) ---")
            for m in msgs:
                dir_icon = "📥" if m.direction == "IN" else "📤"
                print(f"{dir_icon} [{m.timestamp}] ({m.status}): {m.text}")
