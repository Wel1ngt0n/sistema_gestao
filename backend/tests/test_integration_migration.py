"""Testes das migrations da Integracao ate a promocao canonica."""

from importlib.util import module_from_spec, spec_from_file_location
from io import StringIO
import os
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
import sqlalchemy as sa
from sqlalchemy import create_engine, inspect, text


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "versions"
    / "9b7d4e2c1a60_integration_v2_foundation.py"
)
OPERATIONAL_MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "versions"
    / "c4a8f2d19e31_integration_v2_operational_review.py"
)
BASE_MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "versions"
    / "e611f09d7731_v3_0_production_ready.py"
)
QUALITY_MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "versions"
    / "d5f8c1a3b7e2_integration_quality_preservation.py"
)
CANONICAL_MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "versions"
    / "f3a6d9e2c8b1_promote_integration_canonical.py"
)

TABELAS_V2 = {
    "integration_v2_stores",
    "integration_v2_tasks",
    "integration_v2_statuses",
    "integration_v2_status_history",
    "integration_v2_assignees",
    "integration_v2_task_assignees",
    "integration_v2_block_periods",
    "integration_v2_status_catalog_runs",
    "integration_v2_sync_runs",
}

RENOMES_CANONICOS = (
    ("integration_v2_stores", "integration_stores"),
    ("integration_v2_statuses", "integration_statuses"),
    ("integration_v2_assignees", "integration_assignees"),
    ("integration_v2_status_catalog_runs", "integration_status_catalog_runs"),
    ("integration_v2_sync_runs", "integration_sync_runs"),
    ("integration_v2_tasks", "integration_tasks"),
    ("integration_v2_task_assignees", "integration_task_assignees"),
    ("integration_v2_status_history", "integration_status_history"),
    ("integration_v2_block_periods", "integration_block_periods"),
    ("integration_v2_audit_logs", "integration_audit_logs"),
)


def _carregar_migration(path=MIGRATION_PATH, module_name="integration_v2_migration_test"):
    spec = spec_from_file_location(module_name, path)
    module = module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_upgrade_e_downgrade_em_sqlite_isolado():
    migration = _carregar_migration()
    engine = create_engine("sqlite:///:memory:")

    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        migration.op = Operations(context)
        migration.upgrade()

        inspector = inspect(connection)
        assert set(inspector.get_table_names()) == TABELAS_V2
        assert {
            fk["referred_table"]
            for table in TABELAS_V2
            for fk in inspector.get_foreign_keys(table)
        } <= TABELAS_V2

        migration.downgrade()
        assert inspect(connection).get_table_names() == []


def test_migration_compila_para_postgresql_sem_tocar_em_tabelas_legadas():
    migration = _carregar_migration()
    output = StringIO()
    context = MigrationContext.configure(
        dialect_name="postgresql",
        opts={"as_sql": True, "output_buffer": output},
    )
    migration.op = Operations(context)

    migration.upgrade()
    migration.downgrade()
    ddl = output.getvalue().lower()

    for table in TABELAS_V2:
        assert f"create table {table}" in ddl
        assert f"drop table {table}" in ddl
    assert "create table stores" not in ddl
    assert "alter table stores" not in ddl


def test_migration_operacional_upgrade_e_downgrade_sobre_fundacao_sqlite():
    foundation = _carregar_migration()
    operational = _carregar_migration(
        OPERATIONAL_MIGRATION_PATH,
        "integration_v2_operational_migration_test",
    )
    engine = create_engine("sqlite:///:memory:")

    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        operations = Operations(context)
        foundation.op = operations
        operational.op = operations
        foundation.upgrade()
        operational.upgrade()

        inspector = inspect(connection)
        assert "integration_v2_audit_logs" in inspector.get_table_names()
        store_columns = {item["name"] for item in inspector.get_columns("integration_v2_stores")}
        block_columns = {item["name"] for item in inspector.get_columns("integration_v2_block_periods")}
        assert {
            "manual_integrator_id",
            "quality_reviewer",
            "had_post_integration_issues",
            "followed_integration_process",
            "quality_notes",
            "manual_updated_at",
            "manual_updated_by",
        } <= store_columns
        assert {"discount_approved", "review_reason", "reviewed_at", "reviewed_by"} <= block_columns
        assert {
            item["name"] for item in inspector.get_check_constraints("integration_v2_block_periods")
        } == {"ck_integration_v2_block_review_complete"}
        assert {
            item["referred_table"] for item in inspector.get_foreign_keys("integration_v2_audit_logs")
        } == {"integration_v2_stores"}

        operational.downgrade()
        inspector = inspect(connection)
        assert "integration_v2_audit_logs" not in inspector.get_table_names()
        assert "manual_integrator_id" not in {
            item["name"] for item in inspector.get_columns("integration_v2_stores")
        }
        assert "discount_approved" not in {
            item["name"] for item in inspector.get_columns("integration_v2_block_periods")
        }


def _criar_auditoria_como_db_create_all(operations):
    """Simula a tabela nova que o ORM cria antes do Alembic reconciliar o schema."""
    operations.create_table(
        "integration_v2_audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("field_name", sa.String(length=100)),
        sa.Column("old_value", sa.Text()),
        sa.Column("new_value", sa.Text()),
        sa.Column("reason", sa.Text()),
        sa.Column("changed_by_id", sa.Integer()),
        sa.Column("changed_by_name", sa.String(length=255)),
        sa.Column("changed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["integration_v2_stores.id"],
            name="fk_integration_v2_audit_logs_store",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    operations.create_index(
        "ix_integration_v2_audit_logs_store_changed_at",
        "integration_v2_audit_logs",
        ["store_id", "changed_at"],
    )


def test_cadeia_de_revisoes_permite_reconciliar_e611_com_fundacao_existente():
    base = _carregar_migration(BASE_MIGRATION_PATH, "integration_v2_base_migration_test")
    foundation = _carregar_migration()
    operational = _carregar_migration(
        OPERATIONAL_MIGRATION_PATH,
        "integration_v2_operational_revision_chain_test",
    )
    quality = _carregar_migration(
        QUALITY_MIGRATION_PATH,
        "integration_quality_revision_chain_test",
    )
    canonical = _carregar_migration(
        CANONICAL_MIGRATION_PATH,
        "integration_canonical_revision_chain_test",
    )

    assert base.revision == "e611f09d7731"
    assert foundation.down_revision == base.revision
    assert operational.down_revision == foundation.revision
    assert quality.down_revision == operational.revision
    assert canonical.down_revision == quality.revision


def test_upgrade_operacional_preserva_dados_quando_create_all_antecipou_auditoria():
    foundation = _carregar_migration()
    operational = _carregar_migration(
        OPERATIONAL_MIGRATION_PATH,
        "integration_v2_operational_precreated_audit_test",
    )
    engine = create_engine("sqlite:///:memory:")

    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        operations = Operations(context)
        foundation.op = operations
        operational.op = operations
        foundation.upgrade()

        # O banco real estava marcado em e611, apesar de o db.create_all ja ter
        # materializado a fundacao V2 e a tabela nova de auditoria.
        operations.create_table(
            "alembic_version",
            sa.Column("version_num", sa.String(32), nullable=False),
            sa.PrimaryKeyConstraint("version_num"),
        )
        connection.execute(
            text("INSERT INTO alembic_version (version_num) VALUES ('e611f09d7731')")
        )
        _criar_auditoria_como_db_create_all(operations)

        connection.execute(
            text(
                """
                INSERT INTO integration_v2_stores (
                    id, source_task_id, store_name, first_seen_at, last_seen_at,
                    synced_at, source_present, reconciliation_status
                ) VALUES (
                    41, 'task-preservada', 'Loja Preservada', '2026-07-01 09:00:00',
                    '2026-07-19 09:00:00', '2026-07-19 09:00:00', 1, 'MATCHED'
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO integration_v2_tasks (
                    id, clickup_task_id, store_id, task_name, synced_at,
                    archived, is_blocked, data_quality
                ) VALUES (
                    51, 'task-preservada', 41, 'Loja Preservada',
                    '2026-07-19 09:00:00', 0, 1, 'COMPLETE'
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO integration_v2_block_periods (
                    id, task_id, store_id, started_at, duration_seconds,
                    is_current, reason, quality, occurrence, idempotency_key, synced_at
                ) VALUES (
                    61, 51, 41, '2026-07-10 08:00:00', 172800, 0,
                    'Aguardando cliente', 'CONFIRMED', 1, 'block-preservado',
                    '2026-07-19 09:00:00'
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO integration_v2_audit_logs (
                    id, store_id, action, field_name, old_value, new_value,
                    changed_by_name, changed_at
                ) VALUES (
                    71, 41, 'registro_preexistente', 'quality_reviewer', NULL,
                    'Qualidade Antiga', 'Operador', '2026-07-19 09:30:00'
                )
                """
            )
        )

        # Reconciliacao segura: a fundacao ja existe, logo ela e marcada como
        # aplicada; somente a migration operacional deve executar DDL.
        connection.execute(
            text(
                "UPDATE alembic_version SET version_num = '9b7d4e2c1a60' "
                "WHERE version_num = 'e611f09d7731'"
            )
        )
        operational.upgrade()
        connection.execute(
            text(
                "UPDATE alembic_version SET version_num = 'c4a8f2d19e31' "
                "WHERE version_num = '9b7d4e2c1a60'"
            )
        )

        inspector = inspect(connection)
        store_columns = {item["name"] for item in inspector.get_columns("integration_v2_stores")}
        block_columns = {item["name"] for item in inspector.get_columns("integration_v2_block_periods")}
        assert "manual_integrator_id" in store_columns
        assert "discount_approved" in block_columns
        assert connection.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one() == "c4a8f2d19e31"
        assert connection.execute(
            text("SELECT store_name FROM integration_v2_stores WHERE id = 41")
        ).scalar_one() == "Loja Preservada"
        assert connection.execute(
            text("SELECT duration_seconds FROM integration_v2_block_periods WHERE id = 61")
        ).scalar_one() == 172800
        audit_row = connection.execute(
            text(
                "SELECT action, new_value FROM integration_v2_audit_logs "
                "WHERE id = 71"
            )
        ).one()
        assert audit_row == ("registro_preexistente", "Qualidade Antiga")
        assert connection.execute(
            text("SELECT COUNT(*) FROM integration_v2_stores")
        ).scalar_one() == 1
        assert connection.execute(
            text("SELECT COUNT(*) FROM integration_v2_block_periods")
        ).scalar_one() == 1
        assert connection.execute(
            text("SELECT COUNT(*) FROM integration_v2_audit_logs")
        ).scalar_one() == 1


class _PostgresDialectFake:
    name = "postgresql"


class _PostgresBindFake:
    dialect = _PostgresDialectFake()


class _BatchRecorder:
    def __init__(self, owner, table_name):
        self.owner = owner
        self.table_name = table_name

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def add_column(self, column):
        self.owner.batch_operations.append(("add_column", self.table_name, column.name))

    def drop_column(self, column_name):
        self.owner.batch_operations.append(("drop_column", self.table_name, column_name))


class _PostgresOperationsRecorder:
    def __init__(self):
        self.statements = []
        self.batch_operations = []

    def get_bind(self):
        return _PostgresBindFake()

    def execute(self, statement):
        self.statements.append(str(statement).strip())

    def batch_alter_table(self, table_name):
        return _BatchRecorder(self, table_name)


def test_preservacao_de_qualidade_usa_invariantes_dinamicas_e_auditoria_completa():
    quality = _carregar_migration(
        QUALITY_MIGRATION_PATH,
        "integration_quality_dynamic_manifest_test",
    )
    recorder = _PostgresOperationsRecorder()
    quality.op = recorder

    quality.upgrade()
    sql = "\n".join(recorder.statements).lower()

    assert "source_count <> distinct_store_count" in sql
    assert "ambiguous_count <> 0" in sql
    assert "matched_count + exception_count <> source_count" in sql
    assert "imported_count <> expected_imported_count" in sql
    assert "insert into integration_v2_audit_logs" in sql
    for field_name in (
        "snapshot_date",
        "start_date",
        "end_date",
        "sla_days",
        "post_go_live_bugs",
        "churn_risk",
        "documentation_status",
        "points",
        "lead_time_days",
        "ticket_count",
        "has_blocking_issue",
        "last_blocker_reason",
        "legacy_updated_at",
    ):
        assert field_name in sql
    assert "delete from integration_metrics" not in sql
    assert "86ac4aqnn" not in sql
    assert "86ac03z24" not in sql
    assert " 130" not in sql
    assert " 128" not in sql
    assert recorder.batch_operations == [
        ("add_column", "integration_v2_stores", "post_integration_issue_count"),
        ("add_column", "integration_v2_stores", "churn_risk"),
        ("add_column", "integration_v2_stores", "documentation_status"),
    ]


def test_promocao_renomeia_exatamente_dez_tabelas_sem_drop_e_tem_reversao():
    canonical = _carregar_migration(
        CANONICAL_MIGRATION_PATH,
        "integration_canonical_rename_manifest_test",
    )
    assert canonical.TABLE_RENAMES == RENOMES_CANONICOS
    assert len(canonical.TABLE_RENAMES) == 10

    upgrade_recorder = _PostgresOperationsRecorder()
    canonical.op = upgrade_recorder
    canonical.upgrade()
    upgrade_sql = "\n".join(upgrade_recorder.statements).lower()

    for old_name, new_name in RENOMES_CANONICOS:
        assert f"alter table public.{old_name} rename to {new_name}" in upgrade_sql
    assert "alter table public.integration_metrics set schema archive" in upgrade_sql
    assert "drop table" not in upgrade_sql
    assert "drop schema" not in upgrade_sql
    assert "imported_count <> matched_count" in upgrade_sql

    downgrade_recorder = _PostgresOperationsRecorder()
    canonical.op = downgrade_recorder
    canonical.downgrade()
    downgrade_sql = "\n".join(downgrade_recorder.statements).lower()

    for old_name, new_name in RENOMES_CANONICOS:
        assert f"alter table public.{new_name} rename to {old_name}" in downgrade_sql
    assert "alter table archive.integration_metrics set schema public" in downgrade_sql
    assert "drop table" not in downgrade_sql
    assert "drop schema" not in downgrade_sql


def _criar_legado_minimo_postgresql(operations):
    operations.create_table(
        "stores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("store_name", sa.String(255), nullable=False),
        sa.Column("custom_store_id", sa.String(50), unique=True),
        sa.Column("clickup_task_id", sa.String(50), nullable=False, unique=True),
    )
    operations.create_table(
        "integration_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("store_id", sa.Integer(), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("start_date", sa.DateTime()),
        sa.Column("end_date", sa.DateTime()),
        sa.Column("sla_days", sa.Integer()),
        sa.Column("post_go_live_bugs", sa.Integer()),
        sa.Column("churn_risk", sa.Boolean()),
        sa.Column("documentation_status", sa.String(20)),
        sa.Column("points", sa.Float()),
        sa.Column("lead_time_days", sa.Integer()),
        sa.Column("ticket_count", sa.Integer()),
        sa.Column("has_blocking_issue", sa.Boolean()),
        sa.Column("last_blocker_reason", sa.String(255)),
        sa.Column("updated_at", sa.DateTime()),
    )


def test_upgrade_downgrade_postgresql_preserva_backfill_auditoria_e_duas_excecoes():
    database_url = os.getenv("TEST_POSTGRES_URL")
    if not database_url:
        pytest.skip("Defina TEST_POSTGRES_URL para executar a migration PostgreSQL descartavel.")

    engine = create_engine(database_url)
    if not (engine.url.database or "").endswith("_migration_test"):
        pytest.fail("TEST_POSTGRES_URL deve apontar para um banco terminado em _migration_test.")

    foundation = _carregar_migration()
    operational = _carregar_migration(
        OPERATIONAL_MIGRATION_PATH,
        "integration_operational_postgresql_test",
    )
    quality = _carregar_migration(
        QUALITY_MIGRATION_PATH,
        "integration_quality_postgresql_test",
    )
    canonical = _carregar_migration(
        CANONICAL_MIGRATION_PATH,
        "integration_canonical_postgresql_test",
    )

    try:
        with engine.begin() as connection:
            connection.execute(text("DROP SCHEMA public CASCADE"))
            connection.execute(text("CREATE SCHEMA public"))
            operations = Operations(MigrationContext.configure(connection))
            foundation.op = operations
            operational.op = operations
            quality.op = operations
            canonical.op = operations

            _criar_legado_minimo_postgresql(operations)
            foundation.upgrade()
            operational.upgrade()

            connection.execute(
                text(
                    """
                    INSERT INTO stores (id, store_name, custom_store_id, clickup_task_id)
                    VALUES
                        (1, 'Loja conciliada', 'F0H-001', 'task-match'),
                        (2, 'Excecao conhecida 534', 'F0H-534', '86ac4aqnn'),
                        (3, 'Excecao conhecida 533', 'F0H-533', '86ac03z24')
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO integration_metrics (
                        id, store_id, snapshot_date, start_date, end_date, sla_days,
                        post_go_live_bugs, churn_risk, documentation_status, points,
                        lead_time_days, ticket_count, has_blocking_issue,
                        last_blocker_reason, updated_at
                    ) VALUES
                        (101, 1, '2026-07-19', '2026-06-01', '2026-07-10', 45,
                         4, true, 'PENDENTE', 8.5, 39, 2, true,
                         'Acesso ao ERP', '2026-07-19 10:00:00'),
                        (102, 2, '2026-07-19', NULL, NULL, 60,
                         1, false, 'PARCIAL', 3.0, NULL, 1, false,
                         NULL, '2026-07-19 10:00:00'),
                        (103, 3, '2026-07-19', NULL, NULL, 60,
                         0, false, 'COMPLETA', 5.0, NULL, 0, false,
                         NULL, '2026-07-19 10:00:00')
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO integration_v2_stores (
                        id, source_task_id, source_custom_id, business_id, store_name,
                        first_seen_at, last_seen_at, synced_at, source_present,
                        reconciliation_status
                    ) VALUES (
                        201, 'task-match', 'F0H-001', 'F0H-001', 'Loja conciliada',
                        now(), now(), now(), true, 'MATCHED'
                    )
                    """
                )
            )

            quality.upgrade()

            backfill = connection.execute(
                text(
                    """
                    SELECT post_integration_issue_count, had_post_integration_issues,
                           churn_risk, documentation_status
                      FROM integration_v2_stores
                     WHERE id = 201
                    """
                )
            ).one()
            assert backfill == (4, True, True, "PENDENTE")
            assert connection.execute(
                text(
                    """
                    SELECT count(*) FROM integration_v2_audit_logs
                     WHERE action = 'LEGACY_METRIC_IMPORTED'
                       AND changed_by_name = 'migration:d5f8c1a3b7e2'
                    """
                )
            ).scalar_one() == 1

            canonical.upgrade()
            table_names = set(inspect(connection).get_table_names(schema="public"))
            assert {new for _, new in RENOMES_CANONICOS} <= table_names
            assert not ({old for old, _ in RENOMES_CANONICOS} & table_names)
            assert "integration_metrics" not in table_names
            assert connection.execute(
                text("SELECT count(*) FROM archive.integration_metrics")
            ).scalar_one() == 3
            excecoes = connection.execute(
                text(
                    """
                    SELECT s.clickup_task_id, s.custom_store_id
                      FROM archive.integration_metrics metric
                      JOIN stores s ON s.id = metric.store_id
                     WHERE s.clickup_task_id IN ('86ac4aqnn', '86ac03z24')
                     ORDER BY s.clickup_task_id
                    """
                )
            ).all()
            assert excecoes == [("86ac03z24", "F0H-533"), ("86ac4aqnn", "F0H-534")]

            canonical.downgrade()
            reverted_tables = set(inspect(connection).get_table_names(schema="public"))
            assert {old for old, _ in RENOMES_CANONICOS} <= reverted_tables
            assert not ({new for _, new in RENOMES_CANONICOS} & reverted_tables)
            assert connection.execute(
                text("SELECT count(*) FROM public.integration_metrics")
            ).scalar_one() == 3

            quality.downgrade()
            store_columns = {
                column["name"]
                for column in inspect(connection).get_columns("integration_v2_stores")
            }
            assert "post_integration_issue_count" not in store_columns
            assert "churn_risk" not in store_columns
            assert "documentation_status" not in store_columns
            assert connection.execute(
                text(
                    """
                    SELECT count(*) FROM integration_v2_audit_logs
                     WHERE action = 'LEGACY_METRIC_IMPORTED'
                       AND changed_by_name = 'migration:d5f8c1a3b7e2'
                    """
                )
            ).scalar_one() == 0
    finally:
        with engine.begin() as connection:
            connection.execute(text("DROP SCHEMA public CASCADE"))
            connection.execute(text("CREATE SCHEMA public"))
        engine.dispose()
