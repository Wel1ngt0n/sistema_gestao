"""Promove a Integracao ao namespace canonico e arquiva a tabela anterior.

Revision ID: f3a6d9e2c8b1
Revises: d5f8c1a3b7e2
Create Date: 2026-07-19
"""

from alembic import op


revision = 'f3a6d9e2c8b1'
down_revision = 'd5f8c1a3b7e2'
branch_labels = None
depends_on = None


TABLE_RENAMES = (
    ('integration_v2_stores', 'integration_stores'),
    ('integration_v2_statuses', 'integration_statuses'),
    ('integration_v2_assignees', 'integration_assignees'),
    ('integration_v2_status_catalog_runs', 'integration_status_catalog_runs'),
    ('integration_v2_sync_runs', 'integration_sync_runs'),
    ('integration_v2_tasks', 'integration_tasks'),
    ('integration_v2_task_assignees', 'integration_task_assignees'),
    ('integration_v2_status_history', 'integration_status_history'),
    ('integration_v2_block_periods', 'integration_block_periods'),
    ('integration_v2_audit_logs', 'integration_audit_logs'),
)

SEQUENCE_RENAMES = tuple(
    (f'{old}_id_seq', f'{new}_id_seq') for old, new in TABLE_RENAMES
)

CONSTRAINT_RENAMES = (
    ('integration_stores', 'integration_v2_stores_pkey', 'integration_stores_pkey'),
    ('integration_stores', 'fk_integration_v2_stores_manual_integrator', 'fk_integration_stores_manual_integrator'),
    ('integration_statuses', 'integration_v2_statuses_pkey', 'integration_statuses_pkey'),
    ('integration_statuses', 'uq_integration_v2_status_external', 'uq_integration_status_external'),
    ('integration_assignees', 'integration_v2_assignees_pkey', 'integration_assignees_pkey'),
    ('integration_status_catalog_runs', 'integration_v2_status_catalog_runs_pkey', 'integration_status_catalog_runs_pkey'),
    ('integration_sync_runs', 'integration_v2_sync_runs_pkey', 'integration_sync_runs_pkey'),
    ('integration_tasks', 'integration_v2_tasks_pkey', 'integration_tasks_pkey'),
    ('integration_tasks', 'integration_v2_tasks_current_status_id_fkey', 'integration_tasks_current_status_id_fkey'),
    ('integration_tasks', 'integration_v2_tasks_store_id_fkey', 'integration_tasks_store_id_fkey'),
    ('integration_task_assignees', 'integration_v2_task_assignees_pkey', 'integration_task_assignees_pkey'),
    ('integration_task_assignees', 'integration_v2_task_assignees_assignee_id_fkey', 'integration_task_assignees_assignee_id_fkey'),
    ('integration_task_assignees', 'integration_v2_task_assignees_task_id_fkey', 'integration_task_assignees_task_id_fkey'),
    ('integration_task_assignees', 'uq_integration_v2_task_assignee', 'uq_integration_task_assignee'),
    ('integration_status_history', 'integration_v2_status_history_pkey', 'integration_status_history_pkey'),
    ('integration_status_history', 'integration_v2_status_history_idempotency_key_key', 'integration_status_history_idempotency_key_key'),
    ('integration_status_history', 'integration_v2_status_history_status_id_fkey', 'integration_status_history_status_id_fkey'),
    ('integration_status_history', 'integration_v2_status_history_store_id_fkey', 'integration_status_history_store_id_fkey'),
    ('integration_status_history', 'integration_v2_status_history_task_id_fkey', 'integration_status_history_task_id_fkey'),
    ('integration_block_periods', 'integration_v2_block_periods_pkey', 'integration_block_periods_pkey'),
    ('integration_block_periods', 'integration_v2_block_periods_idempotency_key_key', 'integration_block_periods_idempotency_key_key'),
    ('integration_block_periods', 'integration_v2_block_periods_status_id_fkey', 'integration_block_periods_status_id_fkey'),
    ('integration_block_periods', 'integration_v2_block_periods_store_id_fkey', 'integration_block_periods_store_id_fkey'),
    ('integration_block_periods', 'integration_v2_block_periods_task_id_fkey', 'integration_block_periods_task_id_fkey'),
    ('integration_block_periods', 'ck_integration_v2_block_review_complete', 'ck_integration_block_review_complete'),
    ('integration_audit_logs', 'integration_v2_audit_logs_pkey', 'integration_audit_logs_pkey'),
    ('integration_audit_logs', 'fk_integration_v2_audit_logs_store', 'fk_integration_audit_logs_store'),
)

INDEX_RENAMES = (
    ('ix_integration_v2_stores_business_id', 'ix_integration_stores_business_id'),
    ('ix_integration_v2_stores_manual_integrator_id', 'ix_integration_stores_manual_integrator_id'),
    ('ix_integration_v2_stores_reconciliation_status', 'ix_integration_stores_reconciliation_status'),
    ('ix_integration_v2_stores_source_custom_id', 'ix_integration_stores_source_custom_id'),
    ('ix_integration_v2_stores_source_task_id', 'ix_integration_stores_source_task_id'),
    ('ix_integration_v2_stores_store_name', 'ix_integration_stores_store_name'),
    ('ix_integration_v2_statuses_active', 'ix_integration_statuses_active'),
    ('ix_integration_v2_statuses_list_id', 'ix_integration_statuses_list_id'),
    ('ix_integration_v2_assignees_clickup_user_id', 'ix_integration_assignees_clickup_user_id'),
    ('ix_integration_v2_sync_runs_started_at', 'ix_integration_sync_runs_started_at'),
    ('ix_integration_v2_sync_runs_status', 'ix_integration_sync_runs_status'),
    ('ix_integration_v2_tasks_clickup_task_id', 'ix_integration_tasks_clickup_task_id'),
    ('ix_integration_v2_tasks_current_status_id', 'ix_integration_tasks_current_status_id'),
    ('ix_integration_v2_tasks_custom_id', 'ix_integration_tasks_custom_id'),
    ('ix_integration_v2_tasks_is_blocked', 'ix_integration_tasks_is_blocked'),
    ('ix_integration_v2_tasks_store_id', 'ix_integration_tasks_store_id'),
    ('ix_integration_v2_task_assignees_assignee_id', 'ix_integration_task_assignees_assignee_id'),
    ('ix_integration_v2_task_assignees_task_id', 'ix_integration_task_assignees_task_id'),
    ('ix_integration_v2_status_history_entered_at', 'ix_integration_status_history_entered_at'),
    ('ix_integration_v2_status_history_status_id', 'ix_integration_status_history_status_id'),
    ('ix_integration_v2_status_history_store_id', 'ix_integration_status_history_store_id'),
    ('ix_integration_v2_status_history_task_id', 'ix_integration_status_history_task_id'),
    ('ix_integration_v2_block_periods_started_at', 'ix_integration_block_periods_started_at'),
    ('ix_integration_v2_block_periods_store_id', 'ix_integration_block_periods_store_id'),
    ('ix_integration_v2_block_periods_task_id', 'ix_integration_block_periods_task_id'),
    ('ix_integration_v2_audit_logs_store_changed_at', 'ix_integration_audit_logs_store_changed_at'),
)


def _require_postgresql():
    dialect = op.get_bind().dialect.name
    if dialect != 'postgresql':
        raise RuntimeError(
            'A promocao canonica da Integracao exige PostgreSQL; '
            f'dialeto recebido: {dialect}.'
        )


def _rename_tables(pairs):
    for old, new in pairs:
        op.execute(f'ALTER TABLE public.{old} RENAME TO {new}')


def _rename_sequences(pairs):
    for old, new in pairs:
        op.execute(f'ALTER SEQUENCE public.{old} RENAME TO {new}')


def _rename_constraints(pairs):
    for table_name, old, new in pairs:
        op.execute(
            f'ALTER TABLE public.{table_name} RENAME CONSTRAINT {old} TO {new}'
        )


def _rename_indexes(pairs):
    for old, new in pairs:
        op.execute(f'ALTER INDEX public.{old} RENAME TO {new}')


def upgrade():
    _require_postgresql()

    op.execute(
        """
        DO $$
        DECLARE
            source_count integer;
            target_count integer;
            matched_count integer;
            imported_count integer;
        BEGIN
            SELECT count(*) INTO source_count
              FROM (VALUES
                    ('integration_v2_stores'),
                    ('integration_v2_statuses'),
                    ('integration_v2_assignees'),
                    ('integration_v2_status_catalog_runs'),
                    ('integration_v2_sync_runs'),
                    ('integration_v2_tasks'),
                    ('integration_v2_task_assignees'),
                    ('integration_v2_status_history'),
                    ('integration_v2_block_periods'),
                    ('integration_v2_audit_logs')) expected(name)
             WHERE to_regclass('public.' || expected.name) IS NOT NULL;

            SELECT count(*) INTO target_count
              FROM (VALUES
                    ('integration_stores'),
                    ('integration_statuses'),
                    ('integration_assignees'),
                    ('integration_status_catalog_runs'),
                    ('integration_sync_runs'),
                    ('integration_tasks'),
                    ('integration_task_assignees'),
                    ('integration_status_history'),
                    ('integration_block_periods'),
                    ('integration_audit_logs')) expected(name)
             WHERE to_regclass('public.' || expected.name) IS NOT NULL;

            SELECT count(*) INTO imported_count
              FROM integration_v2_audit_logs
             WHERE action = 'LEGACY_METRIC_IMPORTED'
               AND changed_by_name = 'migration:d5f8c1a3b7e2';

            WITH candidate_counts AS (
                SELECT m.id, count(v.id) AS matches
                  FROM integration_metrics m
                  JOIN stores s ON s.id = m.store_id
                  LEFT JOIN integration_v2_stores v
                    ON v.source_task_id = s.clickup_task_id
                    OR (
                        s.custom_store_id IS NOT NULL
                        AND (
                            v.source_custom_id = s.custom_store_id
                            OR v.business_id = s.custom_store_id
                        )
                    )
                 GROUP BY m.id
            )
            SELECT count(*) INTO matched_count
              FROM candidate_counts
             WHERE matches = 1;

            IF source_count <> 10 OR target_count <> 0 THEN
                RAISE EXCEPTION
                    'Preflight de rename divergente: fontes=%, destinos=%; esperado 10/0.',
                    source_count, target_count;
            END IF;
            IF to_regclass('public.integration_metrics') IS NULL
               OR to_regclass('archive.integration_metrics') IS NOT NULL THEN
                RAISE EXCEPTION
                    'integration_metrics precisa existir apenas em public antes da promocao.';
            END IF;
            IF imported_count <> matched_count THEN
                RAISE EXCEPTION
                    'Preservacao anterior incompleta: auditorias=%, matches=%; esperado igualdade.',
                    imported_count, matched_count;
            END IF;
        END $$;
        """
    )

    op.execute(
        'LOCK TABLE integration_metrics, integration_v2_stores, '
        'integration_v2_statuses, integration_v2_assignees, '
        'integration_v2_status_catalog_runs, integration_v2_sync_runs, '
        'integration_v2_tasks, integration_v2_task_assignees, '
        'integration_v2_status_history, integration_v2_block_periods, '
        'integration_v2_audit_logs IN ACCESS EXCLUSIVE MODE'
    )
    op.execute('CREATE SCHEMA IF NOT EXISTS archive')

    _rename_tables(TABLE_RENAMES)
    _rename_constraints(CONSTRAINT_RENAMES)
    _rename_indexes(INDEX_RENAMES)
    _rename_sequences(SEQUENCE_RENAMES)

    op.execute('ALTER TABLE public.integration_metrics SET SCHEMA archive')
    # PostgreSQL normalmente move a sequence SERIAL pertencente junto com a tabela.
    # A verificacao cobre instalações nas quais ela permaneceu em public.
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('public.integration_metrics_id_seq') IS NOT NULL THEN
                ALTER SEQUENCE public.integration_metrics_id_seq SET SCHEMA archive;
            END IF;
        END $$;
        """
    )


def downgrade():
    _require_postgresql()

    op.execute(
        """
        DO $$
        DECLARE canonical_count integer;
        BEGIN
            SELECT count(*) INTO canonical_count
              FROM (VALUES
                    ('integration_stores'),
                    ('integration_statuses'),
                    ('integration_assignees'),
                    ('integration_status_catalog_runs'),
                    ('integration_sync_runs'),
                    ('integration_tasks'),
                    ('integration_task_assignees'),
                    ('integration_status_history'),
                    ('integration_block_periods'),
                    ('integration_audit_logs')) expected(name)
             WHERE to_regclass('public.' || expected.name) IS NOT NULL;

            IF canonical_count <> 10 THEN
                RAISE EXCEPTION
                    'Preflight de downgrade divergente: tabelas canonicas=%; esperado 10.',
                    canonical_count;
            END IF;
            IF to_regclass('archive.integration_metrics') IS NULL
               OR to_regclass('public.integration_metrics') IS NOT NULL THEN
                RAISE EXCEPTION
                    'integration_metrics precisa existir apenas em archive antes do downgrade.';
            END IF;
        END $$;
        """
    )

    op.execute(
        'LOCK TABLE archive.integration_metrics, integration_stores, '
        'integration_statuses, integration_assignees, '
        'integration_status_catalog_runs, integration_sync_runs, '
        'integration_tasks, integration_task_assignees, '
        'integration_status_history, integration_block_periods, '
        'integration_audit_logs IN ACCESS EXCLUSIVE MODE'
    )

    op.execute('ALTER TABLE archive.integration_metrics SET SCHEMA public')
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('archive.integration_metrics_id_seq') IS NOT NULL THEN
                ALTER SEQUENCE archive.integration_metrics_id_seq SET SCHEMA public;
            END IF;
        END $$;
        """
    )

    _rename_sequences(tuple((new, old) for old, new in reversed(SEQUENCE_RENAMES)))
    _rename_indexes(tuple((new, old) for old, new in reversed(INDEX_RENAMES)))
    _rename_constraints(
        tuple((table_name, new, old) for table_name, old, new in reversed(CONSTRAINT_RENAMES))
    )
    _rename_tables(tuple((new, old) for old, new in reversed(TABLE_RENAMES)))
