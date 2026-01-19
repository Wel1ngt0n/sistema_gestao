import React, { useState } from 'react';
import { useDashboardUrlParams } from '../../hooks/useDashboardUrlParams';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
import { Download, ListFilter, X, RefreshCw } from 'lucide-react';

interface AnalyticsFiltersProps {
    availableImplantadores: string[];
    onRefresh: () => void;
    isRefreshing: boolean;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({ availableImplantadores, onRefresh, isRefreshing }) => {
    const { filters, updateFilter } = useDashboardUrlParams();
    const [isOpen, setIsOpen] = useState(false);

    const handleExportCSV = () => {
        const API_BASE_URL = 'http://localhost:5003';
        const params = new URLSearchParams();
        if (filters.startDate) params.append('start_date', filters.startDate.toISOString().split('T')[0]);
        if (filters.endDate) params.append('end_date', filters.endDate.toISOString().split('T')[0]);
        if (filters.implantador) params.append('implantador', filters.implantador);

        window.open(`${API_BASE_URL}/api/analytics/export-csv?${params.toString()}`, '_blank');
    };

    const handleDateChange = (date: Date | undefined, field: 'startDate' | 'endDate') => {
        updateFilter(field, date || null);
    };

    const baseTemporalOptions = [
        { value: 'conclusao', label: 'Data de Conclusão' },
        { value: 'inicio', label: 'Data de Início (Cohort)' },
        { value: 'snapshot', label: 'Snapshot Diário' }
    ];

    const implantadorOptions = [
        { value: '', label: 'Todos os Implantadores' },
        ...availableImplantadores.map(imp => ({ value: imp, label: imp }))
    ];

    const hasActiveFilters = !!(filters.startDate || filters.endDate || filters.implantador);

    return (
        <div className="flex items-center gap-2 relative">
            {/* Refresh Button */}
            <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`h-9 w-9 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isRefreshing ? 'animate-spin cursor-not-allowed opacity-70' : ''}`}
                title="Atualizar Dados"
            >
                <RefreshCw className="w-4 h-4" />
            </button>

            {/* Filter Toggle Button (Monitor Style) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-9 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${isOpen || hasActiveFilters
                    ? 'bg-violet-600 text-white border-violet-600 shadow-md ring-2 ring-violet-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                    }`}
            >
                <ListFilter className="w-4 h-4" />
                <span>Filtros</span>
                {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                )}
            </button>

            {/* Export Button */}
            <button
                onClick={handleExportCSV}
                className="h-9 w-9 flex items-center justify-center bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                title="Exportar Excel"
            >
                <Download className="w-4 h-4" />
            </button>

            {/* Popup Panel */}
            {isOpen && (
                <>
                    {/* Backdrop transparent to close on click outside (optional but good UX) */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-80 p-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Filtros de Analytics</h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Base Temporal</label>
                                <Select
                                    label=""
                                    options={baseTemporalOptions}
                                    value={filters.baseTemporal}
                                    onChange={(val) => updateFilter('baseTemporal', val)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Início</label>
                                    <DatePicker
                                        label=""
                                        date={filters.startDate}
                                        onChange={(d) => handleDateChange(d, 'startDate')}
                                        placeholder="--/--"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fim</label>
                                    <DatePicker
                                        label=""
                                        date={filters.endDate}
                                        onChange={(d) => handleDateChange(d, 'endDate')}
                                        placeholder="--/--"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Implantador</label>
                                <Select
                                    label=""
                                    options={implantadorOptions}
                                    value={filters.implantador || ''}
                                    onChange={(val) => updateFilter('implantador', val || null)}
                                    placeholder="Todos"
                                />
                            </div>

                            {hasActiveFilters && (
                                <button
                                    onClick={() => {
                                        updateFilter('startDate', null);
                                        updateFilter('endDate', null);
                                        updateFilter('implantador', null);
                                    }}
                                    className="w-full mt-2 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/30"
                                >
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
