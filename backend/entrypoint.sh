#!/bin/sh
set -e

# Aguarda DB (opcional, mas recomendado; aqui vamos confiar no depends_on + retry do connect)

echo ">>> [Entrypoint] Running Daily Snapshot Job..."
python jobs/run_daily_snapshot.py

echo ">>> [Entrypoint] Starting Flask..."
exec flask run --host=0.0.0.0
