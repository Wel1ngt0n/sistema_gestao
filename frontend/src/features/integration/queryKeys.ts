import type { IntegrationFilterState } from './types';

type IntegrationViewMode = 'list' | 'kanban';

export const integrationQueryKeys = {
    all: ['integration'] as const,
    monitorRoot: () => ['integration', 'monitor'] as const,
    monitor: (viewMode: IntegrationViewMode, filters: IntegrationFilterState, page: number) =>
        ['integration', 'monitor', viewMode, filters, page] as const,
    filters: () => ['integration', 'filters'] as const,
    kanbanSchema: () => ['integration', 'kanban-schema'] as const,
    syncStatus: () => ['integration', 'sync-status'] as const,
    metricsRoot: () => ['integration', 'metrics'] as const,
    metrics: (filters: IntegrationFilterState) => ['integration', 'metrics', filters] as const,
    store: (storeId: string | number | undefined) => ['integration', 'store', storeId] as const,
    assigneeStores: (
        assigneeId: string | number | null | undefined,
        filters: IntegrationFilterState,
    ) => ['integration', 'assignee-stores', assigneeId, filters] as const,
};
