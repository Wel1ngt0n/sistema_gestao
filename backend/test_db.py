from app import create_app
from app.models import Store

app = create_app()
with app.app_context():
    stores = Store.query.all()
    for s in stores:
        if s.dias_em_progresso == 0 and s.effective_started_at and s.effective_finished_at:
            print(f"Store: {s.store_name}, Start: {s.effective_started_at}, End: {s.effective_finished_at}, Days: {s.dias_em_progresso}")
