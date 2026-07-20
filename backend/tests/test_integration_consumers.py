"""Testes dos consumidores que passaram a usar o domínio canônico de Integração."""

from datetime import datetime

import pytest
from flask import Flask

from app.models import (
    IntegrationAssignee,
    IntegrationStatus,
    IntegrationStatusHistory,
    IntegrationStore,
    IntegrationTask,
    IntegrationTaskAssignee,
    Store,
    db,
)
from app.routes_performance import get_performance_summary


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
        db.session.remove()
        db.drop_all()


def test_performance_usa_integrador_e_qualidade_do_dominio_canonico(app):
    inicio = datetime(2026, 7, 1, 8)
    fim = datetime(2026, 7, 20, 8)
    source = Store(
        store_name="Loja matriz",
        custom_store_id="FOH-900",
        clickup_task_id="implantacao-900",
        tipo_loja="Matriz",
    )
    integrador = IntegrationAssignee(
        clickup_user_id="usuario-1",
        username="Integrador Canônico",
        synced_at=fim,
    )
    status_contato = IntegrationStatus(
        list_id="integracao",
        external_id="contato",
        name="Contato/Comunicação",
        position=1,
        synced_at=fim,
    )
    status_concluido = IntegrationStatus(
        list_id="integracao",
        external_id="concluido",
        name="Concluído",
        native_type="closed",
        position=2,
        synced_at=fim,
    )
    loja = IntegrationStore(
        source_task_id=source.clickup_task_id,
        source_custom_id=source.custom_store_id,
        store_name=source.store_name,
        source_present=True,
        reconciliation_status="MATCHED",
        post_integration_issue_count=0,
        documentation_status="DONE",
        first_seen_at=inicio,
        last_seen_at=fim,
        synced_at=fim,
    )
    tarefa = IntegrationTask(
        clickup_task_id="integracao-900",
        task_name=source.store_name,
        store=loja,
        current_status=status_concluido,
        completed_at=fim,
        synced_at=fim,
    )
    db.session.add_all([source, integrador, status_contato, status_concluido, loja, tarefa])
    db.session.flush()
    db.session.add_all([
        IntegrationTaskAssignee(task=tarefa, assignee=integrador, synced_at=fim),
        IntegrationStatusHistory(
            task=tarefa,
            store_id=loja.id,
            status=status_contato,
            entered_at=inicio,
            exited_at=fim,
            duration_seconds=int((fim - inicio).total_seconds()),
            idempotency_key="performance-contato-1",
            synced_at=fim,
        ),
    ])
    db.session.commit()

    with app.test_request_context("/api/performance/summary?cycle=2026-07"):
        response = get_performance_summary.__wrapped__({})
        payload = response.get_json()

    assert payload["collective_kpis"] == {
        "volume_points": 1.0,
        "quality_global": 100.0,
        "doc_global": 100.0,
    }
    assert payload["collaborators"][0]["username"] == "Integrador Canônico"
    assert payload["collaborators"][0]["metrics"]["completed_count"] == 1
    assert payload["collaborators"][0]["metrics"]["sla_pct"] == 100.0
