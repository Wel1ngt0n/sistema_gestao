import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Bug, AlertCircle, CheckCircle } from 'lucide-react';

interface IntegrationTeamMatrixProps {
    integrations: any[]; // Data from dashData.integrations
}

type SortField = 'implantador' | 'wip' | 'done' | 'sla' | 'bugs';
type SortOrder = 'asc' | 'desc';

export const IntegrationTeamMatrix: React.FC<IntegrationTeamMatrixProps> = ({ integrations }) => {
    const [sortField, setSortField] = useState<SortField>('done');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const teamData = useMemo(() => {
        const map = new Map<string, any>();

        integrations.forEach(i => {
            const assignee = i.assignee || 'Não Atribuído';
            const isDone = i.status === 'CONCLUÍDO';
            const bugs = i.bugs || 0;
            const slaDays = i.sla_days || 0;
            const isMatriz = i.tipo === 'Matriz';
            const points = isMatriz ? 1.0 : 0.7;

            if (!map.has(assignee)) {
                map.set(assignee, {
                    implantador: assignee,
                    wip: 0,
                    wip_points: 0,
                    done: 0,
                    done_points: 0,
                    bugs: 0,
                    sla_ok: 0,
                    total_done_sla: 0,
                    churn_risk: 0
                });
            }

            const data = map.get(assignee);

            if (isDone) {
                data.done += 1;
                data.done_points += points;
                data.total_done_sla += 1;
                data.bugs += bugs;
                if (slaDays <= 60) data.sla_ok += 1;
            } else {
                data.wip += 1;
                data.wip_points += points;
                if (i.churn_risk) data.churn_risk += 1;
            }
        });

        const arr = Array.from(map.values()).map(d => {
            d.sla_pct = d.total_done_sla > 0 ? (d.sla_ok / d.total_done_sla) * 100 : 100;
            return d;
        });

        // Filter out "Não Atribuído" if it has 0 wip and 0 done
        return arr.filter(d => (d.wip > 0 || d.done > 0));

    }, [integrations]);

    const sortedData = useMemo(() => {
        return [...teamData].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'sla') {
                valA = a.sla_pct;
                valB = b.sla_pct;
            }

            if (typeof valA === 'string') {
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
        });
    }, [teamData, sortField, sortOrder]);

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
        <div className="bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 text-xs font-bold text-slate-5000 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('implantador')}>
                                <div className="flex items-center gap-2">Integrador <SortIcon field="implantador" /></div>
                            </th>

                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => handleSort('wip')}>
                                <div className="flex items-center justify-end gap-2">Carga Atual (WIP) <SortIcon field="wip" /></div>
                            </th>

                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => handleSort('done')}>
                                <div className="flex items-center justify-end gap-2">Entregas Totais <SortIcon field="done" /></div>
                            </th>

                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => handleSort('sla')}>
                                <div className="flex items-center justify-end gap-2 text-orange-600">SLA % <SortIcon field="sla" /></div>
                            </th>

                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => handleSort('bugs')}>
                                <div className="flex items-center justify-end gap-2 text-rose-600">Bugs Totais <SortIcon field="bugs" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map((row) => (
                            <tr
                                key={row.implantador}
                                className="hover:bg-slate-50/20 transition-colors group cursor-default"
                            >
                                {/* Integrador */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shadow-sm bg-gradient-to-br from-orange-200 to-rose-300 text-orange-900`}>
                                            {row.implantador.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm group-hover:text-orange-500 transition-colors">
                                                {row.implantador}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* Carga WIP */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-bold text-slate-700">{row.wip} Lojas</span>
                                        </div>
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, row.wip * 10)}%` }}></div>
                                        </div>
                                        {row.churn_risk > 0 && (
                                            <span className="text-[10px] text-rose-500 flex items-center gap-1 font-bold">
                                                <AlertCircle size={10} /> {row.churn_risk} em Risco
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Entregas Totais */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm font-bold text-slate-800">{row.done}</span>
                                        </div>
                                        <span className="text-xs text-slate-400">{row.done_points.toFixed(1)} pts</span>
                                    </div>
                                </td>

                                {/* SLA % */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={`text-sm font-black ${row.sla_pct >= 90 ? 'text-emerald-500' : row.sla_pct >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
                                            {row.sla_pct.toFixed(0)}%
                                        </span>
                                    </div>
                                </td>

                                {/* Bugs */}
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={`text-base font-black ${row.bugs > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {row.bugs > 0 ? row.bugs : '-'}
                                        </span>
                                        <div className={`p-1.5 rounded-lg ${row.bugs > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {row.bugs > 0 ? <Bug size={14} /> : <CheckCircle size={14} />}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {teamData.length === 0 && (
                <div className="text-center py-12 text-slate-4000">
                    Nenhum dado atribuído a integradores.
                </div>
            )}
        </div>
    );
};
