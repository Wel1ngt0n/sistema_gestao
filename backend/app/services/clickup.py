import requests
import time
import logging
from datetime import datetime
from config import Config

class ClickUpService:
    BASE_URL = "https://api.clickup.com/api/v2"
    HEADERS = {"Authorization": Config.CLICKUP_API_KEY}
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def _get(self, endpoint, params=None):
        url = f"{self.BASE_URL}/{endpoint}"
        retries = 3
        for i in range(retries):
            try:
                response = requests.get(url, headers=self.HEADERS, params=params, timeout=30)
                if response.status_code == 429: # Limite de Taxa (Rate Limit)
                    self.logger.warning("Limite de taxa atingido. Aguardando 5 segundos...")
                    time.sleep(5)
                    continue
                
                if response.status_code != 200:
                    self.logger.error(f"Erro ao buscar {url}: {response.text}")
                    return None
                
                return response.json()
            except requests.exceptions.RequestException as e:
                self.logger.error(f"Exceção ao requisitar {url}: {e}")
                time.sleep(2)
        return None

    def fetch_parent_tasks(self, date_updated_gt=None):
        """Busca tarefas da Lista Principal (Lojas). Pagina por todas."""
        self.logger.info(f"[ClickUp] Buscando lojas EM ABERTO na lista {Config.LIST_ID_PRINCIPAL}...")
        tasks = []
        page = 0
        while True:
            self.logger.info(f"[ClickUp] Buscando página {page} de Lojas...")
            
            params = {
                "page": page, 
                "subtasks": "true", 
                "include_closed": "false",
                "archived": "false" # Apenas tarefas abertas
            }
            if date_updated_gt:
                params["date_updated_gt"] = date_updated_gt

            data = self._get(f"list/{Config.LIST_ID_PRINCIPAL}/task", params=params)
            
            if not data or not data.get('tasks'):
                break
                
            batch = data['tasks']
            tasks.extend(batch)
            self.logger.info(f"[ClickUp] Página {page}: {len(batch)} tarefas.")
            page += 1
            
            if len(batch) < 100: # Página do ClickUp geralmente tem 100
                break
        
        self.logger.info(f"[ClickUp] Total de {len(tasks)} lojas encontradas.")
        return tasks

    def get_father_field_id(self):
        """Encontra o UUID do campo personalizado _father_task_id."""
        first_list = list(Config.LIST_IDS_STEPS.values())[0]
        father_field_name = "_father_task_id"
        
        fid_data = self._get(f"list/{first_list}/field")
        if fid_data:
            for f in fid_data.get('fields', []):
                if f['name'] == father_field_name:
                    return f['id']
        return None

    def fetch_tasks_from_list(self, list_id, date_updated_gt=None):
        """Busca todas as tarefas de uma lista específica (inclui paginação)."""
        tasks = []
        page = 0
        while True:
            params = {
                "page": page,
                "subtasks": "true",
                "include_closed": "true",
                "archived": "false",
                "limit": 100 # Explict limit
            }
            if date_updated_gt:
                params["date_updated_gt"] = date_updated_gt
                
            data = self._get(f"list/{list_id}/task", params=params)
            if not data or not data.get('tasks'):
                break
            
            batch = data['tasks']
            tasks.extend(batch)
            page += 1
            if len(batch) < 100:
                break
        return tasks
    
    def get_task_history(self, task_id):
        """
        Busca histórico de status para uma tarefa.
        """
        # Endpoint: GET /task/{task_id}/time_in_status
        # Nota: Este endpoint fornece array 'status_history' com intervalos.
        data = self._get(f"task/{task_id}/time_in_status")
        return data

    def get_task_comments(self, task_id):
        """
        Busca comentários de uma tarefa.
        """
        data = self._get(f"task/{task_id}/comment")
        if data and 'comments' in data:
            return data['comments']
        return []
