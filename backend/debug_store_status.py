from app import create_app
from app.models import db, Store
from app.services.metrics import MetricsService

app = create_app()

with app.app_context():
    # 1. Find the store
    search = "Mix Bahia Vilas"
    store = Store.query.filter(Store.store_name.ilike(f"%{search}%")).first()
    
    if not store:
        print(f"Store '{search}' not found!")
    else:
        print(f"--- STORE BEFORE ---")
        print(f"Name: {store.store_name}")
        print(f"Status: {store.status}")
        print(f"Status Norm: {store.status_norm}")
        print(f"Manual Finished At: {store.manual_finished_at}")
        print(f"Finished At: {store.finished_at}")
        
        # Check Steps
        print(f"--- TRAINING STEP ---")
        training_step = None
        for s in store.steps:
            if "TREINAMENTO" in s.step_list_name:
                training_step = s
                print(f"Step: {s.step_name} | Status: {s.status} | End: {s.end_real_at}")
        
        # 2. Apply Rule
        print(f"--- APPLYING RULE ---")
        metrics = MetricsService()
        metrics.apply_training_completion_rule(store)
        
        if db.session.dirty:
            print("Changes detected!")
            db.session.commit()
            print("Saved.")
        else:
            print("No changes detected by SQLAlchemy.")
            
        print(f"--- STORE AFTER ---")
        print(f"Status: {store.status}")
        print(f"Status Norm: {store.status_norm}")
        print(f"Finished At: {store.finished_at}")
