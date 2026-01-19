import sys
import os
sys.path.append(os.getcwd())
from app import create_app, db
from sqlalchemy import text

app = create_app()

def run_migration():
    with app.app_context():
        # Add new columns
        # SQLite doesn't support adding multiple columns in one statement easily with SQLAlchemy raw SQL if not carefully done,
        # but pure SQL per column works fine.
        
        commands = [
            "ALTER TABLE stores ADD COLUMN address TEXT",
            "ALTER TABLE stores ADD COLUMN state_uf VARCHAR(2)",
            "ALTER TABLE stores ADD COLUMN had_ecommerce BOOLEAN DEFAULT 0",
            "ALTER TABLE stores ADD COLUMN previous_platform VARCHAR(100)",
            "ALTER TABLE stores ADD COLUMN deployment_type VARCHAR(50) DEFAULT 'MIGRAÇÃO'",
            "ALTER TABLE stores ADD COLUMN projected_orders INTEGER DEFAULT 0",
            "ALTER TABLE stores ADD COLUMN order_rate FLOAT DEFAULT 0.0",
            "ALTER TABLE stores ADD COLUMN manual_go_live_date DATETIME",
            "ALTER TABLE stores ADD COLUMN forecast_obs TEXT",
            "ALTER TABLE stores ADD COLUMN include_in_forecast BOOLEAN DEFAULT 1"
        ]
        
        for cmd in commands:
            try:
                db.session.execute(text(cmd))
                print(f"Executed: {cmd}")
            except Exception as e:
                # Ignore if column exists
                print(f"Skipped (probably exists): {cmd} | Error: {e}")
        
        db.session.commit()
        print("Migration completed.")

if __name__ == "__main__":
    run_migration()
