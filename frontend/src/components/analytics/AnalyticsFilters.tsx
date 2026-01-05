import React, { useState } from 'react';
import { useDashboardUrlParams } from '../../hooks/useDashboardUrlParams';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
import { Download, ListFilter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsFiltersProps {
    availableImplantadores: string[];
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({ availableImplantadores }) => {
    const { filters, updateFilter } = useDashboardUrlParams();
    const [isOpen, setIsOpen] = useState(false);

    const handleExportCSV = () => {
        const API_BASE_URL = 'http://localhost:5000';
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

    // Helper para texto de resumo dos filtros ativos
    const getActiveFiltersSummary = () => {
        const parts = [];
        if (filters.startDate || filters.endDate) {
            const start = filters.startDate ? format(filters.startDate, 'dd/MM/yy') : 'Início';
            const end = filters.endDate ? format(filters.endDate, 'dd/MM/yy') : 'Hoje';
            parts.push(`${start} até ${end}`);
        }
        if (filters.implantador) {
            parts.push(filters.implantador);
        }

        if (parts.length === 0) return 'Exibindo todos os dados';
        return parts.join(' • ');
    };

    const hasActiveFilters = !!(filters.startDate || filters.endDate || filters.implantador);

    return (
        <div className="w-full flex flex-col gap-4 mb-2">

            {/* Barra Principal (Minimalista) */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 pl-4 pr-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">

                {/* Esquerda: Botão Toggle + Resumo */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isOpen || hasActiveFilters
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'hover:bg-slate-100 text-slate-600 dark:hover:bg-slate-700 dark:text-slate-300'
                            }`}
                    >
                        <ListFilter className="w-4 h-4" />
                        <span>Filtros</span>
                        {isOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </button>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

                    <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-[200px] md:max-w-[400px]">
                        {getActiveFiltersSummary()}
                    </span>

                    {/* Botão limpar rápido se houver filtros e estiver fechado */}
                    {hasActiveFilters && !isOpen && (
                        <button
                            onClick={() => {
                                updateFilter('startDate', null);
                                updateFilter('endDate', null);
                                updateFilter('implantador', null);
                            }}
                            className="ml-2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Limpar todos os filtros"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Direita: Exportar */}
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar Excel</span>
                </button>
            </div>

            {/* Painel Expansível (Inputs) */}
            {isOpen && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="flex flex-wrap items-end gap-4">

                        <div className="w-48">
                            <Select
                                label="Base Temporal"
                                options={baseTemporalOptions}
                                value={filters.baseTemporal}
                                onChange={(val) => updateFilter('baseTemporal', val)}
                            />
                        </div>

                        <div className="w-40">
                            <DatePicker
                                label="Data Início"
                                date={filters.startDate}
                                onChange={(d) => handleDateChange(d, 'startDate')}
                                placeholder="--/--/----"
                            />
                        </div>

                        <div className="w-40">
                            <DatePicker
                                label="Data Fim"
                                date={filters.endDate}
                                onChange={(d) => handleDateChange(d, 'endDate')}
                                placeholder="--/--/----"
                            />
                        </div>

                        <div className="w-56">
                            <Select
                                label="Implantador"
                                options={implantadorOptions}
                                value={filters.implantador || ''}
                                onChange={(val) => updateFilter('implantador', val || null)}
                                placeholder="Todos"
                            />
                        </div>

                        <div className="flex-1"></div>

                        {hasActiveFilters && (
                            <button
                                onClick={() => {
                                    updateFilter('startDate', null);
                                    updateFilter('endDate', null);
                                    updateFilter('implantador', null);
                                }}
                                className="mb-0.5 px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 rounded-lg transition-colors"
                            >
                                Limpar Filtros
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
