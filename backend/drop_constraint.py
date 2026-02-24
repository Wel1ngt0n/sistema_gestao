from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE users ALTER COLUMN username DROP NOT NULL;"))
        db.session.commit()
        print("Constraint de username removida com sucesso!")
    except Exception as e:
        db.session.rollback()
        print(f"Erro (pode ser que já tenha sido removida ou não exista): {e}")
