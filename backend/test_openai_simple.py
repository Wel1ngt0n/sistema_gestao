import os
from dotenv import load_dotenv
from openai import OpenAI
import json

# Load .env
load_dotenv('c:/Users/welin/Downloads/sistema_gestao/backend/.env')

api_key = os.getenv('OPENAI_API_KEY')
print(f"Buscando API KEY: {api_key[:10]}...")

try:
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Teste de sistema."},
            {"role": "user", "content": "Responda apenas JSON: {\"status\": \"ok\"}"}
        ],
        response_format={"type": "json_object"}
    )
    print("RESPOSTA OPENAI:")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"ERRO: {e}")
