
import sys
from app import create_app
from app.services.clickup import ClickUpService
from config import Config
import json
from datetime import datetime

app = create_app()

def debug_task(task_id):
    with app.app_context():
        service = ClickUpService()
        print(f"--- Debugging Task {task_id} ---")
        
        # 1. Fetch Task Details directly
        data = service._get(f"task/{task_id}")
        if not data:
            print("❌ Task not found via API.")
            return

        print(f"Name: {data.get('name')}")
        print(f"ID: {data.get('id')}")
        print(f"List: {data.get('list', {}).get('name')} (ID: {data.get('list', {}).get('id')})")
        print(f"Status: {data.get('status', {}).get('status')}")
        
        date_updated = data.get('date_updated')
        if date_updated:
            dt = datetime.fromtimestamp(int(date_updated)/1000)
            print(f"Date Updated: {dt}")
        
        # Check against Config
        print(f"\n--- Configuration Check ---")
        print(f"Expected Main List ID: {Config.LIST_ID_PRINCIPAL}")
        
        if data.get('list', {}).get('id') != Config.LIST_ID_PRINCIPAL:
            print("⚠️ MISMATCH: Task is NOT in the Main List!")
        else:
            print("✅ Task is in the correct Main List.")

        # Check Custom ID
        print(f"Custom ID from Task: {data.get('custom_id')}")

if __name__ == "__main__":
    debug_task("86aef79q0")
