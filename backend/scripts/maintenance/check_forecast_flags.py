from app import create_app
from app.models import db, Store
from sqlalchemy import func

app = create_app()

with app.app_context():
    total = Store.query.count()
    included_true = Store.query.filter(Store.include_in_forecast == True).count()
    included_none = Store.query.filter(Store.include_in_forecast == None).count()
    included_false = Store.query.filter(Store.include_in_forecast == False).count()
    
    print(f"Total Stores: {total}")
    print(f"Included (True): {included_true}")
    print(f"Included (None): {included_none}")
    print(f"Excluded (False): {included_false}")
