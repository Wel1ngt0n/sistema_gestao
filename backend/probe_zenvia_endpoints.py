import requests
import json

TOKEN = "8nlm6iYDHyKZ91Riw7_MFQfsaQvdAEFWcw-a"
BASE_URL = "https://api.zenvia.com/v2"

headers = {
    "X-API-Token": TOKEN,
    "Content-Type": "application/json"
}

def test_conversations():
    print("--- Testando Endpoint de Conversas ---")
    # Tentando endpoints comuns da Zenvia v2
    endpoints = [
        "/conversations",
        "/conversation/messages",
        "/chats"
    ]
    
    for ep in endpoints:
        print(f"\nTestando: {BASE_URL}{ep}")
        try:
            response = requests.get(f"{BASE_URL}{ep}", headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print("✅ SUCESSO!")
                print(json.dumps(response.json(), indent=2)[:500])
            else:
                print(f"Resposta: {response.text}")
        except Exception as e:
            print(f"Erro: {str(e)}")

if __name__ == "__main__":
    test_conversations()
