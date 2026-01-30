import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Clock, AlertTriangle, XCircle, Activity } from 'lucide-react';

const API_URL = 'http://localhost:5003/api';

export default function SyncHealthPanel() {

    const { data: health, isLoading, error, refetch } = useQuery({
        queryKey: ['sync-health'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/sync/health`);
            return res.data;
        },
        refetchInterval: 30000 // Refresh every 30s
    });

    if (isLoading) return <div className="p-4 text-center text-slate-500">Carregando saúde do sync...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Erro ao carregar status do sync.</div>;
    if (!health) return null;

    const { last_run, is_stale, stale_hours, recent_errors } = health;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2">

            {/* Header Status */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Last Run Card */}
                <div className={`flex-1 p-5 rounded-xl border ${is_stale ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'} shadow-sm relative overflow-hidden`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Última Sincronização</p>
                            <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                                {last_run?.finished_at || last_run?.started_at || 'Nunca'}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${last_run?.status === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                    last_run?.status === 'RUNNING' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {last_run?.status || 'N/A'}
                                </span>
                                {last_run?.items_processed > 0 && (
                                    <span className="text-xs text-slate-500">{last_run.items_processed} itens processados</span>
                                )}
                            </div>
                        </div>
                        <div className={`p-3 rounded-full ${is_stale ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                            {is_stale ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                        </div>
                    </div>

                    {is_stale && (
                        <div className="mt-4 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm bg-amber-100/50 p-2 rounded">
                            <Clock size={14} />
                            <span>Dados desatualizados há {stale_hours}h. Execute o sync.</span>
                        </div>
                    )}
                </div>

                {/* Error Stats Card */}
                <div className="flex-1 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Erros Recentes</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {recent_errors.length}
                            </h3>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Falhas nos últimos 10 processos.</p>
                </div>
            </div>

            {/* Error Table */}
            {recent_errors.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                        <XCircle size={16} className="text-red-500" />
                        <h4 className="font-semibold text-sm">Histórico de Falhas</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Loja (ID)</th>
                                    <th className="px-4 py-3">Erro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {recent_errors.map((err: any) => (
                                    <tr key={err.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{err.at}</td>
                                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                                            {err.store_id ? `#${err.store_id}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-red-600 dark:text-red-400 w-full">
                                            {err.msg}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Last Error Summary (Fatal) */}
            {last_run?.error_summary && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl text-red-800 dark:text-red-200 text-sm">
                    <strong>Falha Crítica no Último Sync:</strong> {last_run.error_summary}
                </div>
            )}

            <div className="flex justify-end">
                <button onClick={() => refetch()} className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1">
                    <Activity size={12} /> Atualizar Status
                </button>
            </div>
        </div>
    );
}
