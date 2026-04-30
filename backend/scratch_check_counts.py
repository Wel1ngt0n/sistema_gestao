from app import create_app
from app.models import Store
from datetime import datetime

app = create_app()
with app.app_context():
    total = Store.query.count()
    done_2026 = Store.query.filter(Store.status_norm == "DONE", Store.finished_at >= datetime(2026, 1, 1)).count()
    in_progress = Store.query.filter(Store.status_norm != "DONE", Store.status_norm != "CANCELED").count()
    print(f"Total Stores in DB: {total}")
    print(f"Concluded in 2026: {done_2026}")
    print(f"In Progress: {in_progress}")
