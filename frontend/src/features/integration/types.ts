export type ReconciliationStatus =
    | 'NOT_IN_INTEGRATION'
    | 'MATCHED'
    | 'AMBIGUOUS'
    | 'ORPHAN_INTEGRATION_TASK'
    | 'DATA_ERROR'
    | string;

export interface IntegrationStatus {
    id: string;
    name: string;
    color: string | null;
    order: number;
    active: boolean;
    category?: string | null;
    isLocal?: boolean;
}

export interface IntegrationAssignee {
    id?: string | number;
    name: string;
    avatarUrl?: string | null;
}

export interface IntegrationStore {
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
    assignees: IntegrationAssignee[];
    startDate: string | null;
    endDate: string | null;
    integrationCompleted: boolean;
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

export interface IntegrationMetrics {
    totalStores: number;
    implantationCompleted: number;
    implantationActive: number;
    notEntered: number;
    coveragePercent: number;
    workInProgress: number;
    blockedNow: number;
    ambiguous: number;
    dataErrors: number;
    orphanTasks: number;
    completedTotal: number;
    totalBlockPeriods: number;
    averageGrossTimeSeconds: number | null;
    medianGrossTimeSeconds: number | null;
    averageLeadTimeSeconds: number | null;
    collectiveMetas?: {
        pointsDelivered: number;
        qualitySuccessCount: number;
        qualityTotalEvaluated: number;
        slaSuccessCount: number;
        targets: {
            points: number;
            qualityPercent: number;
            slaDays: number;
            slaPercent: number;
            docsPercent: number;
        };
    };
    byStatus: IntegrationStatusMetric[];
    byAssignee: IntegrationAssigneeMetric[];
}

export interface IntegrationStatusMetric {
    statusId: string;
    statusName: string;
    color: string | null;
    count: number;
    averageSeconds: number | null;
    medianSeconds: number | null;
    p75Seconds: number | null;
    p90Seconds: number | null;
}

export interface IntegrationAssigneeMetric {
    assigneeId: string;
    username: string;
    count: number;
    completedCount: number;
    averageNetSeconds: number | null;
    pointsDelivered: number;
    slaSuccessCount: number;
    qualitySuccessCount: number;
    docsSuccessCount: number;
}

export interface IntegrationFilters {
    statuses: IntegrationStatus[];
    assignees: IntegrationAssignee[];
    dataQualities: string[];
}

export interface IntegrationMonitorPage {
    items: IntegrationStore[];
    total: number;
    page: number;
    pageSize: number;
}

export interface IntegrationStageTime {
    statusId: string;
    statusName: string;
    statusColor: string | null;
    totalSeconds: number | null;
    passages: number;
    current: boolean;
}

export interface IntegrationTimelineItem {
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

export interface IntegrationBlockPeriod {
    id: string | number;
    startedAt: string | null;
    endedAt: string | null;
    durationSeconds: number | null;
    current: boolean;
    reason: string | null;
    source: string | null;
    inferenceQuality: string | null;
    discountApproved: boolean | null;
    reviewReason: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
}

export interface IntegrationOperationalProfile {
    manualIntegrator: IntegrationAssignee | null;
    qualityReviewer: string | null;
    hadPostIntegrationIssues: boolean | null;
    followedIntegrationProcess: boolean | null;
    qualityNotes: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
}

export interface IntegrationImplantationReference {
    storeId: string | number;
    startedAt: string | null;
    finishedAt: string | null;
    implantador: string | null;
    erp: string | null;
    cnpj: string | null;
    crm: string | null;
    network: string | null;
    storeType: string | null;
    parentStore: string | null;
    branches: string[];
    monthlyFee: number | null;
    implantationFee: number | null;
    financialStatus: string | null;
    address: string | null;
    state: string | null;
    hadEcommerce: boolean | null;
    previousPlatform: string | null;
    deploymentType: string | null;
    projectedOrders: number | null;
}

export interface IntegrationAuditLog {
    id: string;
    source: string;
    action: string;
    fieldName: string | null;
    oldValue: string | null;
    newValue: string | null;
    reason: string | null;
    changedBy: string | null;
    changedAt: string | null;
}

export interface IntegrationOperationalUpdate {
    manualIntegratorId: string | number | null;
    qualityReviewer: string | null;
    hadPostIntegrationIssues: boolean | null;
    followedIntegrationProcess: boolean | null;
    qualityNotes: string | null;
}

export interface IntegrationBlockReviewUpdate {
    discountApproved: boolean;
    reviewReason: string;
}

export interface IntegrationStoreDetail extends IntegrationStore {
    stageTimes: IntegrationStageTime[];
    timeline: IntegrationTimelineItem[];
    blockPeriods: IntegrationBlockPeriod[];
    customFields: Array<{ label: string; value: string }>;
    operationalProfile: IntegrationOperationalProfile;
    implantationReference: IntegrationImplantationReference | null;
    integrationStartedAt: string | null;
    integrationFinishedAt: string | null;
    integrationStartSource: string | null;
    auditLogs: IntegrationAuditLog[];
}

export interface IntegrationSyncStatus {
    lastSuccessfulSync: string | null;
    running: boolean;
    structuralDivergence: boolean;
    status: string | null;
    message: string | null;
}

export interface IntegrationFilterState {
    search: string;
    statusId: string;
    assigneeId: string;
    reconciliationStatus: string;
    blocked: string;
    startDate: string;
    endDate: string;
}

export const EMPTY_FILTERS: IntegrationFilterState = {
    search: '',
    statusId: '',
    assigneeId: '',
    reconciliationStatus: '',
    blocked: '',
    startDate: '',
    endDate: '',
};

export const LOCAL_NOT_ENTERED_STATUS: IntegrationStatus = {
    id: '__not_in_integration__',
    name: 'Ainda não entrou na Integração',
    color: '#94a3b8',
    order: -1,
    active: true,
    isLocal: true,
};
