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
    reasons?: string[];
    impact_score?: number;
    impact_breakdown?: string;
}

interface ScoreBreakdown {
    total: number;
    volume: number;
    otd: number;
    quality: number;
    time_score: number;
}

interface PerformanceDetailData {
    implantador: string;
    stores: StoreDetail[];
    total_done_points: number;
    total_wip_points: number;
    score_breakdown?: ScoreBreakdown;
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
                const res = await axios.get(`http://localhost:5003/api/analytics/implantador-detail/${encodeURIComponent(implantadorName)}`);
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Pontos Entregues (Done)</p>
                                    <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{data?.total_done_points}</p>
                                </div>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase">Pontos em Aberto (WIP)</p>
                                    <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300">{data?.total_wip_points}</p>
                                </div>

                                {/* New Score Card */}
                                {data?.score_breakdown && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl relative overflow-hidden group">
                                        <div className="absolute right-2 top-2 opacity-10 scale-[2.5] text-amber-500">🏆</div>
                                        <div className="relative z-10">
                                            <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase flex justify-between">
                                                <span>Performance Score</span>
                                                <span className="text-[10px] opacity-70">0-100</span>
                                            </p>
                                            <p className="text-3xl font-black text-amber-700 dark:text-amber-300 mb-2">{data.score_breakdown.total}</p>

                                            <div className="grid grid-cols-4 gap-1 text-[9px] uppercase font-bold text-amber-800/70 dark:text-amber-200/70">
                                                <div title={`Volume: ${data.score_breakdown.volume} pts`}>Vol: {data.score_breakdown.volume}</div>
                                                <div title={`OTD: ${data.score_breakdown.otd}%`}>OTD: {data.score_breakdown.otd}%</div>
                                                <div title={`Qualidade: ${data.score_breakdown.quality}%`}>Qual: {data.score_breakdown.quality}%</div>
                                                <div title={`Tempo: ${data.score_breakdown.time_score} pts`}>Time: {data.score_breakdown.time_score}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Table */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Loja</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Motivos</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Impacto</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Conclusão</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Potencial</th>
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
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {store.reasons?.map((reason, idx) => (
                                                            <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${reason.includes('Atraso') ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                                                                reason.includes('Retrabalho') ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' :
                                                                    'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                                                }`}>
                                                                {reason}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="group relative inline-block cursor-help">
                                                        <span className={`font-bold ${store.impact_score && store.impact_score > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300'}`}>
                                                            {store.impact_score && store.impact_score > 0 ? `+${store.impact_score}` : '--'}
                                                        </span>
                                                        {store.impact_breakdown && (
                                                            <div className="absolute right-0 bottom-full mb-2 w-32 bg-slate-800 text-white text-[10px] rounded p-2 shadow-lg z-50 invisible group-hover:visible whitespace-nowrap">
                                                                {store.impact_breakdown}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 font-medium text-xs">
                                                    {store.finished_at || '--'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-mono text-xs ${store.is_done ? 'text-slate-400' : 'text-indigo-400'}`}>
                                                        {store.is_done ? '-' : `(${store.potential_points})`}
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
        </div >
    );
};

export default PerformanceDetailModal;
