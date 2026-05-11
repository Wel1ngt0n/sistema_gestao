import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Download, TrendingUp, Activity,
    Clock, LayoutDashboard, Search, ChevronRight
} from 'lucide-react'
import { api } from '../../services/api'
import { PeriodFilter, DateRange } from '../../components/ui/PeriodFilter'
import { MRRNetProjectionWidget } from '../../components/reports/MRRNetProjectionWidget'
import { PerformanceScoreBadge } from '../../components/reports/PerformanceScoreBadge'
import { TeamActionsBlock } from '../../components/analytics/TeamActionsBlock'
import { AnalystClassificationCards } from '../../components/analytics/AnalystClassificationCards'
import { IntelligenceInsightBlock } from '../../components/analytics/IntelligenceInsightBlock'
import { BottleneckDonutChart } from '../../components/reports/BottleneckDonutChart'
import logo from '../../assets/logo.png'

interface AnalystResume {
    implantador: string
    ativos: number
    entregas_mes: number
    idle_medio: number
    pct_sla_concluidas: number
    mrr_ativo: number
    carga_ponderada: number
    score: {
        score_final: number
    }
    jarvis_status?: string
    recommendation?: string
    action_priority?: string
}

export const TeamDiagnosticsView: React.FC = () => {
    const navigate = useNavigate()
    const [period, setPeriod] = useState<DateRange>({ start: null, end: null, label: 'Todo o Período' })
    const [loading, setLoading] = useState(true)
    
    // Data states
    const [data, setData] = useState<AnalystResume[]>([])
    const [summary, setSummary] = useState<any>(null)
    const [avgMetrics, setAvgMetrics] = useState<any>(null)
    const [teamActions, setTeamActions] = useState<any[]>([])
    const [diagnostics, setDiagnostics] = useState<any>(null)
    const [companyProjection, setCompanyProjection] = useState<any>(null)

    // Sort state
    const [sortField, setSortField] = useState<keyof AnalystResume>('score')
    const [sortAsc, setSortAsc] = useState(false)

    useEffect(() => {
        fetchUnifiedData()
    }, [period])

    const fetchUnifiedData = async () => {
        setLoading(true)
        try {
            // Mapping DateRange to backend period param or using dates
            const periodParam = period.label === 'Mês Vigente' ? 'month' : 
                               period.label === 'Semestre Atual' ? 'semester' : 
                               period.label === 'YTD (Ano atual)' ? 'year' : 'all'
            
            const params = `?period=${periodParam}`
            
            // Cockpit data (The enriched endpoint)
            const cockpitRes = await api.get(`/api/reports/implantadores/cockpit${params}`)
            setData(cockpitRes.data.analysts || [])
            setSummary(cockpitRes.data.summary)
            setAvgMetrics(cockpitRes.data.avg_metrics)
            setTeamActions(cockpitRes.data.team_actions || [])

            // Secondary diagnostic data
            const diagRes = await api.get(`/api/reports/implantadores/diagnostico${params}`)
            setDiagnostics(diagRes.data)

            // Projection data
            const resumeRes = await api.get(`/api/reports/implantadores/resumo${params}`)
            setCompanyProjection(resumeRes.data.company_projection)

        } catch (err: any) {
            console.error('Erro ao carregar dados do Cockpit:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSort = (field: keyof AnalystResume) => {
        if (sortField === field) {
            setSortAsc(!sortAsc)
        } else {
            setSortField(field)
            setSortAsc(false)
        }
    }

    const sortedData = [...data].sort((a, b) => {
        let valA: any = a[sortField]
        let valB: any = b[sortField]
        if (sortField === 'score') {
            valA = a.score?.score_final || 0
            valB = b.score?.score_final || 0
        }
        if (valA < valB) return sortAsc ? -1 : 1
        if (valA > valB) return sortAsc ? 1 : -1
        return 0
    })

    // Extreme value helpers for table highlighting
    const extremes = React.useMemo(() => {
        if (!data.length) return null
        return {
            maxIdle: Math.max(...data.map(a => a.idle_medio)),
            minSla: Math.min(...data.map(a => a.pct_sla_concluidas)),
            maxCarga: Math.max(...data.map(a => a.carga_ponderada)),
            maxEntregas: Math.max(...data.map(a => a.entregas_mes)),
            maxRetrabalho: Math.max(...data.map(a => (a as any).pct_retrabalho || 0))
        }
    }, [data])

    if (loading && !data.length) {
        return (
            <div className="flex h-[70vh] flex-col items-center justify-center gap-4 bg-[#EEF0F8]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-[#ff7900]"></div>
                <p className="text-sm font-medium text-zinc-500">Carregando relatórios do time...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#EEF0F8] pb-20">
            <div className="mx-auto max-w-[1600px] space-y-6 px-4 pt-8 md:px-8">

                {/* 1. TOP HEADER */}
                <header className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                                <img src={logo} alt="Instabuy" className="h-7 w-auto object-contain" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Gestão do Time</p>
                                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
                                    Relatórios do time
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                                    Visão consolidada de performance, capacidade, riscos e ações prioritárias.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
                                <PeriodFilter value={period} onChange={setPeriod} />
                            </div>
                            <button className="rounded-lg border border-zinc-200 bg-white p-2.5 text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-950">
                                <Download size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="mt-5 h-1 w-24 rounded-full bg-[#ff7900]" />
                </header>

                {/* 2. KPI GRID */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                        <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg bg-[#ff7900] opacity-70"></div>
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Analistas Ativos</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-semibold tracking-tight text-zinc-950">{summary?.total_ativos || 0}</span>
                            <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                                <TrendingUp size={12} /> +2
                            </span>
                        </div>
                    </div>
                    <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                        <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg bg-emerald-500 opacity-70"></div>
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">SLA do Time</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-semibold tracking-tight text-zinc-950">
                                {summary?.avg_sla || 0}%
                            </span>
                            <span className="text-xs font-medium text-zinc-500">Meta: 85%</span>
                        </div>
                    </div>
                    <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                        <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg bg-sky-500 opacity-70"></div>
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Vazão Total</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-semibold tracking-tight text-zinc-950">{summary?.total_entregues_mes || 0}</span>
                            <span className="text-xs font-medium text-zinc-500">no período</span>
                        </div>
                    </div>
                    <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                        <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg bg-orange-500 opacity-70"></div>
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Status Saúde</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-semibold text-zinc-950">
                                {summary?.team_health === 'Good' ? 'Consistente' : 'Atenção'}
                            </span>
                        </div>
                    </div>
                    <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                        <div className="absolute left-0 top-0 h-0.5 w-full rounded-t-lg bg-rose-500 opacity-70"></div>
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Taxa de Retrabalho</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-semibold tracking-tight text-zinc-950">
                                {summary?.avg_retrabalho || 0}%
                            </span>
                            <span className="text-xs font-medium text-zinc-500">média time</span>
                        </div>
                    </div>
                </div>

                {/* 3. PROJECTION & ACTIONS GRID */}
                <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
                    {/* LEFT: PROJECTION */}
                    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md xl:col-span-8" aria-label="Projeção de MRR">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2">
                                <TrendingUp size={18} className="text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-zinc-950">Projeção de Performance</h2>
                                <p className="text-sm text-zinc-500">Faturamento real vs projetado por matriz e filial.</p>
                            </div>
                        </div>
                        <div className="flex-1 min-h-[300px]">
                            {companyProjection ? (
                                <MRRNetProjectionWidget data={companyProjection} />
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm font-medium text-zinc-400">Carregando projeção...</div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: QUICK ACTIONS */}
                    <div className="xl:col-span-4 flex flex-col h-full">
                        <TeamActionsBlock actions={teamActions} isVertical={true} />
                    </div>
                </div>

                {/* 4. PERFORMANCE ANALYSIS GRID: CLASSIFICATION + TABLE */}
                <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
                    {/* CLASSIFICATION (LEFT 4) */}
                    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-4">
                        <AnalystClassificationCards analysts={data} isVertical={true} />
                    </div>

                    {/* TABLE (RIGHT 8) */}
                    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm xl:col-span-8">
                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 p-5">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                <LayoutDashboard className="text-[#128131]" size={16} />
                                Mesa Comparativa de Performance
                            </h3>
                            <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5">
                                <Search size={14} className="text-zinc-400" />
                                <span className="text-xs font-medium text-zinc-500">{data.length} Implantadores</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="border-b border-zinc-100 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    <tr>
                                        <th className="cursor-pointer px-6 py-4 transition-colors hover:text-[#ff7900]" onClick={() => handleSort('implantador')}>Analista</th>
                                        <th className="cursor-pointer px-6 py-4 text-center transition-colors hover:text-[#ff7900]" onClick={() => handleSort('score')}>Score</th>
                                        <th className="cursor-pointer px-6 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleSort('carga_ponderada')}>Carga</th>
                                        <th className="cursor-pointer px-6 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleSort('entregas_mes')}>Entregas</th>
                                        <th className="cursor-pointer px-6 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleSort('pct_retrabalho' as any)}>Retrabalho</th>
                                        <th className="cursor-pointer px-6 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleSort('idle_medio')}>Idle</th>
                                        <th className="cursor-pointer px-6 py-4 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleSort('pct_sla_concluidas')}>SLA</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {sortedData.map((item, idx) => (
                                        <tr 
                                            key={idx} 
                                            onClick={() => navigate(`/team-diagnostics/${encodeURIComponent(item.implantador)}`)}
                                            className="group cursor-pointer transition-colors hover:bg-zinc-50"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-500 transition-colors group-hover:border-orange-200">
                                                        {item.implantador.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold text-zinc-700 transition-colors group-hover:text-[#ff7900]">{item.implantador}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <PerformanceScoreBadge score={item.score?.score_final || 0} size="sm" />
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${item.carga_ponderada === extremes?.maxCarga ? 'bg-orange-50/40 text-orange-700' : 'text-zinc-600'}`}>
                                                {item.carga_ponderada.toFixed(1)}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${item.entregas_mes === extremes?.maxEntregas ? 'bg-emerald-50/40 text-emerald-700' : 'text-zinc-600'}`}>
                                                {item.entregas_mes}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${(item as any).pct_retrabalho === extremes?.maxRetrabalho && (item as any).pct_retrabalho > 0 ? 'bg-rose-50 text-rose-700' : 'text-zinc-600'}`}>
                                                {(item as any).pct_retrabalho?.toFixed(0)}%
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${item.idle_medio === extremes?.maxIdle ? 'bg-rose-50/40 text-rose-700' : 'text-zinc-600'}`}>
                                                {item.idle_medio}d
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${item.pct_sla_concluidas === extremes?.minSla ? 'bg-rose-50/40 text-rose-700' : 'text-emerald-700'}`}>
                                                {item.pct_sla_concluidas}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 5. DIAGNOSTICS & INTELLIGENCE GRID: 3 EQUAL COLUMNS */}
                <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
                    {/* DIAGNOSTICO CAUSA */}
                    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                            <Activity size={16} className="text-[#128131]" />
                            Diagnóstico por Causa
                        </h4>
                        <div className="flex-1 min-h-[250px] relative flex items-center justify-center">
                            {diagnostics && <BottleneckDonutChart data={diagnostics.causas_distribuicao} />}
                        </div>
                    </div>

                    {/* GARGALOS ETAPA */}
                    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                            <Clock size={16} className="text-[#128131]" />
                            Gargalos por Etapa
                        </h4>
                        <div className="flex-1 space-y-1">
                            {diagnostics?.top_gargalos_etapa?.slice(0, 5).map((g: any, i: number) => (
                                <div key={i} className="group flex items-center justify-between rounded-lg border border-transparent bg-zinc-50 p-2.5 transition-all hover:border-zinc-200">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{g.etapa}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-zinc-900">{g.count}</span>
                                        <ChevronRight size={12} className="text-zinc-300 transition-colors group-hover:text-[#ff7900]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* INTELLIGENCE JARVIS */}
                    <div className="h-full">
                        <IntelligenceInsightBlock 
                            analysts={data}
                            avgMetrics={avgMetrics}
                        />
                    </div>
                </div>

                {/* 6. BOTTOM ACTIONS */}
                <div className="flex justify-end pt-4">
                    <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-3 text-xs font-semibold text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.98]">
                        <Download size={14} />
                        Gerar Relatório Estratégico Completo
                    </button>
                </div>


            </div>
        </div>
    )
}

export default TeamDiagnosticsView
