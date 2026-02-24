
import sys
from app import create_app, db
from app.services.clickup import ClickUpService
from app.services.metrics import MetricsService
from app.models import Store

def force_sync(task_id):
    app = create_app()
    with app.app_context():
        clickup = ClickUpService()
        metrics = MetricsService()
        
        print(f"--- Forcing Sync for Task {task_id} ---")
        
        # 1. Fetch Task
        data = clickup._get(f"task/{task_id}")
        if not data:
             print("❌ Task not found in ClickUp.")
             return
             
        print(f"DEBUG: Keys fetched: {list(data.keys())}")
        print(f"DEBUG: Name: {data.get('name')}")
        print(f"DEBUG: ID: {data.get('id')}")

             
        # 2. Process
        try:
            store = metrics.process_store_data(data)
            db.session.commit()
            print(f"✅ Success! Store '{store.store_name}' (ID: {store.id}) synced/updated.")
            
            # Verify
            s = Store.query.get(store.id)
            print(f"   Status: {s.status}")
            print(f"   Custom ID: {s.custom_store_id}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error processing task: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python force_sync_store.py <task_id>")
        sys.exit(1)
    
    force_sync(sys.argv[1])
