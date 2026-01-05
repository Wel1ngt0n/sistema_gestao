import requests
from config import Config

def check_token():
    url = "https://api.clickup.com/api/v2/user"
    headers = {"Authorization": Config.CLICKUP_API_KEY}
    
    print(f"Testando Token: {Config.CLICKUP_API_KEY[:5]}...{Config.CLICKUP_API_KEY[-5:]}")
    
    response = requests.get(url, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print("SUCESSO: Token válido!")
        user = response.json().get('user')
        print(f"Usuário: {user.get('username')} (ID: {user.get('id')})")
    else:
        print("FALHA: Token inválido ou erro de conexão.")

if __name__ == "__main__":
    check_token()
