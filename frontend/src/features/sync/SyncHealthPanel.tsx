// UX Audit: placeholder aria-label
import { api } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, AlertTriangle, Activity, Database } from 'lucide-react';

// API_URL removido pois já está no serviço api.ts

export default function SyncHealthPanel() {

    const { data: health, isLoading, error, refetch } = useQuery({
        queryKey: ['sync-health'],
        queryFn: async () => {
            const res = await api.get('/api/sync/health');
            return res.data;
        },
        refetchInterval: 30000 // Refresh every 30s
    });

    if (isLoading) return <div className="p-4 text-center text-zinc-500 animate-pulse">Carregando saúde do sistema...</div>;
    if (error) return <div className="p-4 text-center text-rose-500 bg-rose-50 rounded-xl">Erro ao carregar status do sync.</div>;
    if (!health) return null;

    const { last_run, is_stale, stale_hours } = health;

    const formatDateTime = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date;
    };

    const lastRunDate = formatDateTime(last_run?.finished_at);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Last Run Card (Glass) */}
                <div className={`flex-1 p-6 rounded-[2.5rem] border transition-all duration-300 relative overflow-hidden group
                    ${is_stale
                        ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
                        : 'bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl border-zinc-200 dark:border-zinc-800'
                    } shadow-sm hover:shadow-md`}>

                    {/* Background glow for staleness */}
                    {is_stale && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>}

                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className={`w-4 h-4 ${is_stale ? 'text-amber-500' : 'text-zinc-400'}`} />
                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Última Sincronização</p>
                            </div>
                            <h3 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">
                                {lastRunDate ? (
                                    <span>{lastRunDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                ) : (
                                    <span className="text-zinc-400 text-xl">--:--</span>
                                )}
                                <span className="text-sm font-medium text-zinc-400 ml-2">
                                    {lastRunDate ? lastRunDate.toLocaleDateString() : ''}
                                </span>
                            </h3>

                            <div className="flex items-center gap-3 mt-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm border ${last_run?.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                    last_run?.status === 'RUNNING' ? 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' :
                                        'bg-rose-100 text-rose-700 border-rose-200'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${last_run?.status === 'SUCCESS' ? 'bg-emerald-500' :
                                        last_run?.status === 'RUNNING' ? 'bg-blue-500' : 'bg-rose-500'
                                        }`}></div>
                                    {last_run?.status || 'N/A'}
                                </span>

                                {last_run?.items_processed > 0 && (
                                    <span className="text-xs font-medium text-zinc-500 flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded-md">
                                        <Database className="w-3 h-3" />
                                        {last_run.items_processed} itens
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={`p-4 rounded-2xl shadow-sm border ${is_stale
                            ? 'bg-amber-100 text-amber-600 border-amber-200'
                            : 'bg-emerald-100/50 text-emerald-600 border-emerald-100'
                            }`}>
                            {is_stale ? <AlertTriangle size={24} strokeWidth={2.5} /> : <CheckCircle size={24} strokeWidth={2.5} />}
                        </div>
                    </div>

                    {is_stale && (
                        <div className="mt-4 flex items-center gap-2 text-amber-700 text-sm font-medium bg-amber-50 p-3 rounded-xl border border-amber-100">
                            <Clock size={16} />
                            <span>Dados desatualizados há {stale_hours}h. Execute o sync.</span>
                        </div>
                    )}
                </div>

                {/* Status System Card (Glass) */}
                <div className="flex-1 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Activity size={80} />
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-4 rounded-2xl shadow-sm border ${!is_stale
                            ? 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                            }`}>
                            <Activity size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Saúde do Motor</p>
                            <h3 className={`text-3xl font-black tracking-tighter mt-1 ${!is_stale ? 'text-emerald-600' : 'text-zinc-900 dark:text-white'}`}>
                                {is_stale ? 'ATENÇÃO' : 'OPERACIONAL'}
                            </h3>
                        </div>
                    </div>
                    <p className="text-xs font-medium text-zinc-400 mt-4 pl-1">Monitoramento em tempo real do Jarvis Sync Engine.</p>
                </div>
            </div>

            {/* Error History Removed per User Request (Logs are now in Render) */}

            {/* Last Error Summary (Fatal) */}
            {last_run?.error_summary && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="font-bold text-rose-700 text-sm">Falha Crítica no Último Sync</h4>
                        <p className="text-rose-600/80/80 text-sm mt-1 leading-relaxed">{last_run.error_summary}</p>
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={() => refetch()}
                    className="group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-zinc-500 hover:text-orange-600 hover:bg-orange-50 transition-all"
                >
                    <Activity size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    Atualizar Status
                </button>
            </div>
        </div>
    );
}

