import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Store } from './types';
import { 
    X, AlertTriangle, Clock, 
    Activity, Save, MessageSquarePlus, Loader2, Link as LinkIcon, PauseCircle, Trash2
} from 'lucide-react';
import { api } from '../../services/api';

interface MonitorStoreModalV2Props {
    isOpen: boolean;
    onClose: () => void;
    store: Store | null;
    matrices: { id: number, name: string }[];
    onSave: (store: Store) => void;
    onDeepSync: (storeId: number) => void;
    isDeepSyncing: boolean;
}

interface Observation {
    id: number;
    texto: string;
    autor: string;
    tipo: string;
    created_at: string;
}

export default function MonitorStoreModalV2({ isOpen, onClose, store, matrices, onSave, onDeepSync, isDeepSyncing }: MonitorStoreModalV2Props) {
    const [activeTab, setActiveTab] = useState<'operacional' | 'analise' | 'cronograma' | 'historico' | 'pausas'>('operacional');
    const [editedStore, setEditedStore] = useState<Store | null>(null);
    const [observations, setObservations] = useState<Observation[]>([]);
    const [steps, setSteps] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [pauses, setPauses] = useState<any[]>([]);
    const [newObs, setNewObs] = useState('');
    const [newObsType, setNewObsType] = useState('observacao');
    const [obsLoading, setObsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (store && isOpen) {
            setEditedStore({ ...store });
            loadObservations(store.id);
            loadTabData(store.id, activeTab);
        }
    }, [store, isOpen, activeTab]);

    const loadTabData = async (id: number, tab: string) => {
        try {
            if (tab === 'cronograma') {
                const res = await api.get(`/api/stores/${id}/steps`);
                setSteps(res.data);
            } else if (tab === 'historico') {
                const res = await api.get(`/api/stores/${id}/logs`);
                setLogs(res.data);
            } else if (tab === 'pausas') {
                const res = await api.get(`/api/stores/${id}/pauses`);
                setPauses(res.data);
            }
        } catch (e) {
            console.error(`Erro ao buscar dados da aba ${tab}:`, e);
        }
    };

    const loadObservations = async (id: number) => {
        try {
            const res = await api.get(`/api/stores/${id}/observations`);
            setObservations(res.data);
        } catch (e) {
            console.error("Erro ao carregar observações:", e);
        }
    };

    const handleStepChange = async (stepId: number, field: string, value: string) => {
        try {
            if (!editedStore) return;
            await api.put(`/api/stores/${editedStore.id}/steps/${stepId}`, { [field]: value });
            loadTabData(editedStore.id, 'cronograma');
        } catch (e) {
            console.error("Erro ao atualizar etapa:", e);
        }
    };

    const handleAddObs = async () => {
        if (!newObs.trim() || !editedStore) return;
        setObsLoading(true);
        try {
            await api.post(`/api/stores/${editedStore.id}/observations`, {
                texto: newObs,
                tipo: newObsType
            });
            setNewObs('');
            loadObservations(editedStore.id);
        } catch (e) {
            console.error("Erro ao adicionar observação:", e);
        } finally {
            setObsLoading(false);
        }
    };

    const handleDeleteStore = async () => {
        if (!editedStore) return;
        if (!window.confirm(`ATENÇÃO: Deseja excluir permanentemente a loja "${editedStore.name}"? Esta ação não pode ser desfeita.`)) return;
        
        setIsDeleting(true);
        try {
            await api.delete(`/api/stores/${editedStore.id}`);
            onClose();
            // Avisar o pai para atualizar a lista
            window.location.reload(); 
        } catch (e) {
            console.error("Erro ao excluir loja:", e);
            alert("Erro ao excluir loja.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleChange = (field: keyof Store, value: any) => {
        if (!editedStore) return;
        setEditedStore({ ...editedStore, [field]: value });
    };

    const handleSave = () => {
        if (editedStore) onSave(editedStore);
    };

    if (!isOpen || !editedStore) return null;

    // Métricas de exibição
    const slaPercent = Math.min(100, Math.round(((editedStore.dias_em_transito || 0) / (editedStore.tempo_contrato || 90)) * 100));
    const isIdleCritical = (editedStore.idle_days || 0) > 7;

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-hidden">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />

                <Dialog.Panel className="relative bg-white w-full max-w-6xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col h-[90vh]">
                    
                    {/* HEADER FIXO */}
                    <div className="px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                                <p className="text-xl font-black text-slate-800">#{editedStore.custom_id || editedStore.id}</p>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{editedStore.name}</h2>
                                <div className="flex gap-2 mt-1 items-center">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider">{editedStore.status}</span>
                                    <span className="text-slate-300">•</span>
                                    <a href={editedStore.clickup_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-400 hover:text-blue-500 transition text-[10px] font-bold uppercase tracking-wider">
                                        <LinkIcon size={12} /> ClickUp
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleDeleteStore} 
                                disabled={isDeleting}
                                className="px-4 py-2 text-rose-500 hover:bg-rose-50 text-xs font-bold rounded-xl transition flex items-center gap-2 border border-rose-100"
                            >
                                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir Loja
                            </button>
                            <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition flex items-center gap-2">
                                <Save size={18} /> Salvar Alterações
                            </button>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* CORPO DO COCKPIT */}
                    <div className="flex flex-1 overflow-hidden">
                        
                        {/* SIDEBAR DE NAVEGAÇÃO */}
                        <div className="w-64 bg-slate-50/50 border-r border-slate-100 p-6 flex flex-col gap-2 shrink-0">
                            {[
                                { id: 'operacional', label: 'Operacional & Edição', icon: <Activity size={18} /> },
                                { id: 'analise', label: 'Análise da Loja', icon: <AlertTriangle size={18} /> },
                                { id: 'cronograma', label: 'Cronograma', icon: <Clock size={18} /> },
                                { id: 'historico', label: 'Histórico', icon: <Activity size={18} /> },
                                { id: 'pausas', label: 'Pausas & Descontos', icon: <PauseCircle size={18} /> },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                                        activeTab === tab.id 
                                        ? 'bg-white text-slate-900 shadow-sm border border-slate-100 translate-x-1' 
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                            
                            <div className="mt-auto p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ações Rápidas</p>
                                <div className="flex flex-col gap-2 mt-2">
                                    <button onClick={() => handleChange('status_norm', 'IN_PROGRESS')} className="w-full px-3 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition text-left">Iniciar Implantação</button>
                                    <button onClick={() => onDeepSync(editedStore.id)} disabled={isDeepSyncing} className="w-full px-3 py-2 bg-teal-50 text-teal-700 text-xs font-bold rounded-lg hover:bg-teal-100 transition flex items-center gap-2">
                                        {isDeepSyncing ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />} Deep Sync
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ÁREA DE CONTEÚDO (SCROLLABLE) */}
                        <div className="flex-1 overflow-y-auto p-8 bg-white">
                            
                            {/* ABA 1: OPERACIONAL & EDIÇÃO */}
                            {activeTab === 'operacional' && (
                                <div className="space-y-8 max-w-4xl">
                                    
                                    {/* SEÇÃO: ESTRUTURAL */}
                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Dados Estruturais & Rede</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 ml-1">Tipo de Loja</label>
                                                <select 
                                                    value={editedStore.tipo_loja || 'Filial'} 
                                                    onChange={(e) => handleChange('tipo_loja', e.target.value)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                                                >
                                                    <option value="Matriz">Matriz</option>
                                                    <option value="Filial">Filial</option>
                                                    <option value="Solo">Solo</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 ml-1">Vinculador de Matriz</label>
                                                <select 
                                                    value={editedStore.parent_id || ''} 
                                                    onChange={(e) => handleChange('parent_id', e.target.value ? parseInt(e.target.value) : null)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                                                >
                                                    <option value="">Nenhuma (Independente)</option>
                                                    {matrices.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 ml-1">Dias de Contrato (SLA)</label>
                                                <input 
                                                    type="number" 
                                                    value={editedStore.tempo_contrato || 90} 
                                                    onChange={(e) => handleChange('tempo_contrato', parseInt(e.target.value))}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 ml-1">Status Financeiro</label>
                                                <select 
                                                    value={editedStore.financeiro_status || 'OK'} 
                                                    onChange={(e) => handleChange('financeiro_status', e.target.value)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                                                >
                                                    <option value="OK">OK</option>
                                                    <option value="PENDING">PENDENTE</option>
                                                    <option value="SUSPENDED">SUSPENSO</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    {/* SEÇÃO: DATAS OPERACIONAIS */}
                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Cronograma Operacional</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 ml-1">Data Início (Replanejado)</label>
                                                <input 
                                                    type="date" 
                                                    value={editedStore.manual_start_date || ''} 
                                                    onChange={(e) => handleChange('manual_start_date', e.target.value)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 ml-1">Data Conclusão (Manual)</label>
                                                <input 
                                                    type="date" 
                                                    value={editedStore.manual_finished_at || ''} 
                                                    onChange={(e) => handleChange('manual_finished_at', e.target.value)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* SEÇÃO: CONTROLES OPERACIONAIS */}
                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Controle Operacional & Qualidade</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-24 ${editedStore.delivered_with_quality ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}
                                                 onClick={() => handleChange('delivered_with_quality', !editedStore.delivered_with_quality)}>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Qualidade</p>
                                                    <p className="text-xs font-bold mt-1 text-slate-700 leading-tight">Chegou Completa?</p>
                                                </div>
                                                <div className="flex justify-end">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${editedStore.delivered_with_quality ? 'bg-emerald-500 border-emerald-600' : 'bg-white border-slate-300'}`}>
                                                        {editedStore.delivered_with_quality && <div className="w-2 h-2 bg-white rounded-full" />}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-24 ${editedStore.teve_retrabalho ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}
                                                 onClick={() => handleChange('teve_retrabalho', !editedStore.teve_retrabalho)}>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Gargalos</p>
                                                    <p className="text-xs font-bold mt-1 text-slate-700 leading-tight">Houve Retrabalho?</p>
                                                </div>
                                                <div className="flex justify-end">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${editedStore.teve_retrabalho ? 'bg-rose-500 border-rose-600' : 'bg-white border-slate-300'}`}>
                                                        {editedStore.teve_retrabalho && <div className="w-2 h-2 bg-white rounded-full" />}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-24 ${editedStore.considerar_tempo ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}
                                                 onClick={() => handleChange('considerar_tempo', !editedStore.considerar_tempo)}>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">SLA</p>
                                                    <p className="text-xs font-bold mt-1 text-slate-700 leading-tight">Considerar SLA?</p>
                                                </div>
                                                <div className="flex justify-end">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${editedStore.considerar_tempo ? 'bg-blue-500 border-blue-600' : 'bg-white border-slate-300'}`}>
                                                        {editedStore.considerar_tempo && <div className="w-2 h-2 bg-white rounded-full" />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* SEÇÃO: OBSERVACÕES */}
                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Notas Internas & Observações</h3>
                                        <div className="flex gap-3 mb-4">
                                            <input 
                                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                                                placeholder="Escreva uma observação importante..."
                                                value={newObs}
                                                onChange={(e) => setNewObs(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddObs()}
                                            />
                                            <select 
                                                value={newObsType}
                                                onChange={(e) => setNewObsType(e.target.value)}
                                                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                            >
                                                <option value="observacao">OBS</option>
                                                <option value="alerta">ALERTA</option>
                                                <option value="bloqueio">BLOQUEIO</option>
                                            </select>
                                            <button 
                                                onClick={handleAddObs}
                                                disabled={obsLoading || !newObs.trim()}
                                                className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
                                            >
                                                {obsLoading ? <Loader2 size={18} className="animate-spin" /> : <MessageSquarePlus size={18} />}
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {observations.map((obs) => (
                                                <div key={obs.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex gap-4">
                                                    <div className={`w-1.5 rounded-full shrink-0 ${
                                                        obs.tipo === 'alerta' ? 'bg-amber-400' : 
                                                        obs.tipo === 'bloqueio' ? 'bg-rose-500' : 'bg-blue-400'
                                                    }`} />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{obs.texto}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-wider">
                                                            {obs.autor} • {new Date(obs.created_at).toLocaleDateString('pt-BR')} {new Date(obs.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            {observations.length === 0 && (
                                                <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                                    <p className="text-slate-400 text-xs font-medium italic">Nenhuma observação interna ainda.</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* ABA 2: ANÁLISE GERENCIAL */}
                            {activeTab === 'analise' && (
                                <div className="space-y-8 max-w-4xl">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-200 flex flex-col items-center text-center shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risco Geral</p>
                                            <p className={`text-6xl font-black mt-4 tracking-tighter ${
                                                editedStore.risk_score > 70 ? 'text-rose-500' : 
                                                editedStore.risk_score > 40 ? 'text-amber-500' : 'text-emerald-500'
                                            }`}>{editedStore.risk_score}</p>
                                            <p className="text-sm font-bold text-slate-600 mt-2 uppercase tracking-wide">{editedStore.risk_level}</p>
                                        </div>
                                        <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-200 flex flex-col items-center text-center shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">SLA Efetivo</p>
                                            <p className="text-6xl font-black mt-4 text-slate-800 tracking-tighter">{editedStore.dias_em_transito}d</p>
                                            <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-wide">Prazo: {editedStore.tempo_contrato}d</p>
                                        </div>
                                        <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-200 flex flex-col items-center text-center shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Boost</p>
                                            <p className="text-6xl font-black mt-4 text-teal-600 tracking-tighter">+{editedStore.ai_boost || 0}</p>
                                            <p className="text-sm font-bold text-teal-600 mt-2 uppercase tracking-wide">Refinamento IA</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-10 bg-blue-50/50 rounded-[40px] border border-blue-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <Activity size={120} />
                                        </div>
                                        <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-3">
                                            <Activity size={24} /> Diagnóstico Analítico
                                        </h3>
                                        <p className="text-blue-800/80 leading-relaxed font-semibold text-lg">
                                            {editedStore.risk_score > 70 
                                                ? "ALERTA CRÍTICO: Esta loja ultrapassou limites de SLA e apresenta inatividade prolongada. Exige revisão estratégica da implantação e contato com os responsáveis técnicos."
                                                : editedStore.idle_days > 7
                                                ? "ATENÇÃO: Embora o SLA esteja saudável, a loja está sem movimentação há mais de uma semana. Verifique possíveis bloqueios externos ou falta de retorno do cliente."
                                                : "OPERAÇÃO SAUDÁVEL: A loja segue dentro dos parâmetros esperados. Recomenda-se manter o fluxo atual e focar na qualidade da entrega final."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ABA 3: CRONOGRAMA & ETAPAS */}
                            {activeTab === 'cronograma' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-slate-800">Fluxo de Etapas (Edição Manual)</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizado via ClickUp</p>
                                    </div>
                                    <div className="overflow-x-auto rounded-[24px] border border-slate-100 shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                                                <tr>
                                                    <th className="px-6 py-4 text-left">Etapa da Implantação</th>
                                                    <th className="px-6 py-4 text-left">Status</th>
                                                    <th className="px-6 py-4 text-left">Início Real</th>
                                                    <th className="px-6 py-4 text-left">Fim Real</th>
                                                    <th className="px-6 py-4 text-right">Duração</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {steps.map((s) => (
                                                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="px-6 py-5 font-bold text-slate-700">{s.step_name}</td>
                                                        <td className="px-6 py-5">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                                s.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                            }`}>{s.status}</span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <input 
                                                                type="date" 
                                                                value={s.start_date || ''} 
                                                                onChange={(e) => handleStepChange(s.id, 'start_date', e.target.value)}
                                                                className="p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-[11px] font-bold text-slate-600"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <input 
                                                                type="date" 
                                                                value={s.end_date || ''} 
                                                                onChange={(e) => handleStepChange(s.id, 'end_date', e.target.value)}
                                                                className="p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-[11px] font-bold text-slate-600"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-5 text-right font-black text-slate-700 text-base">{s.duration}d</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ABA 4: HISTÓRICO */}
                            {activeTab === 'historico' && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-slate-800 mb-6">Log de Alterações & Auditoria</h3>
                                    <div className="space-y-4">
                                        {logs.map((log, idx) => (
                                            <div key={idx} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex gap-5 transition-all hover:border-slate-200">
                                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                                    <Activity size={20} className="text-slate-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{log.field || 'Alteração System'}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{log.at}</p>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-2 font-medium">
                                                        De <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded font-bold">{log.old || 'Nulo'}</span> para <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold">{log.new || 'Nulo'}</span>
                                                    </p>
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-bold rounded uppercase tracking-widest">{log.source}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ABA 5: PAUSAS */}
                            {activeTab === 'pausas' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-xl font-bold text-slate-800">Gestão de Pausas & Impacto SLA</h3>
                                        <button className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-2xl hover:bg-slate-800 transition shadow-lg shadow-slate-200">Registrar Nova Pausa</button>
                                    </div>
                                    <div className="space-y-4">
                                        {pauses.map((p, idx) => (
                                            <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex justify-between items-center transition-all hover:shadow-md">
                                                <div className="flex gap-5 items-center">
                                                    <div className={`p-3 rounded-2xl ${p.is_active ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                                                        <PauseCircle size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-black text-slate-800 leading-tight">{p.reason || 'Pausa Operacional'}</p>
                                                        <p className="text-xs text-slate-500 mt-1 font-bold">
                                                            {p.start_date.split('-').reverse().join('/')} ➔ {p.end_date ? p.end_date.split('-').reverse().join('/') : 'Ativo'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{p.duration}d</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Impacto no SLA</p>
                                                </div>
                                            </div>
                                        ))}
                                        {pauses.length === 0 && (
                                            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-[40px]">
                                                <PauseCircle size={64} className="mx-auto text-slate-100 mb-6" />
                                                <p className="text-slate-400 font-bold text-lg">Nenhuma pausa registrada para esta loja.</p>
                                                <p className="text-slate-300 text-sm mt-1">O SLA está correndo normalmente.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* RODAPÉ DE AÇÕES */}
                    <div className="bg-white border-t border-slate-100 px-10 py-6 shrink-0 flex justify-end gap-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                        <button onClick={onClose} className="px-8 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition">
                            Cancelar
                        </button>
                        <button onClick={handleSave} className="px-10 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 transition shadow-xl shadow-blue-100 flex items-center gap-3">
                            <Save size={20} /> Salvar Tudo
                        </button>
                    </div>

                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
