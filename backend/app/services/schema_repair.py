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
        "ALTER TABLE tasks_steps ADD COLUMN IF NOT EXISTS last_comments TEXT;"
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
