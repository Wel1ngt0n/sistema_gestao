import { FC } from 'react';
import { Column } from '@tanstack/react-table';
import { formatDate } from './monitorUtils';

interface AIPrediction {
    predicted_date: string;
    contract_due: string;
    remaining_days_predicted: number;
    days_late_predicted: number;
    risk_level: string;
    breakdown: { step: string; status: string; contribution: number }[];
    is_concluded?: boolean;
}

interface Store {
    id: number;
    risk_score: number;
    dias_em_transito: number | null;
    idle_days: number | null;
    financeiro_status: string | null;
    teve_retrabalho: boolean;
    ai_prediction?: AIPrediction;
    risk_breakdown?: {
        prazo: number;
        idle: number;
        financeiro: number;
        qualidade: number;
    };
}

export const RiskTooltip: FC<{ store: Store; style: React.CSSProperties }> = ({ store, style }) => {
    const ai = store.ai_prediction;
    const hasRiskScore = store.risk_score > 0;

    if (!hasRiskScore && !ai) return null;

    return (
        <div style={style} className="fixed z-[9999] bg-slate-900 text-white p-3 rounded-lg shadow-2xl w-72 text-xs text-left pointer-events-none animate-in fade-in zoom-in-95 duration-200 border border-slate-700">
            {ai && !ai.is_concluded && (
                <div className="mb-3 pb-3 border-b border-slate-700">
                    <h4 className="font-bold text-violet-400 flex items-center gap-1 mb-2">
                        <span>🤖 Análise AI</span>
                        {ai.risk_level === 'CRITICAL' && <span className="text-[10px] bg-red-600 px-1 rounded text-white">CRÍTICO</span>}
                    </h4>
                    <div className="space-y-1 text-slate-300">
                        <div className="flex justify-between"><span>Previsão:</span> <span className="font-mono text-white">{formatDate(ai.predicted_date)}</span></div>
                        <div className="flex justify-between"><span>Prazo Contrato:</span> <span className="font-mono text-slate-400">{formatDate(ai.contract_due)}</span></div>
                        <div className="flex justify-between mt-1">
                            <span>Status:</span>
                            <span className={`font-bold ${ai.days_late_predicted > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {ai.days_late_predicted > 0 ? `${Math.round(ai.days_late_predicted)} dias de atraso` : 'No prazo'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {hasRiskScore && (
                <>
                    <h4 className="font-bold text-amber-500 mb-2">Composição do Risco (Score)</h4>
                    {store.risk_breakdown ? (
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>Risco de Prazo:</span>
                                <span className={`font-mono ${store.risk_breakdown.prazo > 50 ? 'text-red-400 font-bold' : 'text-slate-300'}`}>{store.risk_breakdown.prazo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Risco Ociosidade:</span>
                                <span className={`font-mono ${store.risk_breakdown.idle > 25 ? 'text-yellow-500' : 'text-slate-300'}`}>{store.risk_breakdown.idle}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Risco Financeiro:</span>
                                <span className={`font-mono ${store.risk_breakdown.financeiro > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>{store.risk_breakdown.financeiro}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Risco Qualidade:</span>
                                <span className={`font-mono ${store.risk_breakdown.qualidade > 0 ? 'text-rose-400' : 'text-slate-300'}`}>{store.risk_breakdown.qualidade}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 text-slate-500">
                            {(store.dias_em_transito || 0) > 0 && <div className="flex justify-between"><span>Tempo em Implantação:</span> <span className="font-mono text-slate-300">+{store.dias_em_transito}</span></div>}
                            {(store.idle_days || 0) > 0 && <div className="flex justify-between text-yellow-500"><span>Tempo Parado (x2):</span> <span className="font-mono text-yellow-500">+{2 * (store.idle_days || 0)}</span></div>}
                            {store.financeiro_status === 'Devendo' && <div className="flex justify-between text-rose-400 font-bold"><span>Financeiro Devendo:</span> <span className="font-mono">+15</span></div>}
                            {store.teve_retrabalho && <div className="flex justify-between text-rose-400 font-bold"><span>Houve Retrabalho:</span> <span className="font-mono">+10</span></div>}
                        </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between font-bold text-amber-500">
                        <span>Total Score:</span>
                        <span className="text-lg">{store.risk_score}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export const Filter = ({ column, table }: { column: Column<any, unknown>; table: import('@tanstack/react-table').Table<any> }) => {
    const columnFilterValue = column.getFilterValue();
    const sortedUniqueValues = Array.from(new Set(table.getPreFilteredRowModel().flatRows.map(row => row.getValue(column.id)))).sort();

    if (['status', 'implantador', 'erp', 'crm'].includes(column.id)) {
        return (
            <div onClick={e => e.stopPropagation()} className="mt-2">
                <select
                    onChange={e => column.setFilterValue(e.target.value || undefined)}
                    value={(columnFilterValue ?? '') as string}
                    className="w-full text-[10px] border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none p-1 h-6 shadow-sm focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="">Todos</option>
                    {sortedUniqueValues.map((value: any) => (
                        <option value={value} key={value}>
                            {value}
                        </option>
                    ))}
                </select>
            </div>
        );
    }
    return null;
};

export const SkeletonLoader = () => (
    <div className="w-full max-w-[1920px] p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            ))}
        </div>
        <div className="h-[600px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
    </div>
);
