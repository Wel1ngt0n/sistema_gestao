import requests
import sys

BASE_URL = "http://localhost:5003/api"

def check_endpoint(name, url):
    print(f"Testing {name}...", end=" ")
    try:
        r = requests.get(url)
        if r.status_code == 200:
            print("OK ✅")
            return True
        else:
            print(f"FAILED ❌ (Status: {r.status_code})")
            print(r.text)
            return False
    except Exception as e:
        print(f"ERROR ❌ ({str(e)})")
        return False

def verify_v3():
    print("=== Verificando Módulos V3 (Local) ===")
    
    # 1. Integration Module
    if not check_endpoint("Integration Dashboard", f"{BASE_URL}/integration/dashboard"):
        sys.exit(1)
        
    # 2. Performance Module
    if not check_endpoint("Performance Summary", f"{BASE_URL}/performance/summary"):
        sys.exit(1)
        
    print("\n✅ Todos os endpoints V3 estão ativos e respondendo!")

if __name__ == "__main__":
    verify_v3()
