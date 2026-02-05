import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import AdminPanel from './AdminPanel';
import { SkeletonLoader } from './monitor/MonitorComponents';
import MonitorTableView from './monitor/MonitorTableViewV2';
import MonitorKanbanView from './monitor/MonitorKanbanView';
import MonitorCardView from './monitor/MonitorCardView';
import MonitorStoreModal from './monitor/MonitorStoreModal';
import MonitorAIModal from './monitor/MonitorAIModal';
import { Store } from './monitor/types';

import { MonitorFilterPanel, FilterState } from './monitor/MonitorFilterPanel';
import MonitorHeader from './monitor/MonitorHeader';

export default function MonitorV2() {
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

    // Recommendation State


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

        if (globalFilter) {
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
    }, [data, advancedFilters, globalFilter]);

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
            await axios.put(`http://localhost:5003/api/store/${storeId}`, updatedStore);
        } catch (e) {
            console.error("Rollback status change", e);
            setData(prev => {
                const rollback = [...prev];
                rollback[storeIndex] = originalStore;
                return rollback;
            });
            alert("Erro ao atualizar status. Tente novamente.");
        }
    };

    const handleExportCSV = () => {
        if (!data || data.length === 0) return;
        // Implementation will be same as V1 (omitted for brevity during build phase, will copy if needed or import util)
        alert("Exportar CSV (Implementado em V2)");
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
        <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">

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

            {/* NEW HEADER */}
            <MonitorHeader
                stats={stats}
                isRefreshing={isRefreshing}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                isFilterPanelOpen={isFilterPanelOpen}
                setIsFilterPanelOpen={setIsFilterPanelOpen}
                advancedFilters={advancedFilters}
                viewMode={viewMode}
                setViewMode={setViewMode}
                setAdminOpen={setAdminOpen}
                handleExportCSV={handleExportCSV}
            />

            {/* Content Area */}
            <div className="flex-1 p-6">
                <div className={`mx-auto ${viewMode === 'kanban' ? 'w-full max-w-[calc(100vw-2rem)]' : 'max-w-[1920px]'} animate-fade-in-up`}>

                    {/* View Content */}
                    {viewMode === 'table' && (
                        <MonitorTableView
                            data={filteredData}
                            onEdit={handleEditClick}
                            onAiAnalyze={handleAiAnalyze}
                            onRefetch={fetchStores}
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
    );
}
