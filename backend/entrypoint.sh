#!/bin/sh
set -e

# Aguarda DB (opcional, mas recomendado; aqui vamos confiar no depends_on + retry do connect)

echo ">>> [Entrypoint] Running Daily Snapshot Job..."
python jobs/run_daily_snapshot.py

echo ">>> [Entrypoint] Checking Backups..."
python -c "from backup_manager import BackupManager; BackupManager.check_and_run_backup()"

echo ">>> [Entrypoint] Starting Flask..."
exec flask run --host=0.0.0.0 --port=5003
