import { useCallback, useEffect, useState } from 'react'
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
import { KPICard } from '../../components/analytics/KPICard'


export default function AnalystProfileView() {
    const { name } = useParams<{ name: string }>()
    const navigate = useNavigate()

    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Estado da inteligência artificial.
    const [aiResult, setAiResult] = useState<any>(null)
    const [aiLoading, setAiLoading] = useState(false)

    const [period, setPeriod] = useState<DateRange>({
        start: null,
        end: null,
        label: 'Todo o Período'
    })

    // Estado do modal.
    const [selectedStore, setSelectedStore] = useState<any>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const fetchAnalyst = useCallback(async () => {
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
    }, [name, period.label])

    useEffect(() => {
        if (!name) return
        fetchAnalyst()
    }, [fetchAnalyst, name])

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
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4 bg-zinc-50">
                <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-indigo-600 animate-spin"></div>
                <p className="text-zinc-500 font-bold animate-pulse">Mapeando Performance Individual...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-6 bg-zinc-50 px-8">
                <div className="w-20 h-20 rounded-lg bg-rose-50 flex items-center justify-center shadow-lg shadow-rose-100 border border-rose-100">
                    <ShieldAlert size={40} className="text-rose-500" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-black text-zinc-950 tracking-tight uppercase">Ops! Falha na Sincronização</h2>
                    <p className="text-zinc-500 font-bold max-w-md text-sm">{error}</p>
                </div>
                <button 
                    onClick={fetchAnalyst}
                    className="px-8 py-3 bg-[#ff7900] text-white rounded-lg font-black uppercase tracking-widest text-xs shadow-sm shadow-orange-100 hover:bg-orange-600 transition-all active:scale-95"
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
        <div className="min-h-screen bg-zinc-50 pb-20">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-8 pt-8">
                
                {/* 1. CABEÇALHO PRINCIPAL */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/team-diagnostics')}
                            className="p-3 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all shadow-sm group"
                        >
                            <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-[#ff7900] transition-colors" />
                        </button>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[#ff7900] font-black text-[10px] uppercase tracking-[0.3em]">
                                <User size={14} />
                                Perfil Analítico Individual
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-zinc-950 flex items-center gap-3">
                                {summary?.implantador || name}
                                {summary?.score && <PerformanceScoreBadge score={summary.score?.score_final || 0} size="lg" />}
                            </h1>

                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-white p-1 rounded-xl border border-zinc-200 shadow-sm flex items-center">
                            <PeriodFilter value={period} onChange={setPeriod} />
                        </div>
                        <button className="p-2.5 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm">
                            <Download size={18} className="text-zinc-500" />
                        </button>
                    </div>
                </div>

                {/* 2. GRADE DE INDICADORES */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <KPICard 
                        label="Carteira Ativa" 
                        value={summary?.ativos || 0} 
                        color="slate" 
                        icon="L" 
                        subtext={`Carga Ponderada: ${summary?.carga_ponderada?.toFixed(1) || 0} pts`}
                    />
                    <KPICard 
                        label="Entregas 2026" 
                        value={summary?.entregas_2026_total || 0} 
                        color="green" 
                        icon="✓" 
                        subtext={`${summary?.matrizes_2026 || 0} Matrizes / ${summary?.filiais_2026 || 0} Filiais`}
                    />
                    <KPICard 
                        label="MRR Entregue (2026)" 
                        value={formatMoney(summary?.mrr_entregue_2026 || 0)} 
                        color="green" 
                        icon="$" 
                        subtext={`Ticket Médio: ${formatMoney(summary?.ticket_medio_2026 || 0)}`}
                    />
                    <KPICard 
                        label="MRR em Gestão" 
                        value={formatMoney(summary?.mrr_ativo || 0)} 
                        color="orange" 
                        icon="▥" 
                        subtext="Receita em implantação"
                    />
                    <KPICard 
                        label="Retrabalhos 2026" 
                        value={`${summary?.retrabalhos_2026 || 0}`} 
                        color={summary?.pct_retrabalho > 10 ? 'red' : 'slate'} 
                        icon="!" 
                        subtext={`Taxa atual: ${summary?.pct_retrabalho?.toFixed(1) || 0}%`}
                    />
                </div>

                {/* 3. PAINEL: AÇÕES, INTELIGÊNCIA E GRÁFICOS */}
                <div className="space-y-6">
                    
                    {/* LINHA SUPERIOR: PLANO DE AÇÃO E MÉTRICAS DAS ETAPAS */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                        {/* 3.1. PLANO DE AÇÃO INDIVIDUAL */}
                        <div className="xl:col-span-2 bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-orange-50 rounded-lg border border-orange-100">
                                    <Target size={18} className="text-[#ff7900]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-zinc-950 tracking-tight">Plano de Ação</h2>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Prioridades de {name}</p>
                                </div>
                            </div>

                            {actions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {actions.map((action: any, idx: number) => (
                                        <div key={idx} className="group p-4 bg-zinc-50 border border-zinc-100 rounded-lg hover:border-orange-200 hover:bg-white hover:shadow-sm transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                                                    action.priority === 'HIGH' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-amber-600 bg-amber-50 border-amber-100'
                                                }`}>
                                                    {action.priority}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-bold text-zinc-900 mb-1 group-hover:text-[#ff7900] transition-colors line-clamp-2">
                                                {action.description}
                                            </h4>
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 uppercase">
                                                <ShieldAlert size={10} />
                                                IMPACTO: {action.impact}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-zinc-400 text-sm font-medium">Nenhuma ação prioritária identificada no momento.</div>
                            )}
                        </div>

                        {/* MÉTRICAS DAS ETAPAS EM LISTA RESUMIDA */}
                        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm h-full">
                            <h3 className="font-black text-[10px] text-zinc-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity className="text-[#ff7900]" size={14} />
                                Média de Dias por Etapa
                            </h3>
                            <div className="space-y-4">
                                {summary?.etapas && Object.entries(summary.etapas).slice(0, 5).map(([step_name, days]: [string, any]) => (
                                    <div key={step_name} className="flex items-center justify-between border-b border-zinc-50 pb-2 last:border-0 last:pb-0">
                                        <span className="text-xs font-bold text-zinc-500">{step_name}</span>
                                        <span className="text-sm font-black text-zinc-950">{days}d</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* LINHA INTERMEDIÁRIA: GRÁFICOS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* GRÁFICO RADAR */}
                        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm flex flex-col">
                            <h3 className="font-black text-[10px] text-zinc-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity className="text-[#ff7900]" size={14} />
                                Radar de Competências
                            </h3>
                            <div className="flex justify-center items-center min-h-[250px]">
                                {summary?.score?.eixos ? (
                                    <AnalystRadarChart data={summary.score.eixos} />
                                ) : (
                                    <div className="text-zinc-300 font-bold text-[10px] uppercase tracking-[0.2em]">Dados Insuficientes</div>
                                )}
                            </div>
                        </div>

                        {/* DIAGNÓSTICO DE CAUSAS */}
                        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
                            <h3 className="font-black text-[10px] text-zinc-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ShieldAlert className="text-[#ff7900]" size={14} />
                                Origem dos Atrasos
                            </h3>
                            <div className="h-64 relative flex items-center justify-center">
                                {summary?.diagnostico_causas ? (
                                    <BottleneckDonutChart data={summary.diagnostico_causas} />
                                ) : (
                                    <div className="text-zinc-300 font-bold text-[10px] uppercase tracking-[0.2em]">Sem Ocorrências</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* LINHA INFERIOR: DIAGNÓSTICO POR INTELIGÊNCIA ARTIFICIAL */}
                    <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
                                    <Sparkles size={14} className="text-[#ff7900]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-zinc-950 tracking-tight">Diagnóstico Jarvis DeepView</h3>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Análise Qualitativa Automatizada</p>
                                </div>
                            </div>
                            <button
                                onClick={handleAIAnalysis}
                                disabled={aiLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 hover:border-orange-200 hover:text-[#ff7900] text-zinc-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50"
                            >
                                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                {aiLoading ? 'Analisando...' : 'Gerar Análise'}
                            </button>
                        </div>

                        <div className="p-6">
                            {!aiResult && !aiLoading && (
                                <div className="flex flex-col items-center justify-center py-8 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                                    <HelpCircle size={24} className="text-zinc-300 mb-2" />
                                    <p className="text-xs text-zinc-400 font-bold text-center max-w-xs">
                                        Clique no botão acima para iniciar a análise inteligente
                                    </p>
                                </div>
                            )}

                            {aiResult && !aiResult.error && (
                                <div className="space-y-6">
                                    {/* Resumo executivo */}
                                    <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                            <Target size={12} />
                                            Parecer Executivo
                                        </h3>
                                        <p className="text-zinc-800 text-sm font-medium leading-relaxed">
                                            {aiResult.resumo_executivo}
                                        </p>
                                    </div>

                                    {/* Grade de detalhes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Padrões */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Padrões Detectados</h3>
                                            <div className="space-y-2">
                                                {aiResult.padroes_identificados?.map((p: string, i: number) => (
                                                    <div key={i} className="flex gap-2 p-2.5 bg-white rounded-lg border border-zinc-100">
                                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                                                        <span className="text-xs text-zinc-600 font-medium">{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Gargalos */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Gargalos Operacionais</h3>
                                            <div className="space-y-2">
                                                {aiResult.gargalos_operacionais?.map((g: string, i: number) => (
                                                    <div key={i} className="flex gap-2 p-2.5 bg-white rounded-lg border border-rose-100">
                                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                                        <span className="text-xs text-zinc-600 font-medium">{g}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {aiResult?.error && (
                                <div className="p-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 text-sm font-bold flex items-center gap-3">
                                    <ShieldAlert size={16} />
                                    {aiResult.error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. TABELA DA CARTEIRA ATIVA */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-zinc-950 flex items-center gap-2 tracking-tight">
                            <Briefcase className="text-[#ff7900]" size={22} />
                            Carteira Ativa ({ativas.length} Projetos)
                        </h2>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Loja</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Controle</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Tempo (SLA)</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Idle</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {ativas.map((loja: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-zinc-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-zinc-950 group-hover:text-[#ff7900] transition-colors">{loja.name}</span>
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{loja.tipo_loja || 'Matriz'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-slate-100 text-zinc-600 text-[10px] font-black uppercase rounded-lg border border-zinc-200">
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
                                                        <div className="p-1 bg-slate-100 text-zinc-500 rounded-md border border-zinc-200" title="SLA Ignorado">
                                                            <Activity size={12} />
                                                        </div>
                                                    )}
                                                    {loja.observacoes && (
                                                        <div className="p-1 bg-orange-50 text-[#ff7900] rounded-md border border-orange-100" title="Possui Observações">
                                                            <Sparkles size={12} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-black ${loja.dias_em_progresso > loja.tempo_contrato && loja.considerar_tempo_implantacao ? 'text-rose-500' : 'text-zinc-700'}`}>
                                                        {loja.dias_em_progresso}d
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Meta: {loja.tempo_contrato}d</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right font-black">
                                                <span className={`px-2 py-1 rounded-lg ${loja.idle_days > 7 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-zinc-600'}`}>
                                                    {loja.idle_days}d
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedStore(loja)
                                                        setIsModalOpen(true)
                                                    }}
                                                    className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-zinc-200 hover:shadow-sm text-zinc-400 hover:text-[#ff7900] transition-all"
                                                    title="Editar Controle Operacional"
                                                >
                                                    <Target size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {ativas.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-12 text-center text-zinc-400 font-bold uppercase tracking-widest italic">Nenhum projeto ativo</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                {/* 5.1. PROJETOS AGENDADOS */}
                {programadas.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-zinc-950 flex items-center gap-2 tracking-tight">
                            <Activity className="text-amber-500" size={22} />
                            Próximas Implantações ({programadas.length} Agendadas)
                        </h2>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50 border-b border-zinc-100">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Loja</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Início Efetivo</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">MRR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {programadas.map((loja: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-amber-50/20 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-zinc-950 group-hover:text-amber-600 transition-colors">{loja.name}</span>
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{loja.tipo_loja || 'Matriz'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-200">
                                                        AGENDADA: {loja.manual_start_date || loja.effective_started_at}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-zinc-500">
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

                {/* 6. ENTREGAS RECENTES */}
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-zinc-950 flex items-center gap-2 tracking-tight">
                        <CheckCircle className="text-emerald-500" size={22} />
                        Entregas Recentes ({entregas.length})
                    </h2>
                    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Loja</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Total Dias</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data Entrega</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Impacto Financeiro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {entregas.map((loja: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-zinc-700">{loja.name}</span>
                                                    <span className="text-[10px] font-bold text-zinc-400">{loja.tipo_loja}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`font-black ${loja.tempo_total > 90 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {loja.tempo_total} dias
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-zinc-500 font-medium">
                                                {loja.finished_at}
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-zinc-950">
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
