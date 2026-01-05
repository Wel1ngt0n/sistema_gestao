# Script para rodar via Cron ou Task Scheduler
# Ex: 0 1 * * * python run_daily_snapshot.py

import sys
import os

# Adicionar diretório raiz ao path para imports funcionarem
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.services.snapshot_service import SnapshotService

app = create_app()

def run():
    with app.app_context():
        print("--- Iniciando Job de Snapshot Diário ---")
        # Cria tabela se não existir (garantia)
        db.create_all()
        
        SnapshotService.generate_daily_snapshot()
        print("--- Job Finalizado ---")

if __name__ == "__main__":
    run()
