import os
import requests
from dotenv import load_dotenv

load_dotenv('c:\\Users\\welin\\OneDrive\\Documentos\\clickup2.5\\sistema_gestão2.5\\backend\\.env')
CLICKUP_API_KEY = os.getenv("CLICKUP_API_KEY")

headers = {
    "Authorization": CLICKUP_API_KEY,
    "Content-Type": "application/json"
}

list_id = "211110999"  # INTEGRACAO
url = f"https://api.clickup.com/api/v2/list/{list_id}/task"

def fetch_all():
    page = 0
    all_tasks = []
    while True:
        params = {
            "page": page,
            "subtasks": "true",
            "include_closed": "true",
            "archived": "false",
            "limit": 100
        }
        res = requests.get(url, headers=headers, params=params)
        data = res.json()
        tasks = data.get('tasks', [])
        if not tasks:
            break
        all_tasks.extend(tasks)
        if len(tasks) < 100:
            break
        page += 1
    return all_tasks

print("Fetching active tasks...")
tasks = fetch_all()
print(f"Total active tasks: {len(tasks)}")

for t in tasks:
    name = t.get('name', '').lower()
    if 'medeiros' in name:
        print(f"FOUND ACTIVE: {t.get('name')} | Status: {t.get('status', {}).get('status')}")

def fetch_all_archived():
    page = 0
    all_tasks = []
    while True:
        params = {
            "page": page,
            "subtasks": "true",
            "include_closed": "true",
            "archived": "true",
            "limit": 100
        }
        res = requests.get(url, headers=headers, params=params)
        data = res.json()
        tasks = data.get('tasks', [])
        if not tasks:
            break
        all_tasks.extend(tasks)
        if len(tasks) < 100:
            break
        page += 1
    return all_tasks

print("\nFetching archived tasks...")
arch_tasks = fetch_all_archived()
print(f"Total archived tasks: {len(arch_tasks)}")

for t in arch_tasks:
    name = t.get('name', '').lower()
    if 'medeiros' in name:
        print(f"FOUND ARCHIVED: {t.get('name')} | Status: {t.get('status', {}).get('status')}")
