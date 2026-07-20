"""Testes do sincronismo do dominio canonico de Integracao."""

from datetime import datetime

import pytest
from flask import Flask

from app.models import (
    db,
    IntegrationAssignee,
    IntegrationBlockPeriod,
    IntegrationStatus,
    IntegrationStatusHistory,
    IntegrationStore,
    IntegrationSyncRun,
    IntegrationTask,
    Store,
)
from app.services.integration_sync_service import (
    IntegrationSyncService,
    normalize_text,
    parse_clickup_datetime,
)


INSTANTE_ATUAL = datetime(2026, 1, 10, 15, 0, 0)


def _timestamp_ms(value):
    return str(int(value.timestamp() * 1000))


def _criar_loja_implantacao(**overrides):
    dados = {
        "clickup_task_id": "implantacao-1",
        "custom_store_id": "LOJA-1",
        "store_name": "Loja Centro",
        "status": "integracao erp",
        "status_norm": "IN_PROGRESS",
        "created_at": datetime(2025, 12, 1),
        "start_real_at": datetime(2025, 12, 2),
    }
    dados.update(overrides)
    store = Store(**dados)
    db.session.add(store)
    db.session.commit()
    return store


class ClickUpFake:
    def __init__(self):
        self.definition = {
            "statuses": [
                {"id": "status-fila", "status": "Fila", "orderindex": 0, "color": "#64748b"},
                {"id": "status-bloqueado", "status": "Bloqueado", "orderindex": 1, "color": "#dc2626"},
                {"id": "status-execucao", "status": "Em execucao", "orderindex": 2, "color": "#2563eb"},
            ]
        }
        self.parent_tasks = [
            {
                "id": "implantacao-1",
                "custom_id": "LOJA-1",
                "name": "Loja Centro",
                "date_created": _timestamp_ms(datetime(2025, 12, 1)),
                "date_updated": _timestamp_ms(datetime(2026, 1, 9)),
            }
        ]
        self.integration_tasks = [
            {
                "id": "integracao-1",
                "name": "Loja Centro",
                "status": {"id": "status-execucao", "status": "Em execucao"},
                "date_created": _timestamp_ms(datetime(2026, 1, 1, 9)),
                "date_started": _timestamp_ms(datetime(2026, 1, 1, 10)),
                "date_updated": _timestamp_ms(datetime(2026, 1, 10, 14)),
                "assignees": [{"id": 42, "username": "Integrador A"}],
                "custom_fields": [
                    {"id": "field-relation", "name": "_father_task_id", "value": "LOJA-1"},
                    {"id": "field-reason", "name": "Motivo do bloqueio", "value": "Acesso pendente"},
                ],
            }
        ]
        self.history = {
            "status_history": [
                {"status": "Fila", "total_time": {"since": _timestamp_ms(datetime(2026, 1, 1, 10))}},
                {"status": "Bloqueado", "total_time": {"since": _timestamp_ms(datetime(2026, 1, 2, 10))}},
                {"status": "Fila", "total_time": {"since": _timestamp_ms(datetime(2026, 1, 3, 10))}},
                {"status": "Bloqueado", "total_time": {"since": _timestamp_ms(datetime(2026, 1, 4, 10))}},
            ],
            "current_status": {
                "status": "Em execucao",
                "total_time": {"since": _timestamp_ms(datetime(2026, 1, 5, 10))},
            },
        }

    def get_list_definition(self, _list_id):
        return self.definition

    def get_list_fields(self, _list_id):
        return [{"id": "field-relation", "name": "_father_task_id"}]

    def fetch_parent_tasks(self, **_kwargs):
        return self.parent_tasks

    def fetch_tasks_from_list(self, _list_id, **_kwargs):
        return self.integration_tasks

    def get_task_history(self, _task_id):
        return self.history


@pytest.fixture()
def app():
    # A aplicacao minima evita scheduler, reparo de schema e qualquer acesso externo.
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
        db.session.remove()
        db.drop_all()


def test_datas_com_fuso_sao_convertidas_para_utc_naive():
    assert parse_clickup_datetime("2026-01-10T12:00:00-03:00") == datetime(2026, 1, 10, 15)
    assert parse_clickup_datetime("2026-01-10T15:00:00Z") == datetime(2026, 1, 10, 15)


def test_normalizacao_preserva_comparacao_sem_acentos():
    assert normalize_text("  Motivo do BLOQUEIO  ") == "motivo do bloqueio"
    assert normalize_text("Integração") == "integracao"


def test_catalogo_preserva_identidade_em_rename_e_reflete_ordem(app):
    fake = ClickUpFake()
    service = IntegrationSyncService(clickup=fake, now_provider=lambda: INSTANTE_ATUAL)

    with app.app_context():
        service._sync_status_catalog()
        db.session.commit()
        status_original = IntegrationStatus.query.filter_by(external_id="status-fila").one()
        id_original = status_original.id

        fake.definition["statuses"] = [
            {"id": "status-execucao", "status": "Em execucao", "orderindex": 0},
            {"id": "status-fila", "status": "Aguardando analise", "orderindex": 1},
            {"id": "status-novo", "status": "Validacao", "orderindex": 2},
        ]
        service._sync_status_catalog()
        db.session.commit()

        renomeado = IntegrationStatus.query.filter_by(external_id="status-fila").one()
        removido = IntegrationStatus.query.filter_by(external_id="status-bloqueado").one()
        novo = IntegrationStatus.query.filter_by(external_id="status-novo").one()
        assert renomeado.id == id_original
        assert (renomeado.name, renomeado.position) == ("Aguardando analise", 1)
        assert removido.active is False
        assert novo.active is True


def test_catalogo_vazio_nao_inativa_o_ultimo_estado_valido(app):
    fake = ClickUpFake()
    service = IntegrationSyncService(clickup=fake, now_provider=lambda: INSTANTE_ATUAL)

    with app.app_context():
        service._sync_status_catalog()
        db.session.commit()
        fake.definition = {"statuses": []}

        with pytest.raises(RuntimeError):
            service._sync_status_catalog()
        db.session.rollback()

        assert IntegrationStatus.query.filter_by(active=True).count() == 3


def test_full_sync_e_idempotente_e_preserva_reentradas_e_bloqueios(app):
    fake = ClickUpFake()
    service = IntegrationSyncService(clickup=fake, now_provider=lambda: INSTANTE_ATUAL)

    with app.app_context():
        _criar_loja_implantacao()
        primeiro = service.run("FULL")
        segundo = service.run("FULL")

        store = IntegrationStore.query.one()
        task = IntegrationTask.query.one()
        historicos = IntegrationStatusHistory.query.order_by(IntegrationStatusHistory.entered_at).all()
        bloqueios = IntegrationBlockPeriod.query.order_by(IntegrationBlockPeriod.started_at).all()

        assert primeiro["status"] == segundo["status"] == "SUCCESS"
        assert IntegrationSyncRun.query.count() == 2
        assert IntegrationStore.query.count() == 1
        assert IntegrationTask.query.count() == 1
        assert IntegrationAssignee.query.count() == 1
        assert len(historicos) == 5
        assert len(bloqueios) == 2
        assert store.reconciliation_status == "MATCHED"
        assert task.store_id == store.id
        assert task.is_blocked is False
        assert [item.occurrence for item in historicos if item.status.name == "Fila"] == [1, 2]
        assert [item.occurrence for item in bloqueios] == [1, 2]
        assert all(item.reason == "Acesso pendente" for item in bloqueios)


def test_falha_parcial_preserva_ultimo_estado_confirmado(app):
    fake = ClickUpFake()
    service = IntegrationSyncService(clickup=fake, now_provider=lambda: INSTANTE_ATUAL)

    with app.app_context():
        _criar_loja_implantacao()
        service.run("FULL")
        Store.query.one().store_name = "Nome que nao deve ser confirmado"
        db.session.commit()

        def falhar_ao_ler_historico(_task_id):
            raise RuntimeError("falha simulada do ClickUp")

        fake.get_task_history = falhar_ao_ler_historico
        with pytest.raises(RuntimeError, match="falha simulada"):
            service.run("INCREMENTAL")

        store = IntegrationStore.query.one()
        ultima_execucao = IntegrationSyncRun.query.order_by(IntegrationSyncRun.id.desc()).first()
        assert store.store_name == "Loja Centro"
        assert store.integration_task is not None
        assert ultima_execucao.status == "FAILED"
        assert "RuntimeError" in ultima_execucao.error_summary


def test_coorte_contem_ativas_e_concluidas_em_2026(app):
    fake = ClickUpFake()
    service = IntegrationSyncService(clickup=fake, now_provider=lambda: INSTANTE_ATUAL)

    with app.app_context():
        _criar_loja_implantacao()
        _criar_loja_implantacao(
            clickup_task_id="implantacao-concluida-2026",
            custom_store_id="LOJA-2",
            store_name="Loja concluida em 2026",
            status="loja entregue",
            status_norm="DONE",
            end_real_at=datetime(2026, 1, 5),
        )
        _criar_loja_implantacao(
            clickup_task_id="implantacao-concluida-2025",
            custom_store_id="LOJA-3",
            store_name="Loja concluida em 2025",
            status="loja entregue",
            status_norm="DONE",
            end_real_at=datetime(2025, 12, 31),
        )

        run = IntegrationSyncRun(run_type="FULL", status="RUNNING")
        db.session.add(run)
        db.session.flush()
        service._sync_store_catalog(run)
        db.session.commit()

        presentes = IntegrationStore.query.filter_by(source_present=True).order_by(
            IntegrationStore.store_name
        ).all()
        assert [store.store_name for store in presentes] == ["Loja Centro", "Loja concluida em 2026"]
        assert run.stores_read == 2


def test_reconciliacao_distingue_ambiguidade_e_tarefa_orfa(app):
    fake = ClickUpFake()
    service = IntegrationSyncService(clickup=fake, now_provider=lambda: INSTANTE_ATUAL)

    with app.app_context():
        stores = [
            IntegrationStore(source_task_id=f"source-{indice}", store_name="Loja duplicada")
            for indice in range(2)
        ]
        ambigua = IntegrationTask(clickup_task_id="task-ambigua", task_name="Loja duplicada")
        orfa = IntegrationTask(clickup_task_id="task-orfa", task_name="Loja inexistente")
        run = IntegrationSyncRun(run_type="FULL", status="RUNNING")
        db.session.add_all([*stores, ambigua, orfa, run])
        db.session.flush()

        service._reconcile_tasks({ambigua.id: None, orfa.id: None}, run)
        db.session.commit()

        assert {store.reconciliation_status for store in stores} == {"AMBIGUOUS"}
        assert ambigua.store_id is None
        assert ambigua.reconciliation_method == "AMBIGUOUS"
        assert orfa.store_id is None
        assert orfa.reconciliation_method == "ORPHAN"
        assert run.ambiguous_matches == 1
        assert run.orphan_tasks == 1
