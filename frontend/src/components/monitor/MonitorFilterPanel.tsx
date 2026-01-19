import { FC } from 'react';

export interface FilterState {
    startDate: string;
    endDate: string;
    finishStartDate: string;
    finishEndDate: string;
    status: string[];
    assignee: string;
    financialStatus: string;
    isHighRisk?: boolean;
    isLate?: boolean;
}

interface MonitorFilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    uniqueAssignees: string[];
    uniqueStatuses: string[];
}

export const MonitorFilterPanel: FC<MonitorFilterPanelProps> = ({
    isOpen,
    onClose,
    filters,
    setFilters,
    uniqueAssignees,
    uniqueStatuses
}) => {
    if (!isOpen) return null;

    const handleChange = (key: keyof FilterState, value: any) => {
        setFilters({ ...filters, [key]: value });
    };

    const handleClear = () => {
        setFilters({
            startDate: '',
            endDate: '',
            finishStartDate: '',
            finishEndDate: '',
            status: [],
            assignee: '',
            financialStatus: ''
        });
    };

    return (
        <div className="absolute top-16 right-4 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-6 w-80 animate-in slide-in-from-right-10 fade-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    ⚡ Filtros Avançados
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    ✕
                </button>
            </div>

            <div className="space-y-5">
                {/* Data de Início */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Data de Início (Intervalo)</label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleChange('startDate', e.target.value)}
                            className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-violet-500"
                        />
                        <span className="self-center text-slate-400">-</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleChange('endDate', e.target.value)}
                            className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-violet-500"
                        />
                    </div>
                </div>

                {/* Data de Conclusão */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Data de Conclusão (Intervalo)</label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={filters.finishStartDate}
                            onChange={(e) => handleChange('finishStartDate', e.target.value)}
                            className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-violet-500"
                        />
                        <span className="self-center text-slate-400">-</span>
                        <input
                            type="date"
                            value={filters.finishEndDate}
                            onChange={(e) => handleChange('finishEndDate', e.target.value)}
                            className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-violet-500"
                        />
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Status da Loja do clickup</label>
                    <select
                        value={filters.status[0] || ''}
                        onChange={(e) => handleChange('status', e.target.value ? [e.target.value] : [])}
                        className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-violet-500"
                    >
                        <option value="">Todos</option>
                        {uniqueStatuses.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Implantador */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Implantador responsável</label>
                    <select
                        value={filters.assignee}
                        onChange={(e) => handleChange('assignee', e.target.value)}
                        className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-violet-500"
                    >
                        <option value="">Todos</option>
                        {uniqueAssignees.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>

                {/* Financeiro */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Status Financeiro</label>
                    <select
                        value={filters.financialStatus}
                        onChange={(e) => handleChange('financialStatus', e.target.value)}
                        className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:border-violet-500"
                    >
                        <option value="">Todos</option>
                        <option value="Em dia">Em dia</option>
                        <option value="Devendo">Devendo</option>
                        <option value="Pago">Pago</option>
                        <option value="Não paga mensalidade">Não paga mensalidade</option>
                    </select>
                </div>

                {/* Quick Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Filtros Rápidos</label>
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 rounded transition-colors">
                            <input
                                type="checkbox"
                                checked={!!filters.isHighRisk}
                                onChange={(e) => handleChange('isHighRisk', e.target.checked)}
                                className="rounded text-violet-600 focus:ring-violet-500"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">🔥 Alto Risco (&gt;20)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1.5 rounded transition-colors">
                            <input
                                type="checkbox"
                                checked={!!filters.isLate}
                                onChange={(e) => handleChange('isLate', e.target.checked)}
                                className="rounded text-violet-600 focus:ring-violet-500"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">⚠️ Atrasados</span>
                        </label>
                    </div>
                </div>

                <div className="pt-4 flex gap-2">
                    <button
                        onClick={handleClear}
                        className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors"
                    >
                        Limpar
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-lg shadow-violet-500/20 transition-all active:scale-95"
                    >
                        Ver Resultados
                    </button>
                </div>
            </div>
        </div>
    );
};
