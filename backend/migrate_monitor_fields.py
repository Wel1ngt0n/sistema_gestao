import os
from app import create_app, db
from sqlalchemy import text

app = create_app()

def add_column_if_not_exists(table, column, type_def):
    try:
        with app.app_context():
            # Check if column exists
            check_query = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='{column}'")
            result = db.session.execute(check_query).fetchone()
            
            if not result:
                print(f"Adding column {column} to {table}...")
                db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}"))
                db.session.commit()
                print(f"✅ {column} added.")
            else:
                print(f"ℹ️ {column} already exists.")
    except Exception as e:
        print(f"❌ Error adding {column}: {e}")

if __name__ == "__main__":
    print("Migrating ImplementationLogic table...")
    add_column_if_not_exists('implementation_logic', 'cnpj', 'VARCHAR(20)')
    add_column_if_not_exists('implementation_logic', 'crm', 'VARCHAR(100)')
    add_column_if_not_exists('implementation_logic', 'financeiro_status', "VARCHAR(50) DEFAULT 'Em dia'")
    add_column_if_not_exists('implementation_logic', 'teve_retrabalho', 'BOOLEAN DEFAULT FALSE')
    add_column_if_not_exists('implementation_logic', 'delivered_with_quality', 'BOOLEAN DEFAULT TRUE')
    add_column_if_not_exists('implementation_logic', 'considerar_tempo', 'BOOLEAN DEFAULT TRUE')
    add_column_if_not_exists('implementation_logic', 'justificativa_tempo', 'TEXT')
    add_column_if_not_exists('implementation_logic', 'observacoes', 'TEXT')
    print("Migration complete.")
