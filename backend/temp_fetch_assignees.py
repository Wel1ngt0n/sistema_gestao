import os
import requests
from dotenv import load_dotenv

load_dotenv()
token = os.getenv('CLICKUP_API_KEY')
list_id = '211110999'

url = f"https://api.clickup.com/api/v2/list/{list_id}/task?include_closed=true&subtasks=true"
headers = {"Authorization": token}
r = requests.get(url, headers=headers)

if r.status_code == 200:
    tasks = r.json().get('tasks', [])
    assignees = {}
    for task in tasks:
        for assignee in task.get('assignees', []):
            assignees[assignee['id']] = assignee['username']
    
    print('ASSIGNEES_FOUND:')
    for uid, name in assignees.items():
        print(f"ID: {uid} | Name: {name}")
    
    # Also let's check custom fields just in case 'Integrador' is a custom field
    list_url = f"https://api.clickup.com/api/v2/list/{list_id}/field"
    r2 = requests.get(list_url, headers=headers)
    if r2.status_code == 200:
        fields = r2.json().get('fields', [])
        for f in fields:
            if 'integrador' in f['name'].lower() or 'respons' in f['name'].lower():
                print(f"FOUND CUSTOM FIELD: {f['name']}")
                if 'options' in f.get('type_config', {}):
                    for opt in f['type_config']['options']:
                        print(f"  - Option: {opt.get('name')}")
else:
    print('Failed', r.status_code, r.text)
