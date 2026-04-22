import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import {
    ArrowLeft, User, Briefcase,
    Activity, Download, Sparkles, Loader2, CheckCircle,
    ShieldAlert, Target, HelpCircle
} from 'lucide-react'
import { PerformanceScoreBadge } from '../../components/reports/PerformanceScoreBadge'
import { AnalystRadarChart } from '../../components/reports/AnalystRadarChart'
import { BottleneckDonutChart } from '../../components/reports/BottleneckDonutChart'
import { PeriodFilter, DateRange } from '../../components/ui/PeriodFilter'
import { OperationalControlModal } from '../../components/reports/OperationalControlModal'


export default function AnalystProfileView() {
    const { name } = useParams<{ name: string }>()
    const navigate = useNavigate()

    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // AI State
    const [aiResult, setAiResult] = useState<any>(null)
    const [aiLoading, setAiLoading] = useState(false)

    const [period, setPeriod] = useState<DateRange>({
        start: null,
        end: null,
        label: 'Todo o Período'
    })

    // Modal State
    const [selectedStore, setSelectedStore] = useState<any>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        if (!name) return
        fetchAnalyst()
    }, [name, period])

    const fetchAnalyst = async () => {
        try {
            setLoading(true)
            setError(null)
            let url = `/api/reports/implantadores/${encodeURIComponent(name || '')}`
            
            const periodParam = period.label === 'Mês Vigente' ? 'month' : 
                               period.label === 'Semestre Atual' ? 'semester' : 
                               period.label === 'YTD (Ano atual)' ? 'year' : 'all'
            
            url += `?period=${periodParam}`
            
            const res = await api.get(url)
            setData(res.data)
            if (res.data.last_ai_analysis) {
                setAiResult(res.data.last_ai_analysis)
            }
        } catch (err: any) {
            console.error('Erro ao carregar perfil:', err)
            setError(`Não foi possível carregar os dados deste analista: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleAIAnalysis = async () => {
        if (!name) return
        try {
            setAiLoading(true)
            const res = await api.post(`/api/reports/implantadores/analyze/${encodeURIComponent(name || '')}`)
            setAiResult(res.data)
        } catch (err: any) {
            setAiResult({ error: err.message })
        } finally {
            setAiLoading(false)
        }
    }

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4 bg-[#EEF0F8]">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                <p className="text-slate-500 font-bold animate-pulse">Mapeando Performance Individual...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-6 bg-[#EEF0F8] px-8">
                <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center shadow-lg shadow-rose-100 border border-rose-100">
                    <ShieldAlert size={40} className="text-rose-500" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Ops! Falha na Sincronização</h2>
                    <p className="text-slate-500 font-bold max-w-md text-sm">{error}</p>
                </div>
                <button 
                    onClick={fetchAnalyst}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    Tentar Novamente
                </button>
            </div>
        )
    }

    if (!data) return null

    const summary = data?.summary || {}
    const ativas = data?.carteira_atual || []
    const programadas = data?.programadas || []
    const entregas = data?.concluidas_mes || []
    const actions = summary?.personal_actions || []

    return (
        <div className="min-h-screen bg-[#EEF0F8] pb-20">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-8 pt-8">
                
                {/* 1. TOP HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/team-diagnostics')}
                            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </button>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">
                                <User size={14} />
                                Perfil Analítico Individual
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                                {summary?.implantador || name}
                                {summary?.score && <PerformanceScoreBadge score={summary.score?.score_final || 0} size="lg" />}
                            </h1>

                        </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Carga Ponderada</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{summary?.carga_ponderada?.toFixed(1) || 0}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">pontos</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">SLA (Entregas)</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${summary?.pct_sla_concluidas >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {summary?.pct_sla_concluidas || 0}%
                            </span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">MRR em Gestão</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-slate-900">{formatMoney(summary?.mrr_ativo || 0)}</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Entregas no Período</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{summary?.entregue_mes || 0}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">lojas</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Taxa de Retrabalho</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${summary?.pct_retrabalho > 10 ? 'text-rose-500' : 'text-slate-900'}`}>
                                {summary?.pct_retrabalho?.toFixed(1) || 0}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. COCKPIT SECTION: ACTIONS + INTELLIGENCE + CHARTS */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT SIDE: ACTIONS & AI (8 COLS) */}
                    <div className="xl:col-span-8 space-y-8">
                        {/* 3.1. INDIVIDUAL ACTION PLAN */}
                        {actions.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Target size={120} className="text-indigo-600" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                                            <Activity size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Plano de Ação Individual</h2>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prioridades para {name}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {actions.map((action: any, idx: number) => (
                                            <div key={idx} className="group p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                                                        action.priority === 'HIGH' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-amber-600 bg-amber-50 border-amber-100'
                                                    }`}>
                                                        {action.priority}
                                                    </span>
                                                    <div className="p-1.5 bg-white rounded-lg border border-slate-100 text-indigo-600">
                                                        <Target size={14} />
                                                    </div>
                                                </div>
                                                <h4 className="text-sm font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                                    {action.description}
                                                </h4>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                    <ShieldAlert size={10} />
                                                    IMPACTO: {action.impact}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3.2. AI DIAGNOSTIC SIDE */}
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                        <Sparkles size={18} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Diagnóstico Jarvis DeepView</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Análise Qualitativa Automatizada</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleAIAnalysis}
                                    disabled={aiLoading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                                >
                                    {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {aiLoading ? 'Analisando...' : 'Gerar Novo Diagnóstico'}
                                </button>
                            </div>

                            <div className="p-8">
                                {!aiResult && !aiLoading && (
                                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                                        <HelpCircle size={40} className="text-slate-200 mb-4" />
                                        <p className="text-sm text-slate-400 font-bold text-center max-w-xs uppercase tracking-widest">
                                            Clique no botão acima para iniciar a análise profunda deste analista
                                        </p>
                                    </div>
                                )}

                                {aiResult && !aiResult.error && (
                                    <div className="space-y-8">
                                        {/* Executive Summary */}
                                        <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100/50">
                                            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                <Target size={12} />
                                                Parecer Executivo
                                            </h3>
                                            <p className="text-slate-800 text-lg font-bold leading-snug">
                                                {aiResult.resumo_executivo}
                                            </p>
                                        </div>

                                        {/* Grid Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Patterns */}
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Padrões Detectados</h3>
                                                <div className="space-y-2">
                                                    {aiResult.padroes_identificados?.map((p: string, i: number) => (
                                                        <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                            <span className="text-sm text-slate-700 font-medium">{p}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Bottlenecks */}
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gargalos Operacionais</h3>
                                                <div className="space-y-2">
                                                    {aiResult.gargalos_operacionais?.map((g: string, i: number) => (
                                                        <div key={i} className="flex gap-3 p-3 bg-rose-50/50 rounded-xl border border-rose-100/50">
                                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                                            <span className="text-sm text-slate-700 font-medium">{g}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {aiResult?.error && (
                                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-sm font-bold flex items-center gap-3">
                                        <ShieldAlert size={18} />
                                        {aiResult.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE: CHARTS & METRICS (4 COLS) */}
                    <div className="xl:col-span-4 space-y-6 sticky top-8">
                        {/* RADAR */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                            <h3 className="font-black text-[10px] text-slate-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity className="text-indigo-500" size={14} />
                                Radar de Competências
                            </h3>
                            <div className="flex justify-center items-center min-h-[300px]">
                                {summary?.score?.eixos ? (
                                    <AnalystRadarChart data={summary.score.eixos} />
                                ) : (
                                    <div className="text-slate-300 font-bold text-[10px] uppercase tracking-[0.2em]">Dados Insuficientes</div>
                                )}
                            </div>
                        </div>

                        {/* CAUSE DIAGNOSTIC */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-black text-[10px] text-slate-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ShieldAlert className="text-indigo-500" size={14} />
                                Origem dos Atrasos
                            </h3>
                            <div className="h-64 relative flex items-center justify-center">
                                {summary?.diagnostico_causas ? (
                                    <BottleneckDonutChart data={summary.diagnostico_causas} />
                                ) : (
                                    <div className="text-slate-300 font-bold text-[10px] uppercase tracking-[0.2em]">Sem Ocorrências</div>
                                )}
                            </div>
                        </div>

                        {/* STAGE METRICS (Quick List) */}
                        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
                            <h3 className="font-black text-[10px] text-indigo-400 mb-4 uppercase tracking-[0.2em]">Média de Dias por Etapa</h3>
                            <div className="space-y-3">
                                {summary?.etapas && Object.entries(summary.etapas).slice(0, 4).map(([name, days]: [string, any]) => (
                                    <div key={name} className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{name}</span>
                                        <span className="text-sm font-black text-white">{days}d</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>


                {/* 5. ACTIVE PORTFOLIO TABLE */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                            <Briefcase className="text-indigo-500" size={22} />
                            Carteira Ativa ({ativas.length} Projetos)
                        </h2>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loja</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tempo (SLA)</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Idle</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {ativas.map((loja: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{loja.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{loja.tipo_loja || 'Matriz'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg border border-slate-200">
                                                    {loja.status_name}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    {loja.delivered_with_quality && (
                                                        <div className="p-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100" title="Qualidade Confirmada">
                                                            <CheckCircle size={12} />
                                                        </div>
                                                    )}
                                                    {loja.teve_retrabalho && (
                                                        <div className="p-1 bg-rose-50 text-rose-600 rounded-md border border-rose-100" title="Teve Retrabalho">
                                                            <ShieldAlert size={12} />
                                                        </div>
                                                    )}
                                                    {!loja.considerar_tempo_implantacao && (
                                                        <div className="p-1 bg-slate-100 text-slate-500 rounded-md border border-slate-200" title="SLA Ignorado">
                                                            <Activity size={12} />
                                                        </div>
                                                    )}
                                                    {loja.observacoes && (
                                                        <div className="p-1 bg-indigo-50 text-indigo-500 rounded-md border border-indigo-100" title="Possui Observações">
                                                            <Sparkles size={12} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-black ${loja.dias_em_progresso > loja.tempo_contrato && loja.considerar_tempo_implantacao ? 'text-rose-500' : 'text-slate-700'}`}>
                                                        {loja.dias_em_progresso}d
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Meta: {loja.tempo_contrato}d</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right font-black">
                                                <span className={`px-2 py-1 rounded-lg ${loja.idle_days > 7 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-slate-600'}`}>
                                                    {loja.idle_days}d
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedStore(loja)
                                                        setIsModalOpen(true)
                                                    }}
                                                    className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-all"
                                                    title="Editar Controle Operacional"
                                                >
                                                    <Target size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {ativas.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">Nenhum projeto ativo</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                {/* 5.1. SCHEDULED PROJECTS (PROGRAMADAS) */}
                {programadas.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                            <Activity className="text-amber-500" size={22} />
                            Próximas Implantações ({programadas.length} Agendadas)
                        </h2>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-amber-50/30 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loja</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Início Efetivo</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">MRR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {programadas.map((loja: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-amber-50/20 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 group-hover:text-amber-600 transition-colors">{loja.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{loja.tipo_loja || 'Matriz'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-200">
                                                        AGENDADA: {loja.manual_start_date || loja.effective_started_at}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-slate-500">
                                                {formatMoney(loja.valor_mensalidade || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                )}

                {/* 6. RECENT DELIVERIES */}
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                        <CheckCircle className="text-emerald-500" size={22} />
                        Entregas Recentes ({entregas.length})
                    </h2>
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loja</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Dias</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Entrega</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Impacto Financeiro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {entregas.map((loja: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{loja.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{loja.tipo_loja}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`font-black ${loja.tempo_total > 90 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {loja.tempo_total} dias
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-slate-500 font-medium">
                                                {loja.finished_at}
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-slate-900">
                                                {formatMoney(loja.valor_mensalidade || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>

            <OperationalControlModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                store={selectedStore}
                onSaveSuccess={fetchAnalyst}
            />
        </div>
    )
}
