// UX Audit: placeholder aria-label
import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface MRRNetProjectionWidgetProps {
    data: {
        delivered_mrr: number;
        projected_mrr: number;
        churn_mrr: number;
        net_mrr_result: number;
        net_mrr_target: number;
        churn_limit: number;
        months_in_period: number;
    } | null;
}

export const MRRNetProjectionWidget: React.FC<MRRNetProjectionWidgetProps> = ({ data }) => {
    if (!data) return null;

    const formatBRL = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const targetProgress = Math.min(100, Math.max(0, (data.net_mrr_result / data.net_mrr_target) * 100));

    // Calcula Churn Alert Level (Se o churn passou de 80% do limite ou estourou)
    const churnPct = (data.churn_mrr / data.churn_limit) * 100;
    const isChurnCritical = churnPct >= 100;
    const isChurnWarning = churnPct >= 80 && churnPct < 100;

    return (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 p-4">
                <div className="flex items-center space-x-2">
                    <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2">
                        <TrendingUp className="h-5 w-5 text-[#128131]" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-950">Projeção MRR Líquido</h3>
                </div>
                <div className="text-right">
                    <p className="text-sm text-zinc-500">Meta Esperada</p>
                    <p className="text-sm font-semibold text-zinc-950">{formatBRL(data.net_mrr_target)}</p>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-3 gap-6 mb-8">
                    {/* Ganhos/Projetado */}
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">Ganho Realizado</p>
                        <p className="text-xl font-semibold text-emerald-700">+{formatBRL(data.delivered_mrr)}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                            + Projetado: {formatBRL(data.projected_mrr)}
                        </p>
                    </div>

                    {/* Churn */}
                    <div className="relative space-y-1 border-l border-zinc-200 pl-6">
                        <p className="flex items-center gap-1 text-sm text-zinc-500">
                            Churn MRR
                            {(isChurnWarning || isChurnCritical) && (
                                <AlertTriangle className={`h-3 w-3 ${isChurnCritical ? 'text-red-600' : 'text-orange-500'}`} />
                            )}
                        </p>
                        <p className={`text-xl font-semibold ${isChurnCritical ? 'text-red-700' : 'text-rose-700'}`}>
                            -{formatBRL(data.churn_mrr)}
                        </p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                            <div
                                className={`h-full rounded-full ${isChurnCritical ? 'bg-red-600' : isChurnWarning ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, churnPct)}%` }}
                            />
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-500">
                            Limite do período: {formatBRL(data.churn_limit)}
                        </p>
                    </div>

                    {/* Resultado Líquido */}
                    <div className="relative space-y-1 border-l border-zinc-200 pl-6">
                        <p className="text-sm text-zinc-500">MRR Líquido</p>
                        <p className={`text-2xl font-semibold ${data.net_mrr_result >= 0 ? 'text-[#128131]' : 'text-red-700'}`}>
                            {formatBRL(data.net_mrr_result)}
                        </p>
                    </div>
                </div>

                {/* Termômetro Net MRR */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-zinc-700">Progresso da Meta</span>
                        <span className="text-lg font-semibold text-[#128131]">{targetProgress.toFixed(1)}%</span>
                    </div>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                            className="absolute left-0 top-0 flex h-full items-center justify-end bg-[#128131] pr-2 transition-all duration-1000 ease-out"
                            style={{ width: `${targetProgress}%` }}
                        >
                            {targetProgress >= 15 && (
                                <div className="h-1.5 w-1.5 rounded-full bg-white opacity-80" />
                            )}
                        </div>
                        {/* Marcadores */}
                        <div className="absolute left-1/4 top-0 h-full border-l border-white/30" />
                        <div className="absolute left-2/4 top-0 h-full border-l border-white/40" />
                        <div className="absolute left-3/4 top-0 h-full border-l border-white/30" />
                    </div>
                </div>
            </div>
        </div>
    );
};

