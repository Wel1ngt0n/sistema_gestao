export type ReconciliationStatus =
    | 'NOT_IN_INTEGRATION'
    | 'MATCHED'
    | 'AMBIGUOUS'
    | 'ORPHAN_INTEGRATION_TASK'
    | 'DATA_ERROR'
    | string;

export interface IntegrationV2Status {
    id: string;
    name: string;
    color: string | null;
    order: number;
    active: boolean;
    category?: string | null;
    isLocal?: boolean;
}

export interface IntegrationV2Assignee {
    id?: string | number;
    name: string;
    avatarUrl?: string | null;
}

export interface IntegrationV2Store {
    id: string | number;
    name: string;
    businessId: string | null;
    implantationTaskId: string | null;
    implantationState: 'ACTIVE' | 'COMPLETED';
    implantationFinishedAt: string | null;
    integrationTaskId: string | null;
    clickupUrl: string | null;
    reconciliationStatus: ReconciliationStatus;
    statusId: string | null;
    statusName: string | null;
    statusColor: string | null;
    assignees: IntegrationV2Assignee[];
    startDate: string | null;
    endDate: string | null;
    dueDate: string | null;
    firstSeenAt: string | null;
    currentStageSeconds: number | null;
    agingSeconds: number | null;
    grossTimeSeconds: number | null;
    blockedTimeSeconds: number | null;
    netTimeSeconds: number | null;
    isBlocked: boolean;
    blockReason: string | null;
    dataQuality: string | null;
    priority: string | null;
    tags: string[];
}

export interface IntegrationV2Metrics {
    totalStores: number;
    implantationCompleted: number;
    implantationActive: number;
    notEntered: number;
    coveragePercent: number;
    workInProgress: number;
    blockedNow: number;
    ambiguous: number;
    orphanTasks: number;
    averageLeadTimeSeconds: number | null;
}

export interface IntegrationV2Filters {
    statuses: IntegrationV2Status[];
    assignees: IntegrationV2Assignee[];
    dataQualities: string[];
}

export interface IntegrationV2MonitorPage {
    items: IntegrationV2Store[];
    total: number;
    page: number;
    pageSize: number;
}

export interface IntegrationV2StageTime {
    statusId: string;
    statusName: string;
    statusColor: string | null;
    totalSeconds: number | null;
    passages: number;
    current: boolean;
}

export interface IntegrationV2TimelineItem {
    id: string | number;
    statusId: string;
    statusName: string;
    statusColor: string | null;
    enteredAt: string | null;
    exitedAt: string | null;
    durationSeconds: number | null;
    current: boolean;
    timestampQuality: string | null;
}

export interface IntegrationV2BlockPeriod {
    id: string | number;
    startedAt: string | null;
    endedAt: string | null;
    durationSeconds: number | null;
    current: boolean;
    reason: string | null;
    source: string | null;
    inferenceQuality: string | null;
}

export interface IntegrationV2StoreDetail extends IntegrationV2Store {
    stageTimes: IntegrationV2StageTime[];
    timeline: IntegrationV2TimelineItem[];
    blockPeriods: IntegrationV2BlockPeriod[];
    customFields: Array<{ label: string; value: string }>;
}

export interface IntegrationV2SyncStatus {
    lastSuccessfulSync: string | null;
    running: boolean;
    structuralDivergence: boolean;
    status: string | null;
    message: string | null;
}

export interface IntegrationV2FilterState {
    search: string;
    statusId: string;
    assigneeId: string;
    reconciliationStatus: string;
    blocked: string;
    startDate: string;
    endDate: string;
}

export const EMPTY_FILTERS: IntegrationV2FilterState = {
    search: '',
    statusId: '',
    assigneeId: '',
    reconciliationStatus: '',
    blocked: '',
    startDate: '',
    endDate: '',
};

export const LOCAL_NOT_ENTERED_STATUS: IntegrationV2Status = {
    id: '__not_in_integration__',
    name: 'Ainda não entrou na Integração',
    color: '#94a3b8',
    order: -1,
    active: true,
    isLocal: true,
};
