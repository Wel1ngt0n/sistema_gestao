import requests
import sys

BASE_URL = "http://localhost:5003/api"

def check_endpoint(name, url):
    print(f"Testando {name}...", end=" ")
    try:
        r = requests.get(url)
        if r.status_code == 200:
            print("OK ✅")
            return True
        else:
            print(f"FALHOU ❌ (Status: {r.status_code})")
            print(r.text)
            return False
    except Exception as e:
        print(f"ERRO ❌ ({str(e)})")
        return False

def verify_v3():
    print("=== Verificando Módulos V3 (Local) ===")
    
    # 1. Modulo de integracao
    if not check_endpoint("dashboard de integracao", f"{BASE_URL}/integration/dashboard"):
        sys.exit(1)
        
    # 2. Modulo de performance
    if not check_endpoint("resumo de performance", f"{BASE_URL}/performance/summary"):
        sys.exit(1)
        
    print("\n✅ Todos os endpoints V3 estão ativos e respondendo!")

if __name__ == "__main__":
    verify_v3()
