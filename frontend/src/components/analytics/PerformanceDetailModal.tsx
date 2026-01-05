import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface StoreDetail {
    id: number;
    name: string;
    tipo: string;
    status: string;
    is_done: boolean;
    points: number;
    potential_points: number;
    finished_at: string | null;
}

interface PerformanceDetailData {
    implantador: string;
    stores: StoreDetail[];
    total_done_points: number;
    total_wip_points: number;
}

interface PerformanceDetailModalProps {
    implantadorName: string;
    onClose: () => void;
}

const PerformanceDetailModal: React.FC<PerformanceDetailModalProps> = ({ implantadorName, onClose }) => {
    const [data, setData] = useState<PerformanceDetailData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/analytics/implantador-detail/${encodeURIComponent(implantadorName)}`);
                setData(res.data);
            } catch (err) {
                console.error('Erro ao buscar detalhes:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [implantadorName]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            🏆 Detalhamento de Pontos: <span className="text-indigo-600 dark:text-indigo-400">{implantadorName}</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-wider">Histórico de entregas e pipeline</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Pontos Entregues (Done)</p>
                                    <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{data?.total_done_points}</p>
                                </div>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase">Pontos em Aberto (WIP)</p>
                                    <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300">{data?.total_wip_points}</p>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Loja</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Conclusão</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Pontos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                        {data?.stores.sort((a, b) => (b.is_done ? 1 : 0) - (a.is_done ? 1 : 0)).map(store => (
                                            <tr key={store.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{store.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${store.tipo === 'Matriz' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {store.tipo}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[11px] font-medium ${store.is_done ? 'text-emerald-500' : 'text-indigo-500'
                                                        }`}>
                                                        {store.is_done ? '🚀 CONCLUÍDO' : `⏳ ${store.status}`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">
                                                    {store.finished_at || '--'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-black ${store.is_done ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                                        {store.is_done ? `+${store.points}` : `(${store.potential_points})`}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-700 transition-all shadow-md"
                    >
                        Fechar Visualização
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PerformanceDetailModal;
