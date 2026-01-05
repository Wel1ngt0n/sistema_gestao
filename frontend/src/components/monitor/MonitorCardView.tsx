import { Store } from './types';
import { getStatusColor, formatDate } from './monitorUtils';

interface MonitorCardViewProps {
    data: Store[];
    onEdit: (store: Store) => void;
}

export default function MonitorCardView({ data, onEdit }: MonitorCardViewProps) {
    // Helper para calcular porcentagem de tempo
    const getProgress = (store: Store) => {
        if (!store.dias_em_transito || !store.tempo_contrato) return 0;
        const pct = (store.dias_em_transito / store.tempo_contrato) * 100;
        return Math.min(Math.max(pct, 0), 100);
    };

    const getProgressColor = (store: Store) => {
        const pct = getProgress(store);
        if (pct > 100) return 'bg-rose-500';
        if (pct > 80) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
            {data.map(store => {
                const progress = getProgress(store);
                const progressColor = getProgressColor(store);
                const isRisk = store.risk_score > 20;
                const isLate = (store.dias_em_transito || 0) > store.tempo_contrato;

                return (
                    <div
                        key={store.id}
                        onClick={() => onEdit(store)}
                        className={`
                            group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm 
                            hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col relative
                        `}
                    >
                        {/* Risk Indicator Blob */}
                        {isRisk && (
                            <div className="absolute top-0 right-0 p-3 z-10">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                </span>
                            </div>
                        )}

                        {/* Card Header & Title */}
                        <div className="p-5 pb-2">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">#{store.id}</span>
                            </div>

                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1">
                                {store.name}
                            </h4>

                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${isLate
                                    ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                                    : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                    }`}>
                                    {isLate ? 'Atrasado' : 'No Prazo'}
                                </span>
                                {store.financeiro_status === 'Devendo' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                                        Devendo
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="px-5 py-2 flex-1 space-y-4">

                            {/* Detailed Info Grid */}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Status</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded inline-block max-w-full truncate ${getStatusColor(store.status)}`}>
                                        {store.status || '...'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Responsável</span>
                                    <div className="flex items-center gap-1.5">
                                        {store.implantador ? (
                                            <>
                                                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300">
                                                    {store.implantador.substring(0, 1)}
                                                </div>
                                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                                                    {store.implantador.split(' ')[0]}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Previsão</span>
                                    <span className={`text-xs font-mono font-medium ${(store.days_late_predicted || 0) > 0 ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {formatDate(store.data_previsao)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Duração</span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        {store.dias_em_transito || 0} / {store.tempo_contrato} dias
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar Footer */}
                        <div className="px-5 pb-5 pt-2">
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${progressColor} transition-all duration-1000 ease-out`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                    </div>
                );
            })}
        </div>
    );
}
