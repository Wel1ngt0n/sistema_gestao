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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Sparkles size={14} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Análise Inteligente do Time</h3>
                        <p className="text-[10px] text-slate-400">Gerada a partir dos dados atuais</p>
                    </div>
                </div>
                <button
                    onClick={handleGenerateAnalysis}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                    {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    Análise Completa
                </button>
            </div>

            {/* Heuristic Insights */}
            {insights.length > 0 && (
                <div className="px-6 py-4 border-b border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Destaques Automáticos</p>
                    <ul className="space-y-2.5">
                        {insights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 leading-snug">
                                <span className="mt-0.5 shrink-0">
                                    {i === 0 ? <TrendingUp size={13} className="text-emerald-500" /> :
                                     i === 1 ? <AlertTriangle size={13} className="text-amber-500" /> :
                                     i === 2 ? <Users size={13} className="text-blue-500" /> :
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
                <div className="px-6 py-4 border-b border-slate-50 bg-indigo-50/50">
                    {aiLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 size={14} className="animate-spin text-indigo-500" />
                            Gerando análise do time...
                        </div>
                    ) : aiAnalysis?.error ? (
                        <p className="text-sm text-rose-600">Serviço de IA indisponível no momento.</p>
                    ) : aiAnalysis ? (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Diagnóstico IA</p>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                {aiAnalysis.analysis || aiAnalysis.response || JSON.stringify(aiAnalysis)}
                            </p>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Question Input */}
            <div className="px-6 py-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Consulta Rápida</p>
                <form onSubmit={handleQuestion} className="flex gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder="Ex: Quem tem maior risco esta semana?"
                        aria-label="Fazer pergunta para a IA"
                        className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder:text-slate-400"
                    />
                    <button
                        type="submit"
                        disabled={loading || !question.trim()}
                        className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </form>

                {/* Answer */}
                {answer && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Resposta</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{answer}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
