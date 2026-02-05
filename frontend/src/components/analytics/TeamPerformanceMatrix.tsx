import React, { useMemo, useState } from 'react';
import { CapacityData, PerformanceData } from './useAnalyticsData';
import { ArrowUpDown, AlertCircle, CheckCircle, TrendingUp, Zap } from 'lucide-react';

interface TeamPerformanceMatrixProps {
    performanceData: PerformanceData[];
    capacityData: CapacityData[];
    onSelectImplantador?: (implantador: string) => void;
}

type SortField = 'implantador' | 'score' | 'done_semester' | 'wip_current' | 'workload_index';
type SortOrder = 'asc' | 'desc';

export const TeamPerformanceMatrix: React.FC<TeamPerformanceMatrixProps> = ({ performanceData, capacityData, onSelectImplantador }) => {
    const [sortField, setSortField] = useState<SortField>('workload_index'); // Default sort by workload for balancing
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Merge Data
    const mergedData = useMemo(() => {
        const map = new Map<string, any>();

        // Init with Performance (Filtered by Date)
        performanceData.forEach(p => {
            map.set(p.implantador, {
                implantador: p.implantador,
                score: p.score,
                done_filtered_count: p.done, // Count in filtered period
                done_filtered_points: p.points, // Points in filtered period
                wip_current_count: p.wip,
                // Defaults
                risk: 'LOW',
                capacity_semester_total: 0,
                capacity_semester_done: 0,
                wip_current_points: 0,
                active_networks: [],
            });
        });

        // Enrich with Capacity (Semester / Global)
        capacityData.forEach(c => {
            const existing = map.get(c.implantador) || {
                implantador: c.implantador,
                score: 0,
                done_filtered_count: 0,
                done_filtered_points: 0,
                wip_current_count: 0
            };

            // Use Filtered Performance Data for the "Period" calculations
            // This ensures the Workload Index respects the dashboard date filters as requested
            const doneCountPeriod = existing.done_filtered_count || 0;
            const donePointsPeriod = existing.done_filtered_points || 0;

            const totalStores = (c.store_count || 0) + doneCountPeriod;
            const totalPoints = (c.current_points || 0) + donePointsPeriod;

            map.set(c.implantador, {
                ...existing,
                risk: c.risk_level,
                capacity_semester_total: c.total_semester_points || ((c.current_points || 0) + (c.finished_points_semester || 0)),
                capacity_semester_done: c.finished_points_semester || 0,
                active_networks: c.active_networks,
                wip_current_count: c.store_count || 0,
                wip_current_points: c.current_points || 0,
                // Workload Index = WIP (Current) + Done (Selected Period)
                workload_index: totalPoints,
                total_stores_semester: totalStores
            });
        });

        return Array.from(map.values());
    }, [performanceData, capacityData]);

    // Sorting
    const sortedData = useMemo(() => {
        // Calculate Official Rank (by Score DESC) independently of display sort
        const ranked = [...mergedData].sort((a, b) => (b.score || 0) - (a.score || 0));
        const rankMap = new Map();
        ranked.forEach((item, index) => {
            rankMap.set(item.implantador, index + 1);
        });

        const displaySorted = [...mergedData].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Map aliases for sorting if needed
            if (sortField === 'done_semester') {
                valA = a.capacity_semester_done;
                valB = b.capacity_semester_done;
            }

            if (typeof valA === 'string') {
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
        });

        // Attach rank to display data
        return displaySorted.map(item => ({
            ...item,
            officialRank: rankMap.get(item.implantador)
        }));
    }, [mergedData, sortField, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className={`transition-opacity ${sortField === field ? 'opacity-100' : 'opacity-20 hover:opacity-50'}`}>
            <ArrowUpDown size={12} />
        </span>
    );

    return (
        <div className="bg-white dark:bg-zinc-800 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-zinc-900/50 text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-center w-16">#</th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('implantador')}>
                                <div className="flex items-center gap-2">Implantador <SortIcon field="implantador" /></div>
                            </th>

                            {/* New Workload Index Column */}
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-right" onClick={() => handleSort('workload_index')}>
                                <div className="flex items-center justify-end gap-2 text-orange-600 dark:text-orange-400 group relative">
                                    Índice de Esforço (Período) <SortIcon field="workload_index" />
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block w-max rounded-md bg-zinc-800 dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none right-0">
                                        Soma dos pontos de WIP atual e entregas no período selecionado.
                                    </div>
                                </div>
                            </th>

                            <th className="px-6 py-4 text-center">Status (Risco)</th>

                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-right" onClick={() => handleSort('wip_current')}>
                                <div className="flex items-center justify-end gap-2">Carga Atual (WIP) <SortIcon field="wip_current" /></div>
                            </th>

                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('done_semester')}>
                                <div className="flex items-center gap-2">Entregas do Semestre <SortIcon field="done_semester" /></div>
                            </th>

                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-right" onClick={() => handleSort('score')}>
                                <div className="flex items-center justify-end gap-2">Score Total <SortIcon field="score" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-700/50">
                        {sortedData.map((row) => (
                            <tr
                                key={row.implantador}
                                className={`hover:bg-slate-50 dark:hover:bg-zinc-700/20 transition-colors group cursor-pointer ${row.officialRank === 1 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                                    }`}
                                onClick={() => onSelectImplantador?.(row.implantador)}
                            >
                                {/* Rank */}
                                <td className="px-6 py-4 text-center">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm shadow-sm ${row.officialRank === 1 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' :
                                        row.officialRank === 2 ? 'bg-slate-200 text-slate-700 ring-2 ring-slate-300' :
                                            row.officialRank === 3 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' :
                                                'bg-slate-50 text-slate-400'
                                        }`}>
                                        {row.officialRank}
                                    </div>
                                </td>

                                {/* Implantador */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shadow-sm bg-gradient-to-br from-slate-200 to-slate-300 dark:from-zinc-700 dark:to-zinc-600 text-slate-700 dark:text-zinc-200`}>
                                            {row.implantador.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 dark:text-zinc-200 text-sm group-hover:text-orange-500 transition-colors">
                                                {row.implantador}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* Workload Index */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-base font-black text-orange-600 dark:text-orange-500">
                                            {row.total_stores_semester || 0} Lojas
                                        </span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-slate-500 font-bold">
                                                {(row.workload_index || 0).toFixed(1)} pts
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {(row.wip_current_points || 0).toFixed(1)} WIP + {(row.done_filtered_points || 0).toFixed(1)} Done
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                {/* Status / Risco */}
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${row.risk === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' :
                                        row.risk === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30' :
                                            'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                        }`}>
                                        {row.risk === 'CRITICAL' ? <AlertCircle size={12} /> :
                                            row.risk === 'HIGH' ? <TrendingUp size={12} /> :
                                                <CheckCircle size={12} />}
                                        {row.risk === 'NORMAL' ? 'NORMAL' : row.risk || 'N/A'}
                                    </span>
                                </td>

                                {/* Carga WIP */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{row.wip_current_count} Lojas</span>
                                            <span className="text-[10px] text-slate-400">({row.wip_current_points?.toFixed(0)} pts)</span>
                                        </div>
                                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, row.wip_current_count * 5)}%` }}></div>
                                        </div>
                                    </div>
                                </td>

                                {/* Entregas do Semestre (DEFAULT VIEW) */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-baseline">
                                            {/* Show Semester TOTAL points here */}
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">{(row.capacity_semester_done || 0).toFixed(1)} pts</span>
                                            <span className="text-xs text-slate-400">Semestre</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-lime-500" style={{ width: `${Math.min(100, (row.capacity_semester_done / (row.capacity_semester_total || 1)) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                                {/* Score */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="flex flex-col items-end">
                                            <span className="text-base font-black text-slate-900 dark:text-white">{row.score?.toFixed(1)}</span>
                                            <span className="text-[10px] text-lime-500 font-bold uppercase tracking-wider">Points</span>
                                        </div>
                                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600 dark:text-yellow-400">
                                            <Zap size={16} fill="currentColor" />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {mergedData.length === 0 && (
                <div className="text-center py-12 text-slate-400 dark:text-zinc-500">
                    Nenhum dado de performance disponível para exibir.
                </div>
            )}
        </div>
    );
};
