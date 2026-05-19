import logging
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request

from app.models import SupportContact, SupportConversation, db
from app.services.event_processor_service import process_pending_zenvia_events
from app.services.security_service import require_auth, require_permission
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
    get_windows,
)

support_bp = Blueprint("support_bp", __name__)
logger = logging.getLogger(__name__)


@support_bp.route("/api/support/kpis", methods=["GET"])
@require_auth
@require_permission("support:view")
def get_kpis(_payload):
    period = request.args.get("period")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    return jsonify(get_support_kpis(period=period, start_date=start_date, end_date=end_date))


@support_bp.route("/api/support/overview", methods=["GET"])
@require_auth
@require_permission("support:view")
def support_overview(_payload):
    period = request.args.get("period")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    group_by = request.args.get("group_by", "day")
    return jsonify(get_overview(period=period, start_date=start_date, end_date=end_date, group_by=group_by))


@support_bp.route("/api/support/source-health", methods=["GET"])
@require_auth
@require_permission("support:view")
def support_source_health(_payload):
    period = request.args.get("period")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    return jsonify(get_source_health(period=period, start_date=start_date, end_date=end_date))


@support_bp.route("/api/support/imports", methods=["GET"])
@require_auth
@require_permission("support:view")
def support_imports(_payload):
    period = request.args.get("period")
    limit = int(request.args.get("limit", 20))
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    return jsonify(get_import_history(period=period, limit=limit, start_date=start_date, end_date=end_date))


@support_bp.route("/api/support/conversations", methods=["GET"])
@require_auth
@require_permission("support:view")
def support_conversations(_payload):
    period = request.args.get("period")
    status = request.args.get("status")
    agent = request.args.get("agent")
    q = request.args.get("q")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("page_size", 50)), 200)
    return jsonify(get_conversations(period, status, agent, q, page, page_size, start_date, end_date))


@support_bp.route("/api/support/orphans", methods=["GET"])
@require_auth
@require_permission("support:view")
def get_orphans(_payload):
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
@require_auth
@require_permission("support:view")
def get_messages(_payload):
    limit = min(int(request.args.get("limit", 50)), 200)
    return jsonify(get_recent_messages(limit))


@support_bp.route("/api/support/link-store", methods=["POST"])
@require_auth
@require_permission("support:manage_contacts")
def link_store(_payload):
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
@require_auth
@require_permission("support:sync")
def sync_data(_payload):
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
@require_auth
@require_permission("support:import")
def import_csv(_payload):
    """
    Importa CSVs enviados pela tela do sistema online.
    Nao le automaticamente a pasta excel_suporte.
    """
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    if not request.files:
        return jsonify({"status": "error", "message": "Nenhum arquivo enviado."}), 400

    files = []
    for key in request.files:
        files.extend(request.files.getlist(key))
    max_files = current_app.config.get("SUPPORT_MAX_IMPORT_FILES", 20)
    max_file_bytes = current_app.config.get("SUPPORT_MAX_IMPORT_FILE_MB", 10) * 1024 * 1024

    if len(files) > max_files:
        return jsonify({"status": "error", "message": f"Importe no maximo {max_files} arquivos por vez."}), 413

    for file in files:
        filename = (file.filename or "").lower()
        if not filename.endswith(".csv"):
            return jsonify({"status": "error", "message": f"Arquivo invalido: {file.filename}. Envie apenas CSV."}), 400

        file.stream.seek(0, 2)
        size = file.stream.tell()
        file.stream.seek(0)
        if size <= 0:
            return jsonify({"status": "error", "message": f"Arquivo vazio: {file.filename}."}), 400
        if size > max_file_bytes:
            limit_mb = current_app.config.get("SUPPORT_MAX_IMPORT_FILE_MB", 10)
            return jsonify({"status": "error", "message": f"Arquivo {file.filename} excede {limit_mb}MB."}), 413

    period = request.form.get("period") or datetime.now().strftime("%Y-%m")
    try:
        result = import_support_files(request.files, request.form, period)
        status_code = 200 if result.get("status") in {"success", "partial"} else 400
        return jsonify(result), status_code
    except Exception as exc:
        logger.exception("Erro na importacao CSV de suporte")
        return jsonify({"status": "error", "message": str(exc)}), 500


@support_bp.route("/api/support/periods", methods=["GET"])
@require_auth
@require_permission("support:view")
def support_periods(_payload):
    return jsonify(get_periods())


@support_bp.route("/api/support/windows", methods=["GET"])
@require_auth
@require_permission("support:view")
def support_windows(_payload):
    return jsonify(get_windows())


@support_bp.route("/api/support/agent-performance", methods=["GET"])
@require_auth
@require_permission("support:view")
def support_agent_performance(_payload):
    period = request.args.get("period")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    return jsonify(get_agent_performance(period=period, start_date=start_date, end_date=end_date))


@support_bp.route("/api/support/nps-feedbacks", methods=["GET"])
@require_auth
@require_permission("support:view")
def support_nps_feedbacks(_payload):
    period = request.args.get("period")
    limit = min(int(request.args.get("limit", 50)), 200)
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    return jsonify(get_nps_feedbacks(period=period, limit=limit, start_date=start_date, end_date=end_date))


@support_bp.route("/api/support/conversations/<int:conversation_id>/agent", methods=["PATCH"])
@require_auth
@require_permission("support:manage_contacts")
def update_support_conversation_agent(_payload, conversation_id: int):
    data = request.json or {}
    agent_name = (data.get("agent_name") or "").strip()

    conversation = SupportConversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"status": "error", "message": "Conversa nao encontrada."}), 404

    conversation.agent_name = agent_name or None
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Atendente do NPS atualizado com sucesso.",
        "conversation": {
            "id": conversation.id,
            "agent_name": conversation.agent_name,
        },
    })
