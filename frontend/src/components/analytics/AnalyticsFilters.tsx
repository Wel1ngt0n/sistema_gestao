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
        <div className="flex items-center gap-2 relative z-20">
            {/* Refresh Button */}
            <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`h-9 w-9 flex items-center justify-center bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm ${isRefreshing ? 'animate-spin cursor-not-allowed opacity-70' : ''}`}
                title="Atualizar Dados"
            >
                <RefreshCw className="w-4 h-4" />
            </button>

            {/* Filter Toggle Button (Glass Style) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-9 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all shadow-sm ${isOpen || hasActiveFilters
                    ? 'bg-orange-600 text-white border-orange-600 shadow-orange-500/20 ring-2 ring-orange-500/20'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-orange-400/50 hover:text-orange-600 dark:hover:text-orange-400'
                    }`}
            >
                <ListFilter className="w-4 h-4" />
                <span>Filtros</span>
                {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-orange-200 animate-pulse" />
                )}
            </button>

            {/* Export Button */}
            <button
                onClick={handleExportCSV}
                className="h-9 w-9 flex items-center justify-center bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm hover:text-orange-600 dark:hover:text-orange-400"
                title="Exportar Excel"
            >
                <Download className="w-4 h-4" />
            </button>

            {/* Popup Panel (Glassmorphism) */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" onClick={() => setIsOpen(false)} />

                    <div className="absolute right-0 top-full mt-2 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-80 p-5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                            <h3 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
                                <ListFilter className="w-4 h-4 text-orange-500" />
                                Configurar Vista
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Base Temporal</label>
                                <Select
                                    label=""
                                    options={baseTemporalOptions}
                                    value={filters.baseTemporal}
                                    onChange={(val) => updateFilter('baseTemporal', val)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Início</label>
                                    <DatePicker
                                        label=""
                                        date={filters.startDate}
                                        onChange={(d) => handleDateChange(d, 'startDate')}
                                        placeholder="--/--"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Fim</label>
                                    <DatePicker
                                        label=""
                                        date={filters.endDate}
                                        onChange={(d) => handleDateChange(d, 'endDate')}
                                        placeholder="--/--"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Filtrar por Implantador</label>
                                <Select
                                    label=""
                                    options={implantadorOptions}
                                    value={filters.implantador || ''}
                                    onChange={(val) => updateFilter('implantador', val || null)}
                                    placeholder="Todos os Implantadores"
                                />
                            </div>

                            {hasActiveFilters && (
                                <button
                                    onClick={() => {
                                        updateFilter('startDate', null);
                                        updateFilter('endDate', null);
                                        updateFilter('implantador', null);
                                    }}
                                    className="w-full mt-2 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/10 dark:text-rose-400 rounded-xl transition-colors border border-rose-100 dark:border-rose-900/20 hover:shadow-sm"
                                >
                                    Limpar Filtros Ativos
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
