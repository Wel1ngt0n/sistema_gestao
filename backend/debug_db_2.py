
import sys
import os

from app import db, create_app
from app.models import Store, User

app = create_app()
with app.app_context():
    print(f"Total de Lojas: {Store.query.count()}")
    print(f"Total de Usuários: {User.query.count()}")
    
    # Verificar lojas por ano
    from sqlalchemy import extract
    for year in [2024, 2025, 2026]:
        try:
            count = Store.query.filter(extract('year', Store.created_at) == year).count()
            print(f"Lojas criadas em {year}: {count}")
        except Exception as e:
            print(f"Erro ao contar lojas de {year}: {e}")

    # Verificar lojas ativas
    ativas = Store.query.filter(Store.status_norm != 'DONE', Store.status_norm != 'CANCELED').count()
    print(f"Lojas Ativas: {ativas}")
    
    # Verificar se há lojas com data de criação >= 2026-01-01
    from datetime import datetime
    cutoff = datetime(2026, 1, 1)
    recente = Store.query.filter(Store.created_at >= cutoff).count()
    print(f"Lojas criadas desde 2026-01-01: {recente}")
