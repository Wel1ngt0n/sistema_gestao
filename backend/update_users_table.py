from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Forçando atualização do Schema via PostgreSQL (ADD COLUMN IF NOT EXISTS)...")
    
    db.create_all()
    
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(32);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;"
    ]

    for stmt in statements:
        try:
            db.session.execute(text(stmt))
            db.session.commit()
            print(f"Sucesso: {stmt}")
        except Exception as e:
            db.session.rollback()
            print(f"Erro em {stmt}: {e}")

    print("Migração estrutural finalizada.")
