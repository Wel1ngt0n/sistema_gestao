import sys

def patch_clickup():
    file_path = r'backend/app/services/clickup.py'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    find_str = """    def fetch_tasks_from_list(self, list_id, date_updated_gt=None):
        \"\"\"Busca todas as tarefas de uma lista específica (inclui paginação).\"\"\"
        tasks = []
        page = 0
        while True:
            params = {
                "page": page,
                "subtasks": "true",
                "include_closed": "true",
                "archived": "false",
                "limit": 100 # Explict limit
            }"""
            
    replace_str = """    def fetch_tasks_from_list(self, list_id, date_updated_gt=None, archived=False):
        \"\"\"Busca todas as tarefas de uma lista específica (inclui paginação).\"\"\"
        tasks = []
        page = 0
        while True:
            params = {
                "page": page,
                "subtasks": "true",
                "include_closed": "true",
                "archived": "true" if archived else "false",
                "limit": 100 # Explict limit
            }"""
            
    if find_str in content:
        content = content.replace(find_str, replace_str)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('clickup.py patched')
    else:
        print('Could not find string in clickup.py')

def patch_sync():
    file_path = r'backend/app/services/sync_service.py'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    find_str = """            # 1. Buscar Tarefas da Lista de Integração
            list_id = Config.LIST_IDS_STEPS['INTEGRACAO']
            tasks = self.clickup.fetch_tasks_from_list(list_id, date_updated_gt=None)"""
            
    replace_str = """            # 1. Buscar Tarefas da Lista de Integração
            list_id = Config.LIST_IDS_STEPS['INTEGRACAO']
            tasks_active = self.clickup.fetch_tasks_from_list(list_id, date_updated_gt=None, archived=False)
            tasks_arch = self.clickup.fetch_tasks_from_list(list_id, date_updated_gt=None, archived=True)
            tasks = tasks_active + tasks_arch"""
            
    if find_str in content:
        content = content.replace(find_str, replace_str)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('sync_service.py patched')
    else:
        print('Could not find string in sync_service.py')

if __name__ == '__main__':
    patch_clickup()
    patch_sync()
