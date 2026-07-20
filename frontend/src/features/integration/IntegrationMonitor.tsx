import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    fetchAllIntegrationStores,
    fetchIntegrationFilters,
    fetchIntegrationKanbanSchema,
    fetchIntegrationMonitor,
    fetchIntegrationSyncStatus,
    startIntegrationSync,
} from './api';
import IntegrationKanban from './components/IntegrationKanban';
import IntegrationStoreDetail from './components/IntegrationStoreDetail';
import IntegrationTable from './components/IntegrationTable';
import IntegrationToolbar from './components/IntegrationToolbar';
import { integrationQueryKeys } from './queryKeys';
import { EMPTY_FILTERS, IntegrationFilterState, IntegrationStore } from './types';

export default function IntegrationMonitor() {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>(() =>
        localStorage.getItem('integration-monitor-view') === 'list' ? 'list' : 'kanban',
    );
    const [filters, setFilters] = useState<IntegrationFilterState>(EMPTY_FILTERS);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [selectedStore, setSelectedStore] = useState<IntegrationStore | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(filters.search), 300);
        return () => window.clearTimeout(timer);
    }, [filters.search]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filters.statusId, filters.assigneeId, filters.reconciliationStatus, filters.blocked, filters.startDate, filters.endDate]);

    const appliedFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);

    const monitorQuery = useQuery({
        queryKey: integrationQueryKeys.monitor(viewMode, appliedFilters, page),
        queryFn: () => viewMode === 'kanban'
            ? fetchAllIntegrationStores(appliedFilters)
            : fetchIntegrationMonitor(appliedFilters, page, 50),
    });
    const optionsQuery = useQuery({
        queryKey: integrationQueryKeys.filters(),
        queryFn: fetchIntegrationFilters,
    });
    const schemaQuery = useQuery({
        queryKey: integrationQueryKeys.kanbanSchema(),
        queryFn: fetchIntegrationKanbanSchema,
    });
    const syncStatusQuery = useQuery({
        queryKey: integrationQueryKeys.syncStatus(),
        queryFn: fetchIntegrationSyncStatus,
        refetchInterval: (query) => query.state.data?.running ? 5000 : false,
    });

    const syncMutation = useMutation({
        mutationFn: () => startIntegrationSync('INCREMENTAL'),
        onSuccess: async () => {
            setNotice('Sincronização solicitada. Os dados serão atualizados assim que o processamento terminar.');
            await queryClient.invalidateQueries({ queryKey: integrationQueryKeys.all });
        },
        onError: () => setNotice('Não foi possível iniciar a sincronização. Verifique sua permissão e tente novamente.'),
    });

    const handleViewModeChange = (mode: 'list' | 'kanban') => {
        setViewMode(mode);
        localStorage.setItem('integration-monitor-view', mode);
    };

    const handleRefresh = async () => {
        setNotice(null);
        await queryClient.invalidateQueries({ queryKey: integrationQueryKeys.all });
    };

    const stores = monitorQuery.data?.items || [];
    const schema = schemaQuery.data || optionsQuery.data?.statuses || [];

    return (
        <div className="relative flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden bg-[#EEF0F8] p-4 text-slate-900 md:p-5">
            <IntegrationToolbar
                filters={filters}
                options={optionsQuery.data}
                viewMode={viewMode}
                filtersOpen={filtersOpen}
                refreshing={monitorQuery.isFetching}
                syncing={syncMutation.isPending}
                syncStatus={syncStatusQuery.data}
                onFiltersChange={setFilters}
                onViewModeChange={handleViewModeChange}
                onToggleFilters={() => setFiltersOpen((open) => !open)}
                onClearFilters={() => setFilters(EMPTY_FILTERS)}
                onRefresh={handleRefresh}
                onSync={() => syncMutation.mutate()}
            />

            {notice && (
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice(null)} className="font-bold" aria-label="Fechar aviso">×</button>
                </div>
            )}

            {monitorQuery.isError ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white text-center shadow-sm">
                    <AlertCircle size={32} className="text-rose-500" />
                    <h2 className="mt-3 text-sm font-bold text-slate-800">Não foi possível carregar o monitor</h2>
                    <p className="mt-1 max-w-md text-xs text-slate-500">A API de Integração não respondeu. Tente novamente em alguns instantes.</p>
                    <button type="button" onClick={() => monitorQuery.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <RefreshCw size={14} /> Tentar novamente
                    </button>
                </div>
            ) : (
                <div className="min-h-0 flex-1 overflow-hidden">
                    {viewMode === 'kanban' ? (
                        <div className="h-full min-w-0 overflow-x-auto overflow-y-hidden">
                            <IntegrationKanban stores={stores} schema={schema} loading={monitorQuery.isLoading || schemaQuery.isLoading} onOpenStore={setSelectedStore} />
                        </div>
                    ) : (
                        <IntegrationTable
                            stores={stores}
                            loading={monitorQuery.isLoading}
                            page={monitorQuery.data?.page || page}
                            pageSize={monitorQuery.data?.pageSize || 50}
                            total={monitorQuery.data?.total || 0}
                            onPageChange={setPage}
                            onOpenStore={setSelectedStore}
                        />
                    )}
                </div>
            )}

            <IntegrationStoreDetail store={selectedStore} onClose={() => setSelectedStore(null)} />
        </div>
    );
}
