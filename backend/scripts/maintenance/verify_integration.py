import requests
import sys

BASE_URL = "http://localhost:5003/api/integration"

def test_endpoint(url):
    try:
        print(f"Testing {url}...", end=" ")
        resp = requests.get(url)
        if resp.status_code == 200:
            print("OK")
            # print(resp.json())
        else:
            print(f"FAILED ({resp.status_code})")
            print(resp.text)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

def main():
    print("--- Verifying Integration Analytics ---")
    
    # 1. KPIs
    test_endpoint(f"{BASE_URL}/analytics/kpi-cards")
    
    # 2. Trends
    test_endpoint(f"{BASE_URL}/analytics/trends?months=3")
    
    # 3. Report (Check headers)
    print(f"Testing {BASE_URL}/reports/export...", end=" ")
    resp = requests.get(f"{BASE_URL}/reports/export")
    if resp.status_code == 200 and resp.headers.get('Content-Type') == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        print("OK (Excel Received)")
    else:
        print(f"FAILED ({resp.status_code})")
        print(resp.headers)
    
    print("--- Backend Verification Complete ---")

if __name__ == "__main__":
    main()
