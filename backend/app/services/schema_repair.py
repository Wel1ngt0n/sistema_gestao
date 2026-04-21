import logging
from sqlalchemy import text
from app import db

logger = logging.getLogger(__name__)

def repair_database_schema():
    """
    Garante que as colunas do Raio-X existem nas tabelas stores e task_steps.
    Invalida o erro 'column does not exist' em produção.
    """
    repair_sql = [
        # Tabela: stores
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS description TEXT;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_comments TEXT;",
        
        # Tabela: tasks_steps
        "ALTER TABLE tasks_steps ADD COLUMN IF NOT EXISTS description TEXT;",
        "ALTER TABLE tasks_steps ADD COLUMN IF NOT EXISTS last_comments TEXT;",
        
        # Novas colunas (V3, V4, V5)
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS rede VARCHAR(100);",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS tipo_loja VARCHAR(50) DEFAULT 'Filial';",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES stores(id);",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS delivered_with_quality BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS manual_start_date TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_manual_start_date BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_summary TEXT;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS address TEXT;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS state_uf VARCHAR(2);",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS had_ecommerce BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS previous_platform VARCHAR(100);",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS deployment_type VARCHAR(50) DEFAULT 'MIGRAÇÃO';",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS projected_orders INTEGER DEFAULT 0;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS order_rate FLOAT DEFAULT 0.0;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS manual_go_live_date TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS forecast_obs TEXT;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS include_in_forecast BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS integrador VARCHAR(100);",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS assignees_json TEXT;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS total_time_tracked INTEGER DEFAULT 0;"
    ]

    
    try:
        with db.engine.connect() as conn:
            for sql in repair_sql:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    logger.info(f"[SchemaRepair] Executado: {sql}")
                except Exception as inner_e:
                    logger.warning(f"[SchemaRepair] Falha (provavelmente coluna já existe): {inner_e}")
            
            logger.info(">>> Database schema verified and repaired (Raio-X columns).")
    except Exception as e:
        logger.error(f"[SchemaRepair] Erro fatal ao reparar schema: {e}")
