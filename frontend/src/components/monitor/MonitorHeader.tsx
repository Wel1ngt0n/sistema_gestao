import { FilterState } from './MonitorFilterPanel';
import { useMemo, useState } from 'react';
import { ChevronDown, Download, Eye, Filter, RefreshCw, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import { KanbanFieldKey, KANBAN_FIELD_OPTIONS } from './MonitorKanbanView';

interface MonitorHeaderProps {
    stats: { total: number; delayed: number; risk: number };
    isRefreshing: boolean;
    globalFilter: string;
    setGlobalFilter: (val: string) => void;
    filterStatus: 'active' | 'concluded' | 'scheduled' | 'archived';
    setFilterStatus: (val: 'active' | 'concluded' | 'scheduled' | 'archived') => void;
    advancedFilters: FilterState;
    setAdvancedFilters: (filters: FilterState) => void;
    uniqueAssignees: string[];
    uniqueStatuses: string[];
    viewMode: 'table' | 'kanban';
    setViewMode: (val: 'table' | 'kanban') => void;
    kanbanFields: KanbanFieldKey[];
    setKanbanFields: (fields: KanbanFieldKey[]) => void;
    handleExportCSV: () => void;
    handleOpenImportModal: () => void;
}

export default function MonitorHeader({
    stats,
    isRefreshing,
    globalFilter,
    setGlobalFilter,
    filterStatus,
    setFilterStatus,
    advancedFilters,
    setAdvancedFilters,
    uniqueAssignees,
    uniqueStatuses,
    viewMode,
    setViewMode,
    kanbanFields,
    setKanbanFields,
    handleExportCSV,
    handleOpenImportModal
}: MonitorHeaderProps) {
    const hasActiveFilters = Object.values(advancedFilters).some(v => Array.isArray(v) ? v.length > 0 : !!v);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [fieldsOpen, setFieldsOpen] = useState(false);
    const activeFilterCount = useMemo(() => {
        return Object.values(advancedFilters).reduce((count, value) => {
            if (Array.isArray(value)) return count + value.length;
            return value ? count + 1 : count;
        }, 0);
    }, [advancedFilters]);

    const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setAdvancedFilters({ ...advancedFilters, [key]: value });
    };

    const clearFilters = () => {
        setAdvancedFilters({ startDate: '', endDate: '', finishStartDate: '', finishEndDate: '', status: [], assignee: '', financialStatus: '', isHighRisk: false, isLate: false });
    };

    const toggleKanbanField = (field: KanbanFieldKey) => {
        if (kanbanFields.includes(field)) {
            setKanbanFields(kanbanFields.filter(item => item !== field));
            return;
        }
        setKanbanFields([...kanbanFields, field]);
    };

    return (
        <header className="relative z-30 flex-none border border-zinc-200 bg-white rounded-lg shadow-sm transition-all duration-300">
            <div className="p-5 space-y-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">

                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
                        <div className="flex items-center gap-3 min-w-fit">
                            <div className="p-2.5 bg-orange-50 rounded-lg border border-orange-100 text-[#ff7900]">
                                <SlidersHorizontal className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
                                    Monitor de Implantação
                                </h1>
                                <p className="text-xs font-medium text-zinc-500 flex items-center gap-2">
                                    Visão Operacional
                                    {isRefreshing && (
                                        <span className="flex items-center gap-1 text-orange-500 animate-pulse ml-2 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                            Atualizando...
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="hidden md:block w-px h-10 bg-zinc-200"></div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
                                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wide">Total</span>
                                <span className="text-sm font-semibold text-zinc-800 tabular-nums">{stats.total}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5">
                                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wide">Atrasados</span>
                                <span className="text-sm font-semibold text-rose-600 tabular-nums">{stats.delayed}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5">
                                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wide">Risco</span>
                                <span className="text-sm font-semibold text-amber-600 tabular-nums">{stats.risk}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start xl:self-center">
                        <button
                            onClick={handleOpenImportModal}
                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                            title="Importar planilha"
                        >
                            <Upload size={17} />
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                            title="Exportar CSV"
                        >
                            <Download size={17} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Buscar loja, ID ou rede"
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/10"
                        />
                    </div>

                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:w-40">
                        <option value="active">Ativas</option>
                        <option value="scheduled">Agendadas</option>
                        <option value="concluded">Concluídas</option>
                    </select>

                    <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:w-52">
                        <option value="kanban">Visualização: Kanban</option>
                        <option value="table">Visualização: Lista</option>
                    </select>

                    {viewMode === 'kanban' && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setFieldsOpen(prev => !prev)}
                                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors lg:w-auto ${fieldsOpen ? 'border-zinc-300 bg-zinc-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}
                            >
                                <Eye size={16} />
                                Campos
                                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-zinc-600">
                                    {kanbanFields.length}
                                </span>
                                <ChevronDown size={15} className={`transition-transform ${fieldsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {fieldsOpen && (
                                <div className="absolute right-0 top-12 z-40 w-[min(92vw,300px)] rounded-lg border border-zinc-200 bg-white p-3 shadow-xl">
                                    <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2">
                                        <div>
                                            <h2 className="text-sm font-semibold text-zinc-900">Campos do card</h2>
                                            <p className="mt-0.5 text-xs text-zinc-500">Escolha o que aparece no Kanban.</p>
                                        </div>
                                        <button type="button" onClick={() => setFieldsOpen(false)} className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700" title="Fechar campos">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                        {KANBAN_FIELD_OPTIONS.map(option => (
                                            <label key={option.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50">
                                                <span>{option.label}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={kanbanFields.includes(option.key)}
                                                    onChange={() => toggleKanbanField(option.key)}
                                                    className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setFiltersOpen(prev => !prev)}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors lg:w-auto ${filtersOpen || hasActiveFilters ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}
                        >
                            <Filter size={16} />
                            Filtros
                            {activeFilterCount > 0 && (
                                <span className="rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown size={15} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {filtersOpen && (
                            <div className="absolute right-0 top-12 z-40 w-[min(92vw,560px)] rounded-lg border border-zinc-200 bg-white p-4 shadow-xl">
                                <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
                                    <div>
                                        <h2 className="text-sm font-semibold text-zinc-900">Filtros</h2>
                                        <p className="mt-0.5 text-xs text-zinc-500">Refine a lista sem ocupar espaço no monitor.</p>
                                    </div>
                                    <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700" title="Fechar filtros">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Responsável
                                        <select value={advancedFilters.assignee} onChange={(e) => updateFilter('assignee', e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10">
                                            <option value="">Todos responsáveis</option>
                                            {uniqueAssignees.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </label>

                                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Status
                                        <select value={advancedFilters.status[0] || ''} onChange={(e) => updateFilter('status', e.target.value ? [e.target.value] : [])} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10">
                                            <option value="">Todos status</option>
                                            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </label>

                                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Financeiro
                                        <select value={advancedFilters.financialStatus} onChange={(e) => updateFilter('financialStatus', e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10">
                                            <option value="">Todos</option>
                                            <option value="Pago">Pago</option>
                                            <option value="Em dia">Em dia</option>
                                            <option value="Devendo">Devendo</option>
                                            <option value="Não paga mensalidade">Não paga mensalidade</option>
                                        </select>
                                    </label>

                                    <div className="flex items-end gap-2">
                                        <button onClick={() => updateFilter('isHighRisk', !advancedFilters.isHighRisk)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${advancedFilters.isHighRisk ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}>
                                            Alto risco
                                        </button>
                                        <button onClick={() => updateFilter('isLate', !advancedFilters.isLate)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${advancedFilters.isLate ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}>
                                            Atrasadas
                                        </button>
                                    </div>

                                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Início de
                                        <input type="date" value={advancedFilters.startDate} onChange={(e) => updateFilter('startDate', e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10" />
                                    </label>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Início até
                                        <input type="date" value={advancedFilters.endDate} onChange={(e) => updateFilter('endDate', e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10" />
                                    </label>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Conclusão de
                                        <input type="date" value={advancedFilters.finishStartDate} onChange={(e) => updateFilter('finishStartDate', e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10" />
                                    </label>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        Conclusão até
                                        <input type="date" value={advancedFilters.finishEndDate} onChange={(e) => updateFilter('finishEndDate', e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10" />
                                    </label>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        disabled={!hasActiveFilters}
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-40"
                                    >
                                        Limpar filtros
                                    </button>
                                    <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500">
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {isRefreshing && <RefreshCw size={16} className="animate-spin text-orange-500" />}
                </div>
            </div>
        </header>
    );
}
