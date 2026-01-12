import { useState, useEffect } from 'react';
import axios from 'axios';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
    const [weights, setWeights] = useState({
        weight_matriz: '1.0',
        weight_filial: '0.7'
    });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            axios.get('http://localhost:5003/api/config')
                .then(res => {
                    if (res.data) {
                        setWeights(prev => ({ ...prev, ...res.data }));
                    }
                })
                .catch(err => console.error(err));
        }
    }, [isOpen]);

    const handleSave = () => {
        setLoading(true);
        axios.post('http://localhost:5003/api/config', weights)
            .then(() => {
                setMsg('Salvo com sucesso!');
                setTimeout(() => setMsg(''), 2000);
            })
            .catch(() => setMsg('Erro ao salvar'))
            .finally(() => setLoading(false));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        ⚙️ Super Admin
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-2xl">×</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Pesos de Pontuação</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Peso Matriz/Única</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 outline-none focus:border-indigo-500 font-mono"
                                    value={weights.weight_matriz}
                                    onChange={e => setWeights({ ...weights, weight_matriz: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Peso Filial</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 outline-none focus:border-indigo-500 font-mono"
                                    value={weights.weight_filial}
                                    onChange={e => setWeights({ ...weights, weight_filial: e.target.value })}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            Isso afeta o cálculo de esforço total e metas da equipe.
                        </p>
                    </div>

                    {msg && (
                        <div className={`p-3 rounded text-sm text-center font-bold ${msg.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {msg}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-b-2xl border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </div>
        </div>
    );
}
