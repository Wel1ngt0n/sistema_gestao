import json
import math
import statistics
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import or_

from app.models import (
    db,
    IntegrationV2Assignee,
    IntegrationV2BlockPeriod,
    IntegrationV2Status,
    IntegrationV2StatusCatalogRun,
    IntegrationV2StatusHistory,
    IntegrationV2Store,
    IntegrationV2SyncRun,
    IntegrationV2Task,
    IntegrationV2TaskAssignee,
)
from app.services.integration_v2_sync_service import IntegrationV2SyncService, utcnow


RECONCILIATION_LABELS = {
    'NOT_IN_INTEGRATION': 'Ainda nao entrou na Integracao',
    'MATCHED': 'Reconciliada',
    'AMBIGUOUS': 'Reconciliacao ambigua',
    'DATA_ERROR': 'Erro de dados',
}


def iso_utc(value):
    return value.isoformat(timespec='seconds') + 'Z' if value else None


def percentile(values, percentile_value):
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile_value
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return int(ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower))


def merged_overlap_seconds(periods, start, end, now):
    if not start or not end or end <= start:
        return None if not start else 0
    intervals = []
    for period in periods:
        period_end = period.ended_at or now
        overlap_start = max(start, period.started_at)
        overlap_end = min(end, period_end)
        if overlap_end > overlap_start:
            intervals.append((overlap_start, overlap_end))
    intervals.sort(key=lambda item: item[0])
    merged = []
    for interval in intervals:
        if not merged or interval[0] > merged[-1][1]:
            merged.append(list(interval))
        else:
            merged[-1][1] = max(merged[-1][1], interval[1])
    return sum(int((item[1] - item[0]).total_seconds()) for item in merged)


class IntegrationV2QueryService:
    def __init__(self, now_provider=None):
        self.now_provider = now_provider or utcnow

    def filtered_query(self, filters):
        query = IntegrationV2Store.query.outerjoin(IntegrationV2Task).filter(
            IntegrationV2Store.source_present.is_(True)
        )
        search = (filters.get('search') or '').strip()
        if search:
            pattern = f'%{search}%'
            query = query.filter(or_(
                IntegrationV2Store.store_name.ilike(pattern),
                IntegrationV2Store.business_id.ilike(pattern),
                IntegrationV2Task.custom_id.ilike(pattern),
            ))

        reconciliation = filters.get('reconciliation_status')
        if reconciliation:
            query = query.filter(IntegrationV2Store.reconciliation_status == reconciliation)

        status_id = filters.get('status_id')
        if status_id == 'NOT_IN_INTEGRATION':
            query = query.filter(IntegrationV2Store.reconciliation_status == 'NOT_IN_INTEGRATION')
        elif status_id:
            query = query.filter(IntegrationV2Task.current_status_id == int(status_id))

        assignee_id = filters.get('assignee_id')
        if assignee_id:
            query = query.join(
                IntegrationV2TaskAssignee,
                IntegrationV2TaskAssignee.task_id == IntegrationV2Task.id,
            ).filter(IntegrationV2TaskAssignee.assignee_id == int(assignee_id))

        blocked = filters.get('blocked')
        if blocked is True:
            query = query.filter(IntegrationV2Task.is_blocked.is_(blocked))
        elif blocked is False:
            query = query.filter(or_(
                IntegrationV2Task.is_blocked.is_(False),
                IntegrationV2Task.id.is_(None),
            ))

        started_from = filters.get('started_from')
        if started_from:
            query = query.filter(IntegrationV2Task.started_at >= started_from)
        started_to = filters.get('started_to')
        if started_to:
            query = query.filter(IntegrationV2Task.started_at <= started_to)
        return query.distinct()

    def monitor(self, filters, page=1, per_page=50, sort='store_name', direction='asc'):
        query = self.filtered_query(filters)
        sort_columns = {
            'store_name': IntegrationV2Store.store_name,
            'first_seen_at': IntegrationV2Store.first_seen_at,
            'last_seen_at': IntegrationV2Store.last_seen_at,
            'started_at': IntegrationV2Task.started_at,
            'updated_at': IntegrationV2Task.source_updated_at,
        }
        column = sort_columns.get(sort, IntegrationV2Store.store_name)
        query = query.order_by(column.desc() if direction == 'desc' else column.asc(), IntegrationV2Store.id.asc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            'items': [self.serialize_store(store) for store in pagination.items],
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
            },
            'applied_filters': self.serialize_filters(filters),
        }

    def metrics(self, filters):
        stores = self.filtered_query(filters).all()
        serialized = [self.serialize_store(store) for store in stores]
        total = len(stores)
        matched = sum(store.reconciliation_status == 'MATCHED' for store in stores)
        gross_values = [item['timing']['gross_seconds'] for item in serialized if item['timing']['gross_seconds'] is not None]
        net_values = [item['timing']['net_seconds'] for item in serialized if item['timing']['net_seconds'] is not None]
        tasks = [store.integration_task for store in stores if store.integration_task]
        task_ids = [task.id for task in tasks]

        by_status = []
        statuses = IntegrationV2Status.query.filter_by(active=True).order_by(IntegrationV2Status.position).all()
        for status in statuses:
            current_tasks = [task for task in tasks if task.current_status_id == status.id]
            durations = []
            if task_ids:
                history = IntegrationV2StatusHistory.query.filter(
                    IntegrationV2StatusHistory.task_id.in_(task_ids),
                    IntegrationV2StatusHistory.status_id == status.id,
                ).all()
                durations = [self.history_duration(item) for item in history]
                durations = [value for value in durations if value is not None]
            by_status.append({
                'status_id': status.id,
                'status_name': status.name,
                'color': status.color,
                'count': len(current_tasks),
                'average_seconds': int(statistics.mean(durations)) if durations else None,
                'median_seconds': int(statistics.median(durations)) if durations else None,
                'p75_seconds': percentile(durations, 0.75),
                'p90_seconds': percentile(durations, 0.90),
            })

        assignee_stats = defaultdict(lambda: {'tasks': set(), 'completed': set(), 'net': []})
        store_by_task = {store.integration_task.id: store for store in stores if store.integration_task}
        if task_ids:
            links = IntegrationV2TaskAssignee.query.filter(IntegrationV2TaskAssignee.task_id.in_(task_ids)).all()
            for link in links:
                item = assignee_stats[link.assignee_id]
                item['tasks'].add(link.task_id)
                linked_store = store_by_task[link.task_id]
                if self.is_completed(link.task):
                    item['completed'].add(link.task_id)
                timing = self.store_timing(linked_store)
                if timing['net_seconds'] is not None:
                    item['net'].append(timing['net_seconds'])

        assignees = {
            item.id: item
            for item in IntegrationV2Assignee.query.filter(IntegrationV2Assignee.id.in_(assignee_stats.keys())).all()
        } if assignee_stats else {}
        by_assignee = [{
            'assignee_id': assignee_id,
            'username': assignees[assignee_id].username,
            'count': len(values['tasks']),
            'completed_count': len(values['completed']),
            'average_net_seconds': int(statistics.mean(values['net'])) if values['net'] else None,
        } for assignee_id, values in assignee_stats.items()]

        return {
            'total_stores': total,
            'implantation_completed': sum(store.source_closed_at is not None for store in stores),
            'implantation_active': sum(store.source_closed_at is None for store in stores),
            'matched_stores': matched,
            'not_in_integration': sum(store.reconciliation_status == 'NOT_IN_INTEGRATION' for store in stores),
            'ambiguous_stores': sum(store.reconciliation_status == 'AMBIGUOUS' for store in stores),
            'data_error_stores': sum(store.reconciliation_status == 'DATA_ERROR' for store in stores),
            'orphan_tasks': IntegrationV2Task.query.filter_by(store_id=None).count(),
            'coverage_percent': round((matched / total) * 100, 1) if total else 0.0,
            'wip_total': sum(not self.is_completed(task) for task in tasks),
            'completed_total': sum(self.is_completed(task) for task in tasks),
            'blocked_now': sum(task.is_blocked for task in tasks),
            'total_block_periods': IntegrationV2BlockPeriod.query.filter(
                IntegrationV2BlockPeriod.task_id.in_(task_ids)
            ).count() if task_ids else 0,
            'average_gross_seconds': int(statistics.mean(gross_values)) if gross_values else None,
            'median_gross_seconds': int(statistics.median(gross_values)) if gross_values else None,
            'average_net_seconds': int(statistics.mean(net_values)) if net_values else None,
            'by_status': by_status,
            'by_assignee': sorted(by_assignee, key=lambda item: (-item['count'], item['username'])),
        }

    def filters(self):
        return {
            'statuses': [self.serialize_status(status) for status in IntegrationV2Status.query.order_by(
                IntegrationV2Status.position,
                IntegrationV2Status.id,
            ).all()],
            'assignees': [self.serialize_assignee(assignee) for assignee in IntegrationV2Assignee.query.filter_by(
                active=True
            ).order_by(IntegrationV2Assignee.username).all()],
            'reconciliation_statuses': [
                {'value': value, 'label': label} for value, label in RECONCILIATION_LABELS.items()
            ],
            'boolean_options': [
                {'value': True, 'label': 'Sim'},
                {'value': False, 'label': 'Nao'},
            ],
        }

    def kanban_schema(self):
        columns = IntegrationV2Status.query.filter_by(active=True).order_by(
            IntegrationV2Status.position,
            IntegrationV2Status.id,
        ).all()
        latest_catalog = IntegrationV2StatusCatalogRun.query.filter_by(status='SUCCESS').order_by(
            IntegrationV2StatusCatalogRun.finished_at.desc()
        ).first()
        counts = dict(
            IntegrationV2Task.query.join(IntegrationV2Store).with_entities(
                IntegrationV2Task.current_status_id,
                db.func.count(IntegrationV2Task.id),
            ).filter(
                IntegrationV2Task.store_id.isnot(None),
                IntegrationV2Store.source_present.is_(True),
            ).group_by(IntegrationV2Task.current_status_id).all()
        )
        not_entered = IntegrationV2Store.query.filter_by(
            reconciliation_status='NOT_IN_INTEGRATION',
            source_present=True,
        ).count()
        last_synced = latest_catalog.finished_at if latest_catalog else None
        return {
            'columns': [{**self.serialize_status(status), 'store_count': counts.get(status.id, 0)} for status in columns],
            'local_columns': [{
                'id': 'NOT_IN_INTEGRATION',
                'external_id': None,
                'name': 'Ainda nao entrou na Integracao',
                'color': '#64748b',
                'type': 'local',
                'position': -1,
                'active': True,
                'store_count': not_entered,
            }],
            'catalog_signature': latest_catalog.configuration_signature if latest_catalog else None,
            'last_synced_at': iso_utc(last_synced),
            'is_stale': last_synced is None or last_synced < self.now_provider() - timedelta(hours=6),
        }

    def store_detail(self, store):
        result = self.serialize_store(store)
        task = store.integration_task
        if not task:
            result.update({
                'task_details': None,
                'stage_totals': [],
                'block_periods': [],
                'timeline_summary': {'first_entry_at': None, 'last_transition_at': None, 'total_transitions': 0},
            })
            return result

        histories = sorted(task.status_history, key=lambda item: (item.entered_at is None, item.entered_at or datetime.max))
        result.update({
            'task_details': {
                'priority': task.priority,
                'tags': self.load_json(task.tags_snapshot, []),
                'custom_fields': self.custom_fields_map(task.custom_fields_snapshot),
            },
            'stage_totals': self.stage_totals(histories),
            'block_periods': [self.serialize_block(item) for item in sorted(task.block_periods, key=lambda item: item.started_at)],
            'timeline_summary': {
                'first_entry_at': iso_utc(next((item.entered_at for item in histories if item.entered_at), None)),
                'last_transition_at': iso_utc(next((item.entered_at for item in reversed(histories) if item.entered_at), None)),
                'total_transitions': len(histories),
            },
        })
        return result

    def timeline(self, store):
        task = store.integration_task
        if not task:
            return {'store_id': store.id, 'items': [], 'block_periods': [], 'stage_totals': []}
        histories = sorted(task.status_history, key=lambda item: (item.entered_at is None, item.entered_at or datetime.max))
        return {
            'store_id': store.id,
            'items': [self.serialize_history(item) for item in histories],
            'block_periods': [self.serialize_block(item) for item in sorted(task.block_periods, key=lambda item: item.started_at)],
            'stage_totals': self.stage_totals(histories),
        }

    def sync_status(self):
        last_run = IntegrationV2SyncRun.query.order_by(IntegrationV2SyncRun.started_at.desc()).first()
        last_success = IntegrationV2SyncRun.query.filter_by(status='SUCCESS').order_by(
            IntegrationV2SyncRun.finished_at.desc()
        ).first()
        catalog = IntegrationV2StatusCatalogRun.query.filter_by(status='SUCCESS').order_by(
            IntegrationV2StatusCatalogRun.finished_at.desc()
        ).first()
        last_success_at = last_success.finished_at if last_success else None
        return {
            'in_progress': bool(last_run and last_run.status == 'RUNNING'),
            'last_run': IntegrationV2SyncService.serialize_run(last_run) if last_run else None,
            'last_successful_sync_at': iso_utc(last_success_at),
            'last_catalog_sync_at': iso_utc(catalog.finished_at if catalog else None),
            'catalog_signature': catalog.configuration_signature if catalog else None,
            'is_stale': last_success_at is None or last_success_at < self.now_provider() - timedelta(hours=6),
            'divergences': {
                'ambiguous': IntegrationV2Store.query.filter_by(
                    reconciliation_status='AMBIGUOUS', source_present=True
                ).count(),
                'orphan_tasks': IntegrationV2Task.query.filter_by(store_id=None).count(),
                'data_errors': IntegrationV2Store.query.filter_by(
                    reconciliation_status='DATA_ERROR', source_present=True
                ).count(),
            },
        }

    def serialize_store(self, store):
        task = store.integration_task
        return {
            'id': store.id,
            'store_name': store.store_name,
            'business_id': store.business_id,
            'implantation_task_id': store.source_task_id,
            'implantation_state': 'COMPLETED' if store.source_closed_at else 'ACTIVE',
            'implantation_finished_at': iso_utc(store.source_closed_at),
            'reconciliation_status': store.reconciliation_status,
            'reconciliation_method': store.reconciliation_method,
            'has_integration_task': task is not None,
            'integration_task': self.serialize_task(task) if task else None,
            'timing': self.store_timing(store),
            'first_seen_at': iso_utc(store.first_seen_at),
            'last_seen_at': iso_utc(store.last_seen_at),
            'synced_at': iso_utc(store.synced_at),
        }

    def serialize_task(self, task):
        return {
            'id': task.id,
            'clickup_task_id': task.clickup_task_id,
            'custom_id': task.custom_id,
            'url': task.url,
            'current_status': self.serialize_status(task.current_status) if task.current_status else None,
            'assignees': [self.serialize_assignee(link.assignee) for link in task.assignee_links],
            'created_at': iso_utc(task.created_at),
            'started_at': iso_utc(task.started_at),
            'due_at': iso_utc(task.due_at),
            'completed_at': iso_utc(task.completed_at),
            'closed_at': iso_utc(task.closed_at),
            'updated_at': iso_utc(task.source_updated_at),
            'archived': task.archived,
            'is_blocked': task.is_blocked,
            'data_quality': task.data_quality,
        }

    def store_timing(self, store):
        task = store.integration_task
        if not task:
            return {'gross_seconds': None, 'blocked_seconds': 0, 'net_seconds': None, 'current_stage_seconds': None}
        now = self.now_provider()
        history_starts = [item.entered_at for item in task.status_history if item.entered_at]
        start = task.started_at or (min(history_starts) if history_starts else task.created_at)
        end = task.completed_at or task.closed_at or (now if start else None)
        gross = max(0, int((end - start).total_seconds())) if start and end else None
        blocked = merged_overlap_seconds(task.block_periods, start, end, now)
        current = next((item for item in task.status_history if item.is_current), None)
        current_seconds = self.history_duration(current) if current else None
        return {
            'gross_seconds': gross,
            'blocked_seconds': blocked or 0,
            'net_seconds': max(0, gross - (blocked or 0)) if gross is not None else None,
            'current_stage_seconds': current_seconds,
        }

    def history_duration(self, item):
        if item is None or item.entered_at is None:
            return None
        if item.is_current:
            return max(0, int((self.now_provider() - item.entered_at).total_seconds()))
        if item.exited_at:
            return max(0, int((item.exited_at - item.entered_at).total_seconds()))
        return item.duration_seconds

    def stage_totals(self, histories):
        grouped = defaultdict(list)
        for item in histories:
            grouped[item.status_id].append(item)
        result = []
        for status_id, items in grouped.items():
            durations = [self.history_duration(item) for item in items]
            known = [value for value in durations if value is not None]
            status = items[0].status
            result.append({
                'status_id': status_id,
                'status_name': status.name,
                'color': status.color,
                'total_seconds': sum(known) if known else None,
                'visits': len(items),
                'current': any(item.is_current for item in items),
            })
        return sorted(result, key=lambda item: next(
            history.status.position for history in histories if history.status_id == item['status_id']
        ))

    def serialize_history(self, item):
        return {
            'id': item.id,
            'occurrence': item.occurrence,
            'status': self.serialize_status(item.status),
            'entered_at': iso_utc(item.entered_at),
            'exited_at': iso_utc(item.exited_at),
            'duration_seconds': self.history_duration(item),
            'current': item.is_current,
            'timestamp_source': item.timestamp_source,
            'timestamp_quality': item.timestamp_quality,
        }

    def serialize_block(self, item):
        if item.started_at:
            block_end = item.ended_at or (self.now_provider() if item.is_current else None)
            duration = max(0, int((block_end - item.started_at).total_seconds())) if block_end else item.duration_seconds
        else:
            duration = None
        return {
            'id': item.id,
            'status_id': item.status_id,
            'started_at': iso_utc(item.started_at),
            'ended_at': iso_utc(item.ended_at),
            'duration_seconds': duration,
            'current': item.is_current,
            'reason': item.reason,
            'reason_source': item.reason_source,
            'quality': item.quality,
        }

    @staticmethod
    def serialize_status(status):
        return {
            'id': status.id,
            'external_id': status.external_id,
            'name': status.name,
            'color': status.color,
            'type': status.native_type,
            'position': status.position,
            'active': status.active,
        }

    @staticmethod
    def serialize_assignee(assignee):
        return {
            'id': assignee.id,
            'clickup_user_id': assignee.clickup_user_id,
            'username': assignee.username,
            'email': assignee.email,
            'avatar': assignee.avatar,
        }

    @staticmethod
    def is_completed(task):
        return bool(task.completed_at or task.closed_at or (task.current_status and task.current_status.native_type == 'closed'))

    @staticmethod
    def serialize_filters(filters):
        return {
            key: iso_utc(value) if isinstance(value, datetime) else value
            for key, value in filters.items()
            if value not in (None, '')
        }

    @staticmethod
    def load_json(value, default):
        try:
            return json.loads(value) if value else default
        except (TypeError, ValueError):
            return default

    @classmethod
    def custom_fields_map(cls, value):
        fields = cls.load_json(value, [])
        return {
            str(field.get('name') or field.get('id')): field.get('value')
            for field in fields
            if isinstance(field, dict) and (field.get('name') or field.get('id'))
        }
