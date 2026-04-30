from app import create_app
from app.models import Store

app = create_app()
with app.app_context():
    count = Store.query.filter_by(teve_retrabalho=True).count()
    print(f'Total stores with rework: {count}')
    
    recent_rework = Store.query.filter_by(teve_retrabalho=True).limit(5).all()
    for s in recent_rework:
        print(f'Store ID: {s.id}, Name: {s.name}, Status: {s.status_norm}, Finished At: {s.effective_finished_at}')
