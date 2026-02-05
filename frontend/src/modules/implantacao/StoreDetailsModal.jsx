import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { X, Calendar, DollarSign, Activity, Save } from 'lucide-react';

const ReadOnlyField = ({ label, value }) => (
    <div className="mb-4">
        <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">{label}</span>
        <span className="text-sm font-medium text-gray-900 break-words">{value ?? '-'}</span>
    </div>
);

const StoreDetailsModal = ({ isOpen, onClose, store, onSave }) => {
    const [localStore, setLocalStore] = useState(null);
    const [activeTab, setActiveTab] = useState('info');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (store) {
            setLocalStore({ ...store });
        }
    }, [store]);

    if (!isOpen || !localStore) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(localStore);
            onClose();
        } catch (error) {
            alert('Erro ao salvar alterações.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return dateString.split('T')[0]; // Extract YYYY-MM-DD
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <span className="text-2xl">🏪</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{localStore.name}</h2>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                <span>ID: <strong className="text-gray-700">{localStore.custom_id}</strong></span>
                                <span>|</span>
                                <span>Responsável: <strong className="text-gray-700">{localStore.implantador || 'N/D'}</strong></span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 border-b border-gray-200 bg-white">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'info' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        📝 Dados Gerais
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        🕒 Histórico (Em Breve)
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Left Column */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Prazos */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase mb-4 flex items-center gap-2">
                                        <Calendar size={14} /> Cronograma
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Data Início</label>
                                            <input
                                                type="date"
                                                className="w-full border-b border-indigo-200 bg-transparent text-sm font-bold text-indigo-700 outline-none focus:border-indigo-500"
                                                value={formatDate(localStore.data_inicio)}
                                                onChange={e => setLocalStore({ ...localStore, data_inicio: e.target.value })}
                                            />
                                        </div>
                                        <ReadOnlyField label="Previsão" value={formatDate(localStore.data_previsao)} />
                                        <ReadOnlyField label="Data Fim Real" value={formatDate(localStore.data_fim)} />

                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Dias Contrato</label>
                                            <input
                                                type="number"
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={localStore.tempo_contrato}
                                                onChange={e => setLocalStore({ ...localStore, tempo_contrato: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Configuração */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-4">
                                        ✏️ Configuração
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Rede</label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={localStore.rede || ''}
                                                onChange={e => setLocalStore({ ...localStore, rede: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Tipo de Loja</label>
                                            <select
                                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={localStore.tipo_loja || 'Filial'}
                                                onChange={e => setLocalStore({ ...localStore, tipo_loja: e.target.value })}
                                            >
                                                <option value="Filial">Filial</option>
                                                <option value="Matriz">Matriz</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Flags */}
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-indigo-600 rounded"
                                                checked={localStore.delivered_with_quality}
                                                onChange={e => setLocalStore({ ...localStore, delivered_with_quality: e.target.checked })}
                                            />
                                            <span className="text-sm text-gray-700">Entregue com Qualidade?</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-indigo-600 rounded"
                                                checked={localStore.teve_retrabalho}
                                                onChange={e => setLocalStore({ ...localStore, tuvo_retrabalho: e.target.checked })}
                                            />
                                            <span className="text-sm text-gray-700">Houve Retrabalho?</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-indigo-600 rounded"
                                                checked={localStore.considerar_tempo}
                                                onChange={e => setLocalStore({ ...localStore, considerar_tempo: e.target.checked })}
                                            />
                                            <span className="text-sm text-gray-700">Considerar Tempo (SLA)?</span>
                                        </label>

                                        {!localStore.considerar_tempo && (
                                            <input
                                                type="text"
                                                placeholder="Justificativa obrigatória..."
                                                className="w-full border border-yellow-300 bg-yellow-50 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500"
                                                value={localStore.justificativa_tempo || ''}
                                                onChange={e => setLocalStore({ ...localStore, justificativa_tempo: e.target.value })}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* Financeiro */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-emerald-600 uppercase mb-4 flex items-center gap-2">
                                        <DollarSign size={14} /> Financeiro
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Status</label>
                                            <select
                                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={localStore.financeiro_status || 'Em dia'}
                                                onChange={e => setLocalStore({ ...localStore, financeiro_status: e.target.value })}
                                            >
                                                <option value="Em dia">Em dia</option>
                                                <option value="Devendo">Devendo</option>
                                                <option value="Cancelado">Cancelado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Mensalidade (MRR)</label>
                                            <input
                                                type="number"
                                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={localStore.valor_mensalidade || 0}
                                                onChange={e => setLocalStore({ ...localStore, valor_mensalidade: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Obs */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-2">Observações</label>
                                    <textarea
                                        rows={5}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                        value={localStore.observacoes || ''}
                                        onChange={e => setLocalStore({ ...localStore, observacoes: e.target.value })}
                                        placeholder="Anotações internas..."
                                    />
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="text-center py-12 text-gray-500">
                            <p>Histórico de alterações será exibido aqui.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreDetailsModal;
