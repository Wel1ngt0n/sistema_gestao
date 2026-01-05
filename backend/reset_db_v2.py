from app import create_app, db
from app.models import *

app = create_app()

with app.app_context():
    print("Dropping all tables...")
    db.drop_all()
    print("Creating all tables (V2.5 Schema)...")
    db.create_all()
    
    # Init SyncState
    if not SyncState.query.get(1):
        print("Initializing SyncState...")
        db.session.add(SyncState(id=1))
        db.session.commit()
        
    print("Database reset successfully.")
