import React, { useState } from 'react'
import { Sparkles, Send, Loader2, TrendingUp, AlertTriangle, Users, Clock } from 'lucide-react'
import { api } from '../../services/api'

interface IntelligenceInsightBlockProps {
    analysts: any[]
    avgMetrics: {
        avg_carga: number
        avg_idle: number
        avg_throughput: number
        avg_sla: number
    }
}

export const IntelligenceInsightBlock: React.FC<IntelligenceInsightBlockProps> = ({
    analysts,
    avgMetrics
}) => {
    const [question, setQuestion] = useState('')
    const [answer, setAnswer] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [aiAnalysis, setAiAnalysis] = useState<any>(null)
    const [aiLoading, setAiLoading] = useState(false)
    const [showAnalysis, setShowAnalysis] = useState(false)

    // Heuristic insights generated from data directly (no AI call needed)
    const insights = React.useMemo(() => {
        if (!analysts.length) return []
        const items: string[] = []

        const overloaded = analysts.filter(a => a.jarvis_status === 'OVERLOADED')
        const warning = analysts.filter(a => a.jarvis_status === 'WARNING')
        const high = analysts.filter(a => a.jarvis_status === 'HIGH_PERFORMANCE')
        const topLoader = [...analysts].sort((a, b) => b.carga_ponderada - a.carga_ponderada)[0]
        const worstSla = [...analysts].sort((a, b) => a.pct_sla_concluidas - b.pct_sla_concluidas)[0]

        if (high.length) {
            items.push(`${high.map(a => a.implantador.split(' ')[0]).join(' e ')} ${high.length > 1 ? 'estão' : 'está'} em alta performance — candidato${high.length > 1 ? 's' : ''} a mentoria.`)
        }
        if (overloaded.length) {
            items.push(`${overloaded.length} analista(s) com carga acima da média e baixa vazão — risco de burnout.`)
        }
        if (warning.length) {
            items.push(`${warning.length} analista(s) com idle prolongado — verificar bloqueio técnico ou cliente inativo.`)
        }
        if (topLoader && analysts.length > 1) {
            const ratio = ((topLoader.carga_ponderada / avgMetrics.avg_carga) - 1) * 100
            if (ratio > 30) {
                items.push(`${topLoader.implantador.split(' ')[0]} concentra ${ratio.toFixed(0)}% mais carga que a média do time.`)
            }
        }
        if (worstSla && worstSla.pct_sla_concluidas < 70) {
            items.push(`${worstSla.implantador.split(' ')[0]} tem o menor SLA do time (${worstSla.pct_sla_concluidas}%) — ponto crítico de atenção.`)
        }
        if (avgMetrics.avg_idle > 6) {
            items.push(`Idle médio do time está em ${avgMetrics.avg_idle.toFixed(1)} dias — acima do ideal de 5 dias.`)
        }

        return items.slice(0, 4)
    }, [analysts, avgMetrics])

    const handleQuestion = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!question.trim() || loading) return
        setLoading(true)
        setAnswer(null)
        try {
            const res = await api.post('/api/reports/implantadores/jarvis/chat', { message: question.trim() })
            setAnswer(res.data.response)
            setQuestion('')
        } catch {
            setAnswer('Não foi possível obter resposta. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateAnalysis = async () => {
        setAiLoading(true)
        setShowAnalysis(true)
        try {
            const res = await api.post('/api/reports/implantadores/analyze/team')
            setAiAnalysis(res.data)
        } catch {
            setAiAnalysis({ error: true })
        } finally {
            setAiLoading(false)
        }
    }

    return (
        <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50">
                        <Sparkles size={12} className="text-[#128131]" />
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold text-zinc-950">Análise Inteligente</h3>
                    </div>
                </div>
                <button
                    onClick={handleGenerateAnalysis}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 rounded-md bg-[#128131] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0f6f2a] disabled:opacity-50"
                >
                    {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    Análise Completa
                </button>
            </div>

            {/* Heuristic Insights */}
            {insights.length > 0 && (
                <div className="border-b border-zinc-100 px-4 py-3">
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        {insights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs leading-snug text-zinc-600">
                                <span className="mt-0.5 shrink-0">
                                    {i === 0 ? <TrendingUp size={11} className="text-emerald-500" /> :
                                     i === 1 ? <AlertTriangle size={11} className="text-orange-500" /> :
                                     i === 2 ? <Users size={11} className="text-sky-600" /> :
                                     <Clock size={11} className="text-rose-400" />}
                                </span>
                                {insight}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* AI Full Analysis (expandable) */}
            {showAnalysis && (
                <div className="max-h-60 overflow-y-auto border-b border-zinc-100 bg-zinc-50 px-4 py-3 scrollbar-thin scrollbar-thumb-zinc-200">
                    {aiLoading ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Loader2 size={12} className="animate-spin text-[#128131]" />
                            Gerando análise do time...
                        </div>
                    ) : aiAnalysis?.error ? (
                        <p className="text-xs text-rose-600">Serviço de IA indisponível no momento.</p>
                    ) : aiAnalysis ? (
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#128131]">Diagnóstico Jarvis v3.5</p>
                            
                            <div className="rounded-lg border border-zinc-200 bg-white p-3">
                                <p className="text-xs font-medium leading-relaxed text-zinc-700">
                                    {aiAnalysis.jarvis_briefing}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {aiAnalysis.insumos_decisao?.map((item: any, idx: number) => (
                                    <div key={idx} className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                                        <div className="mb-1 flex justify-between">
                                            <h4 className="text-[10px] font-bold uppercase text-zinc-900">{item.titulo}</h4>
                                            <span className={`text-[9px] font-bold uppercase ${item.impacto === 'Alto' ? 'text-rose-600' : 'text-orange-600'}`}>
                                                {item.impacto}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Question Input */}
            <div className="px-4 py-3">
                <form onSubmit={handleQuestion} className="flex gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder="Dúvida sobre o time?"
                        className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                    />
                    <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="rounded-lg bg-[#128131] p-2 text-white transition-colors hover:bg-[#0f6f2a] disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </form>

                {answer && (
                    <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#128131]">Resposta</p>
                        <p className="text-xs leading-relaxed text-zinc-700">{answer}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
