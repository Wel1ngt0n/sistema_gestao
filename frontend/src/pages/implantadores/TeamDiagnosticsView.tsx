import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import {
    Users, Download, 
    Activity, Clock, Brain, TrendingUp, Zap, ShieldAlert
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PeriodFilter, DateRange } from '../../components/ui/PeriodFilter'
import { MRRNetProjectionWidget } from '../../components/reports/MRRNetProjectionWidget'
import { PerformanceScoreBadge } from '../../components/reports/PerformanceScoreBadge'
import { BottleneckDonutChart } from '../../components/reports/BottleneckDonutChart'
import { JarvisCopilot } from '../../components/analytics/JarvisCopilot'

interface AnalystResume {
    implantador: string
    ativos: number
    entregues: number
    carga_ponderada: number
    matrizes_ativas: number
    filiais_ativas: number
    mrr_ativo: number
    entregas_mes: number
    pct_sla_concluidas: number
    pct_sla_ativas: number
    pct_retrabalho: number
    idle_medio: number
    idle_critico_count: number
    score?: {
        score_final: number;
        eixos: any;
    }
    jarvis_status?: 'HIGH_PERFORMANCE' | 'HEALTHY' | 'WARNING' | 'OVERLOADED' | 'CRITICAL_IDLE'
    recommendation?: string
    action_priority?: 'high' | 'medium' | 'low'
}

export default function TeamDiagnosticsView() {
    const navigate = useNavigate()
    const [data, setData] = useState<AnalystResume[]>([])
    const [summary, setSummary] = useState<any>(null)
    const [alerts, setAlerts] = useState<any[]>([])
    const [diagnostics, setDiagnostics] = useState<any>(null)
    const [companyProjection, setCompanyProjection] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [period, setPeriod] = useState<DateRange>(() => {
        const today = new Date();
        return {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59),
            label: 'Mês Vigente'
        };
    })

    // Sorters
    const [sortField, setSortField] = useState<keyof AnalystResume>('carga_ponderada')
    const [sortAsc, setSortAsc] = useState(false)

    useEffect(() => {
        fetchUnifiedData()
    }, [period])

    const fetchUnifiedData = async () => {
        try {
            setLoading(true)
            const params = period.start && period.end 
                ? `?start_date=${period.start.toISOString()}&end_date=${period.end.toISOString()}`
                : ''
            
            // Call Cockpit for main team data (includes IA classifications)
            const cockpitRes = await api.get(`/api/reports/implantadores/cockpit${params}`)
            setData(cockpitRes.data.analysts || [])
            setSummary(cockpitRes.data.summary)
            setAlerts(cockpitRes.data.alerts || [])

            // Call Diagnostics for cause charts
            const diagRes = await api.get('/api/reports/implantadores/diagnostico')
            setDiagnostics(diagRes.data)

            // Call Resume for projection (keeping legacy projection for now if separate)
            const resumeRes = await api.get(`/api/reports/implantadores/resumo${params}`)
            setCompanyProjection(resumeRes.data.company_projection)

        } catch (err: any) {
            setError(err.message)
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

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'HIGH_PERFORMANCE': return { label: 'Alta Performance', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
            case 'HEALTHY': return { label: 'Consistente', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' }
            case 'WARNING': return { label: 'Atenção', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }
            case 'OVERLOADED': return { label: 'Baixa Performance (Sobrecarga)', color: 'bg-red-500/10 text-red-600 border-red-500/20' }
            case 'CRITICAL_IDLE': return { label: 'Baixa Performance (Inatividade)', color: 'bg-red-500/10 text-red-600 border-red-500/20' }
            default: return { label: 'Em Análise', color: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20' }
        }
    }

    if (loading && !data.length) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin"></div>
                <p className="text-zinc-500 font-bold animate-pulse">Sincronizando Módulo Operacional...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-2">
                    <ShieldAlert size={20} />
                    <span className="font-bold">Erro ao carregar dados: {error}</span>
                </div>
                <button 
                    onClick={() => { setError(null); fetchUnifiedData(); }}
                    className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                >
                    Tentar Novamente
                </button>
            </div>
        )
    }

    return (
        <div aria-label="Team Diagnostics Dashboard" className="max-w-[1600px] mx-auto space-y-8 pb-20 px-4 md:px-8">
            
            {/* 1. TOP HEADER & FILTERS */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-orange-500 font-black text-[10px] uppercase tracking-[0.3em]">
                        <Brain size={14} className="animate-pulse" />
                        Jarvis Intelligence Core
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-zinc-900">
                        Gestão Operacional do Time
                    </h1>
                    <p className="text-zinc-500 text-lg">
                        Métricas consolidadas e análise preditiva do time de implantação.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm">
                    <PeriodFilter value={period} onChange={setPeriod} />
                    <div className="flex gap-2">
                         <button className="p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors">
                             <Download size={18} />
                         </button>
                    </div>
                </div>
            </div>

            {/* 2. SUMMARY CARDS & PROJECTION */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8">
                    {companyProjection && <MRRNetProjectionWidget data={companyProjection} />}
                </div>
                <div className="xl:col-span-4 grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mb-1">Total Ativos</span>
                        <span className="text-3xl font-black">{summary?.total_ativos || 0}</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                             <TrendingUp size={10} /> +5% vs mês ant.
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mb-1">SLA Médio</span>
                        <span className={`text-3xl font-black ${summary?.avg_sla > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {summary?.avg_sla || 0}%
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 mt-2 uppercase">
                             Meta: 85%
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. ALERTS & IA COPILOT SECTION (The Split Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT CONTENT: DATA & DIAGNOSTICS */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* ACTION BLOCK (JARVIS ALERTS) */}
                    {alerts.length > 0 && (
                        <div className="space-y-4 animate-in slide-in-from-left duration-700">
                             <h3 className="text-xs font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
                                 <ShieldAlert size={14} /> Alertas de Ação Imediata
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {alerts.map((alert, idx) => (
                                     <div key={idx} className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl flex items-start gap-4">
                                         <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                                             <Activity size={18} />
                                         </div>
                                         <p className="text-sm font-medium text-red-700 leading-relaxed">
                                             {alert.msg}
                                         </p>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}

                    {/* TABLE: PERFORMANCE MATRIX */}
                    <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                            <h3 className="font-bold text-xl flex items-center gap-2">
                                <Users className="text-zinc-400" size={20} />
                                Ranking de Performance do Time
                            </h3>
                            <div className="text-[10px] font-black uppercase px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full tracking-widest">
                                {data.length} Analistas
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-zinc-400 uppercase font-black bg-zinc-50/50/50 border-b border-zinc-100 tracking-widest">
                                    <tr>
                                        <th className="px-6 py-5 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => handleSort('implantador')}>Implantador</th>
                                        <th className="px-6 py-5 text-center cursor-pointer hover:text-orange-500 transition-colors" onClick={() => handleSort('score')}>Score</th>
                                        <th className="px-6 py-5 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => handleSort('jarvis_status')}>Classificação</th>
                                        <th className="px-6 py-5 text-right cursor-pointer hover:text-orange-500 transition-colors" onClick={() => handleSort('carga_ponderada')}>Carga</th>
                                        <th className="px-6 py-5 text-right cursor-pointer hover:text-orange-500 transition-colors" onClick={() => handleSort('entregas_mes')}>Entregas</th>
                                        <th className="px-6 py-5 text-right cursor-pointer hover:text-orange-500 transition-colors" onClick={() => handleSort('idle_medio')}>Idle</th>
                                        <th className="px-6 py-5 text-right cursor-pointer hover:text-orange-500 transition-colors" onClick={() => handleSort('pct_sla_concluidas')}>SLA</th>
                                        <th className="px-6 py-5 text-right cursor-pointer hover:text-orange-500 transition-colors" onClick={() => handleSort('mrr_ativo')}>MRR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {sortedData.map((item, idx) => {
                                        const status = getStatusLabel(item.jarvis_status || '');
                                        return (
                                            <tr 
                                                key={idx} 
                                                onClick={() => navigate(`/team-diagnostics/${encodeURIComponent(item.implantador)}`)}
                                                className="group hover:bg-zinc-50/80/30 transition-all cursor-pointer"
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-black text-zinc-400 text-xs border border-zinc-200 group-hover:border-orange-500 transition-colors">
                                                            {item.implantador.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-bold text-zinc-900">{item.implantador}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <PerformanceScoreBadge score={item.score?.score_final || 0} size="sm" />
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 italic max-w-[200px] truncate">
                                                            {item.recommendation || "Sem pendências críticas."}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right font-black text-zinc-700">
                                                    {item.carga_ponderada.toFixed(1)} <span className="text-[10px] font-medium text-zinc-400">pts</span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-bold">{item.entregas_mes}</span>
                                                        <span className="text-[10px] text-zinc-400 uppercase font-black tracking-tighter">no período</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className={`font-bold ${item.idle_medio > 5 ? 'text-amber-500' : 'text-zinc-500'}`}>
                                                        {item.idle_medio}d
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className={`font-bold ${item.pct_sla_concluidas < 75 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {item.pct_sla_concluidas}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right font-medium text-zinc-500">
                                                    {formatMoney(item.mrr_ativo)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* CAUSE DIAGNOSTICS & BOTTLENECKS */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-5 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-orange-500" />
                                Diagnóstico por Causa
                            </h4>
                            <div className="h-64 relative flex items-center justify-center">
                                {diagnostics && <BottleneckDonutChart data={diagnostics.causas_distribuicao} />}
                            </div>
                        </div>
                        <div className="md:col-span-7 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                            <h4 className="font-black mb-4 flex items-center gap-2 text-orange-600 uppercase text-xs tracking-widest">
                                <Clock size={18} />
                                Gargalos por Etapa
                            </h4>
                            <div className="space-y-2">
                                {diagnostics?.top_gargalos_etapa?.slice(0, 5).map((g: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-50/50 rounded-xl border border-transparent hover:border-orange-500/20 transition-all">
                                        <span className="text-xs font-bold text-zinc-600 uppercase tracking-tight">{g.etapa}</span>
                                        <span className="text-sm font-black text-zinc-900">{g.count} <span className="text-[9px] font-bold text-zinc-400">LOJAS</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT CONTENT: JARVIS COPILOT (STICKY SIDEBAR) */}
                <div className="lg:col-span-4 sticky top-8">
                     <JarvisCopilot 
                        teamData={data} 
                        diagnosticsData={diagnostics} 
                    />
                    
                    {/* QUICK ACTION RECOMMENDATIONS BELOW COPILOT */}
                    <div className="mt-6 p-8 bg-zinc-900 border border-zinc-800 rounded-[2rem] text-white shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                            <Zap size={100} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-orange-500">Próximos Passos</h4>
                        <div className="space-y-5">
                            <div className="flex gap-4 items-start group/step">
                                <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center font-black text-[10px] shrink-0 shadow-lg shadow-orange-500/20">1</div>
                                <p className="text-xs font-bold leading-relaxed text-zinc-300 group-hover/step:text-white transition-colors">Cobrar avanço das lojas em "Idle" acima de 7 dias.</p>
                            </div>
                            <div className="flex gap-4 items-start group/step">
                                <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center font-black text-[10px] shrink-0 border border-zinc-700">2</div>
                                <p className="text-xs font-bold leading-relaxed text-zinc-400 group-hover/step:text-white transition-colors">Avaliar redistribuição de carga dos analistas em nível "Sobrecarga".</p>
                            </div>
                        </div>
                        <button className="mt-8 w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                             Gerar Relatório Executivo
                        </button>
                    </div>
                </div>

            </div>

        </div>
    )
}
