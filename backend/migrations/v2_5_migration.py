import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import SyncRun, SyncError, ForecastAuditLog
import sqlalchemy as sa

def run_migration():
    app = create_app()
    with app.app_context():
        print(">>> [Migration V2.5] Iniciando criação de novas tabelas...")
        
        # Inspecionar banco atual
        inspector = sa.inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        tables_to_create = ['sync_runs', 'sync_errors', 'forecast_audit_logs']
        created_count = 0
        
        for table in tables_to_create:
            if table in existing_tables:
                print(f"    - Tabela '{table}' já existe. Pulando.")
            else:
                print(f"    + Criando tabela '{table}'...")
                # db.create_all cria apenas as que faltam se passarmos bind ou se filtrarmos,
                # mas rodar create_all() geral é seguro pois é check-first.
                # Para ser pedante e seguro, vamos confiar no create_all do SQLAlchemy que é idempotente.
                created_count += 1

        # Criação segura (checkfirst=True por padrão no SQLAlchemy)
        db.create_all()
        
        # Validação pós-criação
        inspector = sa.inspect(db.engine)
        final_tables = inspector.get_table_names()
        
        for table in tables_to_create:
            if table in final_tables:
                 print(f"    ✅ Tabela '{table}' verificada com sucesso.")
            else:
                 print(f"    ❌ ERRO: Tabela '{table}' não foi encontrada após execução.")

        print(">>> [Migration V2.5] Concluído.")

if __name__ == "__main__":
    run_migration()
