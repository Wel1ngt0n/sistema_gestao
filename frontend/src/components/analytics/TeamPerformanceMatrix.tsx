import React, { useMemo, useState } from 'react';
import { CapacityData, PerformanceData } from './useAnalyticsData';
import { ArrowUpDown, AlertCircle, CheckCircle, TrendingUp, Users, Zap } from 'lucide-react';

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
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                            <Users size={16} className="text-[#128131]" />
                            Time & Performance
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500">
                            Compare esforço, carga atual, entregas e score por implantador.
                        </p>
                    </div>
                    <span className="text-xs font-medium text-zinc-500">
                        Clique em uma linha para abrir o detalhe
                    </span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        <tr>
                            <th className="px-6 py-4 text-center w-16">#</th>
                            <th className="px-6 py-4 cursor-pointer transition-colors hover:bg-zinc-100" onClick={() => handleSort('implantador')}>
                                <div className="flex items-center gap-2">Implantador <SortIcon field="implantador" /></div>
                            </th>

                            {/* New Workload Index Column */}
                            <th className="px-6 py-4 cursor-pointer text-right transition-colors hover:bg-zinc-100" onClick={() => handleSort('workload_index')}>
                                <div className="group relative flex items-center justify-end gap-2 text-zinc-700">
                                    Índice de Esforço (Período) <SortIcon field="workload_index" />
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block w-max rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none right-0">
                                        Soma dos pontos de WIP atual e entregas no período selecionado.
                                    </div>
                                </div>
                            </th>

                            <th className="px-6 py-4 text-center">Status (Risco)</th>

                            <th className="px-6 py-4 cursor-pointer text-right transition-colors hover:bg-zinc-100" onClick={() => handleSort('wip_current')}>
                                <div className="flex items-center justify-end gap-2">Carga Atual (WIP) <SortIcon field="wip_current" /></div>
                            </th>

                            <th className="px-6 py-4 cursor-pointer transition-colors hover:bg-zinc-100" onClick={() => handleSort('done_semester')}>
                                <div className="flex items-center gap-2">Entregas do Semestre <SortIcon field="done_semester" /></div>
                            </th>

                            <th className="px-6 py-4 cursor-pointer text-right transition-colors hover:bg-zinc-100" onClick={() => handleSort('score')}>
                                <div className="flex items-center justify-end gap-2">Score Total <SortIcon field="score" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {sortedData.map((row) => (
                            <tr
                                key={row.implantador}
                                className={`group cursor-pointer transition-colors hover:bg-zinc-50 ${row.officialRank === 1 ? 'bg-orange-50/40' : ''
                                    }`}
                                onClick={() => onSelectImplantador?.(row.implantador)}
                            >
                                {/* Rank */}
                                <td className="px-6 py-4 text-center">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold ${row.officialRank === 1 ? 'border-orange-200 bg-orange-50 text-orange-700' :
                                        row.officialRank === 2 ? 'border-zinc-200 bg-zinc-100 text-zinc-700' :
                                            row.officialRank === 3 ? 'border-amber-200 bg-amber-50 text-amber-700' :
                                                'border-zinc-200 bg-zinc-50 text-zinc-500'
                                        }`}>
                                        {row.officialRank}
                                    </div>
                                </td>

                                {/* Implantador */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700">
                                            {row.implantador.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-zinc-700 transition-colors group-hover:text-[#ff7900]">
                                                {row.implantador}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* Workload Index */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-base font-semibold text-zinc-900">
                                            {row.total_stores_semester || 0} Lojas
                                        </span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-semibold text-zinc-500">
                                                {(row.workload_index || 0).toFixed(1)} pts
                                            </span>
                                            <span className="font-mono text-[10px] text-zinc-400">
                                                {(row.wip_current_points || 0).toFixed(1)} WIP + {(row.done_filtered_points || 0).toFixed(1)} Done
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                {/* Status / Risco */}
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${row.risk === 'CRITICAL' ? 'border-red-100 bg-red-50 text-red-700' :
                                        row.risk === 'HIGH' ? 'border-orange-100 bg-orange-50 text-orange-700' :
                                            'border-emerald-100 bg-emerald-50 text-emerald-700'
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
                                            <span className="text-sm font-semibold text-zinc-700">{row.wip_current_count} Lojas</span>
                                            <span className="text-[10px] text-zinc-400">({row.wip_current_points?.toFixed(0)} pts)</span>
                                        </div>
                                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
                                            <div className="h-full bg-orange-400" style={{ width: `${Math.min(100, row.wip_current_count * 5)}%` }}></div>
                                        </div>
                                    </div>
                                </td>

                                {/* Entregas do Semestre (DEFAULT VIEW) */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-baseline">
                                            {/* Show Semester TOTAL points here */}
                                            <span className="text-sm font-semibold text-zinc-800">{(row.capacity_semester_done || 0).toFixed(1)} pts</span>
                                            <span className="text-xs text-zinc-400">Semestre</span>
                                        </div>
                                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (row.capacity_semester_done / (row.capacity_semester_total || 1)) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                                {/* Score */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="flex flex-col items-end">
                                            <span className="text-base font-semibold text-zinc-900">{row.score?.toFixed(1)}</span>
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Points</span>
                                        </div>
                                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-amber-600">
                                            <Zap size={16} />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {mergedData.length === 0 && (
                <div className="py-12 text-center text-zinc-400">
                    Nenhum dado de performance disponível para exibir.
                </div>
            )}
        </div>
    );
};
