import requests
import json
from datetime import datetime, timedelta

TOKEN = "8nlm6iYDHyKZ91Riw7_MFQfsaQvdAEFWcw-a"
BASE_URL = "https://api.zenvia.com/v2"

headers = {
    "X-API-Token": TOKEN,
    "Content-Type": "application/json"
}

def get_recent_messages():
    print("--- Buscando Histórico via API de Relatórios ---")
    try:
        # Definindo janela de tempo (últimas 2 horas)
        now = datetime.utcnow()
        start = (now - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
        end = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Endpoint de relatórios de mensagens
        # Nota: Pode haver um pequeno delay para as mensagens aparecerem no relatório
        url = f"{BASE_URL}/reports/messages?startDate={start}&endDate={end}"
        print(f"URL: {url}")
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            messages = response.json()
            if not messages:
                print("Nenhuma mensagem encontrada no período.")
                return
            
            print(f"Total de registros encontrados: {len(messages)}")
            for msg in messages[:10]: # Mostrar as 10 primeiras
                dir_label = "SAÍDA" if msg.get('direction') == 'OUT' else "ENTRADA"
                print(f"[{msg.get('createdAt')}] {dir_label} | De: {msg.get('from')} | Para: {msg.get('to')}")
                # Na API de relatórios v2, o texto as vezes fica dentro de um objeto content
                print(f"   Payload: {json.dumps(msg)[:200]}...")
        else:
            print(f"❌ Erro na API: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Erro ao buscar: {str(e)}")

if __name__ == "__main__":
    get_recent_messages()
