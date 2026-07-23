from app import create_app
from app.services.clickup import ClickUpService

app = create_app()
with app.app_context():
    service = ClickUpService()
    # List ID for INTEGRACAO is 211110999
    data = service._get(f"list/211110999/task", params={"page": 0, "subtasks": "false"})
    
    tasks = data.get('tasks', [])
    print(f"Total returned: {len(tasks)}")
    for t in tasks:
        name = t.get('name', '').lower()
        if 'medeiros' in name:
            print(f"Task: {t.get('name')} | Status: {t.get('status', {}).get('status')}")
