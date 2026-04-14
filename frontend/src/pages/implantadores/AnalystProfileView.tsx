import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import {
    ArrowLeft, UserIcon, BriefcaseIcon,
    Clock, Activity, Download, Sparkles, Loader2, CheckCircle
} from 'lucide-react'

export default function AnalystProfileView() {
    const { name } = useParams<{ name: string }>()
    const navigate = useNavigate()

    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // AI State
    const [aiResult, setAiResult] = useState<any>(null)
    const [aiLoading, setAiLoading] = useState(false)

    useEffect(() => {
        if (!name) return
        const fetchAnalyst = async () => {
            try {
                setLoading(true)
                const res = await api.get(`/api/reports/implantadores/${encodeURIComponent(name)}`)
                setData(res.data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchAnalyst()
    }, [name])

    const handleAIAnalysis = async () => {
        if (!name) return
        try {
            setAiLoading(true)
            const res = await api.post(`/api/reports/implantadores/analyze/${encodeURIComponent(name)}`)
            setAiResult(res.data)
        } catch (err: any) {
            setAiResult({ error: err.message })
        } finally {
            setAiLoading(false)
        }
    }

    const handleExportCSV = async () => {
        if (!name) return
        try {
            const res = await api.get(`/api/reports/implantadores/${encodeURIComponent(name)}/export-csv`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `diagnostico_${name}.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch {
            alert('Erro ao exportar CSV')
        }
    }

    const handleExportPDF = async () => {
        if (!name) return
        try {
            const res = await api.get(`/api/reports/implantadores/${encodeURIComponent(name)}/export-pdf`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `diagnostico_${name}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch {
            alert('Erro ao exportar PDF')
        }
    }

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
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
                {error || "Dados não encontrados"}
            </div>
        )
    }

    const { summary, ativas, entregas } = data

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/team-diagnostics')}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <UserIcon className="text-orange-500" />
                            Perfil Analítico: {data.implantador}
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Raio-X de performance operacional individual
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors"
                    >
                        <Download size={16} />
                        CSV
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Download size={16} />
                        PDF
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <BriefcaseIcon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wider text-zinc-500">Carga Ponderada</span>
                    </div>
                    <div className="text-3xl font-black text-zinc-900 dark:text-white">
                        {summary.carga_ponderada.toFixed(1)} <span className="text-base text-zinc-400 font-medium">pts</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">
                        Base: {summary.ativos} Projetos. (Matriz: 1.0pt | Filial: 0.5pt)
                    </div>
                </div>

                {/* ENTREGA NO SLA */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                            SLA & Conformidade
                        </h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xs text-zinc-500 text-left">Lojas Entregues (Geral)</span>
                                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{summary.pct_sla_concluidas}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${summary.pct_sla_concluidas}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xs text-zinc-500 text-left">Saúde da Carteira (Ativas)</span>
                                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{summary.pct_sla_ativas}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${summary.pct_sla_ativas}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-4 leading-relaxed">
                        Percentual de conformidade com o prazo contratual.
                    </p>
                </div>

                {/* ENTREGA (MÊS) */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                            Entregas (Mês)
                        </h3>
                    </div>
                    <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {summary.entregue_mes}
                    </span>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-2 leading-relaxed">
                        Total de {summary.entregues_total} lojas entregues desde o início.
                    </p>
                </div>

                {/* MRR RETIDO */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
                            MRR Ativo
                        </h3>
                    </div>
                    <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.mrr_ativo)}
                    </span>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-2 leading-relaxed">
                        Faturamento em implantação nas {summary.ativos} lojas ativas.
                    </p>
                </div>
            </div>

            {/* AI ANALYSIS BLOCK */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="text-orange-500" />
                        Diagnóstico Assistido por IA
                    </h2>
                    <button
                        onClick={handleAIAnalysis}
                        disabled={aiLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={16} />}
                        {aiLoading ? 'Analisando...' : 'Gerar Diagnóstico'}
                    </button>
                </div>

                {!aiResult && !aiLoading && (
                    <p className="text-sm text-zinc-400 italic">
                        Clique em "Gerar Diagnóstico" para que a IA analise os dados operacionais deste analista.
                    </p>
                )}

                {aiResult && !aiResult.error && (
                    <div className="space-y-6 text-sm">
                        {/* 1. Resumo Executivo */}
                        <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-100 dark:border-orange-500/20">
                            <h3 className="font-bold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2">
                                <Activity size={16} />
                                1. Resumo Executivo
                            </h3>
                            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                                {aiResult.resumo_executivo}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 2. Padrões */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                <h3 className="font-bold text-zinc-700 dark:text-zinc-200 mb-3">2. Principais Padrões Identificados</h3>
                                <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
                                    {aiResult.padroes_identificados?.map((p: string, i: number) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="text-orange-500">•</span>
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* 3. Diagnóstico de Causa */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                <h3 className="font-bold text-zinc-700 dark:text-zinc-200 mb-3">3. Diagnóstico de Causa</h3>
                                <div className="space-y-3">
                                    {aiResult.diagnostico_causa && Object.entries(aiResult.diagnostico_causa).map(([key, val]: [string, any]) => (
                                        <div key={key}>
                                            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">{key.replace('_', ' ')}</span>
                                            <p className="text-zinc-600 dark:text-zinc-400">{val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. Gargalos */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                <h3 className="font-bold text-zinc-700 dark:text-zinc-200 mb-3 text-red-600 dark:text-red-400">4. Gargalos Operacionais</h3>
                                <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
                                    {aiResult.gargalos_operacionais?.map((g: string, i: number) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="text-red-500">•</span>
                                            {g}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* 5. Riscos */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                <h3 className="font-bold text-zinc-700 dark:text-zinc-200 mb-3 text-amber-600 dark:text-amber-500">5. Riscos</h3>
                                <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
                                    {aiResult.riscos_identificados?.map((r: string, i: number) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="text-amber-500">•</span>
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Raio-X Audit (Deep Analysis) */}
                        {aiResult.auditoria_raio_x && (
                            <div className="bg-zinc-900 dark:bg-black text-white p-5 rounded-2xl border border-zinc-800 shadow-xl">
                                <h3 className="font-bold text-orange-400 mb-4 flex items-center gap-2 text-base">
                                    <Sparkles size={18} />
                                    Raio-X: Auditoria Qualitativa (ClickUp)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Qualidade Doc */}
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Documentação</span>
                                        <p className="text-sm text-zinc-300 leading-relaxed italic">
                                            "{aiResult.auditoria_raio_x.qualidade_documentacao}"
                                        </p>
                                    </div>
                                    {/* Bloqueios Reais */}
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Bloqueios Detectados</span>
                                        <ul className="space-y-1">
                                            {aiResult.auditoria_raio_x.bloqueios_identificados?.map((b: string, idx: number) => (
                                                <li key={idx} className="text-sm text-red-400 flex items-start gap-2">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/50 flex-shrink-0" />
                                                    {b}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    {/* Conformidade Etapas */}
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Procedimento/Etapas</span>
                                        <p className="text-sm text-zinc-300 leading-relaxed text-balance">
                                            {aiResult.auditoria_raio_x.conformidade_etapas}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* 6. Ações */}
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                            <h3 className="font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                                <CheckCircle size={16} />
                                6. Ações Recomendadas para Gestão
                            </h3>
                            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300">
                                {aiResult.acoes_recomendadas?.map((a: string, i: number) => (
                                    <li key={i} className="flex gap-2 font-medium">
                                        <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" />
                                        {a}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {aiResult?.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
                        {aiResult.error}
                    </div>
                )}
            </div>

            {/* CARTEIRA ATUAL */}
            <h2 className="text-lg font-bold mt-8 mb-4 flex items-center gap-2">
                <BriefcaseIcon size={20} className="text-indigo-500" />
                Carteira Ativa ({ativas.length} Projetos)
            </h2>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-4">Loja</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Status Atual</th>
                                <th className="px-6 py-4">Tempo (Dias)</th>
                                <th className="px-6 py-4">Idle (Espera)</th>
                                <th className="px-6 py-4 text-right">MRR</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {ativas.map((loja: any) => (
                                <tr key={loja.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                                        {loja.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                                            {loja.tipo_loja || 'Indefinido'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-zinc-700 dark:text-zinc-300">
                                        {loja.status_name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-medium ${loja.dias_em_progresso > loja.tempo_contrato ? 'text-red-500' : ''}`}>
                                            {loja.dias_em_progresso}d / {loja.tempo_contrato}d
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-bold ${loja.idle_days > 7 ? 'text-red-500' : loja.idle_days > 4 ? 'text-amber-500' : 'text-zinc-600'}`}>
                                            {loja.idle_days}d
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-zinc-500 text-right">
                                        {formatMoney(loja.valor_mensalidade || 0)}
                                    </td>
                                </tr>
                            ))}
                            {ativas.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 italic">Nenhuma loja ativa no momento.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ENTREGAS */}
            <h2 className="text-lg font-bold mt-8 mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-500" />
                Histórico de Entregas (Desde 2026) - {entregas.length} Lojas
            </h2>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-4">Loja</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Tempo Total (SLA)</th>
                                <th className="px-6 py-4">Data Entrega</th>
                                <th className="px-6 py-4 text-right">MRR</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {entregas.map((loja: any) => (
                                <tr key={loja.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                                        {loja.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                                            {loja.tipo_loja || 'Indefinido'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-emerald-600">
                                        Entregue
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${loja.dias_em_progresso > loja.tempo_contrato ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {loja.dias_em_progresso}d <span className="text-[10px] text-zinc-400 font-normal">SLA: {loja.tempo_contrato}d</span>
                                            </span>
                                            {loja.dias_em_progresso > loja.tempo_contrato && (
                                                <span className="text-[10px] text-red-500 font-medium">Atraso: {loja.dias_em_progresso - loja.tempo_contrato}d</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500">
                                        {loja.finished_at ? new Date(loja.finished_at).toLocaleDateString('pt-BR') : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-zinc-500 text-right">
                                        {formatMoney(loja.valor_mensalidade || 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    )
}
