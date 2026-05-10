import logging
import requests
from config import Config

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def check_token():
    url = "https://api.clickup.com/api/v2/user"
    headers = {"Authorization": Config.CLICKUP_API_KEY}
    
    logger.info(f"Token ClickUp configurado: {'sim' if Config.CLICKUP_API_KEY else 'nao'}")
    
    response = requests.get(url, headers=headers)
    
    logger.info(f"Status HTTP: {response.status_code}")
    
    if response.status_code == 200:
        logger.info("SUCESSO: Token valido.")
        user = response.json().get('user')
        logger.info(f"Usuario: {user.get('username')} (ID: {user.get('id')})")
    else:
        logger.info("FALHA: Token invalido ou erro de conexao.")

if __name__ == "__main__":
    check_token()
