import requests
import os
from dotenv import load_dotenv

load_dotenv('c:/Users/welin/Downloads/sistema_gestao/backend/.env')
key = os.getenv('OPENAI_API_KEY')

print(f"Testando chave: {key[:10]}...")

try:
    res = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json={
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": "Respond only 'YES' if you receive this."}]
        },
        timeout=10
    )
    print(f"STATUS CODE: {res.status_code}")
    print(f"RESPOSTA: {res.text[:100]}")
except Exception as e:
    print(f"ERRO: {e}")
