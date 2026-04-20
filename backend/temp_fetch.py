import os
import requests
from dotenv import load_dotenv

load_dotenv()
token = os.getenv('CLICKUP_API_KEY')
list_id = '211110999'

url = f"https://api.clickup.com/api/v2/list/{list_id}"
headers = {"Authorization": token}
r = requests.get(url, headers=headers)

if r.status_code == 200:
    print('STATUSES:')
    for s in r.json().get('statuses', []):
        print(s['status'], s['color'])
else:
    print('Failed', r.status_code, r.text)
