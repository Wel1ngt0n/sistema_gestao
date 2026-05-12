import logging
from datetime import datetime

from flask import Blueprint, jsonify, request

from app.models import SupportContact, db
from app.services.event_processor_service import process_pending_zenvia_events
from app.services.support_importer import import_support_files
from app.services.support_metrics_service import (
    get_agent_performance,
    get_conversations,
    get_import_history,
    get_nps_feedbacks,
    get_overview,
    get_periods,
    get_recent_messages,
    get_source_health,
    get_support_kpis,
)

support_bp = Blueprint("support_bp", __name__)
logger = logging.getLogger(__name__)


@support_bp.route("/api/support/kpis", methods=["GET"])
def get_kpis():
    period = request.args.get("period")
    return jsonify(get_support_kpis(period))


@support_bp.route("/api/support/overview", methods=["GET"])
def support_overview():
    period = request.args.get("period")
    return jsonify(get_overview(period))


@support_bp.route("/api/support/source-health", methods=["GET"])
def support_source_health():
    period = request.args.get("period")
    return jsonify(get_source_health(period))


@support_bp.route("/api/support/imports", methods=["GET"])
def support_imports():
    period = request.args.get("period")
    limit = int(request.args.get("limit", 20))
    return jsonify(get_import_history(period, limit))


@support_bp.route("/api/support/conversations", methods=["GET"])
def support_conversations():
    period = request.args.get("period")
    status = request.args.get("status")
    agent = request.args.get("agent")
    q = request.args.get("q")
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("page_size", 50)), 200)
    return jsonify(get_conversations(period, status, agent, q, page, page_size))


@support_bp.route("/api/support/orphans", methods=["GET"])
def get_orphans():
    contacts = SupportContact.query.filter(
        SupportContact.store_id.is_(None),
        SupportContact.linked_store_name.is_(None),
    ).limit(100).all()
    return jsonify([{
        "id": c.id,
        "phone": c.phone,
        "name": c.name,
        "created_at": c.created_at_zenvia.isoformat() if c.created_at_zenvia else None,
    } for c in contacts])


@support_bp.route("/api/support/messages", methods=["GET"])
def get_messages():
    limit = min(int(request.args.get("limit", 50)), 200)
    return jsonify(get_recent_messages(limit))


@support_bp.route("/api/support/link-store", methods=["POST"])
def link_store():
    data = request.json or {}
    contact_id = data.get("contact_id")
    store_name = (data.get("store_name") or "").strip()
    if not contact_id or not store_name:
        return jsonify({"status": "error", "message": "Contato e loja sao obrigatorios."}), 400

    contact = SupportContact.query.get(contact_id)
    if not contact:
        return jsonify({"status": "error", "message": "Contato nao encontrado."}), 404

    contact.linked_store_name = store_name
    db.session.commit()
    return jsonify({"status": "success", "message": f"Contato vinculado a loja {store_name}"})


@support_bp.route("/api/support/sync", methods=["POST"])
def sync_data():
    try:
        results = process_pending_zenvia_events()
        sync_time = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        from app.models import SystemConfig

        config = SystemConfig.query.filter_by(key="last_support_sync").first()
        if config:
            config.value = sync_time
        else:
            db.session.add(SystemConfig(
                key="last_support_sync",
                value=sync_time,
                category="webhooks",
                description="Ultima sincronizacao manual de eventos de suporte",
            ))
        db.session.commit()
        return jsonify({
            "status": "success",
            "processed": results.get("processed_count", 0),
            "conversations": results.get("new_conversations_count", 0),
            "errors": results.get("errors_count", 0),
            "last_sync": sync_time,
        })
    except Exception as exc:
        logger.exception("Erro ao sincronizar suporte")
        return jsonify({"status": "error", "message": str(exc)}), 500


@support_bp.route("/api/support/import-csv", methods=["POST", "OPTIONS"])
def import_csv():
    """
    Importa CSVs enviados pela tela do sistema online.
    Nao le automaticamente a pasta excel_suporte.
    """
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    if not request.files:
        return jsonify({"status": "error", "message": "Nenhum arquivo enviado."}), 400

    period = request.form.get("period") or datetime.now().strftime("%Y-%m")
    try:
        result = import_support_files(request.files, request.form, period)
        status_code = 200 if result.get("status") in {"success", "partial"} else 400
        return jsonify(result), status_code
    except Exception as exc:
        logger.exception("Erro na importacao CSV de suporte")
        return jsonify({"status": "error", "message": str(exc)}), 500


@support_bp.route("/api/support/periods", methods=["GET"])
def support_periods():
    return jsonify(get_periods())


@support_bp.route("/api/support/agent-performance", methods=["GET"])
def support_agent_performance():
    period = request.args.get("period")
    return jsonify(get_agent_performance(period))


@support_bp.route("/api/support/nps-feedbacks", methods=["GET"])
def support_nps_feedbacks():
    period = request.args.get("period")
    limit = min(int(request.args.get("limit", 50)), 200)
    return jsonify(get_nps_feedbacks(period, limit))
