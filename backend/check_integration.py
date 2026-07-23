from app.models import Store, TaskStep
from app import create_app
app = create_app()
with app.app_context():
    steps = TaskStep.query.filter_by(step_list_name='INTEGRACAO').all()
    status_counts = {}
    total_contact = 0
    print("LOJAS EM CONTATO/COMUNICACAO:")
    for s in steps:
        if s.store and s.store.status_norm == 'ARCHIVED':
            continue
        if s.store and s.store.status == 'Concluído':
            continue
        st = s.status.lower() if s.status else 'none'
        if 'contato' in st or 'comunica' in st:
            print(f" -> {s.store.store_name} (Store status: {s.store.status_norm}, Step status: {s.status})")
            total_contact += 1
        status_counts[st] = status_counts.get(st, 0) + 1
    
    print(f'Total in contato: {total_contact}')
    print('\nIntegration Status counts (for active stores):')
    for k, v in status_counts.items():
        print(f'  {k}: {v}')
