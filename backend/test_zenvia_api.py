import requests
import json
from datetime import datetime, timedelta

TOKEN = "8nlm6iYDHyKZ91Riw7_MFQfsaQvdAEFWcw-a"
BASE_URL = "https://api.zenvia.com/v2"

headers = {
    "X-API-Token": TOKEN,
    "Content-Type": "application/json"
}

def test_api():
    print("--- Testando Conexão com Zenvia API ---")
    try:
        # Tentar listar assinaturas de webhook para validar o token
        response = requests.get(f"{BASE_URL}/subscriptions", headers=headers)
        if response.status_code == 200:
            print("✅ Token Válido! Conexão estabelecida.")
            subs = response.json()
            print(f"Total de Webhooks ativos: {len(subs)}")
        else:
            print(f"❌ Erro de Autenticação: {response.status_code}")
            print(response.text)
            return

        # Tentar buscar mensagens via API de Relatórios (última 1 hora)
        # Nota: O relatório pode ter um delay para aparecer
        print("\n--- Buscando Relatório de Mensagens Recentes ---")
        now = datetime.utcnow()
        start = (now - timedelta(hours=1)).isoformat() + "Z"
        end = now.isoformat() + "Z"
        
        # Filtro básico
        report_payload = {
            "startDate": start,
            "endDate": end
        }
        
        # Endpoint de relatórios costuma ser POST para filtros complexos ou GET com query
        # Vou tentar um GET simples primeiro se houver suporte ou listar mensagens se o v2 permitir
        print(f"Período: {start} até {end}")
        
    except Exception as e:
        print(f"Erro ao conectar: {str(e)}")

if __name__ == "__main__":
    test_api()
