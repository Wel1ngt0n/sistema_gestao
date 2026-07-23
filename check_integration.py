import sys
sys.path.insert(0, r'c:\Users\welin\OneDrive\Documentos\clickup2.5\sistema_gestão2.5\backend')
from app.models import Store, TaskStep
from app import create_app
app = create_app()
with app.app_context():
    steps = TaskStep.query.filter_by(step_list_name='INTEGRACAO').all()
    status_counts = {}
    for s in steps:
        if s.store and s.store.status_norm == 'ARCHIVED':
            continue
        st = s.status.lower() if s.status else 'none'
        status_counts[st] = status_counts.get(st, 0) + 1
    
    print('Integration Status counts (for active stores):')
    for k, v in status_counts.items():
        print(f'  {k}: {v}')
