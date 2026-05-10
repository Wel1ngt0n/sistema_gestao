import requests
import sys

BASE_URL = "http://localhost:5003/api/integration"

def test_endpoint(url):
    try:
        print(f"Testando {url}...", end=" ")
        resp = requests.get(url)
        if resp.status_code == 200:
            print("OK")
            # print(resp.json())
        else:
            print(f"FALHOU ({resp.status_code})")
            print(resp.text)
            sys.exit(1)
    except Exception as e:
        print(f"ERRO: {str(e)}")
        sys.exit(1)

def main():
    print("--- Verificando Analytics de Integracao ---")
    
    # 1. KPIs
    test_endpoint(f"{BASE_URL}/analytics/kpi-cards")
    
    # 2. Tendencias
    test_endpoint(f"{BASE_URL}/analytics/trends?months=3")
    
    # 3. Relatorio (verifica headers)
    print(f"Testando {BASE_URL}/reports/export...", end=" ")
    resp = requests.get(f"{BASE_URL}/reports/export")
    if resp.status_code == 200 and resp.headers.get('Content-Type') == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        print("OK (Excel recebido)")
    else:
        print(f"FALHOU ({resp.status_code})")
        print(resp.headers)
    
    print("--- Verificacao do backend concluida ---")

if __name__ == "__main__":
    main()
