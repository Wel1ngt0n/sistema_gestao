from app import create_app, db
from app.models import *

app = create_app()

with app.app_context():
    print("Removendo todas as tabelas...")
    db.drop_all()
    print("Criando todas as tabelas (schema V2.5)...")
    db.create_all()
    
    # Inicializa SyncState.
    if not SyncState.query.get(1):
        print("Inicializando SyncState...")
        db.session.add(SyncState(id=1))
        db.session.commit()
        
    print("Banco reiniciado com sucesso.")
