import requests
import sys

BASE_URL = "http://localhost:5003/api"
REACHABLE_STATUS_CODES = {200, 401, 403}

def check_endpoint(name, url):
    print(f"Testando {name}...", end=" ")
    try:
        response = requests.get(url, timeout=10)
        if response.status_code in REACHABLE_STATUS_CODES:
            suffix = " (protegido por autenticação)" if response.status_code != 200 else ""
            print(f"OK ✅{suffix}")
            return True
        else:
            print(f"FALHOU ❌ (Status: {response.status_code})")
            print(response.text)
            return False
    except Exception as e:
        print(f"ERRO ❌ ({str(e)})")
        return False

def verify_system():
    print("=== Verificando módulos do sistema local ===")

    # 1. Módulo de integração
    if not check_endpoint("monitor de integração", f"{BASE_URL}/integration/monitor"):
        sys.exit(1)

    # 2. Módulo de performance
    if not check_endpoint("resumo de performance", f"{BASE_URL}/performance/summary"):
        sys.exit(1)

    print("\n✅ Todos os endpoints verificados estão ativos e respondendo!")

if __name__ == "__main__":
    verify_system()
