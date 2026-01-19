import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import AdminPanel from './AdminPanel';
import { SkeletonLoader } from './monitor/MonitorComponents';
import MonitorTableView from './monitor/MonitorTableView';
import MonitorKanbanView from './monitor/MonitorKanbanView';
import MonitorCardView from './monitor/MonitorCardView';
import MonitorStoreModal from './monitor/MonitorStoreModal';
import MonitorAIModal from './monitor/MonitorAIModal';
import { Store } from './monitor/types';

import { MonitorFilterPanel, FilterState } from './monitor/MonitorFilterPanel';

export default function Monitor() {
    const [data, setData] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'cards'>('table');

    // UI State
    const [globalFilter, setGlobalFilter] = useState('');
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    // Advanced Filters State
    const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
        startDate: '',
        endDate: '',
        finishStartDate: '',
        finishEndDate: '',
        status: [],
        assignee: '',
        financialStatus: '',
        isHighRisk: false,
        isLate: false,
    });

    const [filterStatus, setFilterStatus] = useState<'active' | 'concluded'>('active');

    // Estado da Modal de Detalhes (Nova UI)
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [deepSyncLoading, setDeepSyncLoading] = useState(false);

    // Estado da Modal de IA
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [selectedStoreForAi, setSelectedStoreForAi] = useState<Store | null>(null);

    // Admin & Matrix State
    const [adminOpen, setAdminOpen] = useState(false);
    const [matrices, setMatrices] = useState<{ id: number, name: string }[]>([]);

    const handleAiAnalyze = (store: Store) => {
        setSelectedStoreForAi(store);
        setAiModalOpen(true);
    };

    useEffect(() => {
        fetchStores();
    }, [filterStatus]);

    const fetchStores = (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);

        axios.get('http://localhost:5003/api/stores', {
            params: { status: filterStatus }
        })
            .then(res => {
                if (Array.isArray(res.data)) {
                    setData(res.data);
                } else {
                    setData(res.data.stores);
                    setMatrices(res.data.matrices);
                }
            })
            .catch(err => {
                console.error("Error loading stores", err);
            })
            .finally(() => {
                setLoading(false);
                setIsRefreshing(false);
            });
    };

    // Extrair Lista Única de Implantadores
    const uniqueImplantadores = useMemo(() => {
        const owners = data.map(s => s.implantador).filter(Boolean);
        return Array.from(new Set(owners)).sort() as string[];
    }, [data]);

    const uniqueStatuses = useMemo(() => Array.from(new Set(data.map(d => d.status))).sort(), [data]);


    // Lógica de Filtro Unificada
    const filteredData = useMemo(() => {
        let res = data;

        // 1. Text Search (Global) - Only applies if View is NOT Table (Table has internal)
        // OR apply it everywhere if we want unified behavior? User said "search bar only in others".
        // BUT logic wise, if we type in search bar in Kanban, it filters.
        if (globalFilter && viewMode !== 'table') {
            const lowerFilter = globalFilter.toLowerCase();
            res = res.filter(s => s.name.toLowerCase().includes(lowerFilter) || String(s.id).includes(lowerFilter));
        }

        // 2. Advanced Filters
        if (advancedFilters.isHighRisk) res = res.filter(s => s.risk_score > 20);
        if (advancedFilters.isLate) res = res.filter(s => (s.dias_em_transito || 0) > s.tempo_contrato);
        if (advancedFilters.financialStatus) res = res.filter(s => s.financeiro_status === advancedFilters.financialStatus);

        if (advancedFilters.assignee) {
            res = res.filter(s => (s.implantador || 'Sem Responsável') === advancedFilters.assignee);
        }

        if (advancedFilters.status.length > 0) {
            res = res.filter(s => advancedFilters.status.includes(s.status));
        }

        // Date Ranges
        if (advancedFilters.startDate) res = res.filter(s => s.data_inicio && s.data_inicio >= advancedFilters.startDate);
        if (advancedFilters.endDate) res = res.filter(s => s.data_inicio && s.data_inicio <= advancedFilters.endDate);
        if (advancedFilters.finishStartDate) res = res.filter(s => s.data_fim && s.data_fim >= advancedFilters.finishStartDate);
        if (advancedFilters.finishEndDate) res = res.filter(s => s.data_fim && s.data_fim <= advancedFilters.finishEndDate);

        return res;
    }, [data, advancedFilters, globalFilter, viewMode]);

    const handleEditClick = (store: Store) => {
        setEditingStore({ ...store });
        setIsStoreModalOpen(true);
    };

    const handleRunDeepSync = async (storeId: number) => {
        setDeepSyncLoading(true);
        try {
            await axios.post(`http://localhost:5003/api/deep-sync/store/${storeId}`);
            alert("Deep Sync finalizado com sucesso! Histórico atualizado.");
            fetchStores(true); // Soft refresh
            setDeepSyncLoading(false);
        } catch (e) {
            alert("Erro ao rodar Deep Sync.");
            setDeepSyncLoading(false);
        }
    }

    const handleSave = async (storeToSave: Store) => {
        if (!storeToSave.id) {
            alert("Erro: ID da loja inválido.");
            return;
        }

        const url = `http://localhost:5003/api/store/${storeToSave.id}`;

        try {
            await axios.put(url, storeToSave);
            setIsStoreModalOpen(false);
            fetchStores(true); // Soft refresh
        } catch (error: any) {
            console.error("Erro ao salvar", error);
            alert(`Erro ao salvar alterações: ${error.message}`);
        }
    };

    const handleStatusChange = async (storeId: number, newStatus: string) => {
        const storeIndex = data.findIndex(s => s.id === storeId);
        if (storeIndex === -1) return;

        const originalStore = data[storeIndex];
        const updatedStore = { ...originalStore, status: newStatus };

        // Optimistic Update
        const newData = [...data];
        newData[storeIndex] = updatedStore;
        setData(newData);

        try {
            // Usa o mesmo endpoint de edição
            await axios.put(`http://localhost:5003/api/store/${storeId}`, updatedStore);
        } catch (e) {
            console.error("Rollback status change", e);
            // Rollback em caso de erro
            setData(prev => {
                const rollback = [...prev];
                rollback[storeIndex] = originalStore;
                return rollback;
            });
            alert("Erro ao atualizar status. Tente novamente.");
        }
    };

    // Memoized Stats for Mini Cards
    const stats = useMemo(() => {
        const total = data.length;
        const delayed = data.filter(s => s.status_norm === 'IN_PROGRESS' && (s.dias_em_transito || 0) > s.tempo_contrato).length;
        const risk = data.filter(s => (s.risk_score || 0) > 20).length;
        return { total, delayed, risk };
    }, [data]);

    if (loading && data.length === 0) return <SkeletonLoader />;

    return (
        <>
            <MonitorAIModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                store={selectedStoreForAi}
            />

            {/* Global Filter Panel */}
            <MonitorFilterPanel
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                filters={advancedFilters}
                setFilters={setAdvancedFilters}
                uniqueAssignees={uniqueImplantadores}
                uniqueStatuses={uniqueStatuses}
            />

            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
                {/* Modern Header */}
                <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-30 sticky top-0">
                    <div className="px-6 py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Title & Stats */}
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/30">
                                        <span className="text-white text-xl">📊</span>
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                            Monitor de Implantação
                                        </h1>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            Visão Operacional em Tempo Real
                                            {isRefreshing && (
                                                <span className="flex items-center gap-1 text-indigo-500 animate-pulse ml-2">
                                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                                    Syncing...
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Mini Stats Divisória Vertical */}
                                <div className="hidden md:flex items-center gap-4 pl-6 border-l border-slate-200 dark:border-slate-700/50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                                        <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{stats.total}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-rose-500/80">Atrasados</span>
                                        <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.delayed}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-amber-500/80">Risco</span>
                                        <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.risk}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Group (View Switcher + Filter Button + Status Toggle) */}
                            <div className="flex items-center gap-2 self-start md:self-center">
                                {/* Search Bar (Only for non-table views) */}
                                {viewMode !== 'table' && (
                                    <div className="relative group w-48 transition-all focus-within:w-64">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Buscar Global..."
                                            value={globalFilter}
                                            onChange={(e) => setGlobalFilter(e.target.value)}
                                            className="w-full pl-10 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                )}

                                {/* Status Toggle Combined */}
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1">
                                    <button
                                        onClick={() => setFilterStatus('active')}
                                        className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all flex items-center gap-1 ${filterStatus === 'active'
                                            ? 'bg-indigo-500 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        Ativas
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus('concluded')}
                                        className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all flex items-center gap-1 ${filterStatus === 'concluded'
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        Concluídas
                                    </button>
                                </div>

                                {/* Filter Button */}
                                <button
                                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                                    className={`h-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${isFilterPanelOpen || Object.values(advancedFilters).some(v => Array.isArray(v) ? v.length > 0 : !!v)
                                        ? 'bg-violet-600 text-white border-violet-600 shadow-md ring-2 ring-violet-500/20'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                                        }`}
                                >
                                    <span>⚡ Filtros</span>
                                    {(Object.values(advancedFilters).some(v => Array.isArray(v) ? v.length > 0 : !!v)) && (
                                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                    )}
                                </button>

                                {/* View Switcher */}
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1">
                                    {[
                                        { id: 'table', icon: '📋', label: 'Lista' },
                                        { id: 'kanban', icon: '🏗️', label: 'Kanban' },
                                        { id: 'cards', icon: '🏙️', label: 'Cards' }
                                    ].map((view) => (
                                        <button
                                            key={view.id}
                                            onClick={() => setViewMode(view.id as any)}
                                            className={`p-1.5 sm:px-3 sm:py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${viewMode === view.id
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                                                }`}
                                            title={view.label}
                                        >
                                            <span>{view.icon}</span>
                                            <span className="hidden xl:inline">{view.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 p-6">
                    <div className={`mx-auto ${viewMode === 'kanban' ? 'w-full max-w-[calc(100vw-2rem)]' : 'max-w-[1920px]'} pb-20 animate-fade-in-up`}>

                        {/* View Content */}
                        {viewMode === 'table' && (
                            <MonitorTableView
                                data={filteredData}
                                matrices={matrices}
                                onEdit={handleEditClick}
                                onAiAnalyze={handleAiAnalyze}
                                onRefetch={fetchStores}
                                setAdminOpen={setAdminOpen}
                            />
                        )}

                        {viewMode === 'kanban' && (
                            <div className="overflow-x-auto pb-4">
                                <MonitorKanbanView
                                    data={filteredData}
                                    onEdit={handleEditClick}
                                    onStatusChange={handleStatusChange}
                                />
                            </div>
                        )}

                        {viewMode === 'cards' && (
                            <MonitorCardView
                                data={filteredData}
                                onEdit={handleEditClick}
                            />
                        )}
                    </div>
                </div>


                {/* Modals */}
                <MonitorStoreModal
                    isOpen={isStoreModalOpen}
                    onClose={() => setIsStoreModalOpen(false)}
                    store={editingStore}
                    matrices={matrices}
                    onSave={handleSave}
                    onDeepSync={handleRunDeepSync}
                    isDeepSyncing={deepSyncLoading}
                />

                <AdminPanel isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
            </div >
        </>
    );
}
