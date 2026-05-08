import requests
import json
from datetime import datetime

TOKEN = "8nlm6iYDHyKZ91Riw7_MFQfsaQvdAEFWcw-a"
BASE_URL = "https://api.zenvia.com/v2"

headers = {
    "X-API-Token": TOKEN,
    "Content-Type": "application/json"
}

def get_report():
    print("--- Buscando Entradas do Relatório de Mensagens ---")
    try:
        # Hoje
        today = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Endpoint de entradas do relatório
        url = f"{BASE_URL}/reports/message/entries?startDate={today}&endDate={today}"
        print(f"URL: {url}")
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            # O retorno pode ser um JSON com uma lista ou um CSV dependendo do Accept header
            # Zenvia v2 costuma retornar JSON por padrao se pedido no Content-Type
            data = response.json()
            if not data:
                print("Nenhum dado encontrado para hoje.")
                return
            
            # Se vier uma lista de entradas
            entries = data if isinstance(data, list) else data.get('entries', [])
            print(f"Total de entradas encontradas: {len(entries)}")
            
            # Procurar pela sua mensagem ou mensagens de saída
            for entry in entries:
                # Filtrar mensagens para o seu número
                if "5561995515999" in str(entry):
                    print(f"\n--- ENTRADA ENCONTRADA ---")
                    print(json.dumps(entry, indent=2))
        else:
            print(f"❌ Erro na API: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Erro ao buscar relatório: {str(e)}")

if __name__ == "__main__":
    get_report()
