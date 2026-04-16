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
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-color)]/50 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <h3 className="text-[var(--text-color)] font-medium">Projeção MRR Líquido</h3>
                </div>
                <div className="text-right">
                    <p className="text-sm text-[var(--text-muted)]">Meta Esperada</p>
                    <p className="text-sm font-semibold text-[var(--text-color)]">{formatBRL(data.net_mrr_target)}</p>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-3 gap-6 mb-8">
                    {/* Ganhos/Projetado */}
                    <div className="space-y-1">
                        <p className="text-sm text-[var(--text-muted)]">Ganho Realizado</p>
                        <p className="text-xl font-bold text-emerald-500">+{formatBRL(data.delivered_mrr)}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
                            + Projetado: {formatBRL(data.projected_mrr)}
                        </p>
                    </div>

                    {/* Churn */}
                    <div className="space-y-1 relative pl-6 border-l border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                            Churn MRR 
                            {(isChurnWarning || isChurnCritical) && (
                                <AlertTriangle className={`w-3 h-3 ${isChurnCritical ? 'text-red-500' : 'text-yellow-500'}`} />
                            )}
                        </p>
                        <p className={`text-xl font-bold ${isChurnCritical ? 'text-red-500' : 'text-rose-400'}`}>
                            -{formatBRL(data.churn_mrr)}
                        </p>
                        <div className="w-full bg-[var(--bg-color)] rounded-full h-1.5 mt-2 overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${isChurnCritical ? 'bg-red-500' : isChurnWarning ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, churnPct)}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                            Limite do período: {formatBRL(data.churn_limit)}
                        </p>
                    </div>

                    {/* Resultado Líquido */}
                    <div className="space-y-1 relative pl-6 border-l border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-muted)]">MRR Líquido</p>
                        <p className={`text-2xl font-black ${data.net_mrr_result >= 0 ? 'text-[var(--brand-primary)]' : 'text-red-500'}`}>
                            {formatBRL(data.net_mrr_result)}
                        </p>
                    </div>
                </div>

                {/* Termômetro Net MRR */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-[var(--text-color)]">Progresso da Meta</span>
                        <span className="text-lg font-bold text-[var(--brand-primary)]">{targetProgress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-color)] rounded-full h-4 relative overflow-hidden ring-1 ring-inset ring-white/5">
                        <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]/70 transition-all duration-1000 ease-out flex items-center justify-end pr-2 shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]"
                            style={{ width: `${targetProgress}%` }}
                        >
                            {targetProgress >= 15 && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80" />
                            )}
                        </div>
                        {/* Marcadores */}
                        <div className="absolute top-0 left-1/4 h-full border-l border-white/10" />
                        <div className="absolute top-0 left-2/4 h-full border-l border-white/20" />
                        <div className="absolute top-0 left-3/4 h-full border-l border-white/10" />
                    </div>
                </div>
            </div>
        </div>
    );
};
