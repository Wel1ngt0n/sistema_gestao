"""Testes da migration aditiva da Integracao V2."""

from importlib.util import module_from_spec, spec_from_file_location
from io import StringIO
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "versions"
    / "9b7d4e2c1a60_integration_v2_foundation.py"
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


def _carregar_migration():
    spec = spec_from_file_location("integration_v2_migration_test", MIGRATION_PATH)
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

