"""Rotas para verificacoes e disparos manuais de notificacoes no Slack."""
from flask import Blueprint, jsonify, request

from app.services.security_service import require_auth, require_permission

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notifications_bp.route("/test", methods=["POST", "OPTIONS"])
@require_auth
@require_permission('manage_system')
def test_notification(payload):
    """Envia uma mensagem simples para testar a conexao com o Slack."""
    from app.services.notification_service import send_slack_message

    result = send_slack_message("Teste de conexao - Sistema de Gestao de Implantacao")
    return jsonify(result)


@notifications_bp.route("/sla-alerts", methods=["POST", "OPTIONS"])
@require_auth
@require_permission('manage_system')
def trigger_sla_alerts(payload):
    """Dispara alertas de SLA sem a deduplicacao diaria automatica."""
    from app.services.notification_service import check_sla_alerts

    result = check_sla_alerts(force=True)
    return jsonify(result)


@notifications_bp.route("/weekly-summary", methods=["POST", "OPTIONS"])
@require_auth
@require_permission('manage_system')
def trigger_weekly_summary(payload):
    """Dispara o resumo sem a deduplicacao semanal automatica."""
    from app.services.notification_service import send_weekly_summary

    result = send_weekly_summary(force=True)
    return jsonify(result)


@notifications_bp.route("/goal-check", methods=["POST", "OPTIONS"])
@require_auth
@require_permission('manage_system')
def trigger_goal_check(payload):
    """Dispara a verificacao mensal de atingimento das metas."""
    from app.services.notification_service import check_goal_achievement

    data = request.get_json(silent=True) or {}
    result = check_goal_achievement(data.get("month"), force=True)
    return jsonify(result)


@notifications_bp.route("/clickup-docs-reminder", methods=["POST", "OPTIONS"])
@require_auth
@require_permission('manage_system')
def trigger_clickup_docs_reminder(payload):
    """Dispara lembretes sobre a documentacao dos cards-pai no ClickUp."""
    from app.services.notification_service import send_clickup_docs_reminder

    data = request.get_json(silent=True) or {}
    target_owner = data.get("target_owner")

    result = send_clickup_docs_reminder(force=True, target_owner=target_owner)
    return jsonify(result)


@notifications_bp.route("/test-dm", methods=["POST", "OPTIONS"])
@require_auth
@require_permission('manage_system')
def test_dm(payload):
    """Envia uma mensagem direta de teste pelo token do bot.

    Corpo: {"slack_user_id": "UXXXXXXXX", "text": "Mensagem de teste"}
    """
    from app.services.notification_service import send_dm_via_bot

    data = request.get_json(silent=True) or {}
    slack_user_id = (data.get("slack_user_id") or "").strip()
    text = (data.get("text") or "Teste de DM - Sistema de Gestao de Implantacao").strip()

    if not slack_user_id:
        return jsonify({"ok": False, "error": "slack_user_id e obrigatorio"}), 400

    result = send_dm_via_bot(slack_user_id, text)
    return jsonify(result)


@notifications_bp.route("/send-all", methods=["POST", "OPTIONS"])
@require_auth
@require_permission('manage_system')
def send_all_notifications(payload):
    """Executa todas as notificacoes; `force` ignora a deduplicacao."""
    from app.services.notification_service import (
        check_goal_achievement,
        check_sla_alerts,
        send_clickup_docs_reminder,
        send_weekly_summary,
    )

    data = request.get_json(silent=True) or {}
    force = bool(data.get("force"))
    return jsonify({
        "sla": check_sla_alerts(force=force),
        "summary": send_weekly_summary(force=force),
        "goals": check_goal_achievement(force=force),
        "docs": send_clickup_docs_reminder(force=force),
    })
