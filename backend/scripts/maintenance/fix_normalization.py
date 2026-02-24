from app import create_app
from app.models import db, Store
from app.services.status_normalizer import StatusNormalizer

app = create_app()

with app.app_context():
    stores = Store.query.all()
    count = 0
    for s in stores:
        old_norm = s.status_norm
        new_norm = StatusNormalizer.normalize(s.status)
        if old_norm != new_norm:
            print(f"Updating Store {s.id}: {s.status} -> {new_norm}")
            s.status_norm = new_norm
            count += 1
    
    if count > 0:
        db.session.commit()
        print(f"Updated {count} stores.")
    else:
        print("No stores needed updates.")
