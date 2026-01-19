import sys
import os
sys.path.append(os.getcwd())
from app import create_app, db
from sqlalchemy import text, inspect

app = create_app()

def run_migration():
    with app.app_context():
        inspector = inspect(db.engine)
        columns = [c['name'] for c in inspector.get_columns('stores')]
        
        new_columns = [
            ("address", "TEXT"),
            ("state_uf", "VARCHAR(2)"),
            ("had_ecommerce", "BOOLEAN DEFAULT FALSE"),
            ("previous_platform", "VARCHAR(100)"),
            ("deployment_type", "VARCHAR(50) DEFAULT 'MIGRAÇÃO'"),
            ("projected_orders", "INTEGER DEFAULT 0"),
            ("order_rate", "FLOAT DEFAULT 0.0"),
            ("manual_go_live_date", "TIMESTAMP"),
            ("forecast_obs", "TEXT"),
            ("include_in_forecast", "BOOLEAN DEFAULT TRUE")
        ]
        
        with db.engine.connect() as conn:
            # Postgres requires commit for DDL in some contexts, or autocommit.
            # SQLAlchemy connection usually starts a transaction.
            trans = conn.begin()
            try:
                for col_name, col_type in new_columns:
                    if col_name not in columns:
                        print(f"Adding column {col_name}...")
                        conn.execute(text(f"ALTER TABLE stores ADD COLUMN {col_name} {col_type}"))
                    else:
                        print(f"Column {col_name} already exists.")
                trans.commit()
                print("Migration success.")
            except Exception as e:
                trans.rollback()
                print(f"Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
