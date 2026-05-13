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
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_parent_comment_at TIMESTAMP WITHOUT TIME ZONE;",
        "ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_parent_comment_by VARCHAR(255);",
        
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

        # V3.1 - Support Performance & NPS
        "ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS agent_name VARCHAR(255);",
        "ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS nps_score INTEGER;",
        "ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS nps_comment TEXT;",
        "ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER;",
        "ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS resolution_time_seconds INTEGER;",
        "ALTER TABLE support_conversations ADD COLUMN IF NOT EXISTS close_reason VARCHAR(255);",

        # V3.1 - Tabela SupportAgentPerformance
        """CREATE TABLE IF NOT EXISTS support_agent_performance (
            id SERIAL PRIMARY KEY,
            agent_name VARCHAR(255) NOT NULL,
            period VARCHAR(7) NOT NULL,
            group_name VARCHAR(100),
            total_contacts INTEGER DEFAULT 0,
            total_conversations INTEGER DEFAULT 0,
            new_conversations INTEGER DEFAULT 0,
            closed_conversations INTEGER DEFAULT 0,
            total_messages_sent INTEGER DEFAULT 0,
            avg_response_time_seconds INTEGER DEFAULT 0,
            avg_close_time_seconds INTEGER DEFAULT 0,
            avg_nps FLOAT,
            nps_count INTEGER DEFAULT 0,
            last_activity_at TIMESTAMP,
            activities_today INTEGER DEFAULT 0,
            pending_tickets INTEGER DEFAULT 0,
            open_tickets INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uix_agent_period UNIQUE (agent_name, period)
        );""",

        """CREATE TABLE IF NOT EXISTS support_import_batches (
            id SERIAL PRIMARY KEY,
            period VARCHAR(7) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'processing',
            files_count INTEGER DEFAULT 0,
            rows_total INTEGER DEFAULT 0,
            rows_imported INTEGER DEFAULT 0,
            errors_count INTEGER DEFAULT 0,
            stats_json TEXT,
            started_at TIMESTAMP DEFAULT NOW(),
            finished_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );""",
        "CREATE INDEX IF NOT EXISTS idx_support_import_batches_period ON support_import_batches(period);",

        """CREATE TABLE IF NOT EXISTS support_metric_snapshots (
            id SERIAL PRIMARY KEY,
            period VARCHAR(7) NOT NULL,
            source VARCHAR(120) NOT NULL,
            metric_type VARCHAR(80) NOT NULL,
            metric_key VARCHAR(160) NOT NULL,
            dimension_hash VARCHAR(32) NOT NULL,
            dimensions_json TEXT,
            value_float FLOAT,
            value_text TEXT,
            captured_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uix_support_metric_snapshot UNIQUE (period, source, metric_type, metric_key, dimension_hash)
        );""",
        "CREATE INDEX IF NOT EXISTS idx_support_metric_snapshots_period ON support_metric_snapshots(period);",
        "CREATE INDEX IF NOT EXISTS idx_support_metric_snapshots_type ON support_metric_snapshots(metric_type);",
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
    from app.models import Permission, Role, SystemConfig
    
    defaults = [
        {'key': 'annual_mrr_target', 'value': '180000.0', 'description': 'Meta anual de MRR para cálculo de performance.'},
        {'key': 'monthly_cs_churn_limit', 'value': '5000.0', 'description': 'Limite mensal de Churn aceitável.'},
        {'key': 'sla_delivery_target_days', 'value': '90', 'description': 'SLA padrão para entregas (dias).'}
    ]
    
    permissions = [
        {"name": "support:view", "description": "Visualizar dashboard e dados de suporte", "module": "SUPORTE"},
        {"name": "support:import", "description": "Importar CSVs do suporte", "module": "SUPORTE"},
        {"name": "support:sync", "description": "Processar eventos pendentes do suporte", "module": "SUPORTE"},
        {"name": "support:manage_contacts", "description": "Vincular contatos de suporte a lojas", "module": "SUPORTE"},
        {"name": "webhooks:view", "description": "Visualizar diagnostico de webhooks", "module": "WEBHOOKS"},
    ]

    try:
        for item in defaults:
            exists = SystemConfig.query.filter_by(key=item['key']).first()
            if not exists:
                new_config = SystemConfig(**item)
                db.session.add(new_config)
                logger.info(f"[Seed] Inserindo config default: {item['key']}")

        for item in permissions:
            permission = Permission.query.filter_by(name=item["name"]).first()
            if not permission:
                db.session.add(Permission(**item))
                logger.info(f"[Seed] Inserindo permissao default: {item['name']}")

        db.session.flush()

        permission_names = [item["name"] for item in permissions]
        support_permissions = Permission.query.filter(Permission.name.in_(permission_names)).all()

        super_admin = Role.query.filter_by(name="Super Admin").first()
        if super_admin:
            for permission in support_permissions:
                if permission not in super_admin.permissions:
                    super_admin.permissions.append(permission)

        admin = Role.query.filter_by(name="Admin").first()
        if admin:
            for permission in support_permissions:
                if permission not in admin.permissions:
                    admin.permissions.append(permission)

        operador = Role.query.filter_by(name="Operador").first()
        if operador:
            view_permission = Permission.query.filter_by(name="support:view").first()
            if view_permission and view_permission not in operador.permissions:
                operador.permissions.append(view_permission)
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"[Seed] Falha ao popular SystemConfig: {e}")
