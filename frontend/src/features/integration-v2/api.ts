import { api } from '../../services/api';
import {
    IntegrationV2Assignee,
    IntegrationV2BlockPeriod,
    IntegrationV2FilterState,
    IntegrationV2Filters,
    IntegrationV2Metrics,
    IntegrationV2MonitorPage,
    IntegrationV2StageTime,
    IntegrationV2Status,
    IntegrationV2Store,
    IntegrationV2StoreDetail,
    IntegrationV2SyncStatus,
    IntegrationV2TimelineItem,
} from './types';

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const asString = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
    return null;
};

const asNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return null;
};

const asBoolean = (value: unknown): boolean => value === true || value === 1 || value === 'true';

const formatFieldValue = (value: unknown): string => {
    const primitive = asString(value);
    if (primitive) return primitive;
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (Array.isArray(value)) return value.map(formatFieldValue).filter(Boolean).join(', ') || '—';
    const record = asRecord(value);
    return asString(record.name ?? record.label ?? record.value) || '—';
};

const normalizeStatus = (value: unknown, index = 0): IntegrationV2Status => {
    const status = asRecord(value);
    return {
        id: asString(status.id ?? status.external_id) || `status-${index}`,
        name: asString(status.name) || 'Etapa sem nome',
        color: asString(status.color),
        order: asNumber(status.position ?? status.order) ?? index,
        active: status.active !== false,
        category: asString(status.type ?? status.category),
    };
};

const normalizeAssignee = (value: unknown): IntegrationV2Assignee => {
    const assignee = asRecord(value);
    return {
        id: asString(assignee.id ?? assignee.clickup_user_id) || undefined,
        name: asString(assignee.username ?? assignee.name ?? assignee.email) || 'Responsável não identificado',
        avatarUrl: asString(assignee.avatar ?? assignee.avatar_url),
    };
};

const normalizeStore = (value: unknown): IntegrationV2Store => {
    const store = asRecord(value);
    const task = asRecord(store.integration_task);
    const status = asRecord(task.current_status);
    const timing = asRecord(store.timing);

    return {
        id: asString(store.id) || 0,
        name: asString(store.store_name ?? store.name) || 'Loja sem nome',
        businessId: asString(store.business_id),
        implantationTaskId: asString(store.implantation_task_id),
        implantationState: asString(store.implantation_state) === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
        implantationFinishedAt: asString(store.implantation_finished_at),
        integrationTaskId: asString(task.clickup_task_id ?? task.id),
        clickupUrl: asString(task.url),
        reconciliationStatus: asString(store.reconciliation_status) || 'DATA_ERROR',
        statusId: asString(status.id),
        statusName: asString(status.name),
        statusColor: asString(status.color),
        assignees: asArray(task.assignees).map(normalizeAssignee),
        startDate: asString(task.started_at ?? task.created_at),
        endDate: asString(task.completed_at ?? task.closed_at),
        dueDate: asString(task.due_at),
        firstSeenAt: asString(store.first_seen_at),
        currentStageSeconds: asNumber(timing.current_stage_seconds),
        agingSeconds: asNumber(timing.gross_seconds),
        grossTimeSeconds: asNumber(timing.gross_seconds),
        blockedTimeSeconds: asNumber(timing.blocked_seconds),
        netTimeSeconds: asNumber(timing.net_seconds),
        isBlocked: asBoolean(task.is_blocked),
        blockReason: null,
        dataQuality: asString(task.data_quality ?? store.reconciliation_method),
        priority: null,
        tags: [],
    };
};

const normalizeStageTime = (value: unknown): IntegrationV2StageTime => {
    const stage = asRecord(value);
    return {
        statusId: asString(stage.status_id) || 'unknown',
        statusName: asString(stage.status_name) || 'Etapa sem nome',
        statusColor: asString(stage.color),
        totalSeconds: asNumber(stage.total_seconds),
        passages: asNumber(stage.visits) ?? 0,
        current: asBoolean(stage.current),
    };
};

const normalizeBlockPeriod = (value: unknown): IntegrationV2BlockPeriod => {
    const period = asRecord(value);
    return {
        id: asString(period.id) || crypto.randomUUID(),
        startedAt: asString(period.started_at),
        endedAt: asString(period.ended_at),
        durationSeconds: asNumber(period.duration_seconds),
        current: asBoolean(period.current),
        reason: asString(period.reason),
        source: asString(period.reason_source),
        inferenceQuality: asString(period.quality),
    };
};

const normalizeTimelineItem = (value: unknown): IntegrationV2TimelineItem => {
    const item = asRecord(value);
    const status = asRecord(item.status);
    return {
        id: asString(item.id) || crypto.randomUUID(),
        statusId: asString(status.id) || 'unknown',
        statusName: asString(status.name) || 'Etapa sem nome',
        statusColor: asString(status.color),
        enteredAt: asString(item.entered_at),
        exitedAt: asString(item.exited_at),
        durationSeconds: asNumber(item.duration_seconds),
        current: asBoolean(item.current),
        timestampQuality: asString(item.timestamp_quality),
    };
};

const buildParams = (filters: IntegrationV2FilterState) => {
    const params: Record<string, string> = {};
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.statusId) params.status_id = filters.statusId;
    if (filters.assigneeId) params.assignee_id = filters.assigneeId;
    if (filters.reconciliationStatus) params.reconciliation_status = filters.reconciliationStatus;
    if (filters.blocked) params.blocked = filters.blocked;
    if (filters.startDate) params.started_from = filters.startDate;
    if (filters.endDate) params.started_to = filters.endDate;
    return params;
};

export async function fetchIntegrationV2Monitor(
    filters: IntegrationV2FilterState,
    page: number,
    perPage: number,
): Promise<IntegrationV2MonitorPage> {
    const response = await api.get('/api/integration-v2/monitor', {
        params: {
            ...buildParams(filters),
            page,
            per_page: perPage,
            sort: 'store_name',
            direction: 'asc',
        },
    });
    const payload = asRecord(response.data);
    const pagination = asRecord(payload.pagination);
    const items = asArray(payload.items).map(normalizeStore);

    return {
        items,
        total: asNumber(pagination.total) ?? items.length,
        page: asNumber(pagination.page) ?? page,
        pageSize: asNumber(pagination.per_page) ?? perPage,
    };
}

export async function fetchAllIntegrationV2Stores(filters: IntegrationV2FilterState): Promise<IntegrationV2MonitorPage> {
    const firstPage = await fetchIntegrationV2Monitor(filters, 1, 200);
    const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
    if (pageCount <= 1) return firstPage;

    // O Kanban precisa do conjunto completo para não distribuir apenas a página atual entre as etapas.
    const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) => fetchIntegrationV2Monitor(filters, index + 2, firstPage.pageSize)),
    );
    return {
        ...firstPage,
        items: [firstPage, ...remainingPages].flatMap((result) => result.items),
    };
}

export async function fetchIntegrationV2Metrics(filters: IntegrationV2FilterState): Promise<IntegrationV2Metrics> {
    const response = await api.get('/api/integration-v2/monitor/metrics', { params: buildParams(filters) });
    const payload = asRecord(response.data);
    return {
        totalStores: asNumber(payload.total_stores) ?? 0,
        implantationCompleted: asNumber(payload.implantation_completed) ?? 0,
        implantationActive: asNumber(payload.implantation_active) ?? 0,
        notEntered: asNumber(payload.not_in_integration) ?? 0,
        coveragePercent: asNumber(payload.coverage_percent) ?? 0,
        workInProgress: asNumber(payload.wip_total) ?? 0,
        blockedNow: asNumber(payload.blocked_now) ?? 0,
        ambiguous: asNumber(payload.ambiguous_stores) ?? 0,
        orphanTasks: asNumber(payload.orphan_tasks) ?? 0,
        averageLeadTimeSeconds: asNumber(payload.average_net_seconds ?? payload.average_gross_seconds),
    };
}

export async function fetchIntegrationV2Filters(): Promise<IntegrationV2Filters> {
    const response = await api.get('/api/integration-v2/monitor/filters');
    const payload = asRecord(response.data);
    return {
        statuses: asArray(payload.statuses).map(normalizeStatus).sort((a, b) => a.order - b.order),
        assignees: asArray(payload.assignees).map(normalizeAssignee),
        dataQualities: [],
    };
}

export async function fetchIntegrationV2KanbanSchema(): Promise<IntegrationV2Status[]> {
    const response = await api.get('/api/integration-v2/kanban/schema');
    const payload = asRecord(response.data);
    return asArray(payload.columns)
        .map(normalizeStatus)
        .filter((status) => status.active)
        .sort((a, b) => a.order - b.order);
}

export async function fetchIntegrationV2StoreDetail(storeId: string | number): Promise<IntegrationV2StoreDetail> {
    const [detailResponse, timelineResponse] = await Promise.all([
        api.get(`/api/integration-v2/stores/${storeId}`),
        api.get(`/api/integration-v2/stores/${storeId}/timeline`),
    ]);
    const detail = asRecord(detailResponse.data);
    const timeline = asRecord(timelineResponse.data);
    const taskDetails = asRecord(detail.task_details);
    const customFieldsValue = taskDetails.custom_fields;
    const customFields = Array.isArray(customFieldsValue)
        ? customFieldsValue.map((field, index) => {
            const item = asRecord(field);
            return {
                label: asString(item.name ?? item.label) || `Campo ${index + 1}`,
                value: formatFieldValue(item.value),
            };
        })
        : Object.entries(asRecord(customFieldsValue)).map(([label, value]) => ({ label, value: formatFieldValue(value) }));

    return {
        ...normalizeStore(detail),
        priority: asString(taskDetails.priority),
        tags: asArray(taskDetails.tags).map(asString).filter((tag): tag is string => Boolean(tag)),
        stageTimes: asArray(timeline.stage_totals ?? detail.stage_totals).map(normalizeStageTime),
        timeline: asArray(timeline.items).map(normalizeTimelineItem),
        blockPeriods: asArray(timeline.block_periods ?? detail.block_periods).map(normalizeBlockPeriod),
        customFields,
    };
}

export async function fetchIntegrationV2SyncStatus(): Promise<IntegrationV2SyncStatus> {
    const response = await api.get('/api/integration-v2/sync/status');
    const payload = asRecord(response.data);
    const lastRun = asRecord(payload.last_run);
    return {
        lastSuccessfulSync: asString(payload.last_successful_sync_at),
        running: asBoolean(payload.in_progress),
        structuralDivergence: asBoolean(payload.is_stale),
        status: asString(lastRun.status),
        message: asString(lastRun.error_summary),
    };
}

export async function startIntegrationV2Sync(mode: 'FULL' | 'INCREMENTAL' = 'INCREMENTAL'): Promise<void> {
    await api.post('/api/integration-v2/sync', { mode });
}
