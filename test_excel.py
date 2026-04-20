import requests
import json

url = "http://localhost:5003/api/reports/monthly-implantation/export-excel"
payload = {
    "month": "03/2026",
    # minimal payload to trigger it
}

try:
    resp = requests.post(url, json=payload)
    print("STATUS:", resp.status_code)
    try:
        print("RESPONSE:", resp.json())
    except:
        print("RESPONSE TEXT:", resp.text)
except Exception as e:
    print(e)
