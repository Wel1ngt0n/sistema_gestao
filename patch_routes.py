import sys

file_path = r'backend/app/routes.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix /api/stores endpoint

find_str_1 = """    if status_filter == 'active':
        # Active = nao concluidas e sem inicio futuro.
        query = query.filter(Store.manual_finished_at.is_(None), Store.end_real_at.is_(None), Store.finished_at.is_(None))
        query = query.filter(or_(Store.manual_start_date.is_(None), func.date(Store.manual_start_date) <= today))"""

replace_str_1 = """    if status_filter == 'active':
        # Active = nao concluidas e sem inicio futuro.
        query = query.filter(Store.manual_finished_at.is_(None), Store.end_real_at.is_(None), Store.finished_at.is_(None))
        query = query.filter(or_(Store.manual_start_date.is_(None), func.date(Store.manual_start_date) <= today))
        query = query.filter(Store.status_norm != 'ARCHIVED')
    elif status_filter == 'archived':
        query = query.filter(Store.status_norm == 'ARCHIVED')"""

if find_str_1 in content:
    content = content.replace(find_str_1, replace_str_1)

# 2. Add 'status': s.status to the returned json of /api/stores. Oh wait, it already returns s.status. Let's check where it assigns status.
# Wait, let's see lines 350-400 of routes.py to ensure it maps `status` correctly. Let's just run it first.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('routes.py patched for archived status')
