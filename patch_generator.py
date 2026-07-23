def patch_clickup_generator():
    file_path = r'backend/app/services/clickup.py'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    find_str = """    def fetch_tasks_from_list_generator(self, list_id, date_updated_gt=None, include_closed=True):
        \"\"\"Busca todas as tarefas de uma lista específica iterando em blocos.\"\"\"
        page = 0
        while True:
            params = {
                "page": page,
                "subtasks": "true",
                "include_closed": "true" if include_closed else "false",
                "archived": "false",
                "limit": 100
            }"""
            
    replace_str = """    def fetch_tasks_from_list_generator(self, list_id, date_updated_gt=None, include_closed=True, archived=False):
        \"\"\"Busca todas as tarefas de uma lista específica iterando em blocos.\"\"\"
        page = 0
        while True:
            params = {
                "page": page,
                "subtasks": "true",
                "include_closed": "true" if include_closed else "false",
                "archived": "true" if archived else "false",
                "limit": 100
            }"""
            
    if find_str in content:
        content = content.replace(find_str, replace_str)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('clickup.py generator patched')
    else:
        print('Could not find string in clickup.py')

def patch_sync_service():
    file_path = r'backend/app/services/sync_service.py'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    find_str = """                    # B: Etapas do Ciclo Atual
                    self.logger.info(f"[{list_name}] Buscando etapas concluídas em 2026...")
                    search_ts = last_ts if last_ts else int(AnalystsReportService.CUTOFF_DATE.timestamp() * 1000)
                    for batch in self.clickup.fetch_tasks_from_list_generator(list_id, date_updated_gt=search_ts, include_closed=True):
                        for t in batch:
                            steps_dict[t['id']] = t
                    
                    steps_list = list(steps_dict.values())"""
                    
    replace_str = """                    # B: Etapas do Ciclo Atual
                    self.logger.info(f"[{list_name}] Buscando etapas concluídas em 2026...")
                    search_ts = last_ts if last_ts else int(AnalystsReportService.CUTOFF_DATE.timestamp() * 1000)
                    for batch in self.clickup.fetch_tasks_from_list_generator(list_id, date_updated_gt=search_ts, include_closed=True):
                        for t in batch:
                            steps_dict[t['id']] = t
                            
                    # C: Etapas Arquivadas (para garantir que lojas que foram arquivadas tenham seus steps refletidos)
                    self.logger.info(f"[{list_name}] Buscando etapas arquivadas...")
                    for batch in self.clickup.fetch_tasks_from_list_generator(list_id, include_closed=True, archived=True):
                        for t in batch:
                            steps_dict[t['id']] = t
                    
                    steps_list = list(steps_dict.values())"""
                    
    if find_str in content:
        content = content.replace(find_str, replace_str)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('sync_service.py generator patched')
    else:
        print('Could not find string in sync_service.py')

if __name__ == '__main__':
    patch_clickup_generator()
    patch_sync_service()
