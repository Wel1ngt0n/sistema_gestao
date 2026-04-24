import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Store } from './types';
import { 
    X, AlertTriangle, Clock, 
    Activity, Save, MessageSquarePlus, Loader2, Link as LinkIcon
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
    const [newObs, setNewObs] = useState('');
    const [newObsType, setNewObsType] = useState('observacao');
    const [obsLoading, setObsLoading] = useState(false);

    useEffect(() => {
        if (store && isOpen) {
            setEditedStore({ ...store });
            loadObservations(store.id);
        }
    }, [store, isOpen]);

    const loadObservations = async (id: number) => {
        try {
            const res = await api.get(`/api/stores/${id}/observations`);
            setObservations(res.data);
        } catch (e) {
            console.error("Erro ao buscar obs:", e);
        }
    };

    const handleAddObs = async () => {
        if (!newObs.trim() || !store) return;
        setObsLoading(true);
        try {
            await api.post(`/api/stores/${store.id}/observations`, {
                texto: newObs,
                tipo: newObsType
            });
            setNewObs('');
            loadObservations(store.id);
        } catch (e) {
            console.error("Erro ao add obs:", e);
        } finally {
            setObsLoading(false);
        }
    };

    if (!isOpen || !editedStore) return null;

    const handleChange = (field: keyof Store, value: any) => {
        setEditedStore(prev => prev ? { ...prev, [field]: value } : null);
    };

    // Calculate quick metrics
    const slaPercent = Math.min(100, Math.round(((editedStore.dias_em_transito || 0) / (editedStore.tempo_contrato || 90)) * 100));
    
    let slaColor = "text-emerald-500 bg-emerald-50";
    if (slaPercent > 100) slaColor = "text-rose-600 bg-rose-50 border border-rose-200";
    else if (slaPercent > 80) slaColor = "text-orange-500 bg-orange-50 border border-orange-200";

    const isIdleCritical = (editedStore.idle_days || 0) > 7;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-6xl w-full max-h-[90vh] bg-slate-50 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-200">
                    
                    {/* Header: Cockpit Top */}
                    <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex items-start justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-slate-900">{editedStore.name}</h2>
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg uppercase tracking-wider">
                                    {editedStore.custom_id || "N/A"}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                                <a href={editedStore.clickup_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                                    <LinkIcon size={14} /> ClickUp
                                </a>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span>Resp: {editedStore.implantador || 'N/A'}</span>
                            </div>
                            {/* Badges Visuais */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                                    {editedStore.status_norm}
                                </span>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${slaColor}`}>
                                    SLA: {slaPercent}%
                                </span>
                                {isIdleCritical && (
                                    <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full border border-orange-200 flex items-center gap-1">
                                        <AlertTriangle size={12} /> Idle Crítico ({editedStore.idle_days}d)
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Quick Summary Block */}
                    <div className="bg-white px-8 py-5 border-b border-slate-200 shrink-0 grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dias Decorridos</p>
                            <p className="text-xl font-bold text-slate-800">{editedStore.dias_em_transito || 0} / {editedStore.tempo_contrato}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">MRR</p>
                            <p className="text-xl font-bold text-emerald-600">R$ {editedStore.valor_mensalidade?.toLocaleString('pt-BR') || '0,00'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Previsão</p>
                            <p className="text-sm font-semibold text-slate-700 mt-1">{editedStore.data_previsao ? editedStore.data_previsao.split('-').reverse().join('/') : '-'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Início Operacional</p>
                            <p className="text-sm font-semibold text-slate-700 mt-1">{editedStore.data_inicio ? editedStore.data_inicio.split('-').reverse().join('/') : 'N/A'}</p>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ações Rápidas</p>
                            <div className="flex gap-2 mt-1">
                                <button onClick={() => handleChange('status_norm', 'IN_PROGRESS')} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition">Iniciar</button>
                                <button onClick={() => onDeepSync(editedStore.id)} disabled={isDeepSyncing} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-bold rounded-lg hover:bg-teal-100 transition flex items-center gap-1">
                                    {isDeepSyncing ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />} Deep Sync
                                </button>
                                <button onClick={() => setActiveTab('pausas')} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition">Pausar</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar Tabs */}
                        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col py-4 shrink-0 overflow-y-auto">
                            {(['operacional', 'analise', 'cronograma', 'historico', 'pausas'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 text-left text-sm font-bold capitalize transition-colors ${
                                        activeTab === tab 
                                        ? 'bg-white text-blue-600 border-l-4 border-blue-600' 
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-l-4 border-transparent'
                                    }`}
                                >
                                    {tab === 'operacional' ? '1. Op & Edição' :
                                     tab === 'analise' ? '2. Análise' :
                                     tab === 'cronograma' ? '3. Etapas' :
                                     tab === 'historico' ? '4. Histórico' :
                                     '5. Pausas'}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-white overflow-y-auto p-8">
                            
                            {/* ABA 1: Operacional */}
                            {activeTab === 'operacional' && (
                                <div className="space-y-8 max-w-4xl">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Data Início Operacional</label>
                                            <input type="date" value={editedStore.data_inicio || ''} onChange={(e) => handleChange('data_inicio', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                            <p className="text-[10px] text-slate-400">Esta data sobrescreve a original do ClickUp para KPIs.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Dias de Contrato</label>
                                            <input type="number" value={editedStore.tempo_contrato || ''} onChange={(e) => handleChange('tempo_contrato', parseInt(e.target.value))} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Rede</label>
                                            <input type="text" value={editedStore.rede || ''} onChange={(e) => handleChange('rede', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Vínculo Matriz</label>
                                            <select value={editedStore.parent_id || ''} onChange={(e) => handleChange('parent_id', e.target.value ? parseInt(e.target.value) : null)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option value="">Nenhuma</option>
                                                {matrices.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Observações Privadas Feed */}
                                    <div className="mt-12 pt-8 border-t border-slate-200">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <MessageSquarePlus size={18} /> Histórico Interno / Observações
                                        </h3>
                                        
                                        <div className="flex gap-2 mb-6">
                                            <select value={newObsType} onChange={(e) => setNewObsType(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                                <option value="observacao">Observação</option>
                                                <option value="alerta">Alerta</option>
                                                <option value="bloqueio">Bloqueio</option>
                                                <option value="follow-up">Follow-up</option>
                                            </select>
                                            <input 
                                                type="text" 
                                                value={newObs}
                                                onChange={(e) => setNewObs(e.target.value)}
                                                placeholder="Adicione uma nota rápida..."
                                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddObs()}
                                            />
                                            <button onClick={handleAddObs} disabled={obsLoading} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
                                                {obsLoading ? 'Enviando...' : 'Salvar'}
                                            </button>
                                        </div>

                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                            {observations.length === 0 ? (
                                                <p className="text-sm text-slate-400 italic">Nenhuma observação registrada.</p>
                                            ) : (
                                                observations.map(obs => (
                                                    <div key={obs.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-3">
                                                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${obs.tipo === 'alerta' ? 'bg-orange-500' : obs.tipo === 'bloqueio' ? 'bg-rose-500' : 'bg-blue-400'}`} />
                                                        <div>
                                                            <p className="text-sm text-slate-700">{obs.texto}</p>
                                                            <p className="text-[10px] text-slate-400 mt-1 font-medium">{obs.autor} • {new Date(obs.created_at).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ABA 2: Análise */}
                            {activeTab === 'analise' && (
                                <div className="space-y-8 max-w-4xl">
                                    <h3 className="text-lg font-bold text-slate-800">Saúde e Riscos</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase">Prazo / SLA</p>
                                            <p className={`text-2xl font-black mt-2 ${slaPercent > 100 ? 'text-rose-600' : 'text-slate-800'}`}>{slaPercent}%</p>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase">Idle (S/ Movimento)</p>
                                            <p className={`text-2xl font-black mt-2 ${isIdleCritical ? 'text-orange-500' : 'text-slate-800'}`}>{editedStore.idle_days || 0}d</p>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase">Risco Geral</p>
                                            <p className="text-2xl font-black mt-2 text-slate-800">{editedStore.risk_score}/100</p>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase">AI Boost</p>
                                            <p className="text-2xl font-black mt-2 text-teal-600">+{editedStore.ai_boost || 0}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                                        <h4 className="text-sm font-bold text-blue-900 mb-2">Diagnóstico Rápido</h4>
                                        <p className="text-sm text-blue-800 leading-relaxed">
                                            {isIdleCritical && slaPercent > 100 
                                                ? "🚨 Esta loja está com atraso no SLA e apresenta um alto período de inatividade. Ação corretiva urgente é necessária para engajamento com o cliente."
                                                : isIdleCritical
                                                ? "⚠️ A loja está no prazo, mas apresenta inatividade preocupante. Verifique bloqueios na etapa atual."
                                                : slaPercent > 100
                                                ? "⚠️ A loja estourou o prazo do SLA contratado, porém há movimentação recente. Acelere a entrega."
                                                : "✅ Loja saudável com SLA dentro do esperado e movimento recente."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Outras abas (apenas placeholders p/ simplificar neste arquivo) */}
                            {['cronograma', 'historico', 'pausas'].includes(activeTab) && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                    <Clock size={48} className="opacity-20" />
                                    <p className="font-medium text-sm">Visualização de {activeTab} virá na Fase 2 completa.</p>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-white border-t border-slate-200 px-8 py-4 shrink-0 flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                            Cancelar
                        </button>
                        <button onClick={() => onSave(editedStore)} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-2">
                            <Save size={16} /> Salvar Alterações
                        </button>
                    </div>

                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
