import React from 'react';
import { CapacityData } from './useAnalyticsData';
import { InfoTooltip } from './InfoTooltip';

interface TeamCapacityWidgetProps {
    data: CapacityData[];
    className?: string;
}

export const TeamCapacityWidget: React.FC<TeamCapacityWidgetProps> = ({ data, className = '' }) => {
    // Ordenar por Esforço Semestral Total (para equilibrar a carga)
    const sortedData = [...data].sort((a, b) => b.total_semester_points - a.total_semester_points).slice(0, 12);


    return (
        <div className={`bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow ${className}`}>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                ⚡ Gestão de Capacidade (Semestral)
                <InfoTooltip
                    text={`Visualiza o esforço total do semestre (Concluídas + Em Progresso). A barra colorida indica a lotação ATUAL (Risco de Burnout), enquanto o valor numérico mostra o equilíbrio a longo prazo.`}
                />
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
                <span>Ordenado por esforço total acumulado no semestre.</span>
                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    Equilíbrio
                </span>
            </p>

            <div className="space-y-6">
                {sortedData.map((d) => {
                    const pct = Math.min(100, Number(d.utilization_pct) || 0);
                    // Proporção visual do semestre (WIP vs Total) - só decorativo
                    const donePct = d.total_semester_points > 0
                        ? (d.finished_points_semester / d.total_semester_points) * 100
                        : 0;

                    return (
                        <div key={d.implantador} className="group">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-base">{d.implantador}</span>
                                    <span className="text-xs text-slate-400">
                                        Total: <b className="text-slate-600 dark:text-slate-200">{d.total_semester_points} pts</b>
                                        {' '}({d.finished_points_semester} já entregues)
                                    </span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded cursor-help ${d.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                        d.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                                            d.risk_level === 'LOW' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`} title={`Redes Ativas: ${d.active_networks.join(', ')}`}>
                                        {d.risk_level}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">
                                        Atual: {d.current_points} pts
                                    </span>
                                </div>
                            </div>

                            {/* Barra de Progresso Atual (Capacity Risk) */}
                            <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                {/* Marker de limite (opcional) */}
                                <div className="absolute top-0 bottom-0 w-0.5 bg-white/20 z-10" style={{ left: '100%' }}></div>

                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${pct > 110 ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                                        pct > 90 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                            'bg-gradient-to-r from-emerald-400 to-teal-500'
                                        }`}
                                    style={{ width: `${pct}%` }}
                                ></div>
                            </div>

                            {/* Sub-barra de Progresso Semestral (indicador visual de volume) */}
                            {d.total_semester_points > 0 && (
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                        Entregue:
                                    </span>
                                    <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700">
                                        <div className="h-full bg-emerald-500" style={{ width: `${donePct}%` }}></div>
                                        <div className="h-full bg-blue-400/30" style={{ width: `${100 - donePct}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">{Math.round(donePct)}%</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            {data.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                    Nenhum dado de capacidade disponível.
                </div>
            )}
        </div>
    );
};
