"""Testes das consultas e dos calculos temporais da Integracao canonica."""

from datetime import datetime

import pytest
from flask import Flask

from app.models import (
    Store,
    StoreSyncLog,
    User,
    Permission,
    Role,
    db,
    IntegrationAssignee,
    IntegrationAuditLog,
    IntegrationBlockPeriod,
    IntegrationStatus,
    IntegrationStatusHistory,
    IntegrationStore,
    IntegrationTask,
    IntegrationTaskAssignee,
)
from app.routes import api_bp
from app.routes_integration import integration_bp, parse_bool, parse_date
from app.services.integration_query_service import (
    IntegrationQueryService,
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
    test_app.register_blueprint(api_bp)
    test_app.register_blueprint(integration_bp)
    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()


def _criar_cenario_temporal():
    fila = IntegrationStatus(
        list_id="integracao",
        external_id="fila",
        name="Contato/Comunicação",
        position=0,
        active=True,
    )
    execucao = IntegrationStatus(
        list_id="integracao",
        external_id="execucao",
        name="Em execucao",
        position=1,
        active=True,
    )
    store = IntegrationStore(
        source_task_id="implantacao-1",
        store_name="Loja com integracao",
        reconciliation_status="MATCHED",
        first_seen_at=datetime(2025, 12, 1),
        last_seen_at=AGORA,
        synced_at=AGORA,
    )
    sem_integracao = IntegrationStore(
        source_task_id="implantacao-2",
        store_name="Loja ainda nao integrada",
        reconciliation_status="NOT_IN_INTEGRATION",
        first_seen_at=datetime(2025, 12, 2),
        last_seen_at=AGORA,
        synced_at=AGORA,
    )
    task = IntegrationTask(
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
        IntegrationStatusHistory(
            task=task,
            store_id=store.id,
            status=fila,
            entered_at=datetime(2026, 1, 1, 10),
            exited_at=datetime(2026, 1, 2, 10),
            duration_seconds=86400,
            occurrence=1,
            idempotency_key="history-1",
        ),
        IntegrationStatusHistory(
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
        IntegrationBlockPeriod(
            task=task,
            store_id=store.id,
            started_at=datetime(2026, 1, 2, 10),
            ended_at=datetime(2026, 1, 4, 10),
            discount_approved=True,
            review_reason="Aguardando retorno externo",
            reviewed_at=AGORA,
            reviewed_by="Gestor",
            idempotency_key="block-1",
        ),
        IntegrationBlockPeriod(
            task=task,
            store_id=store.id,
            started_at=datetime(2026, 1, 3, 10),
            ended_at=datetime(2026, 1, 5, 10),
            discount_approved=True,
            review_reason="Dependência do cliente",
            reviewed_at=AGORA,
            reviewed_by="Gestor",
            idempotency_key="block-2",
        ),
        IntegrationBlockPeriod(
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


def _criar_cenario_operacional():
    contato = IntegrationStatus(
        list_id="integracao",
        external_id="contato",
        name="Contato e Comunicação",
        position=0,
        active=True,
    )
    concluido = IntegrationStatus(
        list_id="integracao",
        external_id="concluido",
        name="Concluído",
        native_type="closed",
        position=1,
        active=True,
    )
    sincronizado = IntegrationAssignee(
        clickup_user_id="sync-1",
        username="Integrador sincronizado",
        active=True,
    )
    manual = IntegrationAssignee(
        clickup_user_id="manual-1",
        username="Integrador manual",
        active=True,
    )
    inativo = IntegrationAssignee(
        clickup_user_id="inactive-1",
        username="Integrador inativo",
        active=False,
    )
    store = IntegrationStore(
        source_task_id="implantacao-operacional",
        source_custom_id="FOH-900",
        business_id="FOH-900",
        store_name="Loja operacional",
        reconciliation_status="MATCHED",
        first_seen_at=datetime(2025, 12, 1),
        last_seen_at=AGORA,
        synced_at=AGORA,
    )
    task = IntegrationTask(
        clickup_task_id="integracao-operacional",
        task_name="Loja operacional",
        store=store,
        current_status=concluido,
        started_at=datetime(2025, 12, 20, 10),
        completed_at=AGORA,
        is_blocked=False,
        synced_at=AGORA,
    )
    usuario = User(
        name="Gestora de integrações",
        email="gestora@example.com",
        password_hash="hash-de-teste",
        is_active=True,
    )
    permissao = Permission(
        name="manage_performance",
        description="Gerenciar performance",
        module="INTEGRACAO",
    )
    papel = Role(name="Gestor de performance")
    papel.permissions.append(permissao)
    usuario.roles.append(papel)
    db.session.add_all([
        contato,
        concluido,
        sincronizado,
        manual,
        inativo,
        store,
        task,
        usuario,
        papel,
        permissao,
    ])
    db.session.flush()
    db.session.add_all([
        IntegrationTaskAssignee(task=task, assignee=sincronizado),
        IntegrationStatusHistory(
            task=task,
            store_id=store.id,
            status=contato,
            entered_at=datetime(2026, 1, 1, 10),
            exited_at=datetime(2026, 1, 3, 10),
            occurrence=1,
            idempotency_key="operational-contact",
        ),
        IntegrationStatusHistory(
            task=task,
            store_id=store.id,
            status=concluido,
            entered_at=datetime(2026, 1, 3, 10),
            exited_at=AGORA,
            occurrence=1,
            idempotency_key="operational-done",
        ),
        IntegrationBlockPeriod(
            task=task,
            store_id=store.id,
            started_at=datetime(2026, 1, 2, 10),
            ended_at=datetime(2026, 1, 4, 10),
            reason="Aguardando cliente",
            idempotency_key="operational-block",
        ),
    ])
    db.session.commit()
    return store, sincronizado, manual, inativo, usuario


def _autenticar(monkeypatch, user_id):
    from app.services import security_service

    monkeypatch.setattr(
        security_service,
        "decode_jwt_token",
        lambda _token: {"sub": str(user_id)},
    )


def _criar_usuario_teste(email, *, is_active=True, permission_names=()):
    user = User(
        name=email.split("@", 1)[0],
        email=email,
        password_hash="hash-de-teste",
        is_active=is_active,
    )
    for index, permission_name in enumerate(permission_names):
        permission = Permission.query.filter_by(name=permission_name).first()
        if permission is None:
            permission = Permission(name=permission_name, module="TESTE")
        role = Role(name=f"teste-{index}-{email}"[:50])
        role.permissions.append(permission)
        user.roles.append(role)
        db.session.add_all([permission, role])
    db.session.add(user)
    db.session.commit()
    return user


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
        service = IntegrationQueryService(now_provider=lambda: AGORA)

        timing = service.store_timing(store)
        detalhe = service.store_detail(store)

        assert timing == {
            "gross_seconds": 9 * 86400,
            "blocked_seconds": 3 * 86400,
            "net_seconds": 6 * 86400,
            "current_stage_seconds": 86400,
        }
        assert detalhe["stage_totals"] == [{
            "status_id": store.integration_task.status_history[0].status_id,
            "status_name": "Contato/Comunicação",
            "color": None,
            "total_seconds": 2 * 86400,
            "visits": 2,
            "current": True,
        }]
        assert len(detalhe["block_periods"]) == 3
        assert [item["review_status"] for item in detalhe["block_periods"]] == [
            "DISCOUNTED",
            "DISCOUNTED",
            "PENDING",
        ]


def test_inicio_oficial_usa_primeira_entrada_em_contato_comunicacao(app):
    with app.app_context():
        store, _ = _criar_cenario_temporal()
        task = store.integration_task
        etapa_anterior = IntegrationStatus(
            list_id="integracao",
            external_id="backlog",
            name="Backlog",
            position=-1,
            active=True,
        )
        db.session.add(etapa_anterior)
        db.session.flush()
        db.session.add(IntegrationStatusHistory(
            task=task,
            store_id=store.id,
            status=etapa_anterior,
            entered_at=datetime(2025, 12, 20, 10),
            exited_at=datetime(2025, 12, 30, 10),
            occurrence=1,
            idempotency_key="history-before-contact",
        ))
        db.session.commit()

        service = IntegrationQueryService(now_provider=lambda: AGORA)
        detalhe = service.store_detail(store)

        assert task.started_at == datetime(2026, 1, 1, 10)
        assert detalhe["integration_dates"] == {
            "started_at": "2026-01-01T10:00:00Z",
            "finished_at": None,
            "start_source": "CONTACT_STAGE",
        }
        assert service.filtered_query({"started_from": datetime(2026, 1, 1)}).count() == 1
        assert service.filtered_query({"started_from": datetime(2026, 1, 2)}).count() == 0


def test_somente_bloqueio_aprovado_desconta_tempo():
    class Periodo:
        def __init__(self, inicio, fim, decisao):
            self.started_at = inicio
            self.ended_at = fim
            self.discount_approved = decisao

    periodos = [
        Periodo(datetime(2026, 1, 2), datetime(2026, 1, 3), None),
        Periodo(datetime(2026, 1, 3), datetime(2026, 1, 4), False),
        Periodo(datetime(2026, 1, 4), datetime(2026, 1, 6), True),
    ]

    assert merged_overlap_seconds(
        periodos,
        start=datetime(2026, 1, 1),
        end=datetime(2026, 1, 10),
        now=AGORA,
    ) == 2 * 86400


def test_monitor_e_metricas_compartilham_o_mesmo_universo(app):
    with app.app_context():
        _criar_cenario_temporal()
        service = IntegrationQueryService(now_provider=lambda: AGORA)

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
        service = IntegrationQueryService(now_provider=lambda: AGORA)

        assert service.filtered_query({"blocked": False}).count() == 2


def test_integrador_manual_tem_precedencia_em_lista_filtro_e_metricas(app):
    with app.app_context():
        store, sincronizado, manual, _, _ = _criar_cenario_operacional()
        store.manual_integrator = manual
        db.session.commit()
        service = IntegrationQueryService(now_provider=lambda: AGORA)

        item = service.serialize_store(store)
        metrics = service.metrics({})

        assert item["integration_task"]["assignee_source"] == "MANUAL"
        assert [value["id"] for value in item["integration_task"]["assignees"]] == [manual.id]
        assert service.filtered_query({"assignee_id": manual.id}).count() == 1
        assert service.filtered_query({"assignee_id": sincronizado.id}).count() == 0
        assert metrics["by_assignee"] == [{
            "assignee_id": manual.id,
            "username": "Integrador manual",
            "count": 1,
            "completed_count": 1,
            "average_net_seconds": 9 * 86400,
        }]


def test_patch_operacional_persiste_campos_e_adiciona_auditoria_sem_reescrever_log(app, monkeypatch):
    with app.app_context():
        store, _, manual, _, usuario = _criar_cenario_operacional()
        store_id = store.id
        manual_id = manual.id
        user_id = usuario.id
    _autenticar(monkeypatch, user_id)
    payload = {
        "manual_integrator_id": manual_id,
        "quality_reviewer": "  Analista QA  ",
        "had_post_integration_issues": True,
        "followed_integration_process": False,
        "quality_notes": "  Houve divergência no catálogo.  ",
    }

    primeira = app.test_client().patch(
        f"/api/integration/stores/{store_id}/operational",
        json=payload,
        headers=_headers_autenticados(),
    )
    segunda = app.test_client().patch(
        f"/api/integration/stores/{store_id}/operational",
        json=payload,
        headers=_headers_autenticados(),
    )

    assert primeira.status_code == 200
    assert segunda.status_code == 200
    perfil = primeira.get_json()["operational_profile"]
    assert perfil["manual_integrator"]["id"] == manual_id
    assert perfil["integrator_source"] == "MANUAL"
    assert perfil["quality_reviewer"] == "Analista QA"
    assert perfil["had_post_integration_issues"] is True
    assert perfil["followed_integration_process"] is False
    assert perfil["quality_notes"] == "Houve divergência no catálogo."
    assert perfil["updated_by"] == "Gestora de integrações"
    logs_da_resposta = {
        item["field_name"]: item
        for item in primeira.get_json()["audit_logs"]
    }
    assert logs_da_resposta["had_post_integration_issues"]["new_value"] is True
    assert logs_da_resposta["followed_integration_process"]["new_value"] is False
    assert logs_da_resposta["manual_integrator_id"]["new_value"]["id"] == manual_id
    with app.app_context():
        logs = IntegrationAuditLog.query.order_by(IntegrationAuditLog.id).all()
        assert len(logs) == 5
        assert {item.field_name for item in logs} == set(payload)
        assert all(item.action == "OPERATIONAL_UPDATE" for item in logs)
        assert all(item.changed_by_id == user_id for item in logs)
        assert all(item.changed_by_name == "Gestora de integrações" for item in logs)


@pytest.mark.parametrize(
    ("payload", "mensagem"),
    [
        ({"campo_desconhecido": True}, "Campos nao permitidos"),
        ({"had_post_integration_issues": "sim"}, "verdadeiro, falso ou nulo"),
        ({"manual_integrator_id": True}, "Integrador selecionado e invalido"),
        ({"quality_reviewer": "x" * 256}, "no maximo 255 caracteres"),
    ],
)
def test_patch_operacional_rejeita_payload_invalido(app, monkeypatch, payload, mensagem):
    with app.app_context():
        store, _, _, _, usuario = _criar_cenario_operacional()
        store_id = store.id
        user_id = usuario.id
    _autenticar(monkeypatch, user_id)

    response = app.test_client().patch(
        f"/api/integration/stores/{store_id}/operational",
        json=payload,
        headers=_headers_autenticados(),
    )

    assert response.status_code == 400
    assert response.get_json()["code"] == "INVALID_QUERY"
    assert mensagem in response.get_json()["error"]
    with app.app_context():
        assert IntegrationAuditLog.query.count() == 0


def test_patch_operacional_rejeita_integrador_inativo_e_usuario_inativo(app, monkeypatch):
    with app.app_context():
        store, _, _, inativo, usuario = _criar_cenario_operacional()
        store_id = store.id
        inactive_assignee_id = inativo.id
        assert usuario.has_permission("manage_performance") is True
        usuario.is_active = False
        user_id = usuario.id
        db.session.commit()
    _autenticar(monkeypatch, user_id)

    usuario_inativo = app.test_client().patch(
        f"/api/integration/stores/{store_id}/operational",
        json={"quality_reviewer": "QA"},
        headers=_headers_autenticados(),
    )
    with app.app_context():
        db.session.get(User, user_id).is_active = True
        db.session.commit()
    integrador_inativo = app.test_client().patch(
        f"/api/integration/stores/{store_id}/operational",
        json={"manual_integrator_id": inactive_assignee_id},
        headers=_headers_autenticados(),
    )

    assert usuario_inativo.status_code == 403
    assert usuario_inativo.get_json()["code"] == "USER_INACTIVE"
    assert integrador_inativo.status_code == 400
    assert integrador_inativo.get_json()["code"] == "INVALID_QUERY"


def test_revisao_de_bloqueio_audita_e_recalcula_desconto_aprovado_e_recusado(app, monkeypatch):
    with app.app_context():
        store, _, _, _, usuario = _criar_cenario_operacional()
        store_id = store.id
        block_id = store.integration_task.block_periods[0].id
        user_id = usuario.id
        assert IntegrationQueryService(now_provider=lambda: AGORA).store_timing(store)["blocked_seconds"] == 0
    _autenticar(monkeypatch, user_id)

    aprovado = app.test_client().patch(
        f"/api/integration/stores/{store_id}/blocks/{block_id}",
        json={"discount_approved": True, "review_reason": "Dependência externa confirmada"},
        headers=_headers_autenticados(),
    )
    recusado = app.test_client().patch(
        f"/api/integration/stores/{store_id}/blocks/{block_id}",
        json={"discount_approved": False, "review_reason": "Tempo atribuível ao time"},
        headers=_headers_autenticados(),
    )

    assert aprovado.status_code == 200
    assert aprovado.get_json()["timing"] == {
        "gross_seconds": 9 * 86400,
        "blocked_seconds": 2 * 86400,
        "net_seconds": 7 * 86400,
        "current_stage_seconds": None,
    }
    assert aprovado.get_json()["block_periods"][0]["review_status"] == "DISCOUNTED"
    assert recusado.status_code == 200
    assert recusado.get_json()["timing"]["blocked_seconds"] == 0
    assert recusado.get_json()["timing"]["net_seconds"] == 9 * 86400
    assert recusado.get_json()["block_periods"][0]["review_status"] == "NOT_DISCOUNTED"
    with app.app_context():
        logs = IntegrationAuditLog.query.order_by(IntegrationAuditLog.id).all()
        assert len(logs) == 2
        assert [item.action for item in logs] == ["BLOCK_REVIEW", "BLOCK_REVIEW"]
        assert [item.reason for item in logs] == [
            "Dependência externa confirmada",
            "Tempo atribuível ao time",
        ]
        assert all(item.field_name == f"block:{block_id}" for item in logs)


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"discount_approved": None, "review_reason": "Motivo"},
        {"discount_approved": True, "review_reason": "   "},
        {"discount_approved": True, "review_reason": "x" * 501},
    ],
)
def test_revisao_de_bloqueio_exige_decisao_booleana_e_motivo_valido(app, monkeypatch, payload):
    with app.app_context():
        store, _, _, _, usuario = _criar_cenario_operacional()
        store_id = store.id
        block_id = store.integration_task.block_periods[0].id
        user_id = usuario.id
    _autenticar(monkeypatch, user_id)

    response = app.test_client().patch(
        f"/api/integration/stores/{store_id}/blocks/{block_id}",
        json=payload,
        headers=_headers_autenticados(),
    )

    assert response.status_code == 400
    assert response.get_json()["code"] == "INVALID_QUERY"
    with app.app_context():
        assert IntegrationAuditLog.query.count() == 0


def test_detalhe_referencia_implantacao_e_unifica_historico_sem_alterar_legado(app):
    with app.app_context():
        store, _, _, _, _ = _criar_cenario_operacional()
        matriz = Store(
            store_name="Matriz da rede",
            custom_store_id="FOH-899",
            clickup_task_id="implantacao-matriz",
        )
        legado = Store(
            store_name="Loja operacional no legado",
            custom_store_id="FOH-900",
            clickup_task_id=store.source_task_id,
            clickup_url="https://app.clickup.com/t/implantacao-operacional",
            status="Finalizado",
            status_norm="DONE",
            manual_start_date=datetime(2025, 10, 1, 10),
            manual_finished_at=datetime(2025, 12, 15, 10),
            implantador_atual="Implantadora",
            erp="ERP Teste",
            cnpj="00.000.000/0001-00",
            crm="CRM Teste",
            rede="Rede Teste",
            tipo_loja="Filial",
            matriz=matriz,
            valor_mensalidade=1200.0,
            valor_implantacao=6000.0,
            financeiro_status="Adimplente",
            tempo_contrato=90,
            address="Rua de Teste, 100",
            state_uf="SP",
            had_ecommerce=True,
            previous_platform="Plataforma antiga",
            deployment_type="MIGRAÇÃO",
            projected_orders=500,
            description="Dados técnicos preservados",
        )
        log_legado = StoreSyncLog(
            store=legado,
            field_name="erp",
            old_value="ERP Antigo",
            new_value="ERP Teste",
            changed_at=datetime(2026, 1, 5, 10),
            source="sync",
        )
        db.session.add_all([matriz, legado, log_legado])
        db.session.commit()
        service = IntegrationQueryService(now_provider=lambda: AGORA)

        detalhe = service.store_detail(store)

        assert detalhe["implantation_reference"] == {
            "store_id": legado.id,
            "store_name": "Loja operacional no legado",
            "custom_store_id": "FOH-900",
            "clickup_task_id": "implantacao-operacional",
            "clickup_url": "https://app.clickup.com/t/implantacao-operacional",
            "status": "Finalizado",
            "status_normalized": "DONE",
            "started_at": "2025-10-01T10:00:00Z",
            "finished_at": "2025-12-15T10:00:00Z",
            "implantador": "Implantadora",
            "erp": "ERP Teste",
            "cnpj": "00.000.000/0001-00",
            "crm": "CRM Teste",
            "network": "Rede Teste",
            "store_type": "Filial",
            "parent_store": "Matriz da rede",
            "branches": [],
            "parent_store_detail": {
                "id": matriz.id,
                "name": "Matriz da rede",
                "custom_store_id": "FOH-899",
            },
            "branch_details": [],
            "monthly_fee": 1200.0,
            "implantation_fee": 6000.0,
            "financial_status": "Adimplente",
            "contract_days": 90,
            "address": "Rua de Teste, 100",
            "state": "SP",
            "had_ecommerce": True,
            "previous_platform": "Plataforma antiga",
            "deployment_type": "MIGRAÇÃO",
            "projected_orders": 500,
            "description": "Dados técnicos preservados",
            "post_integration_issue_count": None,
            "churn_risk": None,
            "documentation_status": None,
        }
        assert detalhe["audit_logs"] == [{
            "id": f"implantation-{log_legado.id}",
            "source": "IMPLANTATION",
            "action": "FIELD_CHANGE",
            "field_name": "erp",
            "old_value": "ERP Antigo",
            "new_value": "ERP Teste",
            "reason": None,
            "changed_by": "sync",
            "changed_at": "2026-01-05T10:00:00Z",
        }]
        assert db.session.get(Store, legado.id).erp == "ERP Teste"


def test_parsers_de_rota_validam_booleano_e_convertem_offset_para_utc():
    assert parse_bool("sim") is True
    assert parse_bool("nao") is False
    with pytest.raises(ValueError):
        parse_bool("talvez")
    assert parse_date("2026-01-10T12:00:00-03:00") == datetime(2026, 1, 10, 15)


def test_blueprint_canonico_usa_prefixo_publico_da_integracao():
    assert integration_bp.url_prefix == "/api/integration"


def test_rotas_de_leitura_e_sync_exigem_autenticacao(app):
    client = app.test_client()

    monitor = client.get("/api/integration/monitor")
    sync = client.post("/api/integration/sync", json={"mode": "FULL"})
    operational = client.patch("/api/integration/stores/1/operational", json={})
    block = client.patch(
        "/api/integration/stores/1/blocks/1",
        json={"discount_approved": True, "review_reason": "Motivo"},
    )

    assert monitor.status_code == 401
    assert monitor.get_json()["code"] == "AUTH_MISSING"
    assert sync.status_code == 401
    assert sync.get_json()["code"] == "AUTH_MISSING"
    assert operational.status_code == 401
    assert operational.get_json()["code"] == "AUTH_MISSING"
    assert block.status_code == 401
    assert block.get_json()["code"] == "AUTH_MISSING"


def test_rota_rejeita_paginacao_fora_do_limite(app, monkeypatch):
    with app.app_context():
        user_id = _criar_usuario_teste("paginacao@example.com").id
    _autenticar(monkeypatch, user_id)
    response = app.test_client().get(
        "/api/integration/monitor?per_page=201",
        headers=_headers_autenticados(),
    )

    assert response.status_code == 400
    assert response.get_json()["code"] == "INVALID_QUERY"


def test_detalhe_inexistente_retorna_contrato_404(app, monkeypatch):
    with app.app_context():
        user_id = _criar_usuario_teste("detalhe@example.com").id
    _autenticar(monkeypatch, user_id)
    response = app.test_client().get(
        "/api/integration/stores/999",
        headers=_headers_autenticados(),
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "Loja nao encontrada.", "code": "STORE_NOT_FOUND"}


def test_rota_comum_rejeita_usuario_desativado(app, monkeypatch):
    with app.app_context():
        user_id = _criar_usuario_teste(
            "inativo-leitura@example.com",
            is_active=False,
        ).id
    _autenticar(monkeypatch, user_id)

    response = app.test_client().get(
        "/api/integration/monitor",
        headers=_headers_autenticados(),
    )

    assert response.status_code == 403
    assert response.get_json()["code"] == "USER_INACTIVE"


def test_rota_comum_rejeita_token_de_usuario_inexistente(app, monkeypatch):
    _autenticar(monkeypatch, 999999)

    response = app.test_client().get(
        "/api/integration/monitor",
        headers=_headers_autenticados(),
    )

    assert response.status_code == 401
    assert response.get_json()["code"] == "USER_NOT_FOUND"


def test_edicao_operacional_rejeita_usuario_sem_manage_performance(app, monkeypatch):
    with app.app_context():
        store, _, _, _, _ = _criar_cenario_operacional()
        store_id = store.id
        user_id = _criar_usuario_teste("sem-performance@example.com").id
    _autenticar(monkeypatch, user_id)

    response = app.test_client().patch(
        f"/api/integration/stores/{store_id}/operational",
        json={"quality_reviewer": "QA"},
        headers=_headers_autenticados(),
    )

    assert response.status_code == 403
    assert response.get_json()["code"] == "FORBIDDEN"
    with app.app_context():
        assert IntegrationAuditLog.query.count() == 0


def test_backup_admin_exige_auth_e_manage_system(app, monkeypatch):
    import backup_manager

    client = app.test_client()
    sem_auth = client.post("/api/admin/backup")
    assert sem_auth.status_code == 401
    assert sem_auth.get_json()["code"] == "AUTH_MISSING"

    with app.app_context():
        sem_permissao_id = _criar_usuario_teste("sem-sistema@example.com").id
    _autenticar(monkeypatch, sem_permissao_id)
    sem_permissao = client.post(
        "/api/admin/backup",
        headers=_headers_autenticados(),
    )
    assert sem_permissao.status_code == 403
    assert sem_permissao.get_json()["code"] == "FORBIDDEN"

    with app.app_context():
        autorizado_id = _criar_usuario_teste(
            "com-sistema@example.com",
            permission_names=("manage_system",),
        ).id
    _autenticar(monkeypatch, autorizado_id)
    monkeypatch.setattr(backup_manager.BackupManager, "run_backup", lambda: True)
    autorizado = client.post(
        "/api/admin/backup",
        headers=_headers_autenticados(),
    )
    assert autorizado.status_code == 200
    assert autorizado.get_json() == {"status": "backup_created"}
