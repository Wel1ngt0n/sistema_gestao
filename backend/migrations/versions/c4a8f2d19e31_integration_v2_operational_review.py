"""Adiciona revisao operacional e auditoria na Integracao V2.

Revision ID: c4a8f2d19e31
Revises: 9b7d4e2c1a60
Create Date: 2026-07-19
"""

from alembic import op
import sqlalchemy as sa


revision = 'c4a8f2d19e31'
down_revision = '9b7d4e2c1a60'
branch_labels = None
depends_on = None


STORE_COLUMNS = {
    'manual_integrator_id': sa.Column('manual_integrator_id', sa.Integer(), nullable=True),
    'quality_reviewer': sa.Column('quality_reviewer', sa.String(length=255), nullable=True),
    'had_post_integration_issues': sa.Column('had_post_integration_issues', sa.Boolean(), nullable=True),
    'followed_integration_process': sa.Column('followed_integration_process', sa.Boolean(), nullable=True),
    'quality_notes': sa.Column('quality_notes', sa.Text(), nullable=True),
    'manual_updated_at': sa.Column('manual_updated_at', sa.DateTime(), nullable=True),
    'manual_updated_by': sa.Column('manual_updated_by', sa.String(length=255), nullable=True),
}

BLOCK_COLUMNS = {
    'discount_approved': sa.Column('discount_approved', sa.Boolean(), nullable=True),
    'review_reason': sa.Column('review_reason', sa.String(length=500), nullable=True),
    'reviewed_at': sa.Column('reviewed_at', sa.DateTime(), nullable=True),
    'reviewed_by': sa.Column('reviewed_by', sa.String(length=255), nullable=True),
}

AUDIT_COLUMNS = {
    'id', 'store_id', 'action', 'field_name', 'old_value', 'new_value', 'reason',
    'changed_by_id', 'changed_by_name', 'changed_at',
}


def _inspector():
    context = op.get_context()
    if context.as_sql:
        return None
    return sa.inspect(op.get_bind())


def _column_names(inspector, table_name):
    if inspector is None:
        return set()
    return {column['name'] for column in inspector.get_columns(table_name)}


def _index_names(inspector, table_name):
    if inspector is None:
        return set()
    return {index['name'] for index in inspector.get_indexes(table_name)}


def _constraint_names(inspector, table_name, kind):
    if inspector is None:
        return set()
    getter = {
        'check': inspector.get_check_constraints,
        'foreignkey': inspector.get_foreign_keys,
    }[kind]
    return {constraint['name'] for constraint in getter(table_name)}


def upgrade():
    inspector = _inspector()
    table_names = set() if inspector is None else set(inspector.get_table_names())
    required_foundation = {
        'integration_v2_stores',
        'integration_v2_assignees',
        'integration_v2_block_periods',
    }
    if inspector is not None and not required_foundation <= table_names:
        missing = sorted(required_foundation - table_names)
        raise RuntimeError(
            'A fundacao da Integracao V2 precisa existir antes da revisao '
            f'operacional. Tabelas ausentes: {", ".join(missing)}.'
        )

    store_columns = _column_names(inspector, 'integration_v2_stores')
    store_fks = _constraint_names(inspector, 'integration_v2_stores', 'foreignkey')
    store_indexes = _index_names(inspector, 'integration_v2_stores')
    missing_store_columns = [
        column for name, column in STORE_COLUMNS.items() if name not in store_columns
    ]
    needs_store_fk = (
        inspector is None
        or 'fk_integration_v2_stores_manual_integrator' not in store_fks
    )
    needs_store_index = (
        inspector is None
        or 'ix_integration_v2_stores_manual_integrator_id' not in store_indexes
    )
    if missing_store_columns or needs_store_fk or needs_store_index:
        with op.batch_alter_table('integration_v2_stores') as batch_op:
            for column in missing_store_columns:
                batch_op.add_column(column)
            if needs_store_fk:
                batch_op.create_foreign_key(
                    'fk_integration_v2_stores_manual_integrator',
                    'integration_v2_assignees',
                    ['manual_integrator_id'],
                    ['id'],
                    ondelete='RESTRICT',
                )
            if needs_store_index:
                batch_op.create_index(
                    'ix_integration_v2_stores_manual_integrator_id',
                    ['manual_integrator_id'],
                )

    block_columns = _column_names(inspector, 'integration_v2_block_periods')
    block_checks = _constraint_names(inspector, 'integration_v2_block_periods', 'check')
    missing_block_columns = [
        column for name, column in BLOCK_COLUMNS.items() if name not in block_columns
    ]
    needs_block_check = (
        inspector is None
        or 'ck_integration_v2_block_review_complete' not in block_checks
    )
    if missing_block_columns or needs_block_check:
        with op.batch_alter_table('integration_v2_block_periods') as batch_op:
            for column in missing_block_columns:
                batch_op.add_column(column)
            if needs_block_check:
                batch_op.create_check_constraint(
                    'ck_integration_v2_block_review_complete',
                    "(discount_approved IS NULL AND review_reason IS NULL "
                    "AND reviewed_at IS NULL AND reviewed_by IS NULL) OR "
                    "(discount_approved IS NOT NULL AND length(trim(review_reason)) > 0 "
                    "AND reviewed_at IS NOT NULL AND length(trim(reviewed_by)) > 0)",
                )

    audit_exists = inspector is not None and 'integration_v2_audit_logs' in table_names
    if not audit_exists:
        op.create_table(
            'integration_v2_audit_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('store_id', sa.Integer(), nullable=False),
            sa.Column('action', sa.String(length=80), nullable=False),
            sa.Column('field_name', sa.String(length=100), nullable=True),
            sa.Column('old_value', sa.Text(), nullable=True),
            sa.Column('new_value', sa.Text(), nullable=True),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('changed_by_id', sa.Integer(), nullable=True),
            sa.Column('changed_by_name', sa.String(length=255), nullable=True),
            sa.Column('changed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(
                ['store_id'],
                ['integration_v2_stores.id'],
                name='fk_integration_v2_audit_logs_store',
                ondelete='RESTRICT',
            ),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(
            'ix_integration_v2_audit_logs_store_changed_at',
            'integration_v2_audit_logs',
            ['store_id', 'changed_at'],
        )
        return

    audit_columns = _column_names(inspector, 'integration_v2_audit_logs')
    missing_audit_columns = sorted(AUDIT_COLUMNS - audit_columns)
    if missing_audit_columns:
        raise RuntimeError(
            'Tabela integration_v2_audit_logs existente, mas incompativel. '
            f'Colunas ausentes: {", ".join(missing_audit_columns)}.'
        )

    audit_fks = _constraint_names(inspector, 'integration_v2_audit_logs', 'foreignkey')
    if 'fk_integration_v2_audit_logs_store' not in audit_fks:
        with op.batch_alter_table('integration_v2_audit_logs') as batch_op:
            batch_op.create_foreign_key(
                'fk_integration_v2_audit_logs_store',
                'integration_v2_stores',
                ['store_id'],
                ['id'],
                ondelete='RESTRICT',
            )

    audit_indexes = _index_names(inspector, 'integration_v2_audit_logs')
    if 'ix_integration_v2_audit_logs_store_changed_at' not in audit_indexes:
        op.create_index(
            'ix_integration_v2_audit_logs_store_changed_at',
            'integration_v2_audit_logs',
            ['store_id', 'changed_at'],
        )


def downgrade():
    op.drop_index('ix_integration_v2_audit_logs_store_changed_at', table_name='integration_v2_audit_logs')
    op.drop_table('integration_v2_audit_logs')

    with op.batch_alter_table('integration_v2_block_periods') as batch_op:
        batch_op.drop_constraint('ck_integration_v2_block_review_complete', type_='check')
        batch_op.drop_column('reviewed_by')
        batch_op.drop_column('reviewed_at')
        batch_op.drop_column('review_reason')
        batch_op.drop_column('discount_approved')

    with op.batch_alter_table('integration_v2_stores') as batch_op:
        batch_op.drop_index('ix_integration_v2_stores_manual_integrator_id')
        batch_op.drop_constraint('fk_integration_v2_stores_manual_integrator', type_='foreignkey')
        batch_op.drop_column('manual_updated_by')
        batch_op.drop_column('manual_updated_at')
        batch_op.drop_column('quality_notes')
        batch_op.drop_column('followed_integration_process')
        batch_op.drop_column('had_post_integration_issues')
        batch_op.drop_column('quality_reviewer')
        batch_op.drop_column('manual_integrator_id')
