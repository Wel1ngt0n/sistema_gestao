"""Expande qualidade e preserva metricas historicas da Integracao.

Revision ID: d5f8c1a3b7e2
Revises: c4a8f2d19e31
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa


revision = 'd5f8c1a3b7e2'
down_revision = 'c4a8f2d19e31'
branch_labels = None
depends_on = None


MIGRATION_ACTOR = 'migration:d5f8c1a3b7e2'
MIGRATION_ACTION = 'LEGACY_METRIC_IMPORTED'


def _require_postgresql():
    dialect = op.get_bind().dialect.name
    if dialect != 'postgresql':
        raise RuntimeError(
            'A preservacao das metricas da Integracao exige PostgreSQL; '
            f'dialeto recebido: {dialect}.'
        )


def upgrade():
    _require_postgresql()

    # Impede alteracoes concorrentes entre a validacao do manifesto e o backfill.
    op.execute(
        'LOCK TABLE integration_metrics, stores, integration_v2_stores, '
        'integration_v2_audit_logs IN SHARE ROW EXCLUSIVE MODE'
    )
    op.execute(
        """
        DO $$
        DECLARE
            source_count integer;
            distinct_store_count integer;
            matched_count integer;
            ambiguous_count integer;
            exception_count integer;
        BEGIN
            SELECT count(*), count(DISTINCT store_id)
              INTO source_count, distinct_store_count
              FROM integration_metrics;

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
            SELECT count(*) FILTER (WHERE matches = 1),
                   count(*) FILTER (WHERE matches > 1),
                   count(*) FILTER (WHERE matches = 0)
              INTO matched_count, ambiguous_count, exception_count
              FROM candidate_counts;

            IF source_count <> distinct_store_count THEN
                RAISE EXCEPTION
                    'Manifesto integration_metrics ambiguo: linhas=%, lojas distintas=%; esperado uma metrica por loja.',
                    source_count, distinct_store_count;
            END IF;
            IF ambiguous_count <> 0
               OR matched_count + exception_count <> source_count THEN
                RAISE EXCEPTION
                    'Reconciliacao divergente: origem=%, matches=%, ambiguas=%, nao conciliadas=%; esperado ambiguas=0 e cobertura integral.',
                    source_count, matched_count, ambiguous_count, exception_count;
            END IF;
        END $$;
        """
    )

    with op.batch_alter_table('integration_v2_stores') as batch_op:
        batch_op.add_column(
            sa.Column('post_integration_issue_count', sa.Integer(), nullable=True)
        )
        batch_op.add_column(sa.Column('churn_risk', sa.Boolean(), nullable=True))
        batch_op.add_column(
            sa.Column('documentation_status', sa.String(length=20), nullable=True)
        )

    op.execute(
        """
        WITH matched AS (
            SELECT m.id AS metric_id, min(v.id) AS integration_store_id
              FROM integration_metrics m
              JOIN stores s ON s.id = m.store_id
              JOIN integration_v2_stores v
                ON v.source_task_id = s.clickup_task_id
                OR (
                    s.custom_store_id IS NOT NULL
                    AND (
                        v.source_custom_id = s.custom_store_id
                        OR v.business_id = s.custom_store_id
                    )
                )
             GROUP BY m.id
            HAVING count(v.id) = 1
        )
        UPDATE integration_v2_stores target
           SET post_integration_issue_count = CASE
                   WHEN target.post_integration_issue_count IS NULL
                   THEN greatest(coalesce(metric.post_go_live_bugs, 0), 0)
                   ELSE target.post_integration_issue_count
               END,
               had_post_integration_issues = CASE
                   WHEN target.had_post_integration_issues IS NULL
                   THEN coalesce(metric.post_go_live_bugs, 0) > 0
                   ELSE target.had_post_integration_issues
               END,
               churn_risk = CASE
                   WHEN target.churn_risk IS NULL THEN metric.churn_risk
                   ELSE target.churn_risk
               END,
               documentation_status = CASE
                   WHEN target.documentation_status IS NULL
                   THEN metric.documentation_status
                   ELSE target.documentation_status
               END
          FROM matched
          JOIN integration_metrics metric ON metric.id = matched.metric_id
         WHERE target.id = matched.integration_store_id;
        """
    )

    op.execute(
        f"""
        WITH matched AS (
            SELECT m.id AS metric_id, min(v.id) AS integration_store_id
              FROM integration_metrics m
              JOIN stores s ON s.id = m.store_id
              JOIN integration_v2_stores v
                ON v.source_task_id = s.clickup_task_id
                OR (
                    s.custom_store_id IS NOT NULL
                    AND (
                        v.source_custom_id = s.custom_store_id
                        OR v.business_id = s.custom_store_id
                    )
                )
             GROUP BY m.id
            HAVING count(v.id) = 1
        )
        INSERT INTO integration_v2_audit_logs (
            store_id, action, field_name, old_value, new_value, reason,
            changed_by_id, changed_by_name, changed_at
        )
        SELECT matched.integration_store_id,
               '{MIGRATION_ACTION}',
               'integration_metrics:' || metric.id::text,
               NULL,
               jsonb_build_object(
                   'migration_revision', '{revision}',
                   'legacy_metric_id', metric.id,
                   'legacy_store_id', metric.store_id,
                   'snapshot_date', metric.snapshot_date,
                   'start_date', metric.start_date,
                   'end_date', metric.end_date,
                   'sla_days', metric.sla_days,
                   'post_go_live_bugs', metric.post_go_live_bugs,
                   'churn_risk', metric.churn_risk,
                   'documentation_status', metric.documentation_status,
                   'points', metric.points,
                   'lead_time_days', metric.lead_time_days,
                   'ticket_count', metric.ticket_count,
                   'has_blocking_issue', metric.has_blocking_issue,
                   'last_blocker_reason', metric.last_blocker_reason,
                   'legacy_updated_at', metric.updated_at
               )::text,
               'Preservacao integral da metrica anterior a consolidacao do dominio.',
               NULL,
               '{MIGRATION_ACTOR}',
               now()
          FROM matched
          JOIN integration_metrics metric ON metric.id = matched.metric_id;
        """
    )

    op.execute(
        f"""
        DO $$
        DECLARE
            expected_imported_count integer;
            imported_count integer;
        BEGIN
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
            SELECT count(*) INTO expected_imported_count
              FROM candidate_counts
             WHERE matches = 1;

            SELECT count(*) INTO imported_count
              FROM integration_v2_audit_logs
             WHERE action = '{MIGRATION_ACTION}'
               AND changed_by_name = '{MIGRATION_ACTOR}';
            IF imported_count <> expected_imported_count THEN
                RAISE EXCEPTION
                    'Auditoria da importacao divergente: importadas=%, matches=%; esperado igualdade.',
                    imported_count, expected_imported_count;
            END IF;
        END $$;
        """
    )


def downgrade():
    _require_postgresql()

    op.execute(
        'LOCK TABLE integration_metrics, stores, integration_v2_stores, '
        'integration_v2_audit_logs IN SHARE ROW EXCLUSIVE MODE'
    )
    # Devolve alteracoes posteriores aos campos equivalentes antes de removê-los.
    op.execute(
        """
        WITH matched AS (
            SELECT m.id AS metric_id, min(v.id) AS integration_store_id
              FROM integration_metrics m
              JOIN stores s ON s.id = m.store_id
              JOIN integration_v2_stores v
                ON v.source_task_id = s.clickup_task_id
                OR (
                    s.custom_store_id IS NOT NULL
                    AND (
                        v.source_custom_id = s.custom_store_id
                        OR v.business_id = s.custom_store_id
                    )
                )
             GROUP BY m.id
            HAVING count(v.id) = 1
        )
        UPDATE integration_metrics metric
           SET post_go_live_bugs = coalesce(store.post_integration_issue_count, metric.post_go_live_bugs),
               churn_risk = coalesce(store.churn_risk, metric.churn_risk),
               documentation_status = coalesce(store.documentation_status, metric.documentation_status)
          FROM matched
          JOIN integration_v2_stores store ON store.id = matched.integration_store_id
         WHERE metric.id = matched.metric_id;
        """
    )
    op.execute(
        """
        WITH matched AS (
            SELECT min(v.id) AS integration_store_id,
                   coalesce(m.post_go_live_bugs, 0) > 0 AS imported_value
              FROM integration_metrics m
              JOIN stores s ON s.id = m.store_id
              JOIN integration_v2_stores v
                ON v.source_task_id = s.clickup_task_id
                OR (
                    s.custom_store_id IS NOT NULL
                    AND (
                        v.source_custom_id = s.custom_store_id
                        OR v.business_id = s.custom_store_id
                    )
                )
             GROUP BY m.id, m.post_go_live_bugs
            HAVING count(v.id) = 1
        )
        UPDATE integration_v2_stores store
           SET had_post_integration_issues = NULL
          FROM matched
         WHERE store.id = matched.integration_store_id
           AND store.had_post_integration_issues IS NOT DISTINCT FROM matched.imported_value;
        """
    )
    op.execute(
        f"DELETE FROM integration_v2_audit_logs "
        f"WHERE action = '{MIGRATION_ACTION}' "
        f"AND changed_by_name = '{MIGRATION_ACTOR}'"
    )

    with op.batch_alter_table('integration_v2_stores') as batch_op:
        batch_op.drop_column('documentation_status')
        batch_op.drop_column('churn_risk')
        batch_op.drop_column('post_integration_issue_count')
