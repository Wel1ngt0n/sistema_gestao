"""
Routes for Slack notification checks and manual triggers.
"""
from flask import Blueprint, jsonify, request

from app.services.security_service import require_auth

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notifications_bp.route("/test", methods=["POST"])
@require_auth
def test_notification(payload):
    """Sends a simple Slack test message."""
    from app.services.notification_service import send_slack_message

    result = send_slack_message("Teste de conexao - Sistema de Gestao de Implantacao")
    return jsonify(result)


@notifications_bp.route("/sla-alerts", methods=["POST"])
@require_auth
def trigger_sla_alerts(payload):
    """Manual trigger for SLA alerts. Manual sends bypass daily de-dupe."""
    from app.services.notification_service import check_sla_alerts

    result = check_sla_alerts(force=True)
    return jsonify(result)


@notifications_bp.route("/weekly-summary", methods=["POST"])
@require_auth
def trigger_weekly_summary(payload):
    """Manual trigger for weekly summary. Manual sends bypass weekly de-dupe."""
    from app.services.notification_service import send_weekly_summary

    result = send_weekly_summary(force=True)
    return jsonify(result)


@notifications_bp.route("/goal-check", methods=["POST"])
@require_auth
def trigger_goal_check(payload):
    """Manual trigger for monthly goal achievement checks."""
    from app.services.notification_service import check_goal_achievement

    data = request.get_json(silent=True) or {}
    result = check_goal_achievement(data.get("month"), force=True)
    return jsonify(result)


@notifications_bp.route("/clickup-docs-reminder", methods=["POST"])
@require_auth
def trigger_clickup_docs_reminder(payload):
    """Manual trigger for ClickUp parent-card documentation reminders."""
    from app.services.notification_service import send_clickup_docs_reminder

    result = send_clickup_docs_reminder(force=True)
    return jsonify(result)


@notifications_bp.route("/send-all", methods=["POST"])
@require_auth
def send_all_notifications(payload):
    """Runs all notification checks. Pass {"force": true} to bypass de-dupe."""
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
