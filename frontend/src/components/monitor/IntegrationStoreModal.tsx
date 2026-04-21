import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Store, IntegrationData } from './types';

interface IntegrationStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: IntegrationData | null;
    onSave: () => Promise<void>;
    onDeepSync: (id: number) => Promise<void>;
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

export default function IntegrationStoreModal({
    isOpen,
    onClose,
    data,
    onSave,
    onDeepSync,
    isDeepSyncing
}: IntegrationStoreModalProps) {
    const [localData, setLocalData] = useState<IntegrationData | null>(null);
    const [fullStore, setFullStore] = useState<Store | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'history' | 'steps'>('info');
    const [logs, setLogs] = useState<StoreLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [steps, setSteps] = useState<TaskStep[]>([]);
    const [loadingSteps, setLoadingSteps] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (data) {
            setLocalData({ ...data });
            setActiveTab('info');
            setLogs([]);
            fetchStoreDetails(data.id);
        } else {
            setLocalData(null);
            setFullStore(null);
        }
    }, [data]);

    useEffect(() => {
        if (activeTab === 'history' && localData?.id) {
            fetchLogs();
        } else if (activeTab === 'steps' && localData?.id) {
            fetchSteps();
        }
    }, [activeTab]);

    const fetchStoreDetails = async (storeId: number) => {
        try {
            // Tentativa de buscar detalhes da loja (se endpoint existir)
            // Se não existir, usaremos apenas os dados que já temos
            // O endpoint /api/stores retorna lista, mas vamos verificar se /api/stores/:id existe ou simulamos
            // Como MonitorStoreModal usa /stores/:id/logs, assumimos que /stores/:id existe ou é suportado
            // Se falhar, ignoramos silenciosamente e usamos dados parciais
            // NOTA: Endpoint /api/stores/:id não foi confirmado. Vamos tentar buscar na lista por enquanto se falhar?
            // Melhor: Vamos apenas assumir que temos o ID e para URL do clickup precisamos da Store.
            // Se não tiver endpoint, o link do clickup não vai aparecer.
            // Vou tentar uma chamada, se falhar, ok.

            // Workaround: MonitorTableView passa a store completa. IntegrationMonitor só tem IntegrationData via dashboard.
            // Vamos tentar chamar /api/stores?limit=1000 e filtrar no front se não tiver endpoint de detalhe? Não, muito pesado.
            // Vamos deixar sem detalhes extras por enquanto se a API não suportar.
            const res = await api.get(`/api/stores?limit=5000`); // Horrível, mas temporário
            if (res.data && res.data.items) {
                const found = res.data.items.find((s: Store) => s.id === storeId);
                if (found) setFullStore(found);
            } else if (Array.isArray(res.data)) { // As sometimes it returns array directly
                const found = res.data.find((s: Store) => s.id === storeId);
                if (found) setFullStore(found);
            }
        } catch (e) {
            console.warn("Não foi possível carregar detalhes completos da loja", e);
        }
    };

    const fetchLogs = async () => {
        if (!localData?.id) return;
        setLoadingLogs(true);
        try {
            const res = await api.get(`/api/stores/${localData.id}/logs`);
            setLogs(res.data);
        } catch (e) {
            console.error("Erro ao carregar logs", e);
        } finally {
            setLoadingLogs(false);
        }
    };

    const fetchSteps = async () => {
        if (!localData?.id) return;
        setLoadingSteps(true);
        try {
            const res = await api.get(`/api/stores/${localData.id}/steps`);
            setSteps(res.data);
        } catch (e) {
            console.error("Erro ao carregar etapas", e);
        } finally {
            setLoadingSteps(false);
        }
    };

    const handleSave = async () => {
        if (!localData) return;
        setSaving(true);
        try {
            // Mapear localData para payload esperado pelo backend
            // /api/integration/metrics/:store_id
            await api.post(`/api/integration/metrics/${localData.id}`, {
                integrador: localData.integrador,
                start_date: localData.start_date,
                end_date: localData.end_date,
                documentation_status: localData.doc_status,
                post_go_live_bugs: localData.bugs,
                churn_risk: localData.churn_risk
            });
            await onSave();
            onClose();
        } catch (e: any) {
            alert("Erro ao salvar: " + (e.response?.data?.error || e.message));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !localData) return null;

    const ReadOnlyField = ({ label, value, className = "" }: { label: string, value: string | number | null | undefined, className?: string }) => (
        <div className={className}>
            <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">{label}</span>
            <span className="text-sm font-medium text-slate-700 break-words">{value ?? '-'}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white text-slate-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <span className="text-2xl">🔌</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-900 leading-none">{localData.name}</h2>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-200 text-slate-500">
                                    #{localData.id}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                {fullStore?.clickup_url && (
                                    <a
                                        href={fullStore.clickup_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-orange-600 hover:underline flex items-center gap-1"
                                    >
                                        🔗 Abrir no ClickUp (#{fullStore.clickup_id})
                                    </a>
                                )}
                                <span>|</span>
                                <span>Rede: <strong className="text-slate-700">{localData.rede || 'N/A'}</strong></span>
                                <span>|</span>
                                <span>Integrador: <strong className="text-slate-700">{localData.integrador || 'N/D'}</strong></span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs Switcher */}
                <div className="flex px-6 border-b border-slate-200 bg-white shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'info'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        📝 Dados da Integração
                    </button>
                    <button
                        onClick={() => setActiveTab('steps')}
                        className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'steps'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        ⚡ Cronograma (Etapas)
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'history'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        🕒 Histórico de Mudanças
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'info' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* LEFT COLUMN: Main Info & Status */}
                            <div className="space-y-6 lg:col-span-2">
                                {/* Datas e Prazos */}
                                <div className="bg-slate-50/30 rounded-xl p-5 border border-slate-200">
                                    <h4 className="text-xs font-bold text-orange-600 uppercase mb-4 flex items-center gap-2">
                                        📅 Datas da Integração
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">Data Início</span>
                                            <input
                                                type="date"
                                                className="w-full bg-transparent border-b border-orange-200 text-sm font-bold text-orange-700 outline-none focus:border-orange-500 transition-colors py-0.5"
                                                value={localData.start_date ? localData.start_date.split('T')[0] : ''}
                                                onChange={(e) => setLocalData({ ...localData, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] uppercase text-slate-400 font-bold mb-0.5">Data Fim (Go-Live)</span>
                                            <input
                                                type="date"
                                                className="w-full bg-transparent border-b border-orange-200 text-sm font-bold text-orange-700 outline-none focus:border-orange-500 transition-colors py-0.5"
                                                value={localData.end_date ? localData.end_date.split('T')[0] : ''}
                                                onChange={(e) => setLocalData({ ...localData, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <ReadOnlyField label="SLA (Dias)" value={localData.sla_days} />
                                        <ReadOnlyField label="Status Atual" value={localData.status} className={localData.status === 'CONCLUÍDO' ? 'text-emerald-500' : ''} />
                                    </div>
                                </div>

                                {/* Configurações Editáveis (Formulário Principal) */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">
                                        ✏️ Edição & Métricas
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Integrador Responsável</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                                value={localData.integrador || ''}
                                                onChange={e => setLocalData({ ...localData, integrador: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Status da Documentação</label>
                                            <select
                                                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                                value={localData.doc_status}
                                                onChange={e => setLocalData({ ...localData, doc_status: e.target.value as any })}
                                            >
                                                <option value="PENDING">Pendente 🟡</option>
                                                <option value="PARTIAL">Parcial 🟠</option>
                                                <option value="DONE">Concluído ✅</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Bugs Pós-Live (30 dias)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
                                                value={localData.bugs}
                                                onChange={e => setLocalData({ ...localData, bugs: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>

                                        <div className="flex items-end">
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 w-full">
                                                <input
                                                    type="checkbox"
                                                    id="checkChurn"
                                                    className="w-5 h-5 accent-red-500"
                                                    checked={localData.churn_risk}
                                                    onChange={e => setLocalData({ ...localData, churn_risk: e.target.checked })}
                                                />
                                                <label htmlFor="checkChurn" className="text-sm font-bold text-slate-700 cursor-pointer">
                                                    Risco de Churn (Sinalizar)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Actions */}
                            <div className="space-y-6">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Ações</h4>

                                    <button
                                        onClick={() => localData.id && onDeepSync(localData.id)}
                                        disabled={isDeepSyncing || saving}
                                        className="w-full py-3 mb-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-lg border border-orange-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isDeepSyncing ? <span className="animate-spin">🔄</span> : '⚡'}
                                        {isDeepSyncing ? 'Sincronizando...' : 'Rodar Deep Sync'}
                                    </button>

                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-lg shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <span className="animate-spin">🔄</span> : '💾'}
                                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>

                                <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200 text-xs text-slate-500">
                                    <p className="mb-2">⚡ <strong>Deep Sync:</strong> Força a atualização completa de logs e histórico do ClickUp.</p>
                                    <p>ℹ️ As datas de início e fim são sincronizadas automaticamente com o ClickUp, mas podem ser ajustadas manualmente aqui.</p>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'steps' ? (
                        <div className="space-y-4 max-w-5xl mx-auto">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-6">
                                ⚡ Etapas da Integração (ClickUp)
                            </h4>

                            {loadingSteps ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-400 text-sm font-medium">Carregando etapas...</p>
                                </div>
                            ) : steps.length === 0 ? (
                                <div className="bg-slate-50/30 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                                    <span className="text-4xl mb-3 block">🏜️</span>
                                    <p className="text-slate-500 font-medium">Nenhuma etapa encontrada nesta loja.</p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-100/50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Fase</th>
                                                <th className="px-4 py-3">Tarefa</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Conclusão</th>
                                                <th className="px-4 py-3">Responsável</th>
                                                <th className="px-4 py-3 text-right">Duração</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {steps
                                                // Optional: Filter only integration steps if desired. Currently showing all.
                                                // .filter(s => s.list_name === 'INTEGRACAO') 
                                                .map(step => (
                                                    <tr key={step.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                                                                {step.list_name}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-slate-700">
                                                            {step.step_name}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${step.status.toLowerCase().includes('done') || step.status.toLowerCase().includes('conclu')
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {step.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-mono text-slate-600">
                                                            {step.end_date || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                                            {step.assignee || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-xs text-orange-600">
                                                            {step.duration > 0 ? `${step.duration}d` : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-6">
                                📜 Histórico de Alterações
                            </h4>

                            {loadingLogs ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-400 text-sm font-medium">Carregando histórico...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="bg-slate-50/30 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                                    <span className="text-4xl mb-3 block">🏜️</span>
                                    <p className="text-slate-500 font-medium">Nenhum histórico registrado.</p>
                                </div>
                            ) : (
                                <div className="relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                    {logs.map((log) => (
                                        <div key={log.id} className="relative pl-10 pb-8 last:pb-0">
                                            <div className="absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center border-4 border-white z-10 shadow-sm bg-orange-100 text-orange-600">
                                                📝
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {log.field}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(log.at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="text-xs bg-slate-50/50 p-2 rounded border border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-red-400 line-through">{log.old || 'Vazio'}</span>
                                                        <span className="text-slate-400">➔</span>
                                                        <span className="text-emerald-500 font-bold">{log.new || 'Vazio'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
