import sys

# 1. Update metrics.py
file_path = r'backend/app/services/metrics.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

find_str = """        # Normaliza status externo para os estados internos usados pelo sistema.
        raw_status = task_data.get('status', {}).get('status', 'unknown')
        store.status = raw_status 
        store.status_raw = raw_status
        store.status_norm = StatusNormalizer.normalize(raw_status)"""

replace_str = """        # Normaliza status externo para os estados internos usados pelo sistema.
        raw_status = task_data.get('status', {}).get('status', 'unknown')
        if task_data.get('archived', False):
            store.status = 'ARQUIVADA'
            store.status_raw = raw_status
            store.status_norm = 'ARCHIVED'
        else:
            store.status = raw_status 
            store.status_raw = raw_status
            store.status_norm = StatusNormalizer.normalize(raw_status)"""

content = content.replace(find_str, replace_str)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Update sync_service.py
file_path = r'backend/app/services/sync_service.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

find_str = """            # Passo B: Ciclo Atual (2026)
            recent_tasks = self.clickup.fetch_parent_tasks(date_updated_gt=last_ts, include_closed=True)
            for t in recent_tasks:
                parent_tasks_dict[t['id']] = t
                
            parent_tasks = list(parent_tasks_dict.values())"""

replace_str = """            # Passo B: Ciclo Atual (2026)
            recent_tasks = self.clickup.fetch_parent_tasks(date_updated_gt=last_ts, include_closed=True, archived=False)
            for t in recent_tasks:
                parent_tasks_dict[t['id']] = t
                
            # Passo C: Tarefas Arquivadas Recentemente
            archived_tasks = self.clickup.fetch_parent_tasks(date_updated_gt=last_ts, include_closed=True, archived=True)
            for t in archived_tasks:
                parent_tasks_dict[t['id']] = t
                
            parent_tasks = list(parent_tasks_dict.values())"""

content = content.replace(find_str, replace_str)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)


# 3. Update routes_integration.py
file_path = r'backend/app/routes_integration.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

find_str = """            "status": "CONCLUÍDO" if is_done else "EM ANDAMENTO","""

replace_str = """            "status": "CONCLUÍDO" if is_done else ("ARQUIVADA" if s.status_norm == 'ARCHIVED' else "EM ANDAMENTO"),"""

content = content.replace(find_str, replace_str)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 4. Update IntegrationKanbanView.tsx
file_path = r'frontend/src/features/integration/components/IntegrationKanbanView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

find_str = """    { id: 'block_pedido', title: 'BLOQUEADO PEDIDO', match: ['bloqueado pedido'] },"""
replace_str = """    { id: 'block_pedido', title: 'BLOQUEADO PEDIDO', match: ['bloqueado pedido', 'bloqueado'] },"""

content = content.replace(find_str, replace_str)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('All patches applied.')
