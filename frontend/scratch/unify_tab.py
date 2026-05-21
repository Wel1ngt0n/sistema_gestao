import sys

f = r'c:\Users\welin\Downloads\sistema_gestao\frontend\src\components\analytics\DashboardAnalytics.tsx'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

old_start = '                    {/* --- ABA 3: TIME & PERFORMANCE --- */}'
idx = content.find(old_start)
end_marker = '</Tab.Panel>'
end_idx = content.find(end_marker, idx) + len(end_marker)

print(f'Found tab at {idx}, ends at {end_idx}')

new_content = r"""                    {/* --- ABA 3: TIME & PERFORMANCE --- */}
                    <Tab.Panel className="space-y-6 animate-fade-in-up focus:outline-none">
                        <div className="space-y-6 animate-fade-in-up duration-300">

                            {/* Summary Metrics */}
                            {cockpitSummary && (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                    <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                                        <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg" style={{ backgroundColor: (cockpitSummary.avg_sla || 0) >= 85 ? '#128131' : '#ff7900' }} />
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">SLA do Time</p>
                                        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{cockpitSummary.avg_sla || 0}%</p>
                                        <p className="mt-3 text-sm text-zinc-500">Meta operacional: 85%</p>
                                    </div>
                                    <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                                        <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg bg-[#ff7900]" />
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Vaz""" + "\u00e3" + r"""o Total</p>
                                        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{cockpitSummary.total_entregues_mes || 0}</p>
                                        <p className="mt-3 text-sm text-zinc-500">Lojas entregues no per""" + "\u00ed" + r"""odo</p>
                                    </div>
                                    <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                                        <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg" style={{ backgroundColor: (cockpitSummary.avg_retrabalho || 0) > 10 ? '#dc2626' : '#128131' }} />
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Retrabalho</p>
                                        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{cockpitSummary.avg_retrabalho || 0}%</p>
                                        <p className="mt-3 text-sm text-zinc-500">M""" + "\u00e9" + r"""dia do time</p>
                                    </div>
                                    <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                                        <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg bg-[#128131]" />
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sa""" + "\u00fa" + r"""de do Time</p>
                                        <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                                            {cockpitSummary.team_health === 'Good' ? 'Consistente' : 'Aten""" + "\u00e7\u00e3" + r"""o'}
                                        </p>
                                        <p className="mt-3 text-sm text-zinc-500">{cockpitSummary.total_ativos || 0} analistas ativos</p>
                                    </div>
                                </div>
                            )}

                            {/* Unified Performance Table + Classification Sidebar */}
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                                <div className="xl:col-span-9">
                                    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-4">
                                            <div>
                                                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                                    <Users size={16} className="text-[#128131]" />
                                                    Time & Performance
                                                </h3>
                                                <p className="mt-1 text-xs text-zinc-500">Compare esfor""" + "\u00e7" + r"""o, carga, entregas, risco e score por implantador.</p>
                                            </div>
                                            <span className="text-xs font-medium text-zinc-500">{cockpitData.length} Implantadores</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="border-b border-zinc-100 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                    <tr>
                                                        <th className="w-10 px-4 py-4 text-center">#</th>
                                                        <th className="cursor-pointer px-4 py-4 transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('implantador')}>Analista</th>
                                                        <th className="cursor-pointer px-4 py-4 text-center transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('score')}>Score</th>
                                                        <th className="px-4 py-4 text-center">Risco</th>
                                                        <th className="cursor-pointer px-4 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('carga_ponderada')}>Carga (pts)</th>
                                                        <th className="px-4 py-4 text-right">WIP</th>
                                                        <th className="cursor-pointer px-4 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('entregas_mes')}>Entregas</th>
                                                        <th className="cursor-pointer px-4 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('pct_retrabalho')}>Retrab.</th>
                                                        <th className="cursor-pointer px-4 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('idle_medio')}>Idle</th>
                                                        <th className="cursor-pointer px-4 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('pct_sla_concluidas')}>SLA</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-100">
                                                    {sortedCockpitData.map((item, idx) => {
                                                        const cap = Array.isArray(capacityData) ? capacityData.find((c: any) => c.implantador === item.implantador) : null;
                                                        const risk = cap?.risk_level || 'NORMAL';
                                                        const wipCount = cap?.store_count || 0;
                                                        const wipPts = cap?.current_points || 0;
                                                        return (
                                                        <tr
                                                            key={idx}
                                                            onClick={() => navigate(`/team-diagnostics/${encodeURIComponent(item.implantador)}`)}
                                                            className={`group cursor-pointer transition-colors hover:bg-zinc-50 ${idx === 0 ? 'bg-orange-50/30' : ''}`}
                                                        >
                                                            <td className="px-4 py-4 text-center">
                                                                <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${idx === 0 ? 'border border-orange-200 bg-orange-50 text-orange-700' : idx === 1 ? 'border border-zinc-200 bg-zinc-100 text-zinc-600' : idx === 2 ? 'border border-amber-200 bg-amber-50 text-amber-700' : 'text-zinc-400'}`}>
                                                                    {idx + 1}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-500 transition-colors group-hover:border-orange-200">
                                                                        {item.implantador.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <span className="font-semibold text-zinc-700 transition-colors group-hover:text-[#ff7900]">{item.implantador}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <PerformanceScoreBadge score={item.score?.score_final || 0} size="sm" />
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${risk === 'CRITICAL' ? 'border-red-100 bg-red-50 text-red-700' : risk === 'HIGH' ? 'border-orange-100 bg-orange-50 text-orange-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                                                                    {risk}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-semibold text-zinc-600">
                                                                {item.carga_ponderada?.toFixed(1)}
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-sm font-semibold text-zinc-700">{wipCount}</span>
                                                                    <span className="text-[10px] text-zinc-400">{wipPts?.toFixed(0)} pts</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-semibold text-zinc-600">
                                                                {item.entregas_mes}
                                                            </td>
                                                            <td className={`px-4 py-4 text-right font-semibold ${((item as any).pct_retrabalho || 0) > 10 ? 'text-rose-700' : 'text-zinc-600'}`}>
                                                                {(item as any).pct_retrabalho?.toFixed(0)}%
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-semibold text-zinc-600">
                                                                {item.idle_medio}d
                                                            </td>
                                                            <td className={`px-4 py-4 text-right font-semibold ${item.pct_sla_concluidas >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                                {item.pct_sla_concluidas}%
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {cockpitLoading && (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="h-6 w-6 rounded-full border-2 border-zinc-200 border-t-[#ff7900] animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <aside className="xl:col-span-3">
                                    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ranking operacional</p>
                                                <h3 className="mt-1 text-sm font-semibold text-zinc-950">Classifica""" + "\u00e7\u00e3" + r"""o do time</h3>
                                            </div>
                                            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                                                {cockpitData.length} analistas
                                            </span>
                                        </div>
                                        <AnalystClassificationCards analysts={cockpitData} isVertical={true} />
                                    </div>
                                </aside>
                            </div>

                        </div>
                    </Tab.Panel>"""

result = content[:idx] + new_content + content[end_idx:]
with open(f, 'w', encoding='utf-8') as fh:
    fh.write(result)
print('Done - unified table written')
