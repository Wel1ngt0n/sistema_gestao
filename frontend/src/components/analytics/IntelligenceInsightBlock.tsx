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
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50">
                        <Sparkles size={14} className="text-[#128131]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-950">Análise Inteligente do Time</h3>
                        <p className="text-xs text-zinc-500">Gerada a partir dos dados atuais</p>
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
                <div className="border-b border-zinc-100 px-5 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Destaques Automáticos</p>
                    <ul className="space-y-2.5">
                        {insights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm leading-snug text-zinc-700">
                                <span className="mt-0.5 shrink-0">
                                    {i === 0 ? <TrendingUp size={13} className="text-emerald-500" /> :
                                     i === 1 ? <AlertTriangle size={13} className="text-orange-500" /> :
                                     i === 2 ? <Users size={13} className="text-sky-600" /> :
                                     <Clock size={13} className="text-rose-400" />}
                                </span>
                                {insight}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* AI Full Analysis (expandable) */}
            {showAnalysis && (
                <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
                    {aiLoading ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <Loader2 size={14} className="animate-spin text-[#128131]" />
                            Gerando análise do time...
                        </div>
                    ) : aiAnalysis?.error ? (
                        <p className="text-sm text-rose-600">Serviço de IA indisponível no momento.</p>
                    ) : aiAnalysis ? (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#128131]">Diagnóstico Jarvis v3.5</p>
                            
                            <div className="space-y-6 mt-4">
                                {/* Briefing */}
                                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                    <p className="text-sm font-semibold leading-relaxed text-zinc-700">
                                        {aiAnalysis.jarvis_briefing}
                                    </p>
                                </div>

                                {/* Decision Inputs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {aiAnalysis.insumos_decisao?.map((item: any, idx: number) => (
                                        <div key={idx} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-xs font-semibold uppercase text-zinc-900">{item.titulo}</h4>
                                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                                    item.impacto === 'Alto' ? 'border border-rose-100 bg-rose-50 text-rose-700' : 'border border-orange-100 bg-orange-50 text-orange-700'
                                                }`}>
                                                    {item.impacto}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium leading-normal text-zinc-500">{item.descricao}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Xadrez Operacional & Radar */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Xadrez */}
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                            <Users size={12} className="text-[#128131]" />
                                            Xadrez Operacional
                                        </h4>
                                        <div className="space-y-2">
                                            {aiAnalysis.xadrez_operacional?.map((acao: string, idx: number) => (
                                                <div key={idx} className="flex gap-2 rounded-lg border border-zinc-200 bg-white p-2.5">
                                                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#128131]" />
                                                    <span className="text-xs font-medium text-zinc-700">{acao}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Radar */}
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                            <AlertTriangle size={12} className="text-orange-500" />
                                            Radar de Risco
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                                                <span className="block text-[10px] font-semibold uppercase text-zinc-400">Técnico</span>
                                                <span className="text-xs font-medium text-zinc-700">{aiAnalysis.radar_de_risco?.tecnico}</span>
                                            </div>
                                            <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                                                <span className="block text-[10px] font-semibold uppercase text-zinc-400">Financeiro</span>
                                                <span className="text-xs font-medium text-zinc-700">{aiAnalysis.radar_de_risco?.financeiro}</span>
                                            </div>
                                            <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                                                <span className="block text-[10px] font-semibold uppercase text-zinc-400">Pessoas</span>
                                                <span className="text-xs font-medium text-zinc-700">{aiAnalysis.radar_de_risco?.pessoas}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Closure */}
                                <div className="flex justify-end border-t border-zinc-200 pt-4">
                                    <p className="text-xs font-semibold italic text-zinc-500">
                                        "{aiAnalysis.frase_do_copiloto}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Question Input */}
            <div className="px-5 py-4">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Consulta Rápida</p>
                <form onSubmit={handleQuestion} className="flex gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder="Ex: Quem tem maior risco esta semana?"
                        aria-label="Fazer pergunta para a IA"
                        className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10"
                    />
                    <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="rounded-lg bg-[#128131] p-2.5 text-white transition-colors hover:bg-[#0f6f2a] disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </form>

                {/* Answer */}
                {answer && (
                    <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#128131]">Resposta</p>
                        <p className="text-sm leading-relaxed text-zinc-700">{answer}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
