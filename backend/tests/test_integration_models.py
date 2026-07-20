"""Testes estruturais do dominio canonico de Integracao."""

from datetime import datetime

import pytest
from flask import Flask
from sqlalchemy import CheckConstraint, UniqueConstraint, delete, update

from app.models import (
    db,
    Permission,
    Role,
    User,
    IntegrationAssignee,
    IntegrationAuditLog,
    IntegrationAuditLogImmutableError,
    IntegrationBlockPeriod,
    IntegrationStatus,
    IntegrationStatusCatalogRun,
    IntegrationStatusHistory,
    IntegrationStore,
    IntegrationSyncRun,
    IntegrationTask,
    IntegrationTaskAssignee,
)


MODELOS_INTEGRACAO = (
    IntegrationStore,
    IntegrationTask,
    IntegrationStatus,
    IntegrationStatusHistory,
    IntegrationAssignee,
    IntegrationTaskAssignee,
    IntegrationBlockPeriod,
    IntegrationStatusCatalogRun,
    IntegrationSyncRun,
    IntegrationAuditLog,
)


@pytest.fixture()
def app():
    test_app = Flask(__name__)
    test_app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    db.init_app(test_app)
    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.rollback()
        db.session.remove()
        db.drop_all()


def _criar_log_de_auditoria():
    agora = datetime(2026, 7, 19, 19)
    store = IntegrationStore(
        source_task_id="implantacao-auditoria",
        store_name="Loja auditada",
        reconciliation_status="NOT_IN_INTEGRATION",
        first_seen_at=agora,
        last_seen_at=agora,
        synced_at=agora,
    )
    log = IntegrationAuditLog(
        store=store,
        action="OPERATIONAL_UPDATE",
        field_name="quality_reviewer",
        old_value=None,
        new_value='"Analista QA"',
        changed_by_id=10,
        changed_by_name="Gestora",
        changed_at=agora,
    )
    db.session.add_all([store, log])
    db.session.commit()
    return log


def _restricoes_unicas(modelo):
    return {
        tuple(coluna.name for coluna in restricao.columns)
        for restricao in modelo.__table__.constraints
        if isinstance(restricao, UniqueConstraint)
    }


def test_todas_as_tabelas_usam_namespace_novo():
    nomes = {modelo.__tablename__ for modelo in MODELOS_INTEGRACAO}

    assert nomes == {
        "integration_stores",
        "integration_tasks",
        "integration_statuses",
        "integration_status_history",
        "integration_assignees",
        "integration_task_assignees",
        "integration_block_periods",
        "integration_status_catalog_runs",
        "integration_sync_runs",
        "integration_audit_logs",
    }


def test_chaves_estrangeiras_nao_apontam_para_tabelas_legadas():
    destinos = {
        chave.target_fullname
        for modelo in MODELOS_INTEGRACAO
        for chave in modelo.__table__.foreign_keys
    }

    assert destinos
    assert all(destino.startswith("integration_") for destino in destinos)


def test_identidades_externas_e_transicoes_sao_idempotentes():
    assert IntegrationStore.source_task_id.property.columns[0].unique is True
    assert IntegrationTask.clickup_task_id.property.columns[0].unique is True
    assert IntegrationAssignee.clickup_user_id.property.columns[0].unique is True
    assert IntegrationStatusHistory.idempotency_key.property.columns[0].unique is True
    assert IntegrationBlockPeriod.idempotency_key.property.columns[0].unique is True
    assert ("list_id", "external_id") in _restricoes_unicas(IntegrationStatus)
    assert ("task_id", "assignee_id") in _restricoes_unicas(IntegrationTaskAssignee)


def test_nome_do_status_nao_participa_da_identidade():
    restricoes = _restricoes_unicas(IntegrationStatus)

    assert ("list_id", "external_id") in restricoes
    assert all("name" not in colunas for colunas in restricoes)


def test_revisao_operacional_preserva_tri_state_e_isolamento_do_legado():
    assert IntegrationStore.manual_integrator_id.property.columns[0].nullable is True
    assert IntegrationBlockPeriod.discount_approved.property.columns[0].nullable is True
    assert IntegrationAuditLog.changed_by_id.property.columns[0].nullable is True
    assert not IntegrationAuditLog.changed_by_id.property.columns[0].foreign_keys
    assert {
        constraint.name
        for constraint in IntegrationBlockPeriod.__table__.constraints
        if isinstance(constraint, CheckConstraint)
    } == {"ck_integration_block_review_complete"}


def test_auditoria_canonica_tem_identidade_propria_e_referencia_restritiva_da_loja():
    store_fk = next(iter(IntegrationAuditLog.store_id.property.columns[0].foreign_keys))

    assert IntegrationAuditLog.__tablename__ == "integration_audit_logs"
    assert store_fk.target_fullname == "integration_stores.id"
    assert store_fk.ondelete == "RESTRICT"
    assert IntegrationAuditLog.__table__.indexes


def test_auditoria_append_only_permite_insercao(app):
    with app.app_context():
        log = _criar_log_de_auditoria()

        persisted = db.session.get(IntegrationAuditLog, log.id)

        assert persisted is not None
        assert persisted.new_value == '"Analista QA"'
        assert IntegrationAuditLog.query.count() == 1


def test_user_to_dict_lista_permissoes_ordenadas_e_sem_duplicacao(app):
    with app.app_context():
        performance = Permission(name="manage_performance")
        sistema = Permission(name="manage_system")
        gestor = Role(name="Gestor", permissions=[performance, sistema])
        auditor = Role(name="Auditor", permissions=[performance])
        user = User(
            name="Usuario RBAC",
            email="rbac@example.com",
            password_hash="hash-de-teste",
            roles=[gestor, auditor],
        )
        db.session.add(user)
        db.session.commit()

        serialized = user.to_dict()

        assert serialized["roles"] == ["Gestor", "Auditor"]
        assert serialized["permissions"] == ["manage_performance", "manage_system"]


def test_auditoria_append_only_bloqueia_update_individual(app):
    with app.app_context():
        log = _criar_log_de_auditoria()
        log_id = log.id
        log.new_value = '"Valor adulterado"'

        with pytest.raises(IntegrationAuditLogImmutableError):
            db.session.commit()
        db.session.rollback()

        persisted = db.session.get(IntegrationAuditLog, log_id)
        assert persisted.new_value == '"Analista QA"'
        assert IntegrationAuditLog.query.count() == 1


def test_auditoria_append_only_bloqueia_delete_individual(app):
    with app.app_context():
        log = _criar_log_de_auditoria()
        log_id = log.id
        db.session.delete(log)

        with pytest.raises(IntegrationAuditLogImmutableError):
            db.session.commit()
        db.session.rollback()

        assert db.session.get(IntegrationAuditLog, log_id) is not None
        assert IntegrationAuditLog.query.count() == 1


@pytest.mark.parametrize(
    "statement",
    [
        update(IntegrationAuditLog).values(new_value='"Valor adulterado"'),
        delete(IntegrationAuditLog),
    ],
    ids=["bulk-update", "bulk-delete"],
)
def test_auditoria_append_only_bloqueia_mutacoes_em_lote(app, statement):
    with app.app_context():
        log = _criar_log_de_auditoria()
        log_id = log.id

        with pytest.raises(IntegrationAuditLogImmutableError):
            db.session.execute(statement)
        db.session.rollback()

        persisted = db.session.get(IntegrationAuditLog, log_id)
        assert persisted is not None
        assert persisted.new_value == '"Analista QA"'
        assert IntegrationAuditLog.query.count() == 1

