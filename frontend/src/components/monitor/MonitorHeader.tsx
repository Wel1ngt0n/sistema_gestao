import { FilterState } from './MonitorFilterPanel';
import { Download, RefreshCw, Search, Settings, SlidersHorizontal } from 'lucide-react';

interface MonitorHeaderProps {
    stats: { total: number; delayed: number; risk: number };
    isRefreshing: boolean;
    globalFilter: string;
    setGlobalFilter: (val: string) => void;
    filterStatus: 'active' | 'concluded' | 'scheduled';
    setFilterStatus: (val: 'active' | 'concluded' | 'scheduled') => void;
    advancedFilters: FilterState;
    setAdvancedFilters: (filters: FilterState) => void;
    uniqueAssignees: string[];
    uniqueStatuses: string[];
    viewMode: 'table' | 'kanban';
    setViewMode: (val: 'table' | 'kanban') => void;
    setAdminOpen: (val: boolean) => void;
    handleExportCSV: () => void;
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
    setAdminOpen,
    handleExportCSV
}: MonitorHeaderProps) {
    const hasActiveFilters = Object.values(advancedFilters).some(v => Array.isArray(v) ? v.length > 0 : !!v);
    const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setAdvancedFilters({ ...advancedFilters, [key]: value });
    };

    return (
        <header className="flex-none bg-white border border-zinc-200 rounded-lg shadow-sm z-30 transition-all duration-300">
            <div className="p-5 space-y-5">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">

                    {/* Left Side: Title & Bento Stats */}
                    <div className="flex items-center gap-6">
                        {/* Title Block */}
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

                        {/* Divider */}
                        <div className="hidden md:block w-px h-10 bg-zinc-200"></div>

                        <div className="hidden md:flex items-center gap-3">
                            <div className="flex flex-col px-3 py-1 rounded-lg hover:bg-zinc-50/50 transition-colors">
                                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total</span>
                                <span className="text-lg font-bold text-zinc-700 leading-none">{stats.total}</span>
                            </div>
                            <div className="flex flex-col px-3 py-1 rounded-lg hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100">
                                <span className="text-[10px] uppercase font-bold text-rose-500/80 tracking-wider">Atrasados</span>
                                <span className="text-lg font-bold text-rose-600 leading-none">{stats.delayed}</span>
                            </div>
                            <div className="flex flex-col px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-100">
                                <span className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider">Risco</span>
                                <span className="text-lg font-bold text-amber-600 leading-none">{stats.risk}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start xl:self-center">
                        <button
                            onClick={() => setAdminOpen(true)}
                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                            title="Configurações"
                        >
                            <Settings size={17} />
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

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                    <div className="relative lg:col-span-3">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Buscar loja, ID ou rede"
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/10"
                        />
                    </div>

                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-2">
                        <option value="active">Ativas</option>
                        <option value="scheduled">Agendadas</option>
                        <option value="concluded">Concluídas</option>
                    </select>

                    <select value={advancedFilters.assignee} onChange={(e) => updateFilter('assignee', e.target.value)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-2">
                        <option value="">Todos responsáveis</option>
                        {uniqueAssignees.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <select value={advancedFilters.status[0] || ''} onChange={(e) => updateFilter('status', e.target.value ? [e.target.value] : [])} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-2">
                        <option value="">Todos status</option>
                        {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select value={advancedFilters.financialStatus} onChange={(e) => updateFilter('financialStatus', e.target.value)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-1">
                        <option value="">Financeiro</option>
                        <option value="Pago">Pago</option>
                        <option value="Em dia">Em dia</option>
                        <option value="Devendo">Devendo</option>
                    </select>

                    <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-2">
                        <option value="kanban">Visualização: Kanban</option>
                        <option value="table">Visualização: Lista</option>
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => updateFilter('isHighRisk', !advancedFilters.isHighRisk)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${advancedFilters.isHighRisk ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}>
                        Alto risco
                    </button>
                    <button onClick={() => updateFilter('isLate', !advancedFilters.isLate)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${advancedFilters.isLate ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}>
                        Atrasadas
                    </button>
                    {hasActiveFilters && (
                        <button
                            onClick={() => setAdvancedFilters({ startDate: '', endDate: '', finishStartDate: '', finishEndDate: '', status: [], assignee: '', financialStatus: '', isHighRisk: false, isLate: false })}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
                        >
                            Limpar filtros
                        </button>
                    )}
                    {isRefreshing && <RefreshCw size={14} className="animate-spin text-orange-500" />}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
            </div>
        </header>
    );
}
