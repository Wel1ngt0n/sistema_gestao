import json
import math
import statistics
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import func, or_, select

from app.models import (
    Store,
    db,
    IntegrationAssignee,
    IntegrationBlockPeriod,
    IntegrationStatus,
    IntegrationStatusCatalogRun,
    IntegrationStatusHistory,
    IntegrationStore,
    IntegrationSyncRun,
    IntegrationTask,
    IntegrationTaskAssignee,
)
from app.services.integration_sync_service import IntegrationSyncService, normalize_text, utcnow


RECONCILIATION_LABELS = {
    'NOT_IN_INTEGRATION': 'Ainda nao entrou na Integracao',
    'MATCHED': 'Reconciliada',
    'AMBIGUOUS': 'Reconciliacao ambigua',
    'DATA_ERROR': 'Erro de dados',
}

_MISSING_DISCOUNT_DECISION = object()


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
        decision = getattr(period, 'discount_approved', _MISSING_DISCOUNT_DECISION)
        if decision is not _MISSING_DISCOUNT_DECISION and decision is not True:
            continue
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


class IntegrationQueryService:
    def __init__(self, now_provider=None):
        self.now_provider = now_provider or utcnow
        self._contact_status_ids = None

    def filtered_query(self, filters, integration_started_at=None):
        if integration_started_at is None:
            integration_started_at = self.integration_start_expression()
        query = IntegrationStore.query.outerjoin(IntegrationTask).filter(
            IntegrationStore.source_present.is_(True)
        )
        search = (filters.get('search') or '').strip()
        if search:
            pattern = f'%{search}%'
            query = query.filter(or_(
                IntegrationStore.store_name.ilike(pattern),
                IntegrationStore.business_id.ilike(pattern),
                IntegrationTask.custom_id.ilike(pattern),
            ))

        reconciliation = filters.get('reconciliation_status')
        if reconciliation:
            query = query.filter(IntegrationStore.reconciliation_status == reconciliation)

        status_id = filters.get('status_id')
        if status_id == 'NOT_IN_INTEGRATION':
            query = query.filter(IntegrationStore.reconciliation_status == 'NOT_IN_INTEGRATION')
        elif status_id:
            query = query.filter(IntegrationTask.current_status_id == int(status_id))

        assignee_id = filters.get('assignee_id')
        if assignee_id:
            query = query.outerjoin(
                IntegrationTaskAssignee,
                IntegrationTaskAssignee.task_id == IntegrationTask.id,
            ).filter(or_(
                IntegrationStore.manual_integrator_id == int(assignee_id),
                db.and_(
                    IntegrationStore.manual_integrator_id.is_(None),
                    IntegrationTaskAssignee.assignee_id == int(assignee_id),
                ),
            ))

        blocked = filters.get('blocked')
        if blocked is True:
            query = query.filter(IntegrationTask.is_blocked.is_(blocked))
        elif blocked is False:
            query = query.filter(or_(
                IntegrationTask.is_blocked.is_(False),
                IntegrationTask.id.is_(None),
            ))

        started_from = filters.get('started_from')
        if started_from:
            query = query.filter(integration_started_at >= started_from)
        started_to = filters.get('started_to')
        if started_to:
            query = query.filter(integration_started_at <= started_to)
        return query.distinct()

    def monitor(self, filters, page=1, per_page=50, sort='store_name', direction='asc'):
        integration_started_at = self.integration_start_expression()
        query = self.filtered_query(filters, integration_started_at)
        sort_columns = {
            'store_name': IntegrationStore.store_name,
            'first_seen_at': IntegrationStore.first_seen_at,
            'last_seen_at': IntegrationStore.last_seen_at,
            'started_at': integration_started_at,
            'updated_at': IntegrationTask.source_updated_at,
        }
        column = sort_columns.get(sort, IntegrationStore.store_name)
        query = query.order_by(column.desc() if direction == 'desc' else column.asc(), IntegrationStore.id.asc())
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
        statuses = IntegrationStatus.query.filter_by(active=True).order_by(IntegrationStatus.position).all()
        for status in statuses:
            current_tasks = [task for task in tasks if task.current_status_id == status.id]
            durations = []
            if task_ids:
                history = IntegrationStatusHistory.query.filter(
                    IntegrationStatusHistory.task_id.in_(task_ids),
                    IntegrationStatusHistory.status_id == status.id,
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
        for store in stores:
            task = store.integration_task
            if not task:
                continue
            assignee_ids = [store.manual_integrator_id] if store.manual_integrator_id else [
                link.assignee_id for link in task.assignee_links
            ]
            for current_assignee_id in assignee_ids:
                item = assignee_stats[current_assignee_id]
                item['tasks'].add(task.id)
                if self.is_completed(task):
                    item['completed'].add(task.id)
                timing = self.store_timing(store)
                if timing['net_seconds'] is not None:
                    item['net'].append(timing['net_seconds'])

        assignees = {
            item.id: item
            for item in IntegrationAssignee.query.filter(IntegrationAssignee.id.in_(assignee_stats.keys())).all()
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
            'orphan_tasks': IntegrationTask.query.filter_by(store_id=None).count(),
            'coverage_percent': round((matched / total) * 100, 1) if total else 0.0,
            'wip_total': sum(not self.is_completed(task) for task in tasks),
            'completed_total': sum(self.is_completed(task) for task in tasks),
            'blocked_now': sum(task.is_blocked for task in tasks),
            'total_block_periods': IntegrationBlockPeriod.query.filter(
                IntegrationBlockPeriod.task_id.in_(task_ids)
            ).count() if task_ids else 0,
            'average_gross_seconds': int(statistics.mean(gross_values)) if gross_values else None,
            'median_gross_seconds': int(statistics.median(gross_values)) if gross_values else None,
            'average_net_seconds': int(statistics.mean(net_values)) if net_values else None,
            'by_status': by_status,
            'by_assignee': sorted(by_assignee, key=lambda item: (-item['count'], item['username'])),
        }

    def filters(self):
        return {
            'statuses': [self.serialize_status(status) for status in IntegrationStatus.query.order_by(
                IntegrationStatus.position,
                IntegrationStatus.id,
            ).all()],
            'assignees': [self.serialize_assignee(assignee) for assignee in IntegrationAssignee.query.filter_by(
                active=True
            ).order_by(IntegrationAssignee.username).all()],
            'reconciliation_statuses': [
                {'value': value, 'label': label} for value, label in RECONCILIATION_LABELS.items()
            ],
            'boolean_options': [
                {'value': True, 'label': 'Sim'},
                {'value': False, 'label': 'Nao'},
            ],
        }

    def kanban_schema(self):
        columns = IntegrationStatus.query.filter_by(active=True).order_by(
            IntegrationStatus.position,
            IntegrationStatus.id,
        ).all()
        latest_catalog = IntegrationStatusCatalogRun.query.filter_by(status='SUCCESS').order_by(
            IntegrationStatusCatalogRun.finished_at.desc()
        ).first()
        counts = dict(
            IntegrationTask.query.join(IntegrationStore).with_entities(
                IntegrationTask.current_status_id,
                db.func.count(IntegrationTask.id),
            ).filter(
                IntegrationTask.store_id.isnot(None),
                IntegrationStore.source_present.is_(True),
            ).group_by(IntegrationTask.current_status_id).all()
        )
        not_entered = IntegrationStore.query.filter_by(
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
        result.update({
            'operational_profile': self.operational_profile(store),
            'implantation_reference': self.implantation_reference(store),
            'audit_logs': self.audit_logs(store),
        })
        if not task:
            result.update({
                'task_details': None,
                'stage_totals': [],
                'block_periods': [],
                'timeline_summary': {'first_entry_at': None, 'last_transition_at': None, 'total_transitions': 0},
                'integration_dates': {'started_at': None, 'finished_at': None, 'start_source': 'CONTACT_STAGE'},
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
            'integration_dates': {
                'started_at': iso_utc(self.integration_start(task)),
                'finished_at': iso_utc(task.completed_at or task.closed_at),
                'start_source': 'CONTACT_STAGE',
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
        last_run = IntegrationSyncRun.query.order_by(IntegrationSyncRun.started_at.desc()).first()
        last_success = IntegrationSyncRun.query.filter_by(status='SUCCESS').order_by(
            IntegrationSyncRun.finished_at.desc()
        ).first()
        catalog = IntegrationStatusCatalogRun.query.filter_by(status='SUCCESS').order_by(
            IntegrationStatusCatalogRun.finished_at.desc()
        ).first()
        last_success_at = last_success.finished_at if last_success else None
        return {
            'in_progress': bool(last_run and last_run.status == 'RUNNING'),
            'last_run': IntegrationSyncService.serialize_run(last_run) if last_run else None,
            'last_successful_sync_at': iso_utc(last_success_at),
            'last_catalog_sync_at': iso_utc(catalog.finished_at if catalog else None),
            'catalog_signature': catalog.configuration_signature if catalog else None,
            'is_stale': last_success_at is None or last_success_at < self.now_provider() - timedelta(hours=6),
            'divergences': {
                'ambiguous': IntegrationStore.query.filter_by(
                    reconciliation_status='AMBIGUOUS', source_present=True
                ).count(),
                'orphan_tasks': IntegrationTask.query.filter_by(store_id=None).count(),
                'data_errors': IntegrationStore.query.filter_by(
                    reconciliation_status='DATA_ERROR', source_present=True
                ).count(),
            },
        }

    def serialize_store(self, store):
        task = store.integration_task
        serialized_task = self.serialize_task(task) if task else None
        if serialized_task is not None and store.manual_integrator:
            serialized_task['assignees'] = [self.serialize_assignee(store.manual_integrator)]
            serialized_task['assignee_source'] = 'MANUAL'
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
            'integration_task': serialized_task,
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
            'assignee_source': 'CLICKUP',
            'created_at': iso_utc(task.created_at),
            'started_at': iso_utc(task.started_at),
            'due_at': iso_utc(task.due_at),
            'completed_at': iso_utc(task.completed_at),
            'closed_at': iso_utc(task.closed_at),
            'updated_at': iso_utc(task.source_updated_at),
            'archived': task.archived,
            'completed': self.is_completed(task),
            'is_blocked': task.is_blocked,
            'data_quality': task.data_quality,
        }

    def store_timing(self, store):
        task = store.integration_task
        if not task:
            return {'gross_seconds': None, 'blocked_seconds': 0, 'net_seconds': None, 'current_stage_seconds': None}
        now = self.now_provider()
        start = self.integration_start(task)
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
            'discount_approved': item.discount_approved,
            'review_reason': item.review_reason,
            'reviewed_at': iso_utc(item.reviewed_at),
            'reviewed_by': item.reviewed_by,
            'review_status': (
                'PENDING'
                if item.discount_approved is None
                else ('DISCOUNTED' if item.discount_approved else 'NOT_DISCOUNTED')
            ),
            'discounted_seconds': duration if item.discount_approved is True else 0,
        }

    @staticmethod
    def is_contact_communication_status(status):
        normalized = normalize_text(status.name if status else None)
        return 'contato' in normalized and 'comunicacao' in normalized

    def contact_status_ids(self):
        if self._contact_status_ids is None:
            self._contact_status_ids = [
                status.id
                for status in IntegrationStatus.query.all()
                if self.is_contact_communication_status(status)
            ]
        return self._contact_status_ids

    def integration_start_expression(self):
        return select(func.min(IntegrationStatusHistory.entered_at)).where(
            IntegrationStatusHistory.task_id == IntegrationTask.id,
            IntegrationStatusHistory.status_id.in_(self.contact_status_ids()),
            IntegrationStatusHistory.entered_at.isnot(None),
        ).correlate(IntegrationTask).scalar_subquery()

    def integration_start(self, task):
        contact_entries = [
            item.entered_at
            for item in task.status_history
            if item.entered_at and self.is_contact_communication_status(item.status)
        ]
        return min(contact_entries) if contact_entries else None

    def operational_profile(self, store):
        task = store.integration_task
        synced_integrators = [
            self.serialize_assignee(link.assignee)
            for link in task.assignee_links
        ] if task else []
        effective_integrators = (
            [self.serialize_assignee(store.manual_integrator)]
            if store.manual_integrator
            else synced_integrators
        )
        return {
            'manual_integrator': self.serialize_assignee(store.manual_integrator) if store.manual_integrator else None,
            'synced_integrators': synced_integrators,
            'effective_integrators': effective_integrators,
            'integrator_source': 'MANUAL' if store.manual_integrator else 'CLICKUP',
            'quality_reviewer': store.quality_reviewer,
            'had_post_integration_issues': store.had_post_integration_issues,
            'followed_integration_process': store.followed_integration_process,
            'quality_notes': store.quality_notes,
            'updated_at': iso_utc(store.manual_updated_at),
            'updated_by': store.manual_updated_by,
        }

    @staticmethod
    def source_store(store):
        """Localiza a loja de Implantação que originou o registro de Integração."""
        source = Store.query.filter(Store.clickup_task_id == store.source_task_id).first()
        if source:
            return source
        for identifier in (store.source_custom_id, store.business_id):
            if identifier:
                source = Store.query.filter(Store.custom_store_id == identifier).first()
                if source:
                    return source
        return None

    def implantation_reference(self, store):
        source = self.source_store(store)
        if not source:
            return None
        return {
            'store_id': source.id,
            'store_name': source.store_name,
            'custom_store_id': source.custom_store_id,
            'clickup_task_id': source.clickup_task_id,
            'clickup_url': source.clickup_url,
            'status': source.status,
            'status_normalized': source.status_norm,
            'started_at': iso_utc(source.effective_started_at),
            'finished_at': iso_utc(source.effective_finished_at),
            'implantador': source.implantador_atual or source.implantador,
            'erp': source.erp,
            'cnpj': source.cnpj,
            'crm': source.crm,
            'network': source.rede,
            'store_type': source.tipo_loja,
            'parent_store': source.matriz.store_name if source.matriz else None,
            'branches': [item.store_name for item in source.filiais],
            'parent_store_detail': ({
                'id': source.matriz.id,
                'name': source.matriz.store_name,
                'custom_store_id': source.matriz.custom_store_id,
            } if source.matriz else None),
            'branch_details': [{
                'id': item.id,
                'name': item.store_name,
                'custom_store_id': item.custom_store_id,
            } for item in source.filiais],
            'monthly_fee': source.valor_mensalidade,
            'implantation_fee': source.valor_implantacao,
            'financial_status': source.financeiro_status,
            'contract_days': source.tempo_contrato,
            'address': source.address,
            'state': source.state_uf,
            'had_ecommerce': source.had_ecommerce,
            'previous_platform': source.previous_platform,
            'deployment_type': source.deployment_type,
            'projected_orders': source.projected_orders,
            'description': source.description,
            'post_integration_issue_count': store.post_integration_issue_count,
            'churn_risk': store.churn_risk,
            'documentation_status': store.documentation_status,
        }

    def audit_logs(self, store):
        logs = [{
            'id': f'integration-{item.id}',
            'source': 'INTEGRATION',
            'action': item.action,
            'field_name': item.field_name,
            'old_value': self.audit_log_value(item.old_value),
            'new_value': self.audit_log_value(item.new_value),
            'reason': item.reason,
            'changed_by': item.changed_by_name,
            'changed_at': iso_utc(item.changed_at),
        } for item in sorted(store.audit_logs, key=lambda value: value.changed_at, reverse=True)]
        source = self.source_store(store)
        if source:
            logs.extend({
                'id': f'implantation-{item.id}',
                'source': 'IMPLANTATION',
                'action': 'FIELD_CHANGE',
                'field_name': item.field_name,
                'old_value': item.old_value,
                'new_value': item.new_value,
                'reason': None,
                'changed_by': item.source,
                'changed_at': iso_utc(item.changed_at),
            } for item in source.logs)
        return sorted(logs, key=lambda item: item['changed_at'] or '', reverse=True)

    @staticmethod
    def audit_log_value(value):
        if value is None:
            return None
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return value

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
