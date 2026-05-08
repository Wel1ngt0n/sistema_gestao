import requests
import json

TOKEN = "8nlm6iYDHyKZ91Riw7_MFQfsaQvdAEFWcw-a"
BASE_URL = "https://api.zenvia.com/v2"

headers = {
    "X-API-Token": TOKEN,
    "Content-Type": "application/json"
}

def get_message_detail(msg_id):
    print(f"--- Buscando detalhes da Mensagem: {msg_id} ---")
    url = f"{BASE_URL}/messages/{msg_id}"
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ SUCESSO!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Erro: {response.text}")
    except Exception as e:
        print(f"Erro ao buscar: {str(e)}")

if __name__ == "__main__":
    # Usando o ID da sua última mensagem de saída que capturamos no MESSAGE_STATUS
    last_outbound_id = "69fb56ab07363a4edf195c1e" 
    get_message_detail(last_outbound_id)
