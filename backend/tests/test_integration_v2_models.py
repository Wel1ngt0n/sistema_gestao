"""Testes estruturais do dominio isolado de Integracao V2."""

from sqlalchemy import UniqueConstraint

from app.models import (
    IntegrationV2Assignee,
    IntegrationV2BlockPeriod,
    IntegrationV2Status,
    IntegrationV2StatusCatalogRun,
    IntegrationV2StatusHistory,
    IntegrationV2Store,
    IntegrationV2SyncRun,
    IntegrationV2Task,
    IntegrationV2TaskAssignee,
)


MODELOS_V2 = (
    IntegrationV2Store,
    IntegrationV2Task,
    IntegrationV2Status,
    IntegrationV2StatusHistory,
    IntegrationV2Assignee,
    IntegrationV2TaskAssignee,
    IntegrationV2BlockPeriod,
    IntegrationV2StatusCatalogRun,
    IntegrationV2SyncRun,
)


def _restricoes_unicas(modelo):
    return {
        tuple(coluna.name for coluna in restricao.columns)
        for restricao in modelo.__table__.constraints
        if isinstance(restricao, UniqueConstraint)
    }


def test_todas_as_tabelas_usam_namespace_novo():
    nomes = {modelo.__tablename__ for modelo in MODELOS_V2}

    assert nomes == {
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


def test_chaves_estrangeiras_nao_apontam_para_tabelas_legadas():
    destinos = {
        chave.target_fullname
        for modelo in MODELOS_V2
        for chave in modelo.__table__.foreign_keys
    }

    assert destinos
    assert all(destino.startswith("integration_v2_") for destino in destinos)


def test_identidades_externas_e_transicoes_sao_idempotentes():
    assert IntegrationV2Store.source_task_id.property.columns[0].unique is True
    assert IntegrationV2Task.clickup_task_id.property.columns[0].unique is True
    assert IntegrationV2Assignee.clickup_user_id.property.columns[0].unique is True
    assert IntegrationV2StatusHistory.idempotency_key.property.columns[0].unique is True
    assert IntegrationV2BlockPeriod.idempotency_key.property.columns[0].unique is True
    assert ("list_id", "external_id") in _restricoes_unicas(IntegrationV2Status)
    assert ("task_id", "assignee_id") in _restricoes_unicas(IntegrationV2TaskAssignee)


def test_nome_do_status_nao_participa_da_identidade():
    restricoes = _restricoes_unicas(IntegrationV2Status)

    assert ("list_id", "external_id") in restricoes
    assert all("name" not in colunas for colunas in restricoes)

