"""
Routes for Notification System — Slack alerts and manual triggers.
"""
from flask import Blueprint, jsonify, request

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('/test', methods=['POST'])
def test_notification():
    """Envia uma mensagem de teste para o Slack."""
    from app.services.notification_service import send_slack_message
    result = send_slack_message("✅ Teste de conexão — Sistema de Gestão de Implantação")
    return jsonify(result)


@notifications_bp.route('/sla-alerts', methods=['POST'])
def trigger_sla_alerts():
    """Verifica e envia alertas de SLA (manual trigger)."""
    from app.services.notification_service import check_sla_alerts
    result = check_sla_alerts()
    return jsonify(result)


@notifications_bp.route('/weekly-summary', methods=['POST'])
def trigger_weekly_summary():
    """Envia resumo semanal (manual trigger)."""
    from app.services.notification_service import send_weekly_summary
    result = send_weekly_summary()
    return jsonify(result)


@notifications_bp.route('/goal-check', methods=['POST'])
def trigger_goal_check():
    """Verifica se metas foram batidas (manual trigger)."""
    from app.services.notification_service import check_goal_achievement
    data = request.get_json(silent=True) or {}
    month = data.get('month')
    result = check_goal_achievement(month)
    return jsonify(result)


@notifications_bp.route('/send-all', methods=['POST'])
def send_all_notifications():
    """Roda todos os checks e envia notificações relevantes."""
    from app.services.notification_service import check_sla_alerts, send_weekly_summary, check_goal_achievement
    results = {
        "sla": check_sla_alerts(),
        "summary": send_weekly_summary(),
        "goals": check_goal_achievement(),
    }
    return jsonify(results)
