import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import {
    PieChart, Sparkles, Loader2, Activity, CheckCircle
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
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 rounded-full border-4 border-zinc-200 border-t-orange-500 animate-spin"></div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl">
                {error || "Erro ao carregar diagnóstico. Verifique o console."}
            </div>
        )
    }

    const { causas_distribuicao, top_gargalos_etapa, total_analisado } = data

    const colors = {
        "CLIENTE": "bg-indigo-500",
        "IMPLANTADOR": "bg-amber-500",
        "CARGA": "bg-red-500",
        "ETAPA": "bg-blue-500",
        "NO_PRAZO": "bg-emerald-500",
    }

    const parseLabel = (l: string) => {
        if (l === "CLIENTE") return "Cliente / Fator Externo"
        if (l === "IMPLANTADOR") return "Analista / Fator Interno"
        if (l === "CARGA") return "Sobrecarga de Trabalho"
        if (l === "ETAPA") return "Demora Natural / Processo"
        return "Em Fluxo Normal"
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-zinc-900 dark:text-white">
                    <PieChart className="text-orange-500" />
                    Análise Heurística de Causas do Time
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
                    Total de {total_analisado} lojas ativas analisadas. O sistema classifica as lojas que estão com atraso ou ociosidade e tenta alocar o gargalo usando a heurística de idle_days, pausas e carga do responsável.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* DISTRIBUIÇÃO */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-zinc-700 dark:text-zinc-200 mb-2">Gargalos Predominantes</h3>
                        <div className="h-64">
                            <BottleneckDonutChart data={causas_distribuicao} />
                        </div>
                    </div>

                    {/* GARGALOS POR ETAPA */}
                    <div className="space-y-4 border-l border-zinc-100 dark:border-zinc-800 pl-8">
                        <h3 className="font-semibold text-zinc-700 dark:text-zinc-200">Lojas com causa raiz na "Etapa/Processo"</h3>
                        {top_gargalos_etapa.length === 0 && (
                            <p className="text-sm text-zinc-400">Nenhum gargalo processual detectado no momento.</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {top_gargalos_etapa.map((g: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 w-full">
                                    <span className="text-sm font-medium">{g.etapa}</span>
                                    <span className="text-xs font-bold px-2 py-1 bg-white dark:bg-zinc-700 rounded-md text-zinc-600 dark:text-zinc-300">
                                        {g.count} lojas lentas
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* AI ANALYSIS BLOCK (TEAM) */}
            <div className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-500/5 dark:to-zinc-900 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 text-white rounded-lg shadow-sm">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                                Diagnóstico Estratégico do Time (IA)
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Análise cruzada de toda a operação para identificar gargalos sistêmicos.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleTeamAI}
                        disabled={aiLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={16} />}
                        {aiLoading ? 'Processando Equipe...' : 'Analisar Performance do Time'}
                    </button>
                </div>

                {!aiResult && !aiLoading && (
                    <div className="text-center py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                        <p className="text-sm text-zinc-400">
                            Clique no botão acima para gerar um diagnóstico executivo consolidado.
                        </p>
                    </div>
                )}

                {aiResult && !aiResult.error && (
                    <div className="space-y-6 text-sm">
                        {/* 1. Resumo */}
                        <div className="p-4 bg-white/60 dark:bg-zinc-800/40 backdrop-blur-sm rounded-xl border border-white dark:border-zinc-700 shadow-sm">
                            <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2">1. Resumo Executivo da Equipe</h3>
                            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                                "{aiResult.resumo_executivo}"
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* 2. Padrões de Equipe */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                <h3 className="font-bold text-zinc-700 dark:text-zinc-200 mb-3 flex items-center gap-2">
                                    <Activity size={16} className="text-blue-500" />
                                    2. Padrões Identificados
                                </h3>
                                <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
                                    {aiResult.padroes_equipe?.map((p: string, i: number) => (
                                        <li key={i} className="flex gap-2">• {p}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* 3. Diagnóstico de Causas */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                <h3 className="font-bold text-zinc-700 dark:text-zinc-200 mb-3 flex items-center gap-2">
                                    <PieChart size={16} className="text-amber-500" />
                                    3. Diagnóstico de Impactos
                                </h3>
                                <div className="space-y-3">
                                    {aiResult.diagnostico_causas && Object.entries(aiResult.diagnostico_causas).map(([key, val]: [string, any]) => (
                                        <div key={key}>
                                            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">{key}</span>
                                            <p className="text-zinc-600 dark:text-zinc-400 leading-tight">{val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. Riscos Críticos */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                                    <Activity size={16} />
                                    4. Riscos & Ameaças
                                </h3>
                                <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
                                    {aiResult.riscos_criticos?.map((r: string, i: number) => (
                                        <li key={i} className="flex gap-2">• {r}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* 5. Sugestões de Gestão */}
                        <div className="p-5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-500/20">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-100">
                                <CheckCircle size={18} />
                                Recomendações Táticas para Liderança
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {aiResult.sugestoes_gestao?.map((s: string, i: number) => (
                                    <div key={i} className="flex gap-3 bg-white/10 p-3 rounded-xl border border-white/10">
                                        <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm font-medium">{s}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {aiResult?.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
                        {aiResult.error}
                    </div>
                )}
            </div>
        </div>
    )
}
