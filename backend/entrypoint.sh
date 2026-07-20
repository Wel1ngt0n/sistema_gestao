#!/bin/sh
set -e

# O healthcheck do Compose garante que o banco esteja pronto antes deste ponto.

echo ">>> [Entrypoint] Applying database migrations..."
SKIP_SCHEMA_BOOTSTRAP=1 flask db upgrade

echo ">>> [Entrypoint] Running Daily Snapshot Job..."
python jobs/run_daily_snapshot.py

echo ">>> [Entrypoint] Checking Backups..."
python -c "from backup_manager import BackupManager; BackupManager.check_and_run_backup()"

echo ">>> [Entrypoint] Starting Flask..."
exec flask run --host=0.0.0.0 --port=5003
