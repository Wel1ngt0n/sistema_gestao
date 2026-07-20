from datetime import datetime

from flask import Blueprint, jsonify, request

from app.models import db, IntegrationStore, PerformanceReview, Role, User
from app.services.integration_query_service import IntegrationQueryService
from app.services.security_service import require_auth, require_permission

performance_bp = Blueprint('performance', __name__, url_prefix='/api/performance')

@performance_bp.route('/summary', methods=['GET'])
@require_auth
def get_performance_summary(payload):
    """Retorna o resumo de performance dos integradores elegíveis."""
    cycle = request.args.get('cycle', datetime.now().strftime('%Y-%m'))
    users = User.query.filter(User.roles.any(Role.name.ilike('%integrator%'))).all()

    query_service = IntegrationQueryService()
    integration_stores = IntegrationStore.query.filter_by(source_present=True).all()
    records = []
    for integration_store in integration_stores:
        task = integration_store.integration_task
        source_store = query_service.source_store(integration_store)
        integrators = (
            [integration_store.manual_integrator.username]
            if integration_store.manual_integrator
            else [link.assignee.username for link in task.assignee_links] if task else []
        )
        finished_at = (
            task.completed_at or task.closed_at
            if task and query_service.is_completed(task)
            else None
        )
        started_at = query_service.integration_start(task) if task else None
        issue_count = (
            integration_store.post_integration_issue_count
            if integration_store.post_integration_issue_count is not None
            else int(integration_store.had_post_integration_issues is True)
        )
        records.append({
            'integrators': integrators,
            'started_at': started_at,
            'finished_at': finished_at,
            'issue_count': issue_count,
            'documentation_status': integration_store.documentation_status or 'PENDING',
            'points': 1.0 if source_store and source_store.tipo_loja == 'Matriz' else 0.7,
        })

    # Quando ainda não há usuários cadastrados, usa os responsáveis vindos do ClickUp.
    if not users:
        names = sorted({name for record in records for name in record['integrators'] if name})
        users = [{"username": name, "id": None} for name in names]

    results = []

    completed = [record for record in records if record['finished_at']]
    total_points = sum(record['points'] for record in completed)
    total_integrated = len(completed)
    quality_ok_count = sum(record['issue_count'] == 0 for record in completed)
    doc_ok_count = sum(record['documentation_status'] == 'DONE' for record in records)

    p_volume = min(100, (total_points / 80.0) * 100)
    pct_quality_real = (quality_ok_count / total_integrated * 100) if total_integrated else 100
    p_quality = min(100, (pct_quality_real / 90.0) * 100)
    pct_doc_real = (doc_ok_count / len(records) * 100) if records else 0
    p_doc = min(100, pct_doc_real)
    collective_score = (p_volume + p_quality + p_doc) / 3.0

    for user in users:
        username = user.username if hasattr(user, 'username') else user['username']
        user_id = user.id if hasattr(user, 'id') else 0

        user_records = [
            record for record in records
            if username in record['integrators'] and record['finished_at']
        ]
        u_total = len(user_records)
        u_sla_ok = sum(
            bool(record['started_at'])
            and (record['finished_at'] - record['started_at']).days <= 60
            for record in user_records
        )
        u_quality_ok = sum(record['issue_count'] == 0 for record in user_records)

        u_pct_sla = (u_sla_ok / u_total * 100) if u_total else 100
        u_score_sla = min(100, (u_pct_sla / 90.0) * 100)
        u_pct_quality = (u_quality_ok / u_total * 100) if u_total else 100
        u_score_quality = min(100, (u_pct_quality / 90.0) * 100)
        u_score_audit = 100.0
        individual_score = (u_score_sla * 0.34) + (u_score_quality * 0.33) + (u_score_audit * 0.33)

        review = PerformanceReview.query.filter_by(user_id=user_id, cycle=cycle).first() if user_id else None
        soft_score = 100.0
        churn_penalty = False
        if review:
            avg_soft = (review.soft_communication + review.soft_process + review.soft_responsibility) / 3.0
            soft_score = avg_soft
            if review.churn_count > 0:
                soft_score = soft_score * 0.5
                churn_penalty = True

        final_score = (collective_score * 0.4) + (individual_score * 0.4) + (soft_score * 0.2)
        results.append({
            "user_id": user_id,
            "username": username,
            "role": "Integrador",
            "scores": {
                "collective": round(collective_score, 1),
                "individual": round(individual_score, 1),
                "behavioral": round(soft_score, 1),
                "final": round(final_score, 1)
            },
            "metrics": {
                "volume_points": round(total_points, 1),
                "completed_count": u_total,
                "sla_pct": round(u_pct_sla, 1),
                "quality_pct": round(u_pct_quality, 1),
                "churns": review.churn_count if review else 0
            },
            "details": {
                "p_volume": round(p_volume, 1),
                "p_doc": round(p_doc, 1),
                "soft_details": {
                    "comm": review.soft_communication if review else 0,
                    "proc": review.soft_process if review else 0,
                    "resp": review.soft_responsibility if review else 0
                }
            }
        })

    return jsonify({
        "cycle": cycle,
        "collective_kpis": {
            "volume_points": total_points,
            "quality_global": pct_quality_real,
            "doc_global": pct_doc_real
        },
        "collaborators": results
    })

@performance_bp.route('/review', methods=['POST'])
@require_auth
@require_permission('manage_performance')
def save_review(payload):
    """
    Salva avaliação comportamental manual.
    Payload: { user_id, cycle, soft_communication, soft_process, soft_responsibility, churn_count }
    """
    data = request.json
    user_id = data.get('user_id')
    cycle = data.get('cycle')

    if not user_id:
        # Se usuário não existe (caso dummy), precisaríamos criar?
        # Exige um usuario valido para persistir a revisao.
        return jsonify({"error": "ID do usuario obrigatorio"}), 400

    review = PerformanceReview.query.filter_by(user_id=user_id, cycle=cycle).first()
    if not review:
        review = PerformanceReview(user_id=user_id, cycle=cycle)
        db.session.add(review)

    if 'soft_communication' in data: review.soft_communication = float(data['soft_communication'])
    if 'soft_process' in data: review.soft_process = float(data['soft_process'])
    if 'soft_responsibility' in data: review.soft_responsibility = float(data['soft_responsibility'])
    if 'churn_count' in data: review.churn_count = int(data['churn_count'])

    try:
        db.session.commit()
        return jsonify({"message": "Avaliação salva com sucesso"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


from app.services.implantation_bonus_service import ImplantationBonusService

@performance_bp.route('/implantation/summary', methods=['GET'])
@require_auth
def get_implantation_summary(payload):
    cycle = request.args.get('cycle', datetime.now().strftime('%Y-%m'))
    summary = ImplantationBonusService.calculate_summary(cycle)
    return jsonify(summary)

@performance_bp.route('/implantation/rules', methods=['GET'])
@require_auth
def get_implantation_rules(payload):
    cycle = request.args.get('cycle', datetime.now().strftime('%Y-%m'))
    rules = ImplantationBonusService.get_rules(cycle)
    return jsonify(rules)

@performance_bp.route('/implantation/rules', methods=['POST'])
@require_auth
@require_permission('manage_performance')
def save_implantation_rules(payload):
    data = request.json
    cycle = data.get('cycle', datetime.now().strftime('%Y-%m'))
    if 'rules' not in data:
        return jsonify({'error': 'Missing rules payload'}), 400

    rules = ImplantationBonusService.save_rules(cycle, data['rules'])
    return jsonify(rules)
