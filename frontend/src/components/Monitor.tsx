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

export default function Monitor() {
    const [data, setData] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'cards'>('table');

    // UI State
    const [globalFilter, setGlobalFilter] = useState('');

    // V2.5 Filtros Melhorados (Active Filters)
    const [filterRisk, setFilterRisk] = useState(false);
    const [filterLate, setFilterLate] = useState(false);
    const [filterDebt, setFilterDebt] = useState(false);
    const [filterImplantador, setFilterImplantador] = useState('');
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
        return Array.from(new Set(owners)).sort();
    }, [data]);

    // Lógica de Filtro
    const filteredData = useMemo(() => {
        let res = data;
        if (filterRisk) res = res.filter(s => s.risk_score > 20); // Limite arbitrário para "Alto Risco"
        if (filterLate) res = res.filter(s => (s.dias_em_transito || 0) > s.tempo_contrato);
        if (filterDebt) res = res.filter(s => s.financeiro_status === 'Devendo');
        if (filterImplantador) res = res.filter(s => s.implantador === filterImplantador);

        // Filtro Global simples para Kanban e Cards
        if ((viewMode === 'kanban' || viewMode === 'cards') && globalFilter) {
            const lowerFilter = globalFilter.toLowerCase();
            res = res.filter(s => s.name.toLowerCase().includes(lowerFilter) || String(s.id).includes(lowerFilter));
        }

        return res;
    }, [data, filterRisk, filterLate, filterDebt, filterImplantador, globalFilter, viewMode]);

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

                            {/* View Switcher & Status Filter Combined */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start md:self-center gap-1">
                                {/* Status Toggle */}
                                <div className="flex bg-white dark:bg-slate-700 rounded-md shadow-sm mr-2 p-0.5">
                                    <button
                                        onClick={() => setFilterStatus('active')}
                                        className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all flex items-center gap-1 ${filterStatus === 'active'
                                                ? 'bg-indigo-500 text-white'
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        🚀 Ativas
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus('concluded')}
                                        className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all flex items-center gap-1 ${filterStatus === 'concluded'
                                                ? 'bg-emerald-500 text-white'
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        ✅ Concluídas
                                    </button>
                                </div>
                                <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

                                {[
                                    { id: 'table', icon: '📋', label: 'Lista' },
                                    { id: 'kanban', icon: '🏗️', label: 'Kanban' },
                                    { id: 'cards', icon: '🏙️', label: 'Cards' }
                                ].map((view) => (
                                    <button
                                        key={view.id}
                                        onClick={() => setViewMode(view.id as any)}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${viewMode === view.id
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        <span>{view.icon}</span>
                                        <span className="hidden sm:inline">{view.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filter Bar (Integrated) */}
                        <div className="mt-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            {/* Quick Filters (Chips) */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Filtros:</span>

                                <button
                                    onClick={() => { setFilterRisk(!filterRisk); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filterRisk
                                        ? 'bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-500/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-300 hover:text-rose-500'
                                        }`}
                                >
                                    🔥 Alto Risco
                                </button>

                                <button
                                    onClick={() => { setFilterLate(!filterLate); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filterLate
                                        ? 'bg-orange-500 border-orange-600 text-white shadow-md shadow-orange-500/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-300 hover:text-orange-500'
                                        }`}
                                >
                                    ⚠️ Atrasados
                                </button>

                                <button
                                    onClick={() => { setFilterDebt(!filterDebt); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filterDebt
                                        ? 'bg-yellow-500 border-yellow-600 text-white shadow-md shadow-yellow-500/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-yellow-300 hover:text-yellow-500'
                                        }`}
                                >
                                    💰 Inadimplentes
                                </button>

                                {(filterRisk || filterLate || filterDebt || filterImplantador) && (
                                    <button
                                        onClick={() => { setFilterRisk(false); setFilterLate(false); setFilterDebt(false); setFilterImplantador(''); setGlobalFilter(''); }}
                                        className="text-xs text-slate-400 hover:text-slate-600 underline ml-2 transition-colors"
                                    >
                                        Limpar todos
                                    </button>
                                )}
                            </div>

                            {/* Search & Select */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                                <div className="relative group w-full sm:w-64">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou ID..."
                                        value={globalFilter}
                                        onChange={(e) => setGlobalFilter(e.target.value)}
                                        className="w-full pl-10 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <select
                                    value={filterImplantador || ''}
                                    onChange={(e) => setFilterImplantador(e.target.value)}
                                    className="w-full sm:w-48 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="">👤 Todos Resp.</option>
                                    {uniqueImplantadores.map(imp => (
                                        <option key={imp} value={imp || ''}>{imp}</option>
                                    ))}
                                </select>
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
