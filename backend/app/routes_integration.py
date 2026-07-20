import json
from datetime import datetime, time, timezone

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from app.models import (
    db,
    IntegrationAssignee,
    IntegrationAuditLog,
    IntegrationBlockPeriod,
    IntegrationStore,
    User,
)
from app.services.integration_query_service import IntegrationQueryService
from app.services.integration_sync_service import IntegrationSyncService
from app.services.security_service import require_auth, require_permission


integration_bp = Blueprint('integration', __name__, url_prefix='/api/integration')


def parse_bool(value):
    if value is None or value == '':
        return None
    normalized = value.strip().lower()
    if normalized in {'true', '1', 'sim'}:
        return True
    if normalized in {'false', '0', 'nao'}:
        return False
    raise ValueError('Filtro booleano invalido.')


def parse_date(value, end_of_day=False):
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    if len(value) == 10:
        parsed = datetime.combine(parsed.date(), time.max if end_of_day else time.min)
    return parsed


def monitor_filters():
    return {
        'search': request.args.get('search'),
        'status_id': request.args.get('status_id'),
        'assignee_id': request.args.get('assignee_id'),
        'reconciliation_status': request.args.get('reconciliation_status'),
        'blocked': parse_bool(request.args.get('blocked')),
        'started_from': parse_date(request.args.get('started_from')),
        'started_to': parse_date(request.args.get('started_to'), end_of_day=True),
    }


def validation_error(error):
    return jsonify({'error': str(error), 'code': 'INVALID_QUERY'}), 400


def audit_value(value):
    return json.dumps(value, ensure_ascii=False) if value is not None else None


def authenticated_user(payload):
    try:
        return db.session.get(User, int(payload['sub']))
    except (KeyError, TypeError, ValueError):
        return None


def audit_change(store, user, action, field_name, old_value, new_value, reason=None):
    db.session.add(IntegrationAuditLog(
        store_id=store.id,
        action=action,
        field_name=field_name,
        old_value=audit_value(old_value),
        new_value=audit_value(new_value),
        reason=reason,
        changed_by_id=user.id,
        changed_by_name=user.name,
    ))


def json_object():
    if not request.is_json:
        raise ValueError('Envie o corpo da requisicao em formato JSON.')
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValueError('O corpo da requisicao deve ser um objeto JSON.')
    return data


def normalize_optional_text(value, field_name, max_length=None):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f'{field_name} deve ser texto ou nulo.')
    normalized = value.strip()
    if max_length and len(normalized) > max_length:
        raise ValueError(f'{field_name} deve ter no maximo {max_length} caracteres.')
    return normalized or None


def inactive_user_response():
    return jsonify({
        'error': 'Usuario autenticado nao esta ativo ou nao existe.',
        'code': 'USER_INACTIVE',
    }), 403


@integration_bp.route('/monitor', methods=['GET'])
@require_auth
def get_monitor(payload):
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        if page < 1 or per_page < 1 or per_page > 200:
            raise ValueError('Paginacao invalida; per_page deve estar entre 1 e 200.')
        direction = request.args.get('direction', 'asc').lower()
        if direction not in {'asc', 'desc'}:
            raise ValueError('Direcao de ordenacao invalida.')
        data = IntegrationQueryService().monitor(
            monitor_filters(),
            page=page,
            per_page=per_page,
            sort=request.args.get('sort', 'store_name'),
            direction=direction,
        )
        return jsonify(data), 200
    except (TypeError, ValueError) as error:
        return validation_error(error)


@integration_bp.route('/monitor/metrics', methods=['GET'])
@require_auth
def get_monitor_metrics(payload):
    try:
        return jsonify(IntegrationQueryService().metrics(monitor_filters())), 200
    except (TypeError, ValueError) as error:
        return validation_error(error)


@integration_bp.route('/monitor/filters', methods=['GET'])
@require_auth
def get_monitor_filters(payload):
    return jsonify(IntegrationQueryService().filters()), 200


@integration_bp.route('/kanban/schema', methods=['GET'])
@require_auth
def get_kanban_schema(payload):
    return jsonify(IntegrationQueryService().kanban_schema()), 200


@integration_bp.route('/stores/<int:store_id>', methods=['GET'])
@require_auth
def get_store(payload, store_id):
    store = db.session.get(IntegrationStore, store_id)
    if store is None:
        return jsonify({'error': 'Loja nao encontrada.', 'code': 'STORE_NOT_FOUND'}), 404
    return jsonify(IntegrationQueryService().store_detail(store)), 200


@integration_bp.route('/stores/<int:store_id>/operational', methods=['PATCH'])
@require_auth
@require_permission('manage_performance')
def update_store_operational(payload, store_id):
    user = authenticated_user(payload)
    if user is None or not user.is_active:
        return inactive_user_response()
    store = db.session.get(IntegrationStore, store_id)
    if store is None:
        return jsonify({'error': 'Loja nao encontrada.', 'code': 'STORE_NOT_FOUND'}), 404
    try:
        data = json_object()
    except ValueError as error:
        return validation_error(error)
    allowed = {
        'manual_integrator_id',
        'quality_reviewer',
        'had_post_integration_issues',
        'followed_integration_process',
        'quality_notes',
    }
    unknown = set(data) - allowed
    if unknown:
        return validation_error(ValueError(f"Campos nao permitidos: {', '.join(sorted(unknown))}"))

    selected_integrator = None
    if 'manual_integrator_id' in data:
        assignee_id = data['manual_integrator_id']
        if isinstance(assignee_id, bool):
            return validation_error(ValueError('Integrador selecionado e invalido.'))
        try:
            selected_integrator = (
                db.session.get(IntegrationAssignee, int(assignee_id))
                if assignee_id not in (None, '')
                else None
            )
        except (TypeError, ValueError):
            return validation_error(ValueError('Integrador selecionado e invalido.'))
        if assignee_id not in (None, '') and (selected_integrator is None or not selected_integrator.active):
            return validation_error(ValueError('Integrador selecionado nao existe ou esta inativo.'))
        data['manual_integrator_id'] = selected_integrator.id if selected_integrator else None
    for field in ('had_post_integration_issues', 'followed_integration_process'):
        if field in data and data[field] is not None and not isinstance(data[field], bool):
            return validation_error(ValueError(f'{field} deve ser verdadeiro, falso ou nulo.'))
    try:
        if 'quality_reviewer' in data:
            data['quality_reviewer'] = normalize_optional_text(
                data['quality_reviewer'],
                'quality_reviewer',
                max_length=255,
            )
        if 'quality_notes' in data:
            data['quality_notes'] = normalize_optional_text(
                data['quality_notes'],
                'quality_notes',
                max_length=10000,
            )
    except ValueError as error:
        return validation_error(error)

    changed = False
    for field, new_value in data.items():
        old_value = getattr(store, field)
        if old_value == new_value:
            continue
        audit_old_value = old_value
        audit_new_value = new_value
        if field == 'manual_integrator_id':
            audit_old_value = (
                IntegrationQueryService.serialize_assignee(store.manual_integrator)
                if store.manual_integrator
                else None
            )
            audit_new_value = (
                IntegrationQueryService.serialize_assignee(selected_integrator)
                if selected_integrator
                else None
            )
        audit_change(
            store,
            user,
            'OPERATIONAL_UPDATE',
            field,
            audit_old_value,
            audit_new_value,
        )
        setattr(store, field, new_value)
        changed = True
    if changed:
        store.manual_updated_at = datetime.utcnow()
        store.manual_updated_by = user.name
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({
            'error': 'Nao foi possivel salvar os dados operacionais.',
            'code': 'OPERATIONAL_UPDATE_FAILED',
        }), 500
    return jsonify(IntegrationQueryService().store_detail(store)), 200


@integration_bp.route('/stores/<int:store_id>/blocks/<int:block_id>', methods=['PATCH'])
@require_auth
@require_permission('manage_performance')
def review_store_block(payload, store_id, block_id):
    user = authenticated_user(payload)
    if user is None or not user.is_active:
        return inactive_user_response()
    store = db.session.get(IntegrationStore, store_id)
    block = db.session.get(IntegrationBlockPeriod, block_id)
    if store is None:
        return jsonify({'error': 'Loja nao encontrada.', 'code': 'STORE_NOT_FOUND'}), 404
    if block is None or store.integration_task is None or block.task_id != store.integration_task.id:
        return jsonify({'error': 'Bloqueio nao encontrado.', 'code': 'BLOCK_NOT_FOUND'}), 404
    try:
        data = json_object()
    except ValueError as error:
        return validation_error(error)
    unknown = set(data) - {'discount_approved', 'review_reason'}
    if unknown:
        return validation_error(ValueError(f"Campos nao permitidos: {', '.join(sorted(unknown))}"))
    approved = data.get('discount_approved')
    if not isinstance(approved, bool):
        return validation_error(ValueError('A decisao de desconto deve ser verdadeira ou falsa.'))
    try:
        reason = normalize_optional_text(data.get('review_reason'), 'review_reason', max_length=500)
    except ValueError as error:
        return validation_error(error)
    if reason is None:
        return validation_error(ValueError('Informe o motivo da decisao sobre o bloqueio.'))

    old_value = {'discount_approved': block.discount_approved, 'review_reason': block.review_reason}
    new_value = {'discount_approved': approved, 'review_reason': reason}
    if old_value == new_value:
        return jsonify(IntegrationQueryService().store_detail(store)), 200
    audit_change(store, user, 'BLOCK_REVIEW', f'block:{block.id}', old_value, new_value, reason)
    block.discount_approved = approved
    block.review_reason = reason
    block.reviewed_at = datetime.utcnow()
    block.reviewed_by = user.name
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({
            'error': 'Nao foi possivel salvar a revisao do bloqueio.',
            'code': 'BLOCK_REVIEW_FAILED',
        }), 500
    return jsonify(IntegrationQueryService().store_detail(store)), 200


@integration_bp.route('/stores/<int:store_id>/timeline', methods=['GET'])
@require_auth
def get_store_timeline(payload, store_id):
    store = db.session.get(IntegrationStore, store_id)
    if store is None:
        return jsonify({'error': 'Loja nao encontrada.', 'code': 'STORE_NOT_FOUND'}), 404
    return jsonify(IntegrationQueryService().timeline(store)), 200


@integration_bp.route('/sync/status', methods=['GET'])
@require_auth
def get_sync_status(payload):
    return jsonify(IntegrationQueryService().sync_status()), 200


@integration_bp.route('/sync', methods=['POST'])
@require_auth
@require_permission('sync_clickup')
def start_sync(payload):
    body = request.get_json(silent=True) or {}
    mode = str(body.get('mode', 'FULL')).upper()
    if mode not in {'FULL', 'INCREMENTAL'}:
        return jsonify({'error': 'Modo de sincronizacao invalido.', 'code': 'INVALID_SYNC_MODE'}), 400
    try:
        run = IntegrationSyncService().run(mode)
        return jsonify({'message': 'Sincronizacao da Integracao concluida.', 'run': run}), 200
    except RuntimeError as error:
        if 'andamento' in str(error):
            return jsonify({'error': str(error), 'code': 'SYNC_ALREADY_RUNNING'}), 409
        return jsonify({'error': 'Nao foi possivel sincronizar a Integracao.', 'code': 'SYNC_FAILED'}), 502
    except Exception:
        return jsonify({'error': 'Nao foi possivel sincronizar a Integracao.', 'code': 'SYNC_FAILED'}), 502
