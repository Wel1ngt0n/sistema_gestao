from datetime import datetime, time, timezone

from flask import Blueprint, jsonify, request

from app.models import db, IntegrationV2Store
from app.services.integration_v2_query_service import IntegrationV2QueryService
from app.services.integration_v2_sync_service import IntegrationV2SyncService
from app.services.security_service import require_auth, require_permission


integration_v2_bp = Blueprint('integration_v2', __name__, url_prefix='/api/integration-v2')


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


@integration_v2_bp.route('/monitor', methods=['GET'])
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
        data = IntegrationV2QueryService().monitor(
            monitor_filters(),
            page=page,
            per_page=per_page,
            sort=request.args.get('sort', 'store_name'),
            direction=direction,
        )
        return jsonify(data), 200
    except (TypeError, ValueError) as error:
        return validation_error(error)


@integration_v2_bp.route('/monitor/metrics', methods=['GET'])
@require_auth
def get_monitor_metrics(payload):
    try:
        return jsonify(IntegrationV2QueryService().metrics(monitor_filters())), 200
    except (TypeError, ValueError) as error:
        return validation_error(error)


@integration_v2_bp.route('/monitor/filters', methods=['GET'])
@require_auth
def get_monitor_filters(payload):
    return jsonify(IntegrationV2QueryService().filters()), 200


@integration_v2_bp.route('/kanban/schema', methods=['GET'])
@require_auth
def get_kanban_schema(payload):
    return jsonify(IntegrationV2QueryService().kanban_schema()), 200


@integration_v2_bp.route('/stores/<int:store_id>', methods=['GET'])
@require_auth
def get_store(payload, store_id):
    store = db.session.get(IntegrationV2Store, store_id)
    if store is None:
        return jsonify({'error': 'Loja nao encontrada.', 'code': 'STORE_NOT_FOUND'}), 404
    return jsonify(IntegrationV2QueryService().store_detail(store)), 200


@integration_v2_bp.route('/stores/<int:store_id>/timeline', methods=['GET'])
@require_auth
def get_store_timeline(payload, store_id):
    store = db.session.get(IntegrationV2Store, store_id)
    if store is None:
        return jsonify({'error': 'Loja nao encontrada.', 'code': 'STORE_NOT_FOUND'}), 404
    return jsonify(IntegrationV2QueryService().timeline(store)), 200


@integration_v2_bp.route('/sync/status', methods=['GET'])
@require_auth
def get_sync_status(payload):
    return jsonify(IntegrationV2QueryService().sync_status()), 200


@integration_v2_bp.route('/sync', methods=['POST'])
@require_auth
@require_permission('manage_sync')
def start_sync(payload):
    body = request.get_json(silent=True) or {}
    mode = str(body.get('mode', 'FULL')).upper()
    if mode not in {'FULL', 'INCREMENTAL'}:
        return jsonify({'error': 'Modo de sincronizacao invalido.', 'code': 'INVALID_SYNC_MODE'}), 400
    try:
        run = IntegrationV2SyncService().run(mode)
        return jsonify({'message': 'Sincronizacao da Integracao V2 concluida.', 'run': run}), 200
    except RuntimeError as error:
        if 'andamento' in str(error):
            return jsonify({'error': str(error), 'code': 'SYNC_ALREADY_RUNNING'}), 409
        return jsonify({'error': 'Nao foi possivel sincronizar a Integracao V2.', 'code': 'SYNC_FAILED'}), 502
    except Exception:
        return jsonify({'error': 'Nao foi possivel sincronizar a Integracao V2.', 'code': 'SYNC_FAILED'}), 502
