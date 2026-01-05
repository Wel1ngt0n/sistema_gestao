import React from 'react';
import { CapacityData } from './useAnalyticsData';
import { InfoTooltip } from './InfoTooltip';

interface TeamCapacityWidgetProps {
    data: CapacityData[];
}

export const TeamCapacityWidget: React.FC<TeamCapacityWidgetProps> = ({ data }) => {
    // Ordenar por utilização e pegar top 12
    const sortedData = [...data].sort((a, b) => b.utilization_pct - a.utilization_pct).slice(0, 12);

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                ⚡ Gestão de Capacidade
                <InfoTooltip
                    text="Mede a carga de trabalho atual do implantador baseada na soma ponderada de lojas em progresso (Matriz=1.0, Filial=0.7). O limite ideal é de ~30 pontos."
                />
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Pontos de esforço em aberto por implantador. Limite ideal: 30pts.
            </p>

            <div className="space-y-4">
                {sortedData.map((d) => (
                    <div key={d.implantador} className="group">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{d.implantador}</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded cursor-help ${d.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                    d.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                                        d.risk_level === 'LOW' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-slate-100 text-slate-600'
                                    }`} title={`Redes Ativas: ${d.active_networks.join(', ')}`}>
                                    {d.risk_level}
                                </span>
                                <span className="text-slate-500 font-mono">
                                    {d.current_points} pts ({d.store_count} lojas)
                                </span>
                            </div>
                        </div>

                        {/* Barra de Progresso Customizada */}
                        <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            {/* Marker de 100% (Capacidade Ideal) */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300 z-10" style={{ left: `${(d.max_points / 40) * 100}%` }}></div>
                            {/* Assumindo escala maxima fixa visual de 40 pontos para caber overflow */}

                            <div
                                className={`h-full rounded-full transition-all duration-500 ${d.utilization_pct > 110 ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                                    d.utilization_pct > 90 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                        'bg-gradient-to-r from-emerald-400 to-teal-500'
                                    }`}
                                style={{ width: `${Math.min(100, d.utilization_pct)}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
            {data.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                    Nenhum dado de capacidade disponível.
                </div>
            )}
        </div>
    );
};
