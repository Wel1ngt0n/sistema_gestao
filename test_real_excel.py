import requests
import json
import traceback

base_url = "http://localhost:5003"
r1 = requests.get(f"{base_url}/api/reports/monthly-implantation")
payload = r1.json()

if "months" in payload and len(payload["months"]) > 0:
    full_data = payload["months"][0]
    # We need to inject annual_goals and wip_overview as the frontend does:
    full_data["annual_goals"] = payload.get("annual_goals")
    full_data["wip_overview"] = payload.get("wip_overview")
    
    print("Testing month:", full_data.get("month"))
    try:
        r2 = requests.post(f"{base_url}/api/reports/monthly-implantation/export-excel", json=full_data)
        print("Excel Gen Status:", r2.status_code)
        if r2.status_code == 500:
            print(r2.text)
    except Exception as e:
        print("Error calling excel API", e)
