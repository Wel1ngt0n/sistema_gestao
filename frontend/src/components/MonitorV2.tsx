import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { SkeletonLoader } from './monitor/MonitorComponents';
import MonitorTableView from './monitor/MonitorTableViewV2';
import MonitorKanbanView, { DEFAULT_KANBAN_FIELDS, KanbanFieldKey } from './monitor/MonitorKanbanView';
import MonitorStoreModal from './monitor/MonitorStoreModal';
import MonitorAIModal from './monitor/MonitorAIModal';
import { Store } from './monitor/types';

import { FilterState } from './monitor/MonitorFilterPanel';
import MonitorHeader from './monitor/MonitorHeader';
import BulkActionBar from './monitor/BulkActionBar';
import BulkUpdateModal from './monitor/BulkUpdateModal';
import MonitorImportModal from './monitor/MonitorImportModal';

export default function MonitorV2() {
    const [data, setData] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Estado da Visualização
    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
    const [kanbanFields, setKanbanFields] = useState<KanbanFieldKey[]>(DEFAULT_KANBAN_FIELDS);

    // Estado da UI
    const [globalFilter, setGlobalFilter] = useState('');
    // Estado dos Filtros Avançados
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

    const [filterStatus, setFilterStatus] = useState<'active' | 'concluded' | 'scheduled'>('active');

    // Estado da Modal de Detalhes (Nova UI)
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [deepSyncLoading, setDeepSyncLoading] = useState(false);

    // Estado da Modal de IA
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [selectedStoreForAi, setSelectedStoreForAi] = useState<Store | null>(null);

    // Estado das matrizes relacionadas as lojas.
    const [matrices, setMatrices] = useState<{ id: number, name: string }[]>([]);

    // Estado de Seleção em Massa
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importLoading, setImportLoading] = useState(false);

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

        api.get('/api/stores', {
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
            res = res.filter(s =>
                s.name.toLowerCase().includes(lowerFilter) ||
                String(s.id).includes(lowerFilter) ||
                (s.implantador || '').toLowerCase().includes(lowerFilter) ||
                (s.rede || '').toLowerCase().includes(lowerFilter) ||
                (s.status || '').toLowerCase().includes(lowerFilter) ||
                (s.erp || '').toLowerCase().includes(lowerFilter) ||
                (s.crm || '').toLowerCase().includes(lowerFilter)
            );
        }

        // 2. Filtros Avançados
        if (advancedFilters.isHighRisk) res = res.filter(s => s.risk_score > 20);
        if (advancedFilters.isLate) res = res.filter(s => (s.dias_em_transito || 0) > s.tempo_contrato);
        if (advancedFilters.financialStatus) res = res.filter(s => s.financeiro_status === advancedFilters.financialStatus);

        if (advancedFilters.assignee) {
            res = res.filter(s => (s.implantador || 'Sem Responsável') === advancedFilters.assignee);
        }

        if (advancedFilters.status.length > 0) {
            res = res.filter(s => advancedFilters.status.includes(s.status));
        }

        // Intervalos de Datas
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
            await api.post(`/api/deep-sync/store/${storeId}`);
            alert("Deep Sync finalizado com sucesso! Histórico atualizado.");
            fetchStores(true); // Soft refresh
            setDeepSyncLoading(false);
        } catch (e) {
            alert("Erro ao rodar Deep Sync.");
            setDeepSyncLoading(false);
        }
    }

    const handleSave = async (storeToSave: Store) => {
        if (!storeToSave.id) return;
        try {
            await api.put(`/api/store/${storeToSave.id}`, storeToSave);
            fetchStores(true);
            setIsStoreModalOpen(false);
        } catch (err) {
            console.error("Error saving store", err);
            alert("Erro ao salvar alterações.");
        }
    };

    const handleBulkUpdate = async (updateData: { status?: string, manual_finished_at?: string, reopen?: boolean, financeiro_status?: string }) => {
        // Obter os IDs reais das lojas selecionadas a partir do rowSelection (que usa índices)
        // No TanStack Table, se rowSelection = { "0": true }, significa que a linha 0 do modelo atual está selecionada.
        // Como o filteredData é o que passamos para a tabela, usamos ele.
        const selectedIndices = Object.keys(rowSelection).filter(k => rowSelection[k]);
        const selectedIds = selectedIndices.map(idx => filteredData[parseInt(idx)]?.id).filter(Boolean);

        if (selectedIds.length === 0) return;

        setBulkLoading(true);
        try {
            await api.post('/api/stores/bulk-update', {
                store_ids: selectedIds,
                ...updateData
            });
            
            setRowSelection({});
            setIsBulkModalOpen(false);
            fetchStores(true);
            alert(`${selectedIds.length} lojas atualizadas com sucesso!`);
        } catch (err) {
            console.error("Erro no bulk update", err);
            alert("Ocorreu um erro ao atualizar as lojas em massa.");
        } finally {
            setBulkLoading(false);
        }
    };

    const handleStatusChange = async (storeId: number, newStatus: string) => {
        const storeIndex = data.findIndex(s => s.id === storeId);
        if (storeIndex === -1) return;

        const originalStore = data[storeIndex];
        const updatedStore = { ...originalStore, status: newStatus };

        // Atualização Otimista
        const newData = [...data];
        newData[storeIndex] = updatedStore;
        setData(newData);

        try {
            await api.put(`/api/store/${storeId}`, updatedStore);
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
        if (!filteredData || filteredData.length === 0) {
            alert("Nenhum dado para exportar.");
            return;
        }

        const formatarCnpjParaExcel = (valor: string | null | undefined) => {
            const cnpj = (valor || '').replace(/\D/g, '').padStart(14, '0');
            return cnpj ? `="${cnpj}"` : '';
        };

        const headers = [
            "ID", "Nome da Loja", "ID Personalizado", "Status", "Status Normalizado",
            "Implantador", "Dias em Trânsito", "Dias Ociosos (Parado)", "Score de Risco",
            "Rede", "Tipo de Loja", "Início", "Fim", "Mensalidade (R$)", "Implantação (R$)",
            "Status Financeiro", "ERP", "CNPJ", "Teve Retrabalho", "Entregue com Qualidade",
            "Tempo de Contrato", "Observações"
        ];

        const rows = filteredData.map(s => [
            s.id,
            s.name,
            s.custom_id || '',
            s.status,
            s.status_norm,
            s.implantador || 'Sem Responsável',
            s.dias_em_transito || 0,
            s.idle_days || 0,
            s.risk_score || 0,
            s.rede || '',
            s.tipo_loja || '',
            s.data_inicio ? new Date(s.data_inicio).toLocaleDateString('pt-BR') : '',
            s.data_fim ? new Date(s.data_fim).toLocaleDateString('pt-BR') : '',
            s.valor_mensalidade || 0,
            s.valor_implantacao || 0,
            s.financeiro_status || '',
            s.erp || '',
            formatarCnpjParaExcel(s.cnpj),
            s.teve_retrabalho ? 'Sim' : 'Não',
            s.delivered_with_quality ? 'Sim' : 'Não',
            s.tempo_contrato || 0,
            s.observacoes || ''
        ]);

        // Escape quotes and format as CSV
        const csvContent = [
            headers.join(';'), // Usando Ponto e Vírgula para abrir fácil no Excel Pt-BR
            ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        ].join('\n');

        // Adiciona BOM (Byte Order Mark) para o Excel reconhecer UTF-8
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `monitor_lojas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportSpreadsheet = async (dados: {
        arquivo: File;
        modo: 'atualizacao_campos' | 'financeiro_pagantes';
        atualizarNaoListadas: boolean;
        statusFinanceiroPadrao: string;
    }) => {
        const formData = new FormData();
        formData.append('arquivo', dados.arquivo);
        formData.append('modo', dados.modo);
        formData.append('atualizar_nao_listadas', String(dados.atualizarNaoListadas));
        formData.append('status_financeiro_padrao', dados.statusFinanceiroPadrao);

        setImportLoading(true);
        try {
            const resposta = await api.post('/api/stores/import-spreadsheet', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const resultado = resposta.data?.result;
            fetchStores(true);

            const resumo = [
                `Lojas atualizadas: ${resultado?.lojas_atualizadas ?? 0}`,
                `Linhas ignoradas: ${resultado?.linhas_ignoradas ?? 0}`,
                `CNPJs nao encontrados: ${resultado?.nao_encontradas_total ?? 0}`,
            ];

            if ((resultado?.lojas_desmarcadas_nao_pagantes ?? 0) > 0) {
                resumo.push(`Lojas marcadas como nao pagantes: ${resultado.lojas_desmarcadas_nao_pagantes}`);
            }

            alert(`Importacao concluida com sucesso.\n\n${resumo.join('\n')}`);
        } catch (erro: any) {
            console.error("Erro ao importar planilha do monitor", erro);
            const mensagem = erro?.response?.data?.message || "Ocorreu um erro ao importar a planilha.";
            alert(mensagem);
            throw erro;
        } finally {
            setImportLoading(false);
        }
    };

    // Estatísticas memoizadas para o cabeçalho.
    const stats = useMemo(() => {
        const total = data.length;
        const delayed = data.filter(s => s.status_norm === 'IN_PROGRESS' && (s.dias_em_transito || 0) > s.tempo_contrato).length;
        const risk = data.filter(s => (s.risk_score || 0) > 20).length;
        return { total, delayed, risk };
    }, [data]);

    if (loading && data.length === 0) return <SkeletonLoader />;

    return (
        <div aria-label="Monitor View" className="relative flex h-full min-h-0 w-full max-w-full flex-col gap-4 overflow-hidden bg-[#EEF0F8] p-4 font-sans text-zinc-900 transition-colors duration-300 md:p-6">

            <MonitorAIModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                store={selectedStoreForAi}
            />

            {/* NOVO CABEÇALHO */}
            <MonitorHeader
                stats={stats}
                isRefreshing={isRefreshing}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                advancedFilters={advancedFilters}
                setAdvancedFilters={setAdvancedFilters}
                uniqueAssignees={uniqueImplantadores}
                uniqueStatuses={uniqueStatuses}
                viewMode={viewMode}
                setViewMode={setViewMode}
                kanbanFields={kanbanFields}
                setKanbanFields={setKanbanFields}
                handleExportCSV={handleExportCSV}
                handleOpenImportModal={() => setIsImportModalOpen(true)}
            />

            {/* Área de Conteúdo */}
            <div aria-label="Monitor View" className="min-h-0 w-full max-w-full flex-1 overflow-hidden">
                <div aria-label="Monitor View" className={`mx-auto h-full min-w-0 ${viewMode === 'kanban' ? 'w-full' : 'max-w-full overflow-y-auto'} animate-fade-in-up transition-all duration-300`}>

                    {/* Conteúdo da Visualização */}
                    {viewMode === 'table' && (
                        <MonitorTableView
                            data={filteredData}
                            onEdit={handleEditClick}
                            onAiAnalyze={handleAiAnalyze}
                            onRefetch={() => fetchStores(true)}
                            rowSelection={rowSelection}
                            onRowSelectionChange={setRowSelection}
                        />
                    )}

                    {viewMode === 'kanban' && (
                        <div aria-label="Monitor View" className="h-full min-w-0 overflow-x-auto overflow-y-hidden pb-4 pr-1">
                            <MonitorKanbanView
                                data={filteredData}
                                visibleFields={kanbanFields}
                                onEdit={handleEditClick}
                                onStatusChange={handleStatusChange}
                            />
                        </div>
                    )}

                </div>
            </div>


            {/* Modals */}
            <BulkActionBar 
                selectedCount={Object.keys(rowSelection).length}
                onClearSelection={() => setRowSelection({})}
                onBulkAction={() => setIsBulkModalOpen(true)}
            />

            <BulkUpdateModal 
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                selectedCount={Object.keys(rowSelection).length}
                onConfirm={handleBulkUpdate}
                isLoading={bulkLoading}
            />

            <MonitorImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onConfirm={handleImportSpreadsheet}
                isLoading={importLoading}
            />

            <MonitorStoreModal
                isOpen={isStoreModalOpen}
                onClose={() => setIsStoreModalOpen(false)}
                store={editingStore}
                matrices={matrices}
                onSave={handleSave}
                onDeepSync={handleRunDeepSync}
                isDeepSyncing={deepSyncLoading}
            />
        </div >
    );
}
