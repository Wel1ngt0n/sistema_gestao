import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Package } from 'lucide-react';

export default function ForecastCards({ summary }) {
    if (!summary || summary.length === 0) {
        return (
            <div className="text-sm text-slate-400 p-2">Sem dados de projeção para exibir nos cards.</div>
        );
    }

    return (
        <div className="flex gap-4 min-w-max pb-2">
            {summary.map((monthData, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-72 flex-shrink-0 relative overflow-hidden group hover:border-blue-400 transition-colors">
                    {/* Background Decor */}
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full pointer-events-none group-hover:from-blue-500/20 transition-all" />

                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white capitalize">
                            {monthData.month}
                        </h3>
                        <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                            Forecast
                        </span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                                <CheckCircle size={14} className="text-emerald-500" />
                                Lojas (Go-Live)
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{monthData.total_stores}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pl-6 -mt-1">
                            <span>{monthData.matriz_count} Matrizes</span>
                            <span>{monthData.filial_count} Filiais</span>
                        </div>

                        <div className="w-full h-px bg-slate-100 dark:bg-slate-700" />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                                <Package size={14} className="text-violet-500" />
                                Pedidos Proj.
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white">{monthData.total_orders.toLocaleString()}</span>
                        </div>

                        {/* Risk Alert */}
                        {monthData.risk_count > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/50">
                                <AlertTriangle size={12} />
                                {monthData.risk_count} lojas com risco de atraso
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
