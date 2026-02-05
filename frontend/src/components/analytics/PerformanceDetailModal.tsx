import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, X, Clock, Target, Calendar } from 'lucide-react';

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
    // Helper to detect if date is valid
    finished_at_date?: Date;
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-zinc-800 ring-1 ring-white/10">
                {/* Header Premium */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-2xl font-bold text-lg shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white`}>
                            {implantadorName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {implantadorName}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">
                                Detalhamento de Performance & Histórico
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-zinc-950/30">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (data && (
                        <div className="space-y-8">
                            {/* Summary Metrics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Done Card */}
                                <div className="p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700/50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform duration-500">
                                        <CheckCircle size={80} />
                                    </div>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Entregas do Período</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-slate-900 dark:text-white">{data.total_done_points.toFixed(1)}</span>
                                        <span className="text-sm font-bold text-slate-400">pontos</span>
                                    </div>
                                    <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: '100%' }}></div>
                                    </div>
                                </div>

                                {/* WIP Card */}
                                <div className="p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700/50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform duration-500">
                                        <Target size={80} />
                                    </div>
                                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Carga Atual (WIP)</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-slate-900 dark:text-white">{data.total_wip_points.toFixed(1)}</span>
                                        <span className="text-sm font-bold text-slate-400">pontos</span>
                                    </div>
                                    <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: '60%' }}></div>
                                    </div>
                                </div>

                                {/* Score Card */}
                                {data.score_breakdown && (
                                    <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Performance Score</p>
                                            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-full">0-100</span>
                                        </div>

                                        <div className="flex items-center gap-4 mb-4">
                                            <span className="text-5xl font-black text-amber-600 dark:text-amber-500">{data.score_breakdown.total}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg flex justify-between items-center">
                                                <span className="text-[10px] uppercase font-bold text-amber-800/60 dark:text-amber-200/60">Volume</span>
                                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{data.score_breakdown.volume}pts</span>
                                            </div>
                                            <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg flex justify-between items-center">
                                                <span className="text-[10px] uppercase font-bold text-amber-800/60 dark:text-amber-200/60">OTD</span>
                                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{data.score_breakdown.otd}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Table */}
                            <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-700/50 overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
                                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Calendar size={16} className="text-slate-400" />
                                        Histórico de Lojas
                                    </h4>
                                    <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-700 px-2 py-1 rounded-md">
                                        {data.stores.length} registros
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-zinc-900/50 text-[11px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Loja / Cliente</th>
                                                <th className="px-6 py-3 text-center">Tipo</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3">Fatores (Risco/Bônus)</th>
                                                <th className="px-6 py-3 text-right">Impacto</th>
                                                <th className="px-6 py-3 text-right">Conclusão</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-700/50 text-sm">
                                            {data.stores.sort((a, b) => (b.is_done ? 1 : 0) - (a.is_done ? 1 : 0)).map(store => (
                                                <tr key={store.id} className="hover:bg-slate-50 dark:hover:bg-zinc-700/20 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-700 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            {store.name}
                                                        </p>
                                                        {!store.is_done && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Clock size={10} className="text-slate-400" />
                                                                <span className="text-[10px] text-slate-400 uppercase font-bold">Em Andamento</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${store.tipo === 'Matriz'
                                                            ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30'
                                                            : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30'
                                                            }`}>
                                                            {store.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {store.is_done ? (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                                    <CheckCircle size={14} />
                                                                    CONCLUÍDO
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                                                    {store.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(!store.reasons || store.reasons.length === 0) && (
                                                                <span className="text-slate-300 dark:text-zinc-600 text-xs">-</span>
                                                            )}
                                                            {store.reasons?.map((reason, idx) => (
                                                                <span key={idx} className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${reason.includes('Atraso')
                                                                    ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30'
                                                                    : reason.includes('Retrabalho')
                                                                        ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30'
                                                                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                                                    }`}>
                                                                    {reason}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="group/impact relative inline-block cursor-help">
                                                            <span className={`text-sm font-bold ${store.impact_score && store.impact_score > 0
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-slate-300 dark:text-zinc-600'
                                                                }`}>
                                                                {store.impact_score && store.impact_score > 0 ? `+${store.impact_score}` : '--'}
                                                            </span>
                                                            {store.impact_breakdown && (
                                                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-800 text-white text-[10px] rounded-lg p-3 shadow-xl z-50 invisible group-hover/impact:visible">
                                                                    <p className="font-bold border-b border-slate-600 pb-1 mb-1 text-slate-300">Detalhamento:</p>
                                                                    <p className="whitespace-pre-line leading-relaxed">{store.impact_breakdown}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                                                                {store.finished_at || '--'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                {store.is_done ? 'Data Entrega' : 'Previsão'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default PerformanceDetailModal;
