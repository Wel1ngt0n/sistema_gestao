#!/bin/sh
set -e

echo ">>> Aplicando migrations do banco..."
cd backend
if [ -z "${MIGRATION_DATABASE_URL:-}" ]; then
    echo ">>> MIGRATION_DATABASE_URL nao configurada; deploy interrompido."
    exit 1
fi
DATABASE_URL="$MIGRATION_DATABASE_URL" SKIP_SCHEMA_BOOTSTRAP=1 flask db upgrade

echo ">>> Iniciando a API..."
exec gunicorn --timeout 600 run:app
