from app import create_app
from app.models import db, Store
from sqlalchemy import func

app = create_app()

with app.app_context():
    # Query distinct statuses and their normalized count
    results = db.session.query(
        Store.status, 
        Store.status_norm, 
        func.count(Store.id)
    ).group_by(Store.status, Store.status_norm).all()
    
    print(f"{'RAW STATUS':<30} | {'NORMALIZED':<15} | {'COUNT'}")
    print("-" * 60)
    for r in results:
        print(f"{str(r[0]):<30} | {str(r[1]):<15} | {r[2]}")
