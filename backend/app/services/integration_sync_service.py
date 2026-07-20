import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone

from sqlalchemy import and_, func, or_

from config import Config
from app.models import (
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
    Store,
)
from app.services.clickup import ClickUpService


def utcnow():
    return datetime.utcnow()


def parse_clickup_datetime(value):
    if value in (None, ''):
        return None
    try:
        if isinstance(value, (int, float)) or str(value).isdigit():
            return datetime.utcfromtimestamp(int(value) / 1000)
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return parsed.replace(tzinfo=None) if parsed.tzinfo is None else parsed.astimezone(timezone.utc).replace(tzinfo=None)
    except (TypeError, ValueError, OSError):
        return None


def normalize_text(value):
    value = unicodedata.normalize('NFKD', str(value or ''))
    value = ''.join(char for char in value if not unicodedata.combining(char))
    return re.sub(r'\s+', ' ', value).strip().casefold()


def safe_json(value):
    return json.dumps(value, ensure_ascii=True, sort_keys=True, default=str)


def compact_task_snapshot(task):
    """Mantem apenas dados operacionais necessarios para auditoria do sync."""
    return {
        'id': task.get('id'),
        'custom_id': task.get('custom_id'),
        'name': task.get('name'),
        'status': task.get('status'),
        'archived': bool(task.get('archived')),
        'date_created': task.get('date_created'),
        'date_updated': task.get('date_updated'),
        'date_closed': task.get('date_closed'),
        'date_done': task.get('date_done'),
        'date_started': task.get('date_started'),
        'due_date': task.get('due_date'),
        'url': task.get('url'),
    }


def compact_implantation_store_snapshot(store, completion_at):
    """Registra a origem da coorte sem acoplar o novo dominio ao modelo legado."""
    return {
        'id': store.id,
        'clickup_task_id': store.clickup_task_id,
        'custom_store_id': store.custom_store_id,
        'store_name': store.store_name,
        'status': store.status,
        'status_norm': store.status_norm,
        'created_at': store.created_at,
        'start_real_at': store.start_real_at,
        'completion_at': completion_at,
    }


class IntegrationSyncService:
    """Sincroniza o domínio canônico de Integração."""

    def __init__(self, clickup=None, now_provider=None):
        self.clickup = clickup or ClickUpService()
        self.now_provider = now_provider or utcnow
        self.integration_list_id = str(Config.LIST_IDS_STEPS['INTEGRACAO'])

    def run(self, run_type='FULL'):
        run_type = str(run_type or 'FULL').upper()
        if run_type not in {'FULL', 'INCREMENTAL'}:
            raise ValueError('Tipo de sincronizacao invalido.')

        running = IntegrationSyncRun.query.filter_by(status='RUNNING').first()
        if running:
            raise RuntimeError('Ja existe uma sincronizacao da Integracao em andamento.')

        run = IntegrationSyncRun(run_type=run_type, started_at=self.now_provider(), status='RUNNING')
        db.session.add(run)
        db.session.commit()

        try:
            self._sync_status_catalog()
            self._sync_store_catalog(run)
            self._sync_integration_tasks(run)
            run.status = 'SUCCESS'
            run.finished_at = self.now_provider()
            run.cursor = str(int(run.finished_at.timestamp() * 1000))
            db.session.commit()
            return self.serialize_run(run)
        except Exception as exc:
            db.session.rollback()
            failed_run = db.session.get(IntegrationSyncRun, run.id)
            failed_run.status = 'FAILED'
            failed_run.finished_at = self.now_provider()
            failed_run.error_summary = f'{type(exc).__name__}: {str(exc)[:500]}'
            db.session.commit()
            raise

    def _sync_status_catalog(self):
        catalog_run = IntegrationStatusCatalogRun(
            list_id=self.integration_list_id,
            started_at=self.now_provider(),
            status='RUNNING',
        )
        db.session.add(catalog_run)
        db.session.flush()

        definition = self.clickup.get_list_definition(self.integration_list_id)
        if definition is None:
            raise RuntimeError('Nao foi possivel ler a configuracao da lista de Integracao.')

        raw_statuses = definition.get('statuses')
        if raw_statuses is None:
            raise RuntimeError('A resposta do ClickUp nao trouxe o catalogo de status.')
        if not raw_statuses:
            raise RuntimeError('O ClickUp retornou um catalogo de status vazio; o estado anterior foi preservado.')

        normalized_config = [
            {
                'id': raw.get('id'),
                'name': raw.get('status') or raw.get('name'),
                'color': raw.get('color'),
                'type': raw.get('type'),
                'orderindex': raw.get('orderindex'),
            }
            for raw in raw_statuses
        ]
        signature = hashlib.sha256(safe_json(normalized_config).encode()).hexdigest()
        existing = IntegrationStatus.query.filter_by(list_id=self.integration_list_id).all()
        seen_ids = set()

        for position, raw in enumerate(raw_statuses):
            name = raw.get('status') or raw.get('name') or 'Status sem nome'
            status, identity_source = self._find_catalog_status(existing, raw, name, position)
            created = status is None
            if created:
                external_id = str(raw.get('id') or f"fallback:{hashlib.sha256(normalize_text(name).encode()).hexdigest()[:24]}")
                status = IntegrationStatus(
                    list_id=self.integration_list_id,
                    external_id=external_id,
                    first_seen_at=self.now_provider(),
                )
                db.session.add(status)
                existing.append(status)

            old_values = (status.name, status.color, status.native_type, status.position, status.active)
            status.name = name
            status.color = raw.get('color')
            status.native_type = raw.get('type')
            status.category = raw.get('type')
            status.position = self._status_position(raw, position)
            status.active = True
            status.identity_source = identity_source
            status.configuration_signature = signature
            status.last_seen_at = self.now_provider()
            status.synced_at = self.now_provider()
            db.session.flush()
            seen_ids.add(status.id)

            if created:
                catalog_run.statuses_created += 1
            elif old_values != (status.name, status.color, status.native_type, status.position, status.active):
                catalog_run.statuses_updated += 1

        for status in existing:
            if status.id not in seen_ids and status.active:
                status.active = False
                status.synced_at = self.now_provider()
                catalog_run.statuses_deactivated += 1

        catalog_run.statuses_read = len(raw_statuses)
        catalog_run.configuration_signature = signature
        catalog_run.finished_at = self.now_provider()
        catalog_run.status = 'SUCCESS'

    def _find_catalog_status(self, existing, raw, name, position):
        external_id = raw.get('id')
        if external_id is not None:
            match = next((item for item in existing if item.external_id == str(external_id)), None)
            return match, 'CLICKUP_ID'

        same_name = [item for item in existing if normalize_text(item.name) == normalize_text(name)]
        if len(same_name) == 1:
            return same_name[0], 'FALLBACK_NAME'

        target_position = self._status_position(raw, position)
        same_position = [
            item for item in existing
            if item.active and item.position == target_position and item.identity_source.startswith('FALLBACK')
        ]
        if len(same_position) == 1:
            return same_position[0], 'FALLBACK_POSITION'
        return None, 'FALLBACK_NAME'

    @staticmethod
    def _status_position(raw, default):
        try:
            return int(float(raw.get('orderindex', default)))
        except (TypeError, ValueError):
            return default

    def _sync_store_catalog(self, run):
        cohort_year = Config.INTEGRATION_COHORT_YEAR
        cohort_start = datetime(cohort_year, 1, 1)
        cohort_end = datetime(cohort_year + 1, 1, 1)
        completion_at = func.coalesce(Store.end_real_at, Store.manual_finished_at, Store.finished_at)
        stores = Store.query.filter(or_(
            Store.status_norm == 'IN_PROGRESS',
            and_(completion_at >= cohort_start, completion_at < cohort_end),
        )).order_by(Store.store_name, Store.id).all()
        run.stores_read = len(stores)

        # Registros fora do recorte permanecem auditaveis, mas deixam de compor o monitor.
        IntegrationStore.query.update({'source_present': False}, synchronize_session=False)

        for source in stores:
            source_id = str(source.clickup_task_id or '').strip()
            if not source_id:
                continue
            store = IntegrationStore.query.filter_by(source_task_id=source_id).first()
            created = store is None
            if created:
                store = IntegrationStore(
                    source_task_id=source_id,
                    first_seen_at=source.start_real_at or source.created_at or self.now_provider(),
                )
                db.session.add(store)
                run.stores_created += 1
            else:
                run.stores_updated += 1

            finished_at = source.end_real_at or source.manual_finished_at or source.finished_at
            store.source_custom_id = source.custom_store_id
            store.business_id = source.custom_store_id
            store.store_name = source.store_name or f'Loja {source_id}'
            store.source_url = source.clickup_url
            store.source_created_at = source.created_at
            store.source_closed_at = finished_at
            store.source_updated_at = finished_at or source.created_at
            store.last_seen_at = self.now_provider()
            store.synced_at = self.now_provider()
            store.source_present = True
            store.source_snapshot = safe_json(compact_implantation_store_snapshot(source, finished_at))

    def _sync_integration_tasks(self, run):
        active = self.clickup.fetch_tasks_from_list(self.integration_list_id, archived=False)
        archived = self.clickup.fetch_tasks_from_list(self.integration_list_id, archived=True)
        raw_tasks = self._deduplicate_tasks((active or []) + (archived or []))
        run.tasks_read = len(raw_tasks)

        field_ids = self._integration_relation_field_ids()
        relation_by_task = {}
        for raw in raw_tasks:
            task, created = self._upsert_task(raw)
            relation_by_task[task.id] = self._extract_relation_value(raw, field_ids)
            if created:
                run.tasks_created += 1
            else:
                run.tasks_updated += 1
            self._sync_assignees(task, raw.get('assignees', []))

        db.session.flush()
        self._reconcile_tasks(relation_by_task, run)

        for raw in raw_tasks:
            task = IntegrationTask.query.filter_by(clickup_task_id=str(raw.get('id'))).first()
            history_payload = self.clickup.get_task_history(task.clickup_task_id)
            if history_payload is None:
                task.data_quality = 'HISTORY_UNAVAILABLE'
                continue
            histories, blocks = self._sync_history(task, history_payload, raw)
            run.histories_written += histories
            run.blocks_written += blocks

    def _integration_relation_field_ids(self):
        fields = self.clickup.get_list_fields(self.integration_list_id)
        if fields is None:
            return set()
        return {
            str(field.get('id'))
            for field in fields
            if normalize_text(field.get('name')) == '_father_task_id'
        }

    def _upsert_task(self, raw):
        clickup_id = str(raw.get('id') or '').strip()
        if not clickup_id:
            raise ValueError('Tarefa de Integracao sem ID do ClickUp.')
        task = IntegrationTask.query.filter_by(clickup_task_id=clickup_id).first()
        created = task is None
        if created:
            task = IntegrationTask(
                clickup_task_id=clickup_id,
                task_name=raw.get('name') or f'Integracao {clickup_id}',
            )
            db.session.add(task)

        status_raw = raw.get('status') or {}
        status_name = status_raw.get('status') or status_raw.get('name') or 'Status sem nome'
        status = self._status_for_task(status_name, status_raw)
        priority = raw.get('priority')
        task.custom_id = raw.get('custom_id')
        task.task_name = raw.get('name') or f'Integracao {clickup_id}'
        task.url = raw.get('url')
        task.current_status = status
        task.priority = priority.get('priority') if isinstance(priority, dict) else priority
        task.tags_snapshot = safe_json(raw.get('tags', []))
        task.custom_fields_snapshot = safe_json(raw.get('custom_fields', []))
        task.source_snapshot = safe_json(compact_task_snapshot(raw))
        task.created_at = parse_clickup_datetime(raw.get('date_created'))
        task.started_at = parse_clickup_datetime(raw.get('date_started'))
        task.due_at = parse_clickup_datetime(raw.get('due_date'))
        task.completed_at = parse_clickup_datetime(raw.get('date_done'))
        task.closed_at = parse_clickup_datetime(raw.get('date_closed'))
        task.source_updated_at = parse_clickup_datetime(raw.get('date_updated'))
        task.synced_at = self.now_provider()
        task.archived = bool(raw.get('archived'))
        task.is_blocked = 'bloque' in normalize_text(status_name)
        return task, created

    def _status_for_task(self, name, raw_status=None):
        raw_status = raw_status or {}
        external_id = raw_status.get('id')
        query = IntegrationStatus.query.filter_by(list_id=self.integration_list_id)
        status = query.filter_by(external_id=str(external_id)).first() if external_id is not None else None
        if status is None:
            candidates = [item for item in query.all() if normalize_text(item.name) == normalize_text(name)]
            status = candidates[0] if len(candidates) == 1 else None
        if status is None:
            digest = hashlib.sha256(f'history:{normalize_text(name)}'.encode()).hexdigest()[:24]
            status = IntegrationStatus(
                list_id=self.integration_list_id,
                external_id=f'history:{digest}',
                name=name,
                color=raw_status.get('color'),
                native_type=raw_status.get('type'),
                category=raw_status.get('type'),
                position=9999,
                active=False,
                identity_source='HISTORY_NAME',
                first_seen_at=self.now_provider(),
                last_seen_at=self.now_provider(),
                synced_at=self.now_provider(),
            )
            db.session.add(status)
            db.session.flush()
        return status

    @staticmethod
    def _extract_relation_value(raw, relation_field_ids):
        named_candidates = []
        for field in raw.get('custom_fields', []):
            field_id = str(field.get('id'))
            field_name = normalize_text(field.get('name'))
            if field_id in relation_field_ids or field_name == '_father_task_id':
                value = field.get('value')
                if value not in (None, ''):
                    named_candidates.append(str(value).strip())
        return named_candidates[0] if len(set(named_candidates)) == 1 else None

    def _reconcile_tasks(self, relation_by_task, run):
        stores = IntegrationStore.query.filter_by(source_present=True).all()
        tasks = IntegrationTask.query.all()
        by_business = defaultdict(list)
        by_source = defaultdict(list)
        by_name = defaultdict(list)
        for store in stores:
            if store.business_id:
                by_business[normalize_text(store.business_id)].append(store)
            by_source[normalize_text(store.source_task_id)].append(store)
            by_name[normalize_text(store.store_name)].append(store)
            store.reconciliation_status = 'NOT_IN_INTEGRATION'
            store.reconciliation_method = None
            store.reconciliation_evidence = None

        candidates_by_task = {}
        methods = {}
        for task in tasks:
            task.store = None
            relation = relation_by_task.get(task.id)
            candidates = []
            method = None
            if relation:
                candidates = by_business.get(normalize_text(relation), []) or by_source.get(normalize_text(relation), [])
                method = 'RELATION_FIELD'
            if not candidates:
                candidates = by_name.get(normalize_text(task.task_name), [])
                method = 'NAME_EXACT' if candidates else None
            candidates_by_task[task.id] = candidates
            methods[task.id] = method

        # Libera os vinculos anteriores antes de validar unicidade e reatribuir as lojas.
        db.session.flush()

        store_claims = Counter(
            candidates[0].id
            for candidates in candidates_by_task.values()
            if len(candidates) == 1
        )
        for task in tasks:
            candidates = candidates_by_task[task.id]
            if len(candidates) == 1 and store_claims[candidates[0].id] == 1:
                store = candidates[0]
                task.store = store
                task.reconciliation_method = methods[task.id]
                task.reconciliation_evidence = safe_json({'method': methods[task.id]})
                store.reconciliation_status = 'MATCHED'
                store.reconciliation_method = methods[task.id]
                store.reconciliation_evidence = task.reconciliation_evidence
            elif candidates:
                run.ambiguous_matches += 1
                task.reconciliation_method = 'AMBIGUOUS'
                task.reconciliation_evidence = safe_json({'candidate_store_ids': [item.id for item in candidates]})
                for store in candidates:
                    store.reconciliation_status = 'AMBIGUOUS'
                    store.reconciliation_method = 'AMBIGUOUS'
                    store.reconciliation_evidence = task.reconciliation_evidence
            else:
                run.orphan_tasks += 1
                task.reconciliation_method = 'ORPHAN'
                task.reconciliation_evidence = None
        db.session.flush()

    def _sync_assignees(self, task, raw_assignees):
        desired_ids = set()
        for raw in raw_assignees:
            external_id = str(raw.get('id') or '').strip()
            if not external_id:
                continue
            assignee = IntegrationAssignee.query.filter_by(clickup_user_id=external_id).first()
            if assignee is None:
                assignee = IntegrationAssignee(clickup_user_id=external_id)
                db.session.add(assignee)
            assignee.username = raw.get('username') or raw.get('email') or f'Usuario {external_id}'
            assignee.email = raw.get('email')
            assignee.avatar = raw.get('profilePicture')
            assignee.active = True
            assignee.synced_at = self.now_provider()
            db.session.flush()
            desired_ids.add(assignee.id)
            if not any(link.assignee_id == assignee.id for link in task.assignee_links):
                task.assignee_links.append(IntegrationTaskAssignee(
                    assignee_id=assignee.id,
                    assignee=assignee,
                    synced_at=self.now_provider(),
                ))

        for link in list(task.assignee_links):
            if link.assignee_id not in desired_ids:
                db.session.delete(link)

    def _sync_history(self, task, payload, raw_task):
        events = self._history_events(payload)
        if not events:
            return 0, 0

        # O payload completo substitui a marcacao de intervalo atual da leitura anterior.
        for history in task.status_history:
            history.is_current = False
        for block in task.block_periods:
            block.is_current = False

        occurrence_by_status = Counter()
        written = 0
        block_written = 0
        current_name = normalize_text((raw_task.get('status') or {}).get('status'))
        reason = self._extract_block_reason(raw_task)

        for index, event in enumerate(events):
            status = self._status_for_task(event['name'], event['raw'])
            occurrence_by_status[status.id] += 1
            entered_at = event['entered_at']
            exited_at = events[index + 1]['entered_at'] if index + 1 < len(events) else None
            is_current = index == len(events) - 1 and normalize_text(event['name']) == current_name
            duration = int((exited_at - entered_at).total_seconds()) if entered_at and exited_at else None
            if entered_at and is_current:
                duration = max(0, int((self.now_provider() - entered_at).total_seconds()))
            key_source = f"{task.clickup_task_id}|{status.external_id}|{entered_at.isoformat() if entered_at else 'missing'}|{occurrence_by_status[status.id]}"
            key = hashlib.sha256(key_source.encode()).hexdigest()
            row = IntegrationStatusHistory.query.filter_by(idempotency_key=key).first()
            if row is None:
                row = IntegrationStatusHistory(idempotency_key=key, task=task)
                db.session.add(row)
                written += 1
            row.store_id = task.store_id
            row.status = status
            row.entered_at = entered_at
            row.exited_at = exited_at
            row.duration_seconds = max(0, duration) if duration is not None else None
            row.is_current = is_current
            row.occurrence = occurrence_by_status[status.id]
            row.timestamp_quality = 'CONFIRMED' if entered_at else 'INCOMPLETE'
            row.synced_at = self.now_provider()

            if entered_at and 'bloque' in normalize_text(event['name']):
                block_key = hashlib.sha256(f'block|{key_source}'.encode()).hexdigest()
                block = IntegrationBlockPeriod.query.filter_by(idempotency_key=block_key).first()
                if block is None:
                    block = IntegrationBlockPeriod(idempotency_key=block_key, task=task, started_at=entered_at)
                    db.session.add(block)
                    block_written += 1
                block.store_id = task.store_id
                block.status = status
                block.ended_at = exited_at
                block.duration_seconds = max(0, duration) if duration is not None else None
                block.is_current = is_current
                block.reason = reason
                block.reason_source = 'CUSTOM_FIELD' if reason else None
                block.quality = 'INFERRED_STATUS'
                block.occurrence = occurrence_by_status[status.id]
                block.synced_at = self.now_provider()

        task.is_blocked = any(item.is_current and 'bloque' in normalize_text(item.status.name) for item in task.status_history)
        return written, block_written

    @staticmethod
    def _history_events(payload):
        raw_events = list(payload.get('status_history') or [])
        current = payload.get('current_status')
        if current:
            raw_events.append(current)

        events = []
        seen = set()
        for raw in raw_events:
            name = raw.get('status') or raw.get('name') or 'Status sem nome'
            total_time = raw.get('total_time') or {}
            entered_at = parse_clickup_datetime(total_time.get('since') or raw.get('since'))
            identity = (normalize_text(name), entered_at.isoformat() if entered_at else safe_json(raw))
            if identity in seen:
                continue
            seen.add(identity)
            events.append({'name': name, 'entered_at': entered_at, 'raw': raw})

        return sorted(events, key=lambda item: (item['entered_at'] is None, item['entered_at'] or datetime.max))

    @staticmethod
    def _extract_block_reason(raw_task):
        for field in raw_task.get('custom_fields', []):
            name = normalize_text(field.get('name'))
            value = field.get('value')
            if value not in (None, '') and 'motivo' in name and 'bloque' in name:
                return str(value)[:500]
        return None

    @staticmethod
    def _deduplicate_tasks(tasks):
        by_id = {}
        for task in tasks:
            task_id = str(task.get('id') or '').strip()
            if not task_id:
                continue
            current = by_id.get(task_id)
            if current is None or bool(task.get('archived')):
                by_id[task_id] = task
        return list(by_id.values())

    @staticmethod
    def serialize_run(run):
        return {
            'id': run.id,
            'run_type': run.run_type,
            'status': run.status,
            'started_at': run.started_at.isoformat() + 'Z' if run.started_at else None,
            'finished_at': run.finished_at.isoformat() + 'Z' if run.finished_at else None,
            'cursor': run.cursor,
            'stats': {
                'stores_read': run.stores_read,
                'stores_created': run.stores_created,
                'stores_updated': run.stores_updated,
                'tasks_read': run.tasks_read,
                'tasks_created': run.tasks_created,
                'tasks_updated': run.tasks_updated,
                'histories_written': run.histories_written,
                'blocks_written': run.blocks_written,
                'orphan_tasks': run.orphan_tasks,
                'ambiguous_matches': run.ambiguous_matches,
            },
            'error_summary': run.error_summary,
        }
