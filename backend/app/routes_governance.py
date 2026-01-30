from flask import Blueprint, jsonify, request
from app.models import db, SyncRun, SyncError
from app.services.audit_service import AuditService
from datetime import datetime, timedelta

gov_bp = Blueprint('governance', __name__, url_prefix='/api')

@gov_bp.route('/sync/health', methods=['GET'])
def get_sync_health():
    """
    Retorna resumo da saúde da sincronização.
    """
    last_run = SyncRun.query.order_by(SyncRun.started_at.desc()).first()
    
    # Verificar se está stale
    is_stale = False
    stale_hours = 0
    if last_run and last_run.finished_at:
        diff = datetime.now() - last_run.finished_at
        stale_hours = diff.total_seconds() / 3600
        if stale_hours > 6:
            is_stale = True
            
    recent_errors = SyncError.query.order_by(SyncError.created_at.desc()).limit(10).all()
    
    return jsonify({
        "last_run": {
            "id": last_run.id if last_run else None,
            "status": last_run.status if last_run else "NEVER",
            "started_at": last_run.started_at.strftime('%d/%m/%Y %H:%M') if last_run else None,
            "finished_at": last_run.finished_at.strftime('%d/%m/%Y %H:%M') if last_run and last_run.finished_at else None,
            "items_processed": last_run.items_processed if last_run else 0,
            "error_summary": last_run.error_summary if last_run else None
        },
        "is_stale": is_stale,
        "stale_hours": round(stale_hours, 1),
        "recent_errors": [{
            "id": e.id,
            "msg": e.error_msg,
            "store_id": e.store_id,
            "at": e.created_at.strftime('%d/%m %H:%M')
        } for e in recent_errors]
    })

@gov_bp.route('/sync/runs', methods=['GET'])
def get_sync_runs():
    """
    Histórico de execuções.
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
def get_audit_trail(store_id):
    """
    Histórico de mudanças do forecast.
    """
    return jsonify(AuditService.get_store_audit_trail(store_id))
