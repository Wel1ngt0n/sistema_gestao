import { useEffect, useState } from 'react';
import axios from 'axios';
import { Store } from './types';
import { formatDate, formatCurrency } from './monitorUtils';

interface MonitorStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    store: Store | null;
    matrices: { id: number; name: string }[];
    onSave: (store: Store) => Promise<void>;
    onDeepSync: (storeId: number) => Promise<void>;
    isDeepSyncing: boolean;
}

interface StoreLog {
    id: number;
    field: string;
    old: string | null;
    new: string | null;
    at: string;
    source: string;
}

interface TaskStep {
    id: number;
    step_name: string;
    list_name: string;
    status: string;
    assignee: string | null;
    start_date: string | null;
    end_date: string | null;
    duration: number;
    idle: number;
}

interface StorePause {
    id: number;
    start_date: string;
    end_date: string | null;
    reason: string;
    duration: number;
    is_active: boolean;
}


export default function MonitorStoreModal({
    isOpen,
    onClose,
    store,
    matrices,
    onSave,
    onDeepSync,
    isDeepSyncing
}: MonitorStoreModalProps) {
    const [localStore, setLocalStore] = useState<Store | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'history' | 'steps' | 'pauses'>('info');
    const [logs, setLogs] = useState<StoreLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [steps, setSteps] = useState<TaskStep[]>([]);
    const [loadingSteps, setLoadingSteps] = useState(false);

    // Pauses State
    const [pauses, setPauses] = useState<StorePause[]>([]);
    const [loadingPauses, setLoadingPauses] = useState(false);
    const [newPauseReason, setNewPauseReason] = useState("");
    const [newPauseDate, setNewPauseDate] = useState("");
    const [showPauseForm, setShowPauseForm] = useState(false);


    useEffect(() => {
        if (store) {
            setLocalStore({ ...store });
            setActiveTab('info');
            setLogs([]);
        } else {
            setLocalStore(null);
        }
    }, [store]);

    useEffect(() => {
        if (activeTab === 'history' && localStore?.id) {
            fetchLogs();
        } else if (activeTab === 'steps' && localStore?.id) {
            fetchSteps();
        } else if (activeTab === 'pauses' && localStore?.id) {
            fetchPauses();
        }
    }, [activeTab]);

    const fetchPauses = async () => {
        if (!localStore?.id) return;
        setLoadingPauses(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/stores/${localStore.id}/pauses`);
            setPauses(res.data);
        } catch (e) {
            console.error("Erro ao carregar pausas", e);
        } finally {
            setLoadingPauses(false);
        }
    };

    const handleAddPause = async () => {
        if (!localStore?.id || !newPauseDate) return;
        try {
            await axios.post(`http://localhost:5000/api/stores/${localStore.id}/pauses`, {
                start_date: newPauseDate,
                reason: newPauseReason
            });
            setNewPauseReason("");
            setNewPauseDate("");
            setShowPauseForm(false);
            fetchPauses();
            // Refresh store details to update days calculation
            // Mas o onSave atualiza o Pai? O pai passa 'store'. 
            // Precisamos atualizar o localStore ou pedir pro pai recarregar.
            // O ideal seria chamar uma prop onRefresh se existisse, mas vamos confiar que o usuario vai dar refresh ou o deep sync.
            // Porem, podemos atualizar o summary:
            alert("Pausa iniciada com sucesso!");
        } catch (e: any) {
            alert("Erro ao criar pausa: " + (e.response?.data?.error || e.message));
        }
    };

    const handleClosePause = async (pauseId: number) => {
        const endDate = prompt("Data de fim da pausa (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
        if (!endDate) return;

        try {
            await axios.put(`http://localhost:5000/api/pauses/${pauseId}/close`, {
                end_date: endDate
            });
            fetchPauses();
        } catch (e: any) {
            alert("Erro ao fechar pausa: " + (e.response?.data?.error || e.message));
        }
    };

    const handleDeletePause = async (pauseId: number) => {
        if (!confirm("Tem certeza que deseja apagar este registro de pausa?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/pauses/${pauseId}`);
            fetchPauses();
        } catch (e: any) {
            alert("Erro ao apagar pausa: " + (e.response?.data?.error || e.message));
        }
    };


    const fetchLogs = async () => {
        if (!localStore?.id) return;
        setLoadingLogs(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/stores/${localStore.id}/logs`);
            setLogs(res.data);
        } catch (e) {
            console.error("Erro ao carregar logs", e);
        } finally {
            setLoadingLogs(false);
        }
    };

    const fetchSteps = async () => {
        if (!localStore?.id) return;
        setLoadingSteps(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/stores/${localStore.id}/steps`);
            setSteps(res.data);
        } catch (e) {
            console.error("Erro ao carregar etapas", e);
        } finally {
            setLoadingSteps(false);
        }
    };

    const handleDelete = async () => {
        if (!localStore?.id) return;

        const confirmStr = prompt(`Para excluir esta loja, digite "DELETAR" abaixo.\n\nIsso apagará permanentemente todo o histórico e métricas de:\n${localStore.name}`);

        if (confirmStr !== "DELETAR") {
            if (confirmStr !== null) alert("Exclusão cancelada. Texto incorreto.");
            return;
        }

        try {
            await axios.delete(`http://localhost:5000/api/stores/${localStore.id}`);
            alert("Loja excluída com sucesso.");
            onClose();
            window.location.reload(); // Simples refresh para atualizar lista
        } catch (e) {
            console.error("Erro ao excluir loja", e);
            alert("Erro ao excluir loja. Verifique o console.");
        }
    };

    if (!isOpen || !localStore) return null;

    // Helper para exibir campos Read-Only
    const ReadOnlyField = ({ label, value, className = "" }: { label: string, value: string | number | null | undefined, className?: string }) => (
        <div className={className}>
            <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">{label}</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 break-words">{value ?? '-'}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            {/* Modal Container - Corrigido bg-white/dark (Force light mode colors if not dark) */}
            <div
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 rounded-lg">
                            <span className="text-2xl">🏪</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{localStore.name}</h2>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-200 dark:bg-slate-800 text-slate-500">
                                    #{localStore.custom_id || localStore.id}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                {localStore.clickup_url && (
                                    <a
                                        href={localStore.clickup_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                    >
                                        🔗 Abrir no ClickUp (#{localStore.clickup_id})
                                    </a>
                                )}
                                <span>|</span>
                                <span>Responsável: <strong className="text-slate-700 dark:text-slate-300">{localStore.implantador || 'N/D'}</strong></span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs Switcher */}
                <div className="flex px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'info'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        📝 Dados Gerais
                    </button>
                    <button
                        onClick={() => setActiveTab('steps')}
                        className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'steps'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        ⚡ Cronograma (Etapas)
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'history'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        🕒 Histórico de Mudanças
                    </button>
                    <button
                        onClick={() => setActiveTab('pauses')}
                        className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'pauses'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        ⏸️ Pausas & Descontos
                    </button>

                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'info' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* LEFT COLUMN: Main Info & Status */}
                            <div className="space-y-6 lg:col-span-2">
                                {/* Datas e Prazos */}
                                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-4 flex items-center gap-2">
                                        📅 Cronograma & Prazos
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">Data de Início</span>
                                            <input
                                                type="date"
                                                className="w-full bg-transparent border-b border-indigo-200 dark:border-indigo-800 text-sm font-bold text-indigo-700 dark:text-indigo-400 outline-none focus:border-indigo-500 transition-colors py-0.5"
                                                value={localStore.data_inicio || ''}
                                                onChange={(e) => setLocalStore({ ...localStore, data_inicio: e.target.value })}
                                            />
                                            {localStore.is_manual_start_date && (
                                                <span className="text-[9px] text-indigo-400 block mt-0.5" title="Data definida manualmente">* Manual</span>
                                            )}
                                        </div>

                                        <ReadOnlyField label="Previsão Entrega" value={formatDate(localStore.data_previsao)} />
                                        <ReadOnlyField label="Data Fim Real" value={formatDate(localStore.data_fim)} />
                                        <div>
                                            <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">Dias Decorridos</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-bold text-slate-800 dark:text-white">{localStore.dias_em_transito || 0}</span>
                                                <span className="text-xs text-slate-500">/ {localStore.tempo_contrato} dias</span>
                                            </div>
                                            {(localStore.days_late_predicted || 0) > 0 && (
                                                <span className="text-[10px] text-red-500 font-bold">⚠️ +{Math.round(localStore.days_late_predicted || 0)} dias atraso provável</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Informações Técnicas & IA */}
                                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-4 flex items-center gap-2">
                                        ⚙️ Dados Técnicos & IA
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <ReadOnlyField label="ERP" value={localStore.erp || ''} />
                                        <ReadOnlyField label="CNPJ" value={localStore.cnpj || ''} />
                                        <ReadOnlyField label="CRM" value={localStore.crm || ''} />
                                        <ReadOnlyField label="Status Atual" value={localStore.status} />

                                        <ReadOnlyField label="Dias Sem Movimento" value={localStore.idle_days || 0} />
                                        <ReadOnlyField label="Risco (0-100)" value={localStore.risk_score || 0} />
                                        <ReadOnlyField label="Previsão IA" value={formatDate(localStore.previsao_ia)} />
                                        <ReadOnlyField label="Status Sync" value={localStore.deep_sync_status || '-'} />
                                    </div>
                                </div>

                                {/* Configurações Editáveis (Formulário Principal) */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                                        ✏️ Edição & Configuração
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Rede</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                value={localStore.rede || ''}
                                                onChange={e => setLocalStore({ ...localStore, rede: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Tipo de Loja</label>
                                                <select
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                    value={localStore.tipo_loja || 'Filial'}
                                                    onChange={e => setLocalStore({ ...localStore, tipo_loja: e.target.value })}
                                                >
                                                    <option value="Filial">Filial</option>
                                                    <option value="Matriz">Matriz</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Dias Contrato</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                    value={localStore.tempo_contrato ?? ''}
                                                    onChange={e => setLocalStore({ ...localStore, tempo_contrato: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {localStore.tipo_loja === 'Filial' && (
                                        <div>
                                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Vincular a Matriz</label>
                                            <select
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={localStore.parent_id || ''}
                                                onChange={e => setLocalStore({ ...localStore, parent_id: e.target.value ? Number(e.target.value) : null })}
                                            >
                                                <option value="">-- Nenhuma --</option>
                                                {matrices.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Controle Operacional */}
                                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase">Controle Operacional / SLA</h5>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="checkQuality"
                                                className="w-4 h-4 accent-indigo-500"
                                                checked={localStore.delivered_with_quality || false}
                                                onChange={e => setLocalStore({ ...localStore, delivered_with_quality: e.target.checked })}
                                            />
                                            <label htmlFor="checkQuality" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                                Loja chegou completa na qualidade?
                                            </label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="checkRework"
                                                className="w-4 h-4 accent-indigo-500"
                                                checked={localStore.teve_retrabalho}
                                                onChange={e => setLocalStore({ ...localStore, teve_retrabalho: e.target.checked })}
                                            />
                                            <label htmlFor="checkRework" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                                Houve retrabalho pós implantação?
                                            </label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="checkTime"
                                                className="w-4 h-4 accent-indigo-500"
                                                checked={localStore.considerar_tempo !== false}
                                                onChange={e => setLocalStore({ ...localStore, considerar_tempo: e.target.checked })}
                                            />
                                            <label htmlFor="checkTime" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                                Considerar SLA?
                                            </label>
                                        </div>
                                    </div>

                                    {localStore.considerar_tempo === false && (
                                        <input
                                            type="text"
                                            className="w-full bg-white dark:bg-slate-800 border border-yellow-300 dark:border-yellow-700 text-slate-700 dark:text-white text-sm px-3 py-2 rounded focus:ring-2 focus:ring-yellow-500 outline-none"
                                            placeholder="Justificativa obrigatória para ignorar SLA..."
                                            value={localStore.justificativa_tempo || ''}
                                            onChange={e => setLocalStore({ ...localStore, justificativa_tempo: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Financial & Actions */}
                            <div className="space-y-6">
                                {/* Deep Sync Action */}
                                <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 p-5 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-sm text-center">
                                    <button
                                        onClick={() => localStore.id && onDeepSync(localStore.id)}
                                        disabled={isDeepSyncing}
                                        className="w-full py-2.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2"
                                    >
                                        {isDeepSyncing ? <span className="animate-spin">🔄</span> : '⚡'}
                                        {isDeepSyncing ? 'Sincronizando...' : 'Rodar Deep Sync'}
                                    </button>
                                    <p className="text-[10px] text-slate-400">Força atualização completa do histórico do ClickUp.</p>
                                </div>

                                {/* Financeiro */}
                                <div className="bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase mb-4 flex items-center gap-2">
                                        💰 Financeiro
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Status Financeiro</label>
                                            <select
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={localStore.financeiro_status || ''}
                                                onChange={e => setLocalStore({ ...localStore, financeiro_status: e.target.value })}
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="Em dia">Em dia</option>
                                                <option value="Não paga mensalidade">Não paga mensalidade</option>
                                                <option value="Devendo">Devendo</option>
                                                <option value="Cancelado">Cancelado</option>
                                            </select>
                                        </div>
                                        <ReadOnlyField label="Valor Mensalidade" value={formatCurrency(localStore.valor_mensalidade)} />
                                        <ReadOnlyField label="Valor Implantação" value={formatCurrency(localStore.valor_implantacao)} />
                                    </div>
                                </div>

                                {/* Manual Finish Date */}
                                <div className="bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-2">Data Manual de Fim</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                        value={localStore.manual_finished_at || ''}
                                        onChange={e => setLocalStore({ ...localStore, manual_finished_at: e.target.value })}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                                        Define manualmente a data de conclusão, sobrescrevendo a do ClickUp.
                                    </p>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Observações Privadas</label>
                                    <textarea
                                        rows={4}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                                        placeholder="Anotações internas sobre a loja..."
                                        value={localStore.observacoes || ''}
                                        onChange={e => setLocalStore({ ...localStore, observacoes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'steps' ? (
                        <div className="space-y-4 max-w-5xl mx-auto">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-6">
                                ⚡ Etapas e Status (ClickUp)
                            </h4>

                            {loadingSteps ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-400 text-sm font-medium">Carregando etapas...</p>
                                </div>
                            ) : steps.length === 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                                    <span className="text-4xl mb-3 block">🏜️</span>
                                    <p className="text-slate-500 font-medium">Nenhuma etapa encontrada nesta loja.</p>
                                    <p className="text-xs text-slate-400 mt-1">Verifique se a tarefa foi criada corretamente no ClickUp.</p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-900/50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-4 py-3">Fase</th>
                                                <th className="px-4 py-3">Tarefa</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Responsável</th>
                                                <th className="px-4 py-3 text-right">Duração</th>
                                                <th className="px-4 py-3 text-right">Idle</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {steps.map(step => (
                                                <tr key={step.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                                                            {step.list_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                                                        {step.step_name}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${['complete', 'concluida', 'done'].some(s => step.status.toLowerCase().includes(s))
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                            }`}>
                                                            {step.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                                        {step.assignee || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-xs text-indigo-600 dark:text-indigo-400">
                                                        {step.duration > 0 ? `${step.duration}d` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-xs">
                                                        <span className={step.idle > 5 ? 'text-red-500 font-bold' : 'text-slate-400'}>
                                                            {step.idle > 0 ? step.idle : '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'pauses' ? (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    ⏸️ Registro de Pausas e Congelamentos
                                </h4>
                                <button
                                    onClick={() => setShowPauseForm(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/30"
                                >
                                    + Nova Pausa
                                </button>
                            </div>

                            {showPauseForm && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-indigo-200 dark:border-indigo-900/50 mb-8 animate-in slide-in-from-top-4">
                                    <h5 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-4">Adicionar Nova Pausa</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <div>
                                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Data Início</label>
                                            <input
                                                type="date"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={newPauseDate}
                                                onChange={e => setNewPauseDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Motivo (Cliente, Recesso, etc)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Ex: Cliente solicitou pausa para reforma"
                                                    value={newPauseReason}
                                                    onChange={e => setNewPauseReason(e.target.value)}
                                                />
                                                <button
                                                    onClick={handleAddPause}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded font-bold"
                                                >
                                                    Salvar
                                                </button>
                                                <button
                                                    onClick={() => setShowPauseForm(false)}
                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-4 py-2 rounded font-bold"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {loadingPauses ? (
                                <div className="flex justify-center py-10"><span className="animate-spin text-2xl">🔄</span></div>
                            ) : pauses.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border-dashed border-2 border-slate-200 dark:border-slate-800">
                                    <p className="text-slate-500">Nenhuma pausa registrada.</p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-900/50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-6 py-3">Início</th>
                                                <th className="px-6 py-3">Fim</th>
                                                <th className="px-6 py-3">Motivo</th>
                                                <th className="px-6 py-3 text-right">Dias Descontados</th>
                                                <th className="px-6 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {pauses.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-300">{formatDate(p.start_date)}</td>
                                                    <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-300">
                                                        {p.end_date ? formatDate(p.end_date) : <span className="text-emerald-500 font-bold uppercase text-[10px] bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">Em Aberto</span>}
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-700 dark:text-slate-200">{p.reason}</td>
                                                    <td className="px-6 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                        {p.duration > 0 ? `-${p.duration} dias` : '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                        {p.is_active && (
                                                            <button
                                                                onClick={() => handleClosePause(p.id)}
                                                                className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-bold uppercase"
                                                                title="Encerrar Pausa"
                                                            >
                                                                Encerrar
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeletePause(p.id)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                                            title="Excluir Registro"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <td colSpan={3} className="px-6 py-3 text-right text-xs uppercase font-bold text-slate-500">Total Descontado:</td>
                                                <td className="px-6 py-3 text-right font-bold text-indigo-700 dark:text-indigo-400 text-lg">
                                                    -{pauses.reduce((acc, p) => acc + p.duration, 0)} dias
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-6">
                                📜 Histórico de Sincronização e Alterações Manuais
                            </h4>

                            {loadingLogs ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-400 text-sm font-medium">Carregando histórico...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                                    <span className="text-4xl mb-3 block">🏜️</span>
                                    <p className="text-slate-500 font-medium">Nenhum histórico registrado para esta loja ainda.</p>
                                    <p className="text-xs text-slate-400 mt-1">Mudanças feitas a partir de hoje serão listadas aqui.</p>
                                </div>
                            ) : (
                                <div className="relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                                    {logs.map((log) => (
                                        <div key={log.id} className="relative pl-10 pb-8 last:pb-0">
                                            {/* Dot */}
                                            <div className={`absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 z-10 shadow-sm ${log.source === 'sync' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600'
                                                }`}>
                                                {log.source === 'sync' ? '🔄' : '👤'}
                                            </div>

                                            {/* Card */}
                                            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                                        Campo: <span className="text-slate-700 dark:text-slate-200">{log.field}</span>
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                        {log.at}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="flex-1 bg-rose-50 dark:bg-rose-900/10 p-2 rounded border border-rose-100 dark:border-rose-900/30 line-through text-rose-700 dark:text-rose-400 text-xs text-wrap break-all">
                                                        {log.old || '(vazio)'}
                                                    </div>
                                                    <span className="text-slate-300">➜</span>
                                                    <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded border border-emerald-100 dark:border-emerald-900/30 font-bold text-emerald-700 dark:text-emerald-400 text-xs text-wrap break-all">
                                                        {log.new || '(vazio)'}
                                                    </div>
                                                </div>

                                                <div className="mt-2 flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${log.source === 'sync' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                                                    <span className="text-[10px] font-bold uppercase text-slate-500">
                                                        Fonte: {log.source === 'sync' ? 'Sincronização' : 'Alteração Manual'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                    >
                        🗑️ Excluir Loja
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onSave(localStore)}
                            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5"
                        >
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
