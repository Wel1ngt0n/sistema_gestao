import requests
import json

try:
    response = requests.get('http://localhost:5000/api/analytics/trends?months=6')
    print(f"Status: {response.status_code}")
    data = response.json()
    print(json.dumps(data, indent=2))
    print(f"Total items: {len(data)}")
except Exception as e:
    print(f"Error: {e}")
