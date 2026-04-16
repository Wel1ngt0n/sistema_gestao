import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import {
    PieChart, Sparkles, Loader2, Activity, CheckCircle, 
    AlertTriangle, LayoutDashboard, Target, TrendingUp,
    Briefcase, Clock
} from 'lucide-react'
import { BottleneckDonutChart } from '../../components/reports/BottleneckDonutChart'

export default function TeamDiagnosticsDashboardView() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // AI State
    const [aiResult, setAiResult] = useState<any>(null)
    const [aiLoading, setAiLoading] = useState(false)

    useEffect(() => {
        const fetchDiagnostics = async () => {
            try {
                setLoading(true)
                const res = await api.get('/api/reports/implantadores/diagnostico')
                setData(res.data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchDiagnostics()
    }, [])

    const handleTeamAI = async () => {
        try {
            setAiLoading(true)
            const res = await api.post('/api/reports/implantadores/analyze/team')
            setAiResult(res.data)
        } catch (err: any) {
            setAiResult({ error: err.message })
        } finally {
            setAiLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-orange-500 animate-spin"></div>
                <p className="text-sm font-medium text-zinc-500 animate-pulse">Processando Heurísticas do Time...</p>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="p-8 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-500/20 flex items-center gap-4">
                <AlertTriangle size={24} />
                <div>
                   <h3 className="font-bold">Erro de Carregamento</h3>
                   <p className="text-sm opacity-80">{error || "Falha ao conectar com o serviço de diagnóstico."}</p>
                </div>
            </div>
        )
    }

    const { causas_distribuicao, top_gargalos_etapa, total_analisado } = data

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-[0.2em]">
                        <Activity size={14} />
                        Operational Diagnostics
                    </div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
                        Diagnóstico de Governança
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-2xl">
                        Análise heurística baseada em cadência, paradas e distribuição de carga operacional para identificar a causa raiz de atrasos.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Total Analisado</span>
                        <span className="text-lg font-black text-zinc-900 dark:text-white">{total_analisado} <span className="text-xs font-medium text-zinc-500">Lojas</span></span>
                    </div>
                    <div className="w-px h-8 bg-zinc-100 dark:bg-zinc-800 mx-1"></div>
                    <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-orange-500">
                        <LayoutDashboard size={20} />
                    </div>
                </div>
            </div>

            {/* MAIN DIAGNOSTIC GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. CAUSA RAIZ (PIE CHART) */}
                <div className="lg:col-span-12 xl:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <PieChart className="text-orange-500" size={18} />
                                Distribuição de Causas
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500">Predominância estatística de gargalos</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-[320px] relative flex items-center justify-center">
                        <BottleneckDonutChart data={causas_distribuicao} />
                    </div>
                </div>

                {/* 2. GARGALOS POR ETAPA (LIST) */}
                <div className="lg:col-span-12 xl:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <Clock className="text-indigo-500" size={18} />
                                Gargalos por Etapa (Processo)
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500">Etapas do ClickUp com maior tempo de retenção</p>
                        </div>
                        <div className="text-[10px] font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded">
                            TOP {top_gargalos_etapa.length} CRÍTICOS
                        </div>
                    </div>

                    {top_gargalos_etapa.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                            <CheckCircle size={32} className="mb-2 opacity-20" />
                            <p className="text-sm italic">Nenhum gargalo processual detectado no momento</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {top_gargalos_etapa.map((g: any, i: number) => (
                                <div 
                                    key={i} 
                                    className="group flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-default"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 text-[10px] font-bold text-zinc-400 border border-zinc-100 dark:border-zinc-600">
                                            0{i+1}
                                        </div>
                                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {g.etapa}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-lg font-black text-zinc-900 dark:text-white leading-none">{g.count}</span>
                                        <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Lojas</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/10">
                        <p className="text-[11px] text-amber-700 dark:text-amber-500 flex items-start gap-2 leading-relaxed italic">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            Atenção: Ações nestas etapas impactam diretamente a taxa de conversão final do time. Reavalie processos de validação e hand-off nestas áreas.
                        </p>
                    </div>
                </div>
            </div>

            {/* AI DIAGNOSTICS SECTION */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                
                <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/40">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                                    Diagnóstico Estratégico do Time (IA)
                                </h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                                    Parecer consultivo gerado por Inteligência Artificial baseado no contexto total.
                                </p>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleTeamAI}
                            disabled={aiLoading}
                            className={`
                                flex items-center gap-3 px-8 py-3 rounded-2xl text-sm font-black transition-all shadow-xl
                                ${aiLoading 
                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 animate-pulse-subtle'}
                            `}
                        >
                            {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles size={18} />}
                            {aiLoading ? 'ANALISANDO OPERAÇÕES...' : 'GERAR PARECER TÁTICO'}
                        </button>
                    </div>

                    {!aiResult && !aiLoading && (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                            <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-700">
                                <Sparkles size={32} />
                            </div>
                            <p className="text-zinc-500 font-medium">Pronto para gerar diagnóstico executivo</p>
                            <p className="text-xs text-zinc-400 mt-1">Cross-check de todos os analistas e faturamento em risco</p>
                        </div>
                    )}

                    {aiResult && !aiResult.error && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                            
                            {/* 1. RESUMO EXECUTIVO (FULL WIDTH) */}
                            <div className="relative group/card">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 rounded-2xl opacity-0 group-hover/card:opacity-100 transition duration-500"></div>
                                <div className="relative p-6 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10">
                                        <FileText size={80} />
                                    </div>
                                    <h3 className="text-[10px] uppercase font-black text-indigo-500 tracking-widest mb-3">01. Sumário Executivo</h3>
                                    <p className="text-lg font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed italic text-balance">
                                        "{aiResult.resumo_executivo}"
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                
                                {/* 2. PADRÕES IDENTIFICADOS */}
                                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                                    <h3 className="text-[10px] uppercase font-black text-blue-500 tracking-widest mb-4 flex items-center gap-2">
                                        <TrendingUp size={14} />
                                        02. Padrões de Performance
                                    </h3>
                                    <div className="space-y-3">
                                        {aiResult.padroes_equipe?.map((p: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                                                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 text-[10px] flex items-center justify-center font-bold">{i+1}</span>
                                                {p}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. DIAGNÓSTICO DE RISCOS */}
                                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all">
                                    <h3 className="text-[10px] uppercase font-black text-red-500 tracking-widest mb-4 flex items-center gap-2">
                                        <AlertTriangle size={14} />
                                        03. Riscos & Alertas Críticos
                                    </h3>
                                    <div className="space-y-3">
                                        {aiResult.riscos_criticos?.map((r: string, i: number) => (
                                            <div key={i} className="flex gap-3 text-zinc-700 dark:text-zinc-300 text-sm font-semibold p-3 bg-white dark:bg-zinc-800 rounded-xl border-l-4 border-red-500 shadow-sm">
                                                {r}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 4. RECOMENDAÇÕES PARA GESTÃO */}
                            <div className="p-8 bg-zinc-900 dark:bg-black rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden relative">
                                <div className="absolute bottom-0 right-0 -mb-8 -mr-8 opacity-10">
                                    <Sparkles size={160} className="text-indigo-500" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <CheckCircle size={20} className="text-emerald-500" />
                                    Ações Táticas Recomendadas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                    {aiResult.sugestoes_gestao?.map((s: string, i: number) => (
                                        <div key={i} className="flex gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                            <span className="text-indigo-400 font-black text-xl opacity-40">0{i+1}</span>
                                            <p className="text-sm text-zinc-300 leading-relaxed">{s}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                    {aiResult?.error && (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-3">
                            <AlertTriangle size={20} />
                            {aiResult.error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
