import { FilterState } from './MonitorFilterPanel';

interface MonitorHeaderProps {
    stats: { total: number; delayed: number; risk: number };
    isRefreshing: boolean;
    globalFilter: string;
    setGlobalFilter: (val: string) => void;
    filterStatus: 'active' | 'concluded';
    setFilterStatus: (val: 'active' | 'concluded') => void;
    isFilterPanelOpen: boolean;
    setIsFilterPanelOpen: (val: boolean) => void;
    advancedFilters: FilterState;
    viewMode: 'table' | 'kanban' | 'cards';
    setViewMode: (val: 'table' | 'kanban' | 'cards') => void;
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
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    advancedFilters,
    viewMode,
    setViewMode,
    setAdminOpen,
    handleExportCSV
}: MonitorHeaderProps) {
    const hasActiveFilters = Object.values(advancedFilters).some(v => Array.isArray(v) ? v.length > 0 : !!v);

    return (
        <header className="flex-none bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 z-30 sticky top-0 transition-all duration-300">
            <div className="px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                    {/* Left Side: Title & Bento Stats */}
                    <div className="flex items-center gap-6">
                        {/* Title Block */}
                        <div className="flex items-center gap-3 min-w-fit">
                            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-500/20">
                                <span className="text-white text-xl">📊</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                    Monitor de Implantação
                                </h1>
                                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                    Visão Operacional
                                    {isRefreshing && (
                                        <span className="flex items-center gap-1 text-orange-500 animate-pulse ml-2 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                            Syncing...
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block w-px h-10 bg-zinc-200 dark:bg-zinc-800"></div>

                        {/* Bento Stats (Clean) */}
                        <div className="hidden md:flex items-center gap-3">
                            <div className="flex flex-col px-3 py-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total</span>
                                <span className="text-lg font-bold text-zinc-700 dark:text-zinc-200 leading-none">{stats.total}</span>
                            </div>
                            <div className="flex flex-col px-3 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/20">
                                <span className="text-[10px] uppercase font-bold text-rose-500/80 tracking-wider">Atrasados</span>
                                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 leading-none">{stats.delayed}</span>
                            </div>
                            <div className="flex flex-col px-3 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors border border-transparent hover:border-amber-100 dark:hover:border-amber-900/20">
                                <span className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider">Risco</span>
                                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-none">{stats.risk}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Controls */}
                    <div className="flex items-center gap-3 self-start md:self-center w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">

                        {/* Search Bar */}
                        <div className="relative group w-48 transition-all focus-within:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm"
                            />
                        </div>

                        {/* Status Toggle (Pill Switch) */}
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl gap-1 border border-zinc-200 dark:border-zinc-700/50">
                            <button
                                onClick={() => setFilterStatus('active')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${filterStatus === 'active'
                                    ? 'bg-white dark:bg-zinc-700 text-orange-600 dark:text-orange-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                    }`}
                            >
                                Ativas
                            </button>
                            <button
                                onClick={() => setFilterStatus('concluded')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${filterStatus === 'concluded'
                                    ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                    }`}
                            >
                                Concluídas
                            </button>
                        </div>

                        {/* Filter Button */}
                        <button
                            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                            className={`h-full px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${isFilterPanelOpen || hasActiveFilters
                                ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 ring-2 ring-orange-500/10'
                                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400'
                                }`}
                        >
                            <span>Filtros</span>
                            {hasActiveFilters && (
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                            )}
                        </button>

                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

                        {/* Settings & Export */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setAdminOpen(true)}
                                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                title="Configurações Admin"
                            >
                                ⚙️
                            </button>
                            <button
                                onClick={handleExportCSV}
                                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                title="Exportar CSV"
                            >
                                📥
                            </button>
                        </div>

                    </div>
                </div>

                {/* View Switcher Tabs (Bottom of Header) */}
                <div className="mt-4 flex gap-6 border-b border-transparent">
                    {[
                        { id: 'table', icon: '📋', label: 'Lista' },
                        { id: 'kanban', icon: '🏗️', label: 'Kanban' },
                        { id: 'cards', icon: '🏙️', label: 'Cards' }
                    ].map((view) => (
                        <button
                            key={view.id}
                            onClick={() => setViewMode(view.id as any)}
                            className={`pb-3 text-sm font-medium transition-all relative ${viewMode === view.id
                                ? 'text-orange-600 dark:text-orange-500'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span>{view.icon}</span>
                                {view.label}
                            </span>
                            {viewMode === view.id && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-t-full"></span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </header>
    );
}
