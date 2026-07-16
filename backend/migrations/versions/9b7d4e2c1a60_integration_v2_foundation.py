"""Cria o dominio isolado do Monitor de Integracao V2.

Revision ID: 9b7d4e2c1a60
Revises: e611f09d7731
Create Date: 2026-07-15
"""

from alembic import op
import sqlalchemy as sa


revision = '9b7d4e2c1a60'
down_revision = 'e611f09d7731'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'integration_v2_stores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_task_id', sa.String(length=64), nullable=False),
        sa.Column('source_custom_id', sa.String(length=100), nullable=True),
        sa.Column('business_id', sa.String(length=100), nullable=True),
        sa.Column('store_name', sa.String(length=255), nullable=False),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('source_created_at', sa.DateTime(), nullable=True),
        sa.Column('source_closed_at', sa.DateTime(), nullable=True),
        sa.Column('source_updated_at', sa.DateTime(), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('synced_at', sa.DateTime(), nullable=False),
        sa.Column('source_present', sa.Boolean(), nullable=False),
        sa.Column('reconciliation_status', sa.String(length=32), nullable=False),
        sa.Column('reconciliation_method', sa.String(length=32), nullable=True),
        sa.Column('reconciliation_evidence', sa.Text(), nullable=True),
        sa.Column('source_snapshot', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_task_id'),
    )
    op.create_index('ix_integration_v2_stores_business_id', 'integration_v2_stores', ['business_id'])
    op.create_index('ix_integration_v2_stores_reconciliation_status', 'integration_v2_stores', ['reconciliation_status'])
    op.create_index('ix_integration_v2_stores_source_custom_id', 'integration_v2_stores', ['source_custom_id'])
    op.create_index('ix_integration_v2_stores_source_task_id', 'integration_v2_stores', ['source_task_id'])
    op.create_index('ix_integration_v2_stores_store_name', 'integration_v2_stores', ['store_name'])

    op.create_table(
        'integration_v2_statuses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('list_id', sa.String(length=64), nullable=False),
        sa.Column('external_id', sa.String(length=160), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('color', sa.String(length=32), nullable=True),
        sa.Column('native_type', sa.String(length=50), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('identity_source', sa.String(length=32), nullable=False),
        sa.Column('configuration_signature', sa.String(length=64), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('synced_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('list_id', 'external_id', name='uq_integration_v2_status_external'),
    )
    op.create_index('ix_integration_v2_statuses_active', 'integration_v2_statuses', ['active'])
    op.create_index('ix_integration_v2_statuses_list_id', 'integration_v2_statuses', ['list_id'])

    op.create_table(
        'integration_v2_assignees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('clickup_user_id', sa.String(length=64), nullable=False),
        sa.Column('username', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('avatar', sa.String(length=500), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('synced_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('clickup_user_id'),
    )
    op.create_index('ix_integration_v2_assignees_clickup_user_id', 'integration_v2_assignees', ['clickup_user_id'])

    op.create_table(
        'integration_v2_status_catalog_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('finished_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('list_id', sa.String(length=64), nullable=False),
        sa.Column('configuration_signature', sa.String(length=64), nullable=True),
        sa.Column('statuses_read', sa.Integer(), nullable=False),
        sa.Column('statuses_created', sa.Integer(), nullable=False),
        sa.Column('statuses_updated', sa.Integer(), nullable=False),
        sa.Column('statuses_deactivated', sa.Integer(), nullable=False),
        sa.Column('error_summary', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'integration_v2_sync_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('run_type', sa.String(length=20), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('finished_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('cursor', sa.String(length=100), nullable=True),
        sa.Column('stores_read', sa.Integer(), nullable=False),
        sa.Column('stores_created', sa.Integer(), nullable=False),
        sa.Column('stores_updated', sa.Integer(), nullable=False),
        sa.Column('tasks_read', sa.Integer(), nullable=False),
        sa.Column('tasks_created', sa.Integer(), nullable=False),
        sa.Column('tasks_updated', sa.Integer(), nullable=False),
        sa.Column('histories_written', sa.Integer(), nullable=False),
        sa.Column('blocks_written', sa.Integer(), nullable=False),
        sa.Column('orphan_tasks', sa.Integer(), nullable=False),
        sa.Column('ambiguous_matches', sa.Integer(), nullable=False),
        sa.Column('error_summary', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_integration_v2_sync_runs_started_at', 'integration_v2_sync_runs', ['started_at'])
    op.create_index('ix_integration_v2_sync_runs_status', 'integration_v2_sync_runs', ['status'])

    op.create_table(
        'integration_v2_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('clickup_task_id', sa.String(length=64), nullable=False),
        sa.Column('custom_id', sa.String(length=100), nullable=True),
        sa.Column('store_id', sa.Integer(), nullable=True),
        sa.Column('current_status_id', sa.Integer(), nullable=True),
        sa.Column('task_name', sa.String(length=255), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=True),
        sa.Column('priority', sa.String(length=50), nullable=True),
        sa.Column('tags_snapshot', sa.Text(), nullable=True),
        sa.Column('custom_fields_snapshot', sa.Text(), nullable=True),
        sa.Column('source_snapshot', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('due_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('source_updated_at', sa.DateTime(), nullable=True),
        sa.Column('synced_at', sa.DateTime(), nullable=False),
        sa.Column('archived', sa.Boolean(), nullable=False),
        sa.Column('is_blocked', sa.Boolean(), nullable=False),
        sa.Column('data_quality', sa.String(length=32), nullable=False),
        sa.Column('reconciliation_method', sa.String(length=32), nullable=True),
        sa.Column('reconciliation_evidence', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['current_status_id'], ['integration_v2_statuses.id']),
        sa.ForeignKeyConstraint(['store_id'], ['integration_v2_stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('clickup_task_id'),
        sa.UniqueConstraint('store_id'),
    )
    op.create_index('ix_integration_v2_tasks_clickup_task_id', 'integration_v2_tasks', ['clickup_task_id'])
    op.create_index('ix_integration_v2_tasks_current_status_id', 'integration_v2_tasks', ['current_status_id'])
    op.create_index('ix_integration_v2_tasks_custom_id', 'integration_v2_tasks', ['custom_id'])
    op.create_index('ix_integration_v2_tasks_is_blocked', 'integration_v2_tasks', ['is_blocked'])
    op.create_index('ix_integration_v2_tasks_store_id', 'integration_v2_tasks', ['store_id'])

    op.create_table(
        'integration_v2_task_assignees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('assignee_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('synced_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['assignee_id'], ['integration_v2_assignees.id']),
        sa.ForeignKeyConstraint(['task_id'], ['integration_v2_tasks.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('task_id', 'assignee_id', name='uq_integration_v2_task_assignee'),
    )
    op.create_index('ix_integration_v2_task_assignees_assignee_id', 'integration_v2_task_assignees', ['assignee_id'])
    op.create_index('ix_integration_v2_task_assignees_task_id', 'integration_v2_task_assignees', ['task_id'])

    op.create_table(
        'integration_v2_status_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=True),
        sa.Column('status_id', sa.Integer(), nullable=False),
        sa.Column('entered_at', sa.DateTime(), nullable=True),
        sa.Column('exited_at', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.BigInteger(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False),
        sa.Column('occurrence', sa.Integer(), nullable=False),
        sa.Column('timestamp_source', sa.String(length=50), nullable=False),
        sa.Column('timestamp_quality', sa.String(length=32), nullable=False),
        sa.Column('idempotency_key', sa.String(length=64), nullable=False),
        sa.Column('synced_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['status_id'], ['integration_v2_statuses.id']),
        sa.ForeignKeyConstraint(['store_id'], ['integration_v2_stores.id']),
        sa.ForeignKeyConstraint(['task_id'], ['integration_v2_tasks.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key'),
    )
    op.create_index('ix_integration_v2_status_history_entered_at', 'integration_v2_status_history', ['entered_at'])
    op.create_index('ix_integration_v2_status_history_status_id', 'integration_v2_status_history', ['status_id'])
    op.create_index('ix_integration_v2_status_history_store_id', 'integration_v2_status_history', ['store_id'])
    op.create_index('ix_integration_v2_status_history_task_id', 'integration_v2_status_history', ['task_id'])

    op.create_table(
        'integration_v2_block_periods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('store_id', sa.Integer(), nullable=True),
        sa.Column('status_id', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.BigInteger(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False),
        sa.Column('reason', sa.String(length=500), nullable=True),
        sa.Column('reason_source', sa.String(length=50), nullable=True),
        sa.Column('quality', sa.String(length=32), nullable=False),
        sa.Column('occurrence', sa.Integer(), nullable=False),
        sa.Column('idempotency_key', sa.String(length=64), nullable=False),
        sa.Column('synced_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['status_id'], ['integration_v2_statuses.id']),
        sa.ForeignKeyConstraint(['store_id'], ['integration_v2_stores.id']),
        sa.ForeignKeyConstraint(['task_id'], ['integration_v2_tasks.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key'),
    )
    op.create_index('ix_integration_v2_block_periods_started_at', 'integration_v2_block_periods', ['started_at'])
    op.create_index('ix_integration_v2_block_periods_store_id', 'integration_v2_block_periods', ['store_id'])
    op.create_index('ix_integration_v2_block_periods_task_id', 'integration_v2_block_periods', ['task_id'])


def downgrade():
    op.drop_index('ix_integration_v2_block_periods_task_id', table_name='integration_v2_block_periods')
    op.drop_index('ix_integration_v2_block_periods_store_id', table_name='integration_v2_block_periods')
    op.drop_index('ix_integration_v2_block_periods_started_at', table_name='integration_v2_block_periods')
    op.drop_table('integration_v2_block_periods')
    op.drop_index('ix_integration_v2_status_history_task_id', table_name='integration_v2_status_history')
    op.drop_index('ix_integration_v2_status_history_store_id', table_name='integration_v2_status_history')
    op.drop_index('ix_integration_v2_status_history_status_id', table_name='integration_v2_status_history')
    op.drop_index('ix_integration_v2_status_history_entered_at', table_name='integration_v2_status_history')
    op.drop_table('integration_v2_status_history')
    op.drop_index('ix_integration_v2_task_assignees_task_id', table_name='integration_v2_task_assignees')
    op.drop_index('ix_integration_v2_task_assignees_assignee_id', table_name='integration_v2_task_assignees')
    op.drop_table('integration_v2_task_assignees')
    op.drop_index('ix_integration_v2_tasks_store_id', table_name='integration_v2_tasks')
    op.drop_index('ix_integration_v2_tasks_is_blocked', table_name='integration_v2_tasks')
    op.drop_index('ix_integration_v2_tasks_custom_id', table_name='integration_v2_tasks')
    op.drop_index('ix_integration_v2_tasks_current_status_id', table_name='integration_v2_tasks')
    op.drop_index('ix_integration_v2_tasks_clickup_task_id', table_name='integration_v2_tasks')
    op.drop_table('integration_v2_tasks')
    op.drop_index('ix_integration_v2_sync_runs_status', table_name='integration_v2_sync_runs')
    op.drop_index('ix_integration_v2_sync_runs_started_at', table_name='integration_v2_sync_runs')
    op.drop_table('integration_v2_sync_runs')
    op.drop_table('integration_v2_status_catalog_runs')
    op.drop_index('ix_integration_v2_assignees_clickup_user_id', table_name='integration_v2_assignees')
    op.drop_table('integration_v2_assignees')
    op.drop_index('ix_integration_v2_statuses_list_id', table_name='integration_v2_statuses')
    op.drop_index('ix_integration_v2_statuses_active', table_name='integration_v2_statuses')
    op.drop_table('integration_v2_statuses')
    op.drop_index('ix_integration_v2_stores_store_name', table_name='integration_v2_stores')
    op.drop_index('ix_integration_v2_stores_source_task_id', table_name='integration_v2_stores')
    op.drop_index('ix_integration_v2_stores_source_custom_id', table_name='integration_v2_stores')
    op.drop_index('ix_integration_v2_stores_reconciliation_status', table_name='integration_v2_stores')
    op.drop_index('ix_integration_v2_stores_business_id', table_name='integration_v2_stores')
    op.drop_table('integration_v2_stores')
