import { Columns3, DatabaseZap, List, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { IntegrationFilterState, IntegrationFilters, IntegrationSyncStatus } from '../types';
import { formatDate } from '../utils';

interface IntegrationToolbarProps {
    filters: IntegrationFilterState;
    options?: IntegrationFilters;
    viewMode: 'list' | 'kanban';
    filtersOpen: boolean;
    refreshing: boolean;
    syncing: boolean;
    syncStatus?: IntegrationSyncStatus;
    onFiltersChange: (filters: IntegrationFilterState) => void;
    onViewModeChange: (mode: 'list' | 'kanban') => void;
    onToggleFilters: () => void;
    onClearFilters: () => void;
    onRefresh: () => void;
    onSync: () => void;
}

const reconciliationOptions = [
    { value: '', label: 'Todos os vínculos' },
    { value: 'NOT_IN_INTEGRATION', label: 'Ainda não entrou' },
    { value: 'MATCHED', label: 'Reconciliadas' },
    { value: 'AMBIGUOUS', label: 'Vínculo ambíguo' },
    { value: 'DATA_ERROR', label: 'Inconsistência de dados' },
];

export default function IntegrationToolbar({
    filters,
    options,
    viewMode,
    filtersOpen,
    refreshing,
    syncing,
    syncStatus,
    onFiltersChange,
    onViewModeChange,
    onToggleFilters,
    onClearFilters,
    onRefresh,
    onSync,
}: IntegrationToolbarProps) {
    const setFilter = (key: keyof IntegrationFilterState, value: string) => {
        onFiltersChange({ ...filters, [key]: value });
    };
    const hasFilters = Object.values(filters).some(Boolean);

    return (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                    <h1 className="text-lg font-bold text-slate-900">Monitor de Lojas da Integração</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>Histórico completo desde a Implantação</span>
                        <span className="text-slate-300">•</span>
                        <span>Última sincronização: {formatDate(syncStatus?.lastSuccessfulSync || null, true)}</span>
                        {syncStatus?.structuralDivergence && (
                            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">Estrutura desatualizada</span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        title="Atualizar dados"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <button
                        type="button"
                        onClick={onSync}
                        disabled={syncing || syncStatus?.running}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50"
                    >
                        <DatabaseZap size={15} />
                        {syncing || syncStatus?.running ? 'Sincronizando' : 'Sincronizar ClickUp'}
                    </button>
                    <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 p-1" aria-label="Modo de visualização">
                        <button
                            type="button"
                            onClick={() => onViewModeChange('kanban')}
                            className={`flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-semibold ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                            title="Visualização Kanban"
                        >
                            <Columns3 size={14} /> Kanban
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewModeChange('list')}
                            className={`flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-semibold ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                            title="Visualização em lista"
                        >
                            <List size={14} /> Lista
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 p-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        value={filters.search}
                        onChange={(event) => setFilter('search', event.target.value)}
                        placeholder="Buscar loja ou identificador"
                        className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <select
                    value={filters.statusId}
                    onChange={(event) => setFilter('statusId', event.target.value)}
                    className="h-9 min-w-44 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-orange-400"
                    aria-label="Filtrar etapa"
                >
                    <option value="">Todas as etapas</option>
                    {options?.statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
                </select>
                <select
                    value={filters.assigneeId}
                    onChange={(event) => setFilter('assigneeId', event.target.value)}
                    className="h-9 min-w-44 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-orange-400"
                    aria-label="Filtrar integrador"
                >
                    <option value="">Todos os integradores</option>
                    {options?.assignees.map((assignee) => <option key={String(assignee.id)} value={String(assignee.id)}>{assignee.name}</option>)}
                </select>
                <button
                    type="button"
                    onClick={onToggleFilters}
                    className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium ${filtersOpen || hasFilters ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    <SlidersHorizontal size={15} /> Filtros
                </button>
            </div>

            {filtersOpen && (
                <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2 lg:grid-cols-5">
                    <label className="text-xs font-semibold text-slate-600">
                        Situação do vínculo
                        <select value={filters.reconciliationStatus} onChange={(event) => setFilter('reconciliationStatus', event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-normal">
                            {reconciliationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Bloqueio
                        <select value={filters.blocked} onChange={(event) => setFilter('blocked', event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-normal">
                            <option value="">Todas</option>
                            <option value="true">Bloqueadas agora</option>
                            <option value="false">Sem bloqueio atual</option>
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Início a partir de
                        <input type="date" value={filters.startDate} onChange={(event) => setFilter('startDate', event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-normal" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Início até
                        <input type="date" value={filters.endDate} onChange={(event) => setFilter('endDate', event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-normal" />
                    </label>
                    <button type="button" onClick={onClearFilters} disabled={!hasFilters} className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                        <X size={14} /> Limpar filtros
                    </button>
                </div>
            )}
        </section>
    );
}
