from flask import Blueprint, jsonify, request
from app.models import SyncRun, SyncError, SystemConfig
from app.services.audit_service import AuditService
from app.services.security_service import require_auth
from datetime import datetime, timedelta

gov_bp = Blueprint('governance', __name__, url_prefix='/api')


def _config_value(key, fallback):
    cfg = SystemConfig.query.filter_by(key=key).first()
    return cfg.value if cfg and cfg.value is not None else fallback


@gov_bp.route('/sync/health', methods=['GET'])
@require_auth
def get_sync_health(payload):
    """
    Retorna resumo operacional da saude da sincronizacao.
    Mantem os campos antigos e adiciona metadados para o painel novo.
    """
    last_run = SyncRun.query.order_by(SyncRun.started_at.desc()).first()
    now = datetime.now()

    try:
        stale_threshold_hours = max(1.0, float(_config_value("sync_stale_after_hours", "6")))
    except (TypeError, ValueError):
        stale_threshold_hours = 6.0

    is_stale = False
    stale_hours = 0.0
    if last_run and last_run.finished_at:
        stale_hours = (now - last_run.finished_at).total_seconds() / 3600
        is_stale = stale_hours > stale_threshold_hours

    recent_errors = SyncError.query.order_by(SyncError.created_at.desc()).limit(10).all()
    since_24h = now - timedelta(hours=24)
    runs_24h = SyncRun.query.filter(SyncRun.started_at >= since_24h).all()
    errors_24h = SyncError.query.filter(SyncError.created_at >= since_24h).count()

    processed_24h = sum((run.items_processed or 0) for run in runs_24h)
    updated_24h = sum((run.items_updated or 0) for run in runs_24h)
    success_24h = sum(1 for run in runs_24h if run.status == "SUCCESS")
    failed_24h = sum(1 for run in runs_24h if run.status not in ("SUCCESS", "RUNNING"))

    duration_sec = 0
    if last_run and last_run.started_at and last_run.finished_at:
        duration_sec = round((last_run.finished_at - last_run.started_at).total_seconds(), 2)

    return jsonify({
        "last_run": {
            "id": last_run.id if last_run else None,
            "status": last_run.status if last_run else "NEVER",
            "started_at": last_run.started_at.strftime('%d/%m/%Y %H:%M') if last_run else None,
            "finished_at": last_run.finished_at.strftime('%d/%m/%Y %H:%M') if last_run and last_run.finished_at else None,
            "started_at_iso": last_run.started_at.isoformat() if last_run and last_run.started_at else None,
            "finished_at_iso": last_run.finished_at.isoformat() if last_run and last_run.finished_at else None,
            "duration_sec": duration_sec,
            "items_processed": last_run.items_processed if last_run else 0,
            "items_updated": last_run.items_updated if last_run else 0,
            "error_summary": last_run.error_summary if last_run else None
        },
        "is_stale": is_stale,
        "stale_hours": round(stale_hours, 1),
        "stale_threshold_hours": stale_threshold_hours,
        "summary": {
            "window_hours": 24,
            "runs": len(runs_24h),
            "success": success_24h,
            "failed": failed_24h,
            "errors": errors_24h,
            "items_processed": processed_24h,
            "items_updated": updated_24h,
        },
        "scheduler": {
            "status": "ACTIVE",
            "timezone": _config_value("default_timezone", "America/Sao_Paulo"),
            "vital_schedule": _config_value("sync_vital_schedule", "10:00,12:00,14:00,16:00,18:00"),
            "deep_schedule": _config_value("sync_deep_schedule", "03:00"),
        },
        "recent_errors": [{
            "id": e.id,
            "msg": e.error_msg,
            "store_id": e.store_id,
            "task_id": e.task_id,
            "at": e.created_at.strftime('%d/%m %H:%M')
        } for e in recent_errors]
    })


@gov_bp.route('/sync/runs', methods=['GET'])
@require_auth
def get_sync_runs(payload):
    """
    Historico de execucoes.
    """
    limit = int(request.args.get('limit', 10))
    runs = SyncRun.query.order_by(SyncRun.started_at.desc()).limit(limit).all()

    return jsonify([{
        "id": r.id,
        "status": r.status,
        "started_at": r.started_at.strftime('%d/%m %H:%M'),
        "duration_sec": (r.finished_at - r.started_at).total_seconds() if r.finished_at else 0,
        "items": r.items_processed,
        "updates": r.items_updated
    } for r in runs])


@gov_bp.route('/audit/forecast/<int:store_id>', methods=['GET'])
@require_auth
def get_audit_trail(payload, store_id):
    """
    Historico de mudancas do forecast.
    """
    return jsonify(AuditService.get_store_audit_trail(store_id))
