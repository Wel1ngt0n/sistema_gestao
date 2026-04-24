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
        if (!window.confirm(`ATENÇÃO: Deseja excluir permanentemente a loja "${editedStore.name}"?`)) return;
        
        setIsDeleting(true);
        try {
            await api.delete(`/api/stores/${editedStore.id}`);
            onClose();
            window.location.reload(); 
        } catch (e) {
            console.error("Erro ao excluir loja:", e);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleChange = (field: keyof Store, value: any) => {
        if (!editedStore) return;
        setEditedStore({ ...editedStore, [field]: value });
    };

    if (!isOpen || !editedStore) return null;

    const slaPercent = Math.min(100, Math.round(((editedStore.dias_em_transito || 0) / (editedStore.tempo_contrato || 90)) * 100));
    const isIdleCritical = (editedStore.idle_days || 0) > 7;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-6xl w-full max-h-[90vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-200">
                    
                    {/* Header: Cockpit Top */}
                    <div className="bg-white border-b border-slate-100 px-8 py-6 shrink-0 flex items-start justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editedStore.name}</h2>
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                    {editedStore.custom_id || "N/A"}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <a href={editedStore.clickup_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                                    <LinkIcon size={14} /> ClickUp
                                </a>
                                <span className="text-slate-200">•</span>
                                <span>Resp: {editedStore.implantador || 'N/A'}</span>
                            </div>
                            {/* Badges Rápidos */}
                            <div className="flex gap-2 pt-1">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider border border-blue-100">
                                    {editedStore.status}
                                </span>
                                <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${slaPercent >= 100 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    SLA: {slaPercent}%
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleDeleteStore} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Excluir Loja">
                                <Trash2 size={20} />
                            </button>
                            <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                <X size={28} />
                            </button>
                        </div>
                    </div>

                    {/* Resumo de Métricas (Igual ao Screenshot) */}
                    <div className="bg-white px-8 py-5 border-b border-slate-100 shrink-0 grid grid-cols-2 md:grid-cols-6 gap-8">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Dias Decorridos</p>
                            <p className="text-xl font-black text-slate-800">{editedStore.dias_em_transito || 0} <span className="text-slate-300 text-lg">/ {editedStore.tempo_contrato}</span></p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">MRR</p>
                            <p className="text-xl font-black text-emerald-600">R$ {editedStore.valor_mensalidade?.toLocaleString('pt-BR') || '0'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Previsão</p>
                            <p className="text-sm font-bold text-slate-700 mt-1">{editedStore.data_previsao ? editedStore.data_previsao.split('-').reverse().join('/') : '-'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Início Operacional</p>
                            <p className="text-sm font-bold text-slate-700 mt-1">{editedStore.data_inicio ? editedStore.data_inicio.split('-').reverse().join('/') : 'N/A'}</p>
                        </div>
                        <div className="col-span-2 space-y-1 text-right md:text-left">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Ações Rápidas</p>
                            <div className="flex gap-2 mt-1">
                                <button onClick={() => handleChange('status_norm', 'IN_PROGRESS')} className="px-4 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg hover:bg-blue-100 transition uppercase tracking-wider">Iniciar</button>
                                <button onClick={() => onDeepSync(editedStore.id)} disabled={isDeepSyncing} className="px-4 py-1.5 bg-teal-50 text-teal-700 text-[10px] font-black rounded-lg hover:bg-teal-100 transition flex items-center gap-1 uppercase tracking-wider">
                                    {isDeepSyncing ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />} Deep Sync
                                </button>
                                <button onClick={() => setActiveTab('pausas')} className="px-4 py-1.5 bg-slate-50 text-slate-500 text-[10px] font-black rounded-lg hover:bg-slate-100 transition uppercase tracking-wider">Pausar</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar: Botões Numerados */}
                        <div className="w-64 bg-white border-r border-slate-100 flex flex-col py-6 shrink-0 overflow-y-auto">
                            {[
                                { id: 'operacional', label: '1. Op & Edição' },
                                { id: 'analise', label: '2. Análise' },
                                { id: 'cronograma', label: '3. Etapas' },
                                { id: 'historico', label: '4. Histórico' },
                                { id: 'pausas', label: '5. Pausas' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-8 py-4 text-left text-sm font-bold transition-all relative ${
                                        activeTab === tab.id 
                                        ? 'text-blue-600' 
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {activeTab === tab.id && <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-white overflow-y-auto p-10">
                            
                            {/* ABA 1: Operacional */}
                            {activeTab === 'operacional' && (
                                <div className="space-y-10 max-w-4xl">
                                    
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Início Operacional</label>
                                            <input type="date" value={editedStore.manual_start_date || ''} onChange={(e) => handleChange('manual_start_date', e.target.value)} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm font-bold text-slate-700" />
                                            <p className="text-[10px] text-slate-400 ml-1">Esta data sobrescreve a original do ClickUp para KPIs.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dias de Contrato</label>
                                            <input type="number" value={editedStore.tempo_contrato || ''} onChange={(e) => handleChange('tempo_contrato', parseInt(e.target.value))} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm font-bold text-slate-700" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rede</label>
                                            <input type="text" value={editedStore.rede || ''} onChange={(e) => handleChange('rede', e.target.value)} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm font-bold text-slate-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vínculo Matriz</label>
                                            <select value={editedStore.parent_id || ''} onChange={(e) => handleChange('parent_id', e.target.value ? parseInt(e.target.value) : null)} className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition text-sm font-bold text-slate-700">
                                                <option value="">Nenhuma</option>
                                                {matrices.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* CONTROLES OPERACIONAIS (Novos campos integrados) */}
                                    <div className="pt-6 border-t border-slate-50">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Checklist de Operação</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <button onClick={() => handleChange('delivered_with_quality', !editedStore.delivered_with_quality)} 
                                                    className={`p-4 rounded-2xl border text-left transition ${editedStore.delivered_with_quality ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Qualidade</p>
                                                <p className={`text-xs font-bold mt-1 ${editedStore.delivered_with_quality ? 'text-emerald-700' : 'text-slate-600'}`}>Loja Completa?</p>
                                            </button>
                                            <button onClick={() => handleChange('teve_retrabalho', !editedStore.teve_retrabalho)}
                                                    className={`p-4 rounded-2xl border text-left transition ${editedStore.teve_retrabalho ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Execução</p>
                                                <p className={`text-xs font-bold mt-1 ${editedStore.teve_retrabalho ? 'text-rose-700' : 'text-slate-600'}`}>Houve Retrabalho?</p>
                                            </button>
                                            <button onClick={() => handleChange('considerar_tempo', !editedStore.considerar_tempo)}
                                                    className={`p-4 rounded-2xl border text-left transition ${editedStore.considerar_tempo ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Métricas</p>
                                                <p className={`text-xs font-bold mt-1 ${editedStore.considerar_tempo ? 'text-blue-700' : 'text-slate-600'}`}>Contar SLA?</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Observações Feed */}
                                    <div className="pt-10 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <MessageSquarePlus size={18} className="text-slate-400" /> Histórico Interno / Observações
                                        </h3>
                                        
                                        <div className="flex gap-2 mb-8 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                                            <select value={newObsType} onChange={(e) => setNewObsType(e.target.value)} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none text-slate-600">
                                                <option value="observacao">Observação</option>
                                                <option value="alerta">Alerta</option>
                                                <option value="bloqueio">Bloqueio</option>
                                            </select>
                                            <input 
                                                type="text" 
                                                value={newObs}
                                                onChange={(e) => setNewObs(e.target.value)}
                                                placeholder="Adicione uma nota rápida..."
                                                className="flex-1 px-4 py-2 bg-transparent outline-none text-sm font-medium text-slate-700"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddObs()}
                                            />
                                            <button onClick={handleAddObs} disabled={obsLoading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-100">
                                                {obsLoading ? '...' : 'Salvar'}
                                            </button>
                                        </div>

                                        <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                            {observations.map((obs) => (
                                                <div key={obs.id} className="p-4 bg-slate-50/30 rounded-2xl border border-slate-100 flex gap-4 transition hover:border-slate-200">
                                                    <div className={`w-1 rounded-full shrink-0 ${
                                                        obs.tipo === 'alerta' ? 'bg-amber-400' : 
                                                        obs.tipo === 'bloqueio' ? 'bg-rose-500' : 'bg-blue-400'
                                                    }`} />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{obs.texto}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">{obs.autor} • {new Date(obs.created_at).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ABA 2: ANÁLISE */}
                            {activeTab === 'analise' && (
                                <div className="space-y-10 max-w-4xl">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Risco</p>
                                            <p className={`text-6xl font-black mt-4 tracking-tighter ${editedStore.risk_score > 70 ? 'text-rose-500' : editedStore.risk_score > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>{editedStore.risk_score}</p>
                                            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">{editedStore.risk_level}</p>
                                        </div>
                                        <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SLA Efetivo</p>
                                            <p className="text-6xl font-black mt-4 text-slate-800 tracking-tighter">{editedStore.dias_em_transito}d</p>
                                            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Limite: {editedStore.tempo_contrato}d</p>
                                        </div>
                                        <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idle Days</p>
                                            <p className={`text-6xl font-black mt-4 tracking-tighter ${isIdleCritical ? 'text-orange-500' : 'text-slate-800'}`}>{editedStore.idle_days || 0}d</p>
                                            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Inatividade</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-10 bg-blue-50/30 rounded-[3rem] border border-blue-100 relative overflow-hidden">
                                        <h3 className="text-lg font-black text-blue-900 mb-6 flex items-center gap-3">
                                            <Activity size={24} className="text-blue-400" /> Diagnóstico Gerencial
                                        </h3>
                                        <p className="text-blue-800/80 leading-relaxed font-semibold text-lg">
                                            {editedStore.risk_score > 70 
                                                ? "⚠️ CRÍTICO: A loja apresenta desvios severos de prazo e inatividade. Recomendamos contato imediato com o responsável para desbloqueio operacional."
                                                : isIdleCritical
                                                ? "⚠️ ATENÇÃO: Loja em idle há mais de 7 dias. Verifique se há pendências com o cliente ou travamento técnico na etapa atual."
                                                : "✅ SAUDÁVEL: O fluxo de implantação está dentro dos parâmetros normais de SLA e engajamento."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ABA 3: ETAPAS */}
                            {activeTab === 'cronograma' && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-slate-800 mb-8">Fluxo de Etapas (Edição Manual)</h3>
                                    <div className="overflow-x-auto rounded-3xl border border-slate-100">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
                                                <tr>
                                                    <th className="px-6 py-4 text-left">Etapa</th>
                                                    <th className="px-6 py-4 text-left">Status</th>
                                                    <th className="px-6 py-4 text-left">Início Real</th>
                                                    <th className="px-6 py-4 text-left">Fim Real</th>
                                                    <th className="px-6 py-4 text-right">Duração</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {steps.map((s) => (
                                                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                                                        <td className="px-6 py-5 font-bold text-slate-700">{s.step_name}</td>
                                                        <td className="px-6 py-5">
                                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                                s.status === 'DONE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                            }`}>{s.status}</span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <input type="date" value={s.start_date || ''} onChange={(e) => handleStepChange(s.id, 'start_date', e.target.value)} className="p-1 bg-transparent border-b border-slate-200 outline-none text-xs font-bold text-slate-600" />
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <input type="date" value={s.end_date || ''} onChange={(e) => handleStepChange(s.id, 'end_date', e.target.value)} className="p-1 bg-transparent border-b border-slate-200 outline-none text-xs font-bold text-slate-600" />
                                                        </td>
                                                        <td className="px-6 py-5 text-right font-black text-slate-800">{s.duration}d</td>
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
                                    <h3 className="text-xl font-bold text-slate-800 mb-8">Log de Mudanças</h3>
                                    <div className="space-y-4">
                                        {logs.map((log, idx) => (
                                            <div key={idx} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex gap-4 transition hover:border-slate-200">
                                                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                                    <Activity size={18} className="text-slate-300" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{log.field || 'Sistema'}</p>
                                                    <p className="text-xs text-slate-500 mt-2 font-medium">
                                                        De <span className="font-bold text-rose-500">{log.old || '-'}</span> para <span className="font-bold text-emerald-600">{log.new || '-'}</span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">{log.at} • {log.source}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-white border-t border-slate-100 px-8 py-6 shrink-0 flex justify-end gap-3 shadow-sm">
                        <button onClick={onClose} className="px-8 py-2.5 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition">
                            Cancelar
                        </button>
                        <button onClick={() => onSave(editedStore)} className="px-10 py-3 bg-blue-600 text-white text-[11px] font-black rounded-xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition flex items-center gap-2 uppercase tracking-widest">
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>

                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
