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
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS integrador VARCHAR(255);",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS assignees_json TEXT;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS total_time_tracked INTEGER DEFAULT 0;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS start_real_at TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS end_real_at TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS total_time_days FLOAT DEFAULT 0.0;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS valor_implantacao FLOAT DEFAULT 0.0;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS financeiro_status VARCHAR(100) DEFAULT 'Não paga mensalidade';",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS manual_finished_at TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS considerar_tempo_implantacao BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS justificativa_tempo_implantacao VARCHAR(255);",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS teve_retrabalho BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS retrabalho_tipo VARCHAR(100);",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS observacoes TEXT;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS tempo_contrato INTEGER DEFAULT 90;",


        
        # V3.1 - Expandir colunas VARCHAR estreitas para TEXT/VARCHAR(255) (fix StringDataRightTruncation)
        "ALTER TABLE stores ALTER COLUMN erp TYPE TEXT;",
        "ALTER TABLE stores ALTER COLUMN cnpj TYPE TEXT;",
        "ALTER TABLE stores ALTER COLUMN crm TYPE TEXT;",
        "ALTER TABLE stores ALTER COLUMN implantador TYPE VARCHAR(255);",
        "ALTER TABLE stores ALTER COLUMN implantador_original TYPE VARCHAR(255);",
        "ALTER TABLE stores ALTER COLUMN implantador_atual TYPE VARCHAR(255);",
        "ALTER TABLE stores ALTER COLUMN integrador TYPE VARCHAR(255);",
        "ALTER TABLE stores ALTER COLUMN rede TYPE VARCHAR(255);",
        "ALTER TABLE stores ALTER COLUMN status TYPE VARCHAR(255);",
        "ALTER TABLE stores ALTER COLUMN status_raw TYPE VARCHAR(255);",
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
            
            # Seeding de Configurações
            seed_database()
            
    except Exception as e:
        logger.error(f"[SchemaRepair] Erro fatal ao reparar schema: {e}")

def seed_database():
    """
    Insere dados iniciais necessários para o funcionamento das métricas e relatórios.
    """
    from app.models import SystemConfig
    
    defaults = [
        {'key': 'annual_mrr_target', 'value': '180000.0', 'description': 'Meta anual de MRR para cálculo de performance.'},
        {'key': 'monthly_cs_churn_limit', 'value': '5000.0', 'description': 'Limite mensal de Churn aceitável.'},
        {'key': 'sla_delivery_target_days', 'value': '90', 'description': 'SLA padrão para entregas (dias).'}
    ]
    
    try:
        for item in defaults:
            exists = SystemConfig.query.filter_by(key=item['key']).first()
            if not exists:
                new_config = SystemConfig(**item)
                db.session.add(new_config)
                logger.info(f"[Seed] Inserindo config default: {item['key']}")
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"[Seed] Falha ao popular SystemConfig: {e}")
