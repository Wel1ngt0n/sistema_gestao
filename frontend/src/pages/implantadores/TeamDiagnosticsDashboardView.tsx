import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import {
    PieChart
} from 'lucide-react'

export default function TeamDiagnosticsDashboardView() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
                        <h3 className="font-semibold text-zinc-700 dark:text-zinc-200">Gargalos Predominantes</h3>
                        {Object.keys(causas_distribuicao).map(key => {
                            const val = causas_distribuicao[key]
                            const bg = colors[key as keyof typeof colors] || "bg-zinc-500"
                            const p = total_analisado > 0 ? (val / total_analisado) * 100 : 0
                            return (
                                <div key={key} className="flex items-center gap-4">
                                    <div className="w-48 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                        {parseLabel(key)}
                                    </div>
                                    <div className="flex-1 flex items-center gap-3">
                                        <div className="flex-1 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                            <div className={`h-full ${bg} rounded-full transition-all`} style={{ width: `${p}%` }}></div>
                                        </div>
                                        <span className="text-sm font-bold w-12 text-right">{p.toFixed(0)}%</span>
                                    </div>
                                </div>
                            )
                        })}
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
        </div>
    )
}
