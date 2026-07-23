import { api } from '../../services/api';
import {
    IntegrationAssignee,
    IntegrationAuditLog,
    IntegrationBlockReviewUpdate,
    IntegrationBlockPeriod,
    IntegrationFilterState,
    IntegrationFilters,
    IntegrationMetrics,
    IntegrationMonitorPage,
    IntegrationOperationalUpdate,
    IntegrationStageTime,
    IntegrationStatus,
    IntegrationStore,
    IntegrationStoreDetail,
    IntegrationSyncStatus,
    IntegrationTimelineItem,
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

const asNullableBoolean = (value: unknown): boolean | null => {
    if (value === true || value === 1 || value === 'true') return true;
    if (value === false || value === 0 || value === 'false') return false;
    return null;
};

const formatFieldValue = (value: unknown): string => {
    const primitive = asString(value);
    if (primitive) return primitive;
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (Array.isArray(value)) return value.map(formatFieldValue).filter(Boolean).join(', ') || '—';
    const record = asRecord(value);
    return asString(record.name ?? record.label ?? record.value) || '—';
};

const formatAuditValue = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

const normalizeStatus = (value: unknown, index = 0): IntegrationStatus => {
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

const normalizeAssignee = (value: unknown): IntegrationAssignee => {
    const assignee = asRecord(value);
    return {
        id: asString(assignee.id ?? assignee.clickup_user_id) || undefined,
        name: asString(assignee.username ?? assignee.name ?? assignee.email) || 'Responsável não identificado',
        avatarUrl: asString(assignee.avatar ?? assignee.avatar_url),
    };
};

const normalizeStore = (value: unknown): IntegrationStore => {
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
        integrationCompleted: asBoolean(task.completed),
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

const normalizeStageTime = (value: unknown): IntegrationStageTime => {
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

const normalizeBlockPeriod = (value: unknown): IntegrationBlockPeriod => {
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
        discountApproved: asNullableBoolean(period.discount_approved),
        reviewReason: asString(period.review_reason),
        reviewedAt: asString(period.reviewed_at),
        reviewedBy: asString(period.reviewed_by),
    };
};

const normalizeAuditLog = (value: unknown): IntegrationAuditLog => {
    const log = asRecord(value);
    return {
        id: asString(log.id) || crypto.randomUUID(),
        source: asString(log.source) || 'INTEGRATION',
        action: asString(log.action) || 'FIELD_CHANGE',
        fieldName: asString(log.field_name),
        oldValue: formatAuditValue(log.old_value),
        newValue: formatAuditValue(log.new_value),
        reason: asString(log.reason),
        changedBy: asString(log.changed_by),
        changedAt: asString(log.changed_at),
    };
};

const normalizeTimelineItem = (value: unknown): IntegrationTimelineItem => {
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

const buildParams = (filters: IntegrationFilterState) => {
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

export async function fetchIntegrationMonitor(
    filters: IntegrationFilterState,
    page: number,
    perPage: number,
): Promise<IntegrationMonitorPage> {
    const response = await api.get('/api/integration/monitor', {
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

export async function fetchAllIntegrationStores(filters: IntegrationFilterState): Promise<IntegrationMonitorPage> {
    const firstPage = await fetchIntegrationMonitor(filters, 1, 200);
    const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
    if (pageCount <= 1) return firstPage;

    // O Kanban precisa do conjunto completo para não distribuir apenas a página atual entre as etapas.
    const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) => fetchIntegrationMonitor(filters, index + 2, firstPage.pageSize)),
    );
    return {
        ...firstPage,
        items: [firstPage, ...remainingPages].flatMap((result) => result.items),
    };
}

export async function fetchIntegrationMetrics(filters: IntegrationFilterState): Promise<IntegrationMetrics> {
    const response = await api.get('/api/integration/monitor/metrics', { params: buildParams(filters) });
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
        dataErrors: asNumber(payload.data_error_stores) ?? 0,
        orphanTasks: asNumber(payload.orphan_tasks) ?? 0,
        completedTotal: asNumber(payload.completed_total) ?? 0,
        totalBlockPeriods: asNumber(payload.total_block_periods) ?? 0,
        averageGrossTimeSeconds: asNumber(payload.average_gross_seconds),
        medianGrossTimeSeconds: asNumber(payload.median_gross_seconds),
        averageLeadTimeSeconds: asNumber(payload.average_net_seconds),
        collectiveMetas: payload.collective_metas ? {
            pointsDelivered: asNumber(asRecord(payload.collective_metas).points_delivered) ?? 0,
            qualitySuccessCount: asNumber(asRecord(payload.collective_metas).quality_success_count) ?? 0,
            qualityTotalEvaluated: asNumber(asRecord(payload.collective_metas).quality_total_evaluated) ?? 0,
            slaSuccessCount: asNumber(asRecord(payload.collective_metas).sla_success_count) ?? 0,
            targets: {
                points: asNumber(asRecord(asRecord(payload.collective_metas).targets).points) ?? 90,
                qualityPercent: asNumber(asRecord(asRecord(payload.collective_metas).targets).quality_percent) ?? 90,
                slaDays: asNumber(asRecord(asRecord(payload.collective_metas).targets).sla_days) ?? 60,
                slaPercent: asNumber(asRecord(asRecord(payload.collective_metas).targets).sla_percent) ?? 80,
                docsPercent: asNumber(asRecord(asRecord(payload.collective_metas).targets).docs_percent) ?? 20,
            },
        } : undefined,
        byStatus: asArray(payload.by_status).map((value) => {
            const status = asRecord(value);
            return {
                statusId: asString(status.status_id) || 'unknown',
                statusName: asString(status.status_name) || 'Etapa sem nome',
                color: asString(status.color),
                count: asNumber(status.count) ?? 0,
                averageSeconds: asNumber(status.average_seconds),
                medianSeconds: asNumber(status.median_seconds),
                p75Seconds: asNumber(status.p75_seconds),
                p90Seconds: asNumber(status.p90_seconds),
            };
        }),
        byAssignee: asArray(payload.by_assignee).map((value) => {
            const assignee = asRecord(value);
            return {
                assigneeId: asString(assignee.assignee_id) || 'unknown',
                username: asString(assignee.username) || 'Integrador não identificado',
                count: asNumber(assignee.count) ?? 0,
                completedCount: asNumber(assignee.completed_count) ?? 0,
                averageNetSeconds: asNumber(assignee.average_net_seconds),
                pointsDelivered: asNumber(assignee.points_delivered) ?? 0,
                slaSuccessCount: asNumber(assignee.sla_success_count) ?? 0,
                qualitySuccessCount: asNumber(assignee.quality_success_count) ?? 0,
                docsSuccessCount: asNumber(assignee.docs_success_count) ?? 0,
            };
        }),
    };
}

export async function fetchIntegrationFilters(): Promise<IntegrationFilters> {
    const response = await api.get('/api/integration/monitor/filters');
    const payload = asRecord(response.data);
    return {
        statuses: asArray(payload.statuses).map(normalizeStatus).sort((a, b) => a.order - b.order),
        assignees: asArray(payload.assignees).map(normalizeAssignee),
        dataQualities: [],
    };
}

export async function fetchIntegrationKanbanSchema(): Promise<IntegrationStatus[]> {
    const response = await api.get('/api/integration/kanban/schema');
    const payload = asRecord(response.data);
    return asArray(payload.columns)
        .map(normalizeStatus)
        .filter((status) => status.active)
        .sort((a, b) => a.order - b.order);
}

export async function fetchIntegrationStoreDetail(storeId: string | number): Promise<IntegrationStoreDetail> {
    const [detailResponse, timelineResponse] = await Promise.all([
        api.get(`/api/integration/stores/${storeId}`),
        api.get(`/api/integration/stores/${storeId}/timeline`),
    ]);
    const detail = asRecord(detailResponse.data);
    const timeline = asRecord(timelineResponse.data);
    const taskDetails = asRecord(detail.task_details);
    const operational = asRecord(detail.operational_profile);
    const implantation = detail.implantation_reference ? asRecord(detail.implantation_reference) : null;
    const integrationDates = asRecord(detail.integration_dates);
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
        operationalProfile: {
            manualIntegrator: operational.manual_integrator ? normalizeAssignee(operational.manual_integrator) : null,
            qualityReviewer: asString(operational.quality_reviewer),
            hadPostIntegrationIssues: asNullableBoolean(operational.had_post_integration_issues),
            followedIntegrationProcess: asNullableBoolean(operational.followed_integration_process),
            qualityNotes: asString(operational.quality_notes),
            updatedAt: asString(operational.updated_at),
            updatedBy: asString(operational.updated_by),
        },
        implantationReference: implantation ? {
            storeId: asString(implantation.store_id) || 0,
            startedAt: asString(implantation.started_at),
            finishedAt: asString(implantation.finished_at),
            implantador: asString(implantation.implantador),
            erp: asString(implantation.erp),
            cnpj: asString(implantation.cnpj),
            crm: asString(implantation.crm),
            network: asString(implantation.network),
            storeType: asString(implantation.store_type),
            parentStore: asString(implantation.parent_store),
            branches: asArray(implantation.branches).map(asString).filter((item): item is string => Boolean(item)),
            monthlyFee: asNumber(implantation.monthly_fee),
            implantationFee: asNumber(implantation.implantation_fee),
            financialStatus: asString(implantation.financial_status),
            address: asString(implantation.address),
            state: asString(implantation.state),
            hadEcommerce: asNullableBoolean(implantation.had_ecommerce),
            previousPlatform: asString(implantation.previous_platform),
            deploymentType: asString(implantation.deployment_type),
            projectedOrders: asNumber(implantation.projected_orders),
        } : null,
        integrationStartedAt: asString(integrationDates.started_at),
        integrationFinishedAt: asString(integrationDates.finished_at),
        integrationStartSource: asString(integrationDates.start_source),
        auditLogs: asArray(detail.audit_logs).map(normalizeAuditLog),
    };
}

export async function updateIntegrationStoreOperational(
    storeId: string | number,
    values: IntegrationOperationalUpdate,
): Promise<void> {
    await api.patch(`/api/integration/stores/${storeId}/operational`, {
        manual_integrator_id: values.manualIntegratorId,
        quality_reviewer: values.qualityReviewer,
        had_post_integration_issues: values.hadPostIntegrationIssues,
        followed_integration_process: values.followedIntegrationProcess,
        quality_notes: values.qualityNotes,
    });
}

export async function reviewIntegrationBlock(
    storeId: string | number,
    blockId: string | number,
    values: IntegrationBlockReviewUpdate,
): Promise<void> {
    await api.patch(`/api/integration/stores/${storeId}/blocks/${blockId}`, {
        discount_approved: values.discountApproved,
        review_reason: values.reviewReason,
    });
}

export async function fetchIntegrationSyncStatus(): Promise<IntegrationSyncStatus> {
    const response = await api.get('/api/integration/sync/status');
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

export async function startIntegrationSync(mode: 'FULL' | 'INCREMENTAL' = 'INCREMENTAL'): Promise<void> {
    await api.post('/api/integration/sync', { mode });
}
