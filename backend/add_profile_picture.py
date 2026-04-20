from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Verificando a tabela 'users' para a coluna 'profile_picture'...")
    try:
        db.session.execute(text("ALTER TABLE users ADD COLUMN profile_picture TEXT;"))
        db.session.commit()
        print("Coluna 'profile_picture' adicionada com sucesso.")
    except Exception as e:
        db.session.rollback()
        print(f"Aviso ao alterar tabela (pode já existir): {e}")
