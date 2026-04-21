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
                response = requests.get(url, headers=self.HEADERS, params=params, timeout=25)
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
                "include_closed": "true",
                "archived": "false"
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

    def fetch_parent_tasks_generator(self, date_updated_gt=None):
        """Busca tarefas da Lista Principal (Lojas) e retorna por página."""
        self.logger.info(f"[ClickUp] Buscando lojas EM ABERTO na lista {Config.LIST_ID_PRINCIPAL} (Generator)...")
        page = 0
        while True:
            params = {
                "page": page, 
                "subtasks": "true", 
                "include_closed": "true",
                "archived": "false"
            }
            if date_updated_gt:
                params["date_updated_gt"] = date_updated_gt

            data = self._get(f"list/{Config.LIST_ID_PRINCIPAL}/task", params=params)
            
            if not data or not data.get('tasks'):
                break
                
            batch = data['tasks']
            yield batch
            page += 1
            
            if len(batch) < 100:
                break

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
    
    def fetch_tasks_from_list_generator(self, list_id, date_updated_gt=None):
        """Busca todas as tarefas de uma lista específica iterando em blocos."""
        page = 0
        while True:
            params = {
                "page": page,
                "subtasks": "true",
                "include_closed": "true",
                "archived": "false",
                "limit": 100
            }
            if date_updated_gt:
                params["date_updated_gt"] = date_updated_gt
                
            data = self._get(f"list/{list_id}/task", params=params)
            if not data or not data.get('tasks'):
                break
            
            batch = data['tasks']
            yield batch
            page += 1
            if len(batch) < 100:
                break
    
    def get_task_history(self, task_id):
        """
        Busca histórico de status para uma tarefa.
        """
        data = self._get(f"task/{task_id}/time_in_status")
        return data

    def parse_integration_dates(self, task_id):
        """
        Usa time_in_status para extrair datas reais de início e fim da integração.
        Início = quando entrou em 'contato/comunicação' (primeiro status ativo do workflow)
        Fim = quando entrou em 'implantado'
        """
        # Status que NÃO representam trabalho ativo de integração
        INACTIVE_STATUSES = {
            'backlog', 'não vão iniciar agora',
            'open', 'todo', 'to do', 'closed',
        }
        END_STATUS = 'implantado'
        
        data = self.get_task_history(task_id)
        if not data:
            return {'start_date': None, 'end_date': None}
        
        start_date = None
        end_date = None
        
        # Coletar somente status do workflow (que têm orderindex definido)
        workflow_statuses = []
        
        for item in data.get('status_history', []):
            status_name = item.get('status', '').lower().strip()
            since_ts = item.get('total_time', {}).get('since')
            order = item.get('orderindex')
            
            # Ignorar status default do ClickUp (sem orderindex = não é do workflow)
            if order is None:
                self.logger.debug(f"Ignorando status default '{status_name}' (sem orderindex)")
                continue
            
            if since_ts:
                try:
                    since_dt = datetime.fromtimestamp(int(since_ts) / 1000)
                    workflow_statuses.append({
                        'status': status_name,
                        'since': since_dt,
                        'orderindex': order
                    })
                except Exception:
                    pass
        
        # Incluir current_status se tiver orderindex
        current = data.get('current_status', {})
        if current and current.get('orderindex') is not None:
            cs_name = current.get('status', '').lower().strip()
            cs_since = current.get('total_time', {}).get('since')
            if cs_since:
                try:
                    cs_dt = datetime.fromtimestamp(int(cs_since) / 1000)
                    workflow_statuses.append({
                        'status': cs_name,
                        'since': cs_dt,
                        'orderindex': current.get('orderindex')
                    })
                except Exception:
                    pass
        
        # Ordenar pelo workflow
        workflow_statuses.sort(key=lambda x: x['orderindex'])
        
        # START: Primeiro status ativo (NÃO inativo) no workflow
        for s in workflow_statuses:
            if s['status'] not in INACTIVE_STATUSES:
                start_date = s['since']
                break
        
        # END: Status 'implantado'
        for s in workflow_statuses:
            if s['status'] == END_STATUS:
                end_date = s['since']
                break
        
        self.logger.info(f"[ClickUp] Datas integração task {task_id}: início={start_date}, fim={end_date}")
        return {'start_date': start_date, 'end_date': end_date}

    def get_task_comments(self, task_id):
        """
        Busca comentários de uma tarefa.
        """
        data = self._get(f"task/{task_id}/comment")
        if data and 'comments' in data:
            return data['comments']
        return []
