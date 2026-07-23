from app import create_app
from app.services.clickup import ClickUpService

app = create_app()
with app.app_context():
    service = ClickUpService()
    # Test archived: true
    data = service._get(f"list/{app.config['LIST_ID_PRINCIPAL']}/task", params={"page": 0, "archived": "true", "subtasks": "false"})
    
    tasks = data.get('tasks', [])
    print(f"Total returned with archived=true: {len(tasks)}")
    for t in tasks[:3]:
        print(f"Task {t['name']} - Archived: {t.get('archived')}")
