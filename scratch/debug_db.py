
import sys
import os

# Adicionar o diretório backend ao path para importar app
sys.path.append(os.path.abspath('backend'))

from backend.app import db, create_app
from backend.app.models import Store, User

app = create_app()
with app.app_context():
    print(f"Total de Lojas: {Store.query.count()}")
    print(f"Total de Usuários: {User.query.count()}")
    
    # Verificar lojas por ano
    from sqlalchemy import extract
    for year in [2024, 2025, 2026]:
        count = Store.query.filter(extract('year', Store.created_at) == year).count()
        print(f"Lojas criadas em {year}: {count}")

    # Verificar lojas ativas
    ativas = Store.query.filter(Store.status_norm != 'DONE', Store.status_norm != 'CANCELED').count()
    print(f"Lojas Ativas: {ativas}")
