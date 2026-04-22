import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
    Brain, Download, TrendingUp, Activity, 
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
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4 bg-[#EEF0F8]">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                <p className="text-slate-500 font-bold animate-pulse">Sincronizando Cockpit Jarvis...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#EEF0F8] pb-20">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-6 pt-8">
                
                {/* 1. TOP HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">
                            <Brain size={14} className="animate-pulse" />
                            Gestão de Performance v3.5
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">
                            Dashboard de Operações
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center">
                            <PeriodFilter value={period} onChange={setPeriod} />
                        </div>
                        <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                            <Download size={18} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* 2. KPI GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Analistas Ativos</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{summary?.total_ativos || 0}</span>
                            <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                                <TrendingUp size={12} /> +2
                            </span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">SLA do Time</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${summary?.avg_sla >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {summary?.avg_sla || 0}%
                            </span>
                            <span className="text-xs font-bold text-slate-400">Meta: 85%</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Vazão Total</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{summary?.total_entregues_mes || 0}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">no período</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Status Saúde</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-xl font-black uppercase ${summary?.team_health === 'Good' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {summary?.team_health === 'Good' ? 'Consistente' : 'Atenção'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Taxa de Retrabalho</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${summary?.avg_retrabalho > 10 ? 'text-rose-500' : 'text-slate-900'}`}>
                                {summary?.avg_retrabalho || 0}%
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">média time</span>
                        </div>
                    </div>
                </div>

                {/* 3. PROJECTION & ACTIONS GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                    {/* LEFT: PROJECTION */}
                    <div className="xl:col-span-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col" aria-label="Projeção de MRR">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <TrendingUp size={20} className="text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Projeção de Performance</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">Faturamento Real vs Projetado (Matriz/Filial)</p>
                            </div>
                        </div>
                        <div className="flex-1 min-h-[300px]">
                            {companyProjection ? (
                                <MRRNetProjectionWidget data={companyProjection} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase tracking-[0.2em]">Carregando Projeção...</div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: QUICK ACTIONS */}
                    <div className="xl:col-span-4 flex flex-col h-full">
                        <TeamActionsBlock actions={teamActions} isVertical={true} />
                    </div>
                </div>

                {/* 4. PERFORMANCE ANALYSIS GRID: CLASSIFICATION + TABLE */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                    {/* CLASSIFICATION (LEFT 4) */}
                    <div className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
                        <AnalystClassificationCards analysts={data} isVertical={true} />
                    </div>

                    {/* TABLE (RIGHT 8) */}
                    <div className="xl:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                <LayoutDashboard className="text-slate-400" size={18} />
                                Mesa Comparativa de Performance
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                <Search size={14} className="text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{data.length} Implantadores</span>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('implantador')}>Analista</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('score')}>Score</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('carga_ponderada')}>Carga</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('entregas_mes')}>Entregas</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('pct_retrabalho' as any)}>Retrabalho</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('idle_medio')}>Idle</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('pct_sla_concluidas')}>SLA</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {sortedData.map((item, idx) => (
                                        <tr 
                                            key={idx} 
                                            onClick={() => navigate(`/team-diagnostics/${encodeURIComponent(item.implantador)}`)}
                                            className="group hover:bg-slate-50 transition-all cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-[10px] border border-slate-200 group-hover:border-indigo-400 transition-colors">
                                                        {item.implantador.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-700">{item.implantador}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <PerformanceScoreBadge score={item.score?.score_final || 0} size="sm" />
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${item.carga_ponderada === extremes?.maxCarga ? 'text-indigo-600 bg-indigo-50/30' : 'text-slate-600'}`}>
                                                {item.carga_ponderada.toFixed(1)}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${item.entregas_mes === extremes?.maxEntregas ? 'text-emerald-600 bg-emerald-50/30' : 'text-slate-600'}`}>
                                                {item.entregas_mes}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${(item as any).pct_retrabalho === extremes?.maxRetrabalho && (item as any).pct_retrabalho > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-600'}`}>
                                                {(item as any).pct_retrabalho?.toFixed(0)}%
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${item.idle_medio === extremes?.maxIdle ? 'text-rose-600 bg-rose-50/30' : 'text-slate-600'}`}>
                                                {item.idle_medio}d
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${item.pct_sla_concluidas === extremes?.minSla ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-600'}`}>
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {/* DIAGNOSTICO CAUSA */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Activity size={14} className="text-indigo-500" />
                            Diagnóstico por Causa
                        </h4>
                        <div className="flex-1 min-h-[250px] relative flex items-center justify-center">
                            {diagnostics && <BottleneckDonutChart data={diagnostics.causas_distribuicao} />}
                        </div>
                    </div>

                    {/* GARGALOS ETAPA */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Clock size={14} className="text-indigo-500" />
                            Gargalos por Etapa
                        </h4>
                        <div className="flex-1 space-y-1">
                            {diagnostics?.top_gargalos_etapa?.slice(0, 5).map((g: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-transparent hover:border-indigo-500/20 transition-all group">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{g.etapa}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-900">{g.count}</span>
                                        <ChevronRight size={12} className="text-slate-200 group-hover:text-indigo-500 transition-colors" />
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
                    <button className="px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center gap-2">
                        <Download size={14} />
                        Gerar Relatório Estratégico Completo
                    </button>
                </div>


            </div>
        </div>
    )
}

export default TeamDiagnosticsView
