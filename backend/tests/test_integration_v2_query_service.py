"""Testes das consultas e dos calculos temporais da Integracao V2."""

from datetime import datetime

import pytest
from flask import Flask

from app.models import (
    db,
    IntegrationV2BlockPeriod,
    IntegrationV2Status,
    IntegrationV2StatusHistory,
    IntegrationV2Store,
    IntegrationV2Task,
)
from app.routes_integration import integration_bp
from app.routes_integration_v2 import integration_v2_bp, parse_bool, parse_date
from app.services.integration_v2_query_service import (
    IntegrationV2QueryService,
    merged_overlap_seconds,
    percentile,
)


AGORA = datetime(2026, 1, 10, 10)


def _headers_autenticados():
    return {"Authorization": "{} {}".format("Bearer", "credencial-ficticia")}


@pytest.fixture()
def app():
    # O Flask minimo mantem os testes independentes dos reparos executados no create_app.
    test_app = Flask(__name__)
    test_app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    db.init_app(test_app)
    test_app.register_blueprint(integration_v2_bp)
    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()


def _criar_cenario_temporal():
    fila = IntegrationV2Status(
        list_id="integracao",
        external_id="fila",
        name="Fila",
        position=0,
        active=True,
    )
    execucao = IntegrationV2Status(
        list_id="integracao",
        external_id="execucao",
        name="Em execucao",
        position=1,
        active=True,
    )
    store = IntegrationV2Store(
        source_task_id="implantacao-1",
        store_name="Loja com integracao",
        reconciliation_status="MATCHED",
        first_seen_at=datetime(2025, 12, 1),
        last_seen_at=AGORA,
        synced_at=AGORA,
    )
    sem_integracao = IntegrationV2Store(
        source_task_id="implantacao-2",
        store_name="Loja ainda nao integrada",
        reconciliation_status="NOT_IN_INTEGRATION",
        first_seen_at=datetime(2025, 12, 2),
        last_seen_at=AGORA,
        synced_at=AGORA,
    )
    task = IntegrationV2Task(
        clickup_task_id="task-1",
        task_name="Loja com integracao",
        store=store,
        current_status=execucao,
        started_at=datetime(2026, 1, 1, 10),
        is_blocked=False,
        synced_at=AGORA,
    )
    db.session.add_all([fila, execucao, store, sem_integracao, task])
    db.session.flush()

    historicos = [
        IntegrationV2StatusHistory(
            task=task,
            store_id=store.id,
            status=fila,
            entered_at=datetime(2026, 1, 1, 10),
            exited_at=datetime(2026, 1, 2, 10),
            duration_seconds=86400,
            occurrence=1,
            idempotency_key="history-1",
        ),
        IntegrationV2StatusHistory(
            task=task,
            store_id=store.id,
            status=fila,
            entered_at=datetime(2026, 1, 9, 10),
            is_current=True,
            occurrence=2,
            idempotency_key="history-2",
        ),
    ]
    bloqueios = [
        IntegrationV2BlockPeriod(
            task=task,
            store_id=store.id,
            started_at=datetime(2026, 1, 2, 10),
            ended_at=datetime(2026, 1, 4, 10),
            idempotency_key="block-1",
        ),
        IntegrationV2BlockPeriod(
            task=task,
            store_id=store.id,
            started_at=datetime(2026, 1, 3, 10),
            ended_at=datetime(2026, 1, 5, 10),
            idempotency_key="block-2",
        ),
        IntegrationV2BlockPeriod(
            task=task,
            store_id=store.id,
            started_at=datetime(2026, 1, 8, 10),
            is_current=True,
            idempotency_key="block-3",
        ),
    ]
    db.session.add_all(historicos + bloqueios)
    db.session.commit()
    return store, sem_integracao


def test_intervalos_sobrepostos_sao_unidos_sem_contagem_dupla():
    class Periodo:
        def __init__(self, inicio, fim):
            self.started_at = inicio
            self.ended_at = fim

    periodos = [
        Periodo(datetime(2026, 1, 2), datetime(2026, 1, 5)),
        Periodo(datetime(2026, 1, 4), datetime(2026, 1, 7)),
        Periodo(datetime(2026, 1, 9), None),
    ]

    segundos = merged_overlap_seconds(
        periodos,
        start=datetime(2026, 1, 1),
        end=datetime(2026, 1, 11),
        now=datetime(2026, 1, 10),
    )

    assert segundos == 6 * 86400


def test_percentis_interpolam_amostras_ordenadas():
    assert percentile([], 0.9) is None
    assert percentile([40, 10, 30, 20], 0.5) == 25
    assert percentile([10, 20, 30, 40], 0.75) == 32


def test_tempo_bruto_bloqueado_liquido_e_reentrada(app):
    with app.app_context():
        store, _ = _criar_cenario_temporal()
        service = IntegrationV2QueryService(now_provider=lambda: AGORA)

        timing = service.store_timing(store)
        detalhe = service.store_detail(store)

        assert timing == {
            "gross_seconds": 9 * 86400,
            "blocked_seconds": 5 * 86400,
            "net_seconds": 4 * 86400,
            "current_stage_seconds": 86400,
        }
        assert detalhe["stage_totals"] == [{
            "status_id": store.integration_task.status_history[0].status_id,
            "status_name": "Fila",
            "color": None,
            "total_seconds": 2 * 86400,
            "visits": 2,
            "current": True,
        }]
        assert len(detalhe["block_periods"]) == 3


def test_monitor_e_metricas_compartilham_o_mesmo_universo(app):
    with app.app_context():
        _criar_cenario_temporal()
        service = IntegrationV2QueryService(now_provider=lambda: AGORA)

        monitor = service.monitor({}, page=1, per_page=50)
        metrics = service.metrics({})
        somente_nao_integradas = service.metrics({"reconciliation_status": "NOT_IN_INTEGRATION"})

        assert monitor["pagination"]["total"] == metrics["total_stores"] == 2
        assert metrics["matched_stores"] == 1
        assert metrics["not_in_integration"] == 1
        assert metrics["coverage_percent"] == 50.0
        assert somente_nao_integradas["total_stores"] == 1
        assert somente_nao_integradas["not_in_integration"] == 1


def test_filtro_sem_bloqueio_inclui_loja_que_ainda_nao_tem_tarefa(app):
    with app.app_context():
        _criar_cenario_temporal()
        service = IntegrationV2QueryService(now_provider=lambda: AGORA)

        assert service.filtered_query({"blocked": False}).count() == 2


def test_parsers_de_rota_validam_booleano_e_convertem_offset_para_utc():
    assert parse_bool("sim") is True
    assert parse_bool("nao") is False
    with pytest.raises(ValueError):
        parse_bool("talvez")
    assert parse_date("2026-01-10T12:00:00-03:00") == datetime(2026, 1, 10, 15)


def test_blueprint_novo_nao_altera_prefixo_do_modulo_legado():
    assert integration_bp.url_prefix == "/api/integration"
    assert integration_v2_bp.url_prefix == "/api/integration-v2"


def test_rotas_de_leitura_e_sync_exigem_autenticacao(app):
    client = app.test_client()

    monitor = client.get("/api/integration-v2/monitor")
    sync = client.post("/api/integration-v2/sync", json={"mode": "FULL"})

    assert monitor.status_code == 401
    assert monitor.get_json()["code"] == "AUTH_MISSING"
    assert sync.status_code == 401
    assert sync.get_json()["code"] == "AUTH_MISSING"


def test_rota_rejeita_paginacao_fora_do_limite(app, monkeypatch):
    from app.services import security_service

    monkeypatch.setattr(security_service, "decode_jwt_token", lambda _token: {"sub": 1})
    response = app.test_client().get(
        "/api/integration-v2/monitor?per_page=201",
        headers=_headers_autenticados(),
    )

    assert response.status_code == 400
    assert response.get_json()["code"] == "INVALID_QUERY"


def test_detalhe_inexistente_retorna_contrato_404(app, monkeypatch):
    from app.services import security_service

    monkeypatch.setattr(security_service, "decode_jwt_token", lambda _token: {"sub": 1})
    response = app.test_client().get(
        "/api/integration-v2/stores/999",
        headers=_headers_autenticados(),
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "Loja nao encontrada.", "code": "STORE_NOT_FOUND"}
