import { useEffect, useMemo, useState } from 'react';
import { Tab } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { Chart as GraficoReact } from 'react-chartjs-2';
import 'chart.js/auto';
import { api } from '../../services/api';
import { AnalyticsFilters as FiltrosAnalytics } from './AnalyticsFilters';
import { FinancialForecastChart as GraficoForecastFinanceiro } from './FinancialForecastChart';
import { AnnualTrendCharts as GraficosTendenciaAnual } from './AnnualTrendCharts';
import { InfoTooltip } from './InfoTooltip';
import { KPICard as CartaoKpi } from './KPICard';
import { PainelFinanceiroImplantacao } from './PainelFinanceiroImplantacao';
import { RiskScatterPlot as GraficoDispersaoRisco } from './RiskScatterPlot';
import { PerformanceScoreBadge as SeloScorePerformance } from '../reports/PerformanceScoreBadge';
import { TeamActionsBlock as BlocoAcoesTime } from './TeamActionsBlock';
import { IntelligenceInsightBlock as BlocoInteligencia } from './IntelligenceInsightBlock';
import { useAnalyticsData as useDadosAnalytics } from './useAnalyticsData';
import { useDashboardUrlParams as useParametrosDashboard } from '../../hooks/useDashboardUrlParams';
import {
    coresAnalytics,
    estiloLinhaLaranja,
    estiloLinhaMetaVariavel,
    formatarMoeda,
    opcoesGraficoExecutivo,
} from './graficos/temaGraficosAnalytics';

const juntarClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

type PropriedadesIconeLocal = {
    className?: string;
    size?: number;
};

const criarIconeLocal = (texto: string) => ({ className, size = 16 }: PropriedadesIconeLocal) => (
    <span
        className={juntarClasses('inline-flex shrink-0 items-center justify-center rounded text-xs font-bold leading-none', className)}
        style={{ width: size, height: size, minWidth: size }}
        aria-hidden="true"
    >
        {texto}
    </span>
);

const IconeAlerta = criarIconeLocal('!');
const IconeGrafico = criarIconeLocal('▥');
const IconeLoja = criarIconeLocal('L');
const IconeSucesso = criarIconeLocal('✓');
const IconeRelogio = criarIconeLocal('h');
const IconePainel = criarIconeLocal('▦');
const IconeMeta = criarIconeLocal('◎');
const IconeTrofeu = criarIconeLocal('★');
const IconeUsuarios = criarIconeLocal('U');
const IconeCarteira = criarIconeLocal('$');

const abasAnalytics = [
    { nome: 'Visão geral', icone: IconePainel },
    { nome: 'Financeiro', icone: IconeCarteira },
    { nome: 'Eficiência e risco', icone: IconeAlerta },
    { nome: 'Time e performance', icone: IconeUsuarios },
    { nome: 'Perfil dos analistas', icone: IconeTrofeu },
];

const formatarDias = (valor?: number | null) => `${valor || 0} dias`;

type SnapshotMetaVariavel = {
    meta_geral_valor?: number;
    ticket_medio?: number;
    lojas_meta_total?: number;
    lojas_entregues_ano?: number;
    meses_restantes?: number;
    meta_mensal_recalculada?: number;
    data_snapshot?: string;
};

const calcularSnapshotMetaVariavel = (kpis: any, tendencias: any[]): SnapshotMetaVariavel => {
    const snapshotBackend = kpis?.meta_variavel_snapshot;
    if (snapshotBackend) {
        return snapshotBackend;
    }

    const metaGeralValor = Number(kpis?.meta_geral_valor || kpis?.annual_mrr_goal || kpis?.mrr_meta_anual || 0);
    const ticketMedio = Number(kpis?.ticket_medio || kpis?.avg_monthly_fee || 0);
    const lojasMetaTotal = Number(kpis?.lojas_meta_total || (ticketMedio > 0 ? metaGeralValor / ticketMedio : 0));
    const lojasEntreguesAno = Number(
        kpis?.lojas_entregues_ano ||
        tendencias.reduce((total, item) => total + Number(item?.throughput || 0), 0),
    );
    const mesAtual = new Date().getMonth() + 1;
    const mesesRestantes = Number(kpis?.meses_restantes || Math.max(1, 12 - mesAtual + 1));
    const lojasRestantes = Math.max(0, lojasMetaTotal - lojasEntreguesAno);

    return {
        meta_geral_valor: metaGeralValor,
        ticket_medio: ticketMedio,
        lojas_meta_total: lojasMetaTotal,
        lojas_entregues_ano: lojasEntreguesAno,
        meses_restantes: mesesRestantes,
        meta_mensal_recalculada: mesesRestantes > 0 ? lojasRestantes / mesesRestantes : 0,
        data_snapshot: new Date().toISOString().slice(0, 10),
    };
};

export default function PainelAnalyticsFinal() {
    const navegar = useNavigate();
    const { filters: filtros } = useParametrosDashboard();
    const {
        kpiData: kpis,
        trendData: tendencias,
        annualTrendData: tendenciaAnual,
        performanceData: desempenho,
        bottleneckData: gargalos,
        capacityData: capacidade,
        forecastData: forecast,
        loading: carregando,
        refetch: recarregar,
    } = useDadosAnalytics(filtros);

    const [dadosCockpit, setDadosCockpit] = useState<any[]>([]);
    const [resumoCockpit, setResumoCockpit] = useState<any>(null);
    const [metricasMedias, setMetricasMedias] = useState<any>(null);
    const [acoesTime, setAcoesTime] = useState<any[]>([]);
    const [carregandoCockpit, setCarregandoCockpit] = useState(false);
    const [campoOrdenacao, setCampoOrdenacao] = useState('score');
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(false);

    useEffect(() => {
        const carregarCockpit = async () => {
            setCarregandoCockpit(true);
            try {
                const resposta = await api.get('/api/reports/implantadores/cockpit?period=all');
                setDadosCockpit(resposta.data.analysts || []);
                setResumoCockpit(resposta.data.summary);
                setMetricasMedias(resposta.data.avg_metrics);
                setAcoesTime(resposta.data.team_actions || []);
            } catch (erro) {
                console.error('Erro ao carregar cockpit de implantação:', erro);
            } finally {
                setCarregandoCockpit(false);
            }
        };

        carregarCockpit();
    }, []);

    const implantadoresDisponiveis = useMemo(() => {
        return (Array.isArray(desempenho) ? desempenho : []).map((item) => item.implantador).sort();
    }, [desempenho]);

    const tendenciasSeguras = Array.isArray(tendencias) ? tendencias : [];
    const rotulosTendencia = tendenciasSeguras.map((item) => item.month);
    const snapshotMetaVariavel = useMemo(
        () => calcularSnapshotMetaVariavel(kpis, tendenciasSeguras),
        [kpis, tendenciasSeguras],
    );
    const metaMensalVariavel = Number(snapshotMetaVariavel.meta_mensal_recalculada || 0);

    const dadosGraficoEntregas = {
        labels: rotulosTendencia,
        datasets: [
            {
                type: 'line' as const,
                label: 'Lojas entregues',
                data: tendenciasSeguras.map((item) => item.throughput),
                ...estiloLinhaLaranja,
            },
            {
                type: 'line' as const,
                label: 'Meta variável salva',
                data: tendenciasSeguras.map((item) => Number((item as any)?.meta_mensal_variavel || metaMensalVariavel)),
                ...estiloLinhaMetaVariavel,
            },
        ],
    };

    const opcoesBaseEntregas = opcoesGraficoExecutivo<'line'>() as any;
    const opcoesBaseEficiencia = opcoesGraficoExecutivo<'line'>() as any;

    const opcoesEntregas = {
        ...opcoesBaseEntregas,
        plugins: {
            ...opcoesBaseEntregas.plugins,
            tooltip: {
                ...opcoesBaseEntregas.plugins?.tooltip,
                callbacks: {
                    label: (contexto: any) => {
                        const valor = Number(contexto.parsed.y || 0);
                        return contexto.dataset.label === 'Meta variável salva'
                            ? `Meta variável: ${valor.toFixed(1)} lojas`
                            : `Lojas entregues: ${valor}`;
                    },
                },
            },
        },
    };

    const dadosGraficoEficiencia = {
        labels: rotulosTendencia,
        datasets: [
            {
                type: 'line' as const,
                label: 'Cycle time médio',
                data: tendenciasSeguras.map((item) => item.cycle_time_avg),
                borderColor: coresAnalytics.laranja,
                backgroundColor: 'rgba(255, 121, 0, 0.12)',
                fill: true,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.36,
                yAxisID: 'y',
            },
            {
                type: 'line' as const,
                label: 'OTD',
                data: tendenciasSeguras.map((item) => item.otd_percentage),
                borderColor: coresAnalytics.verde,
                backgroundColor: 'rgba(18, 129, 49, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.36,
                yAxisID: 'y1',
            },
        ],
    };

    const opcoesEficiencia = {
        ...opcoesBaseEficiencia,
        scales: {
            ...opcoesBaseEficiencia.scales,
            y: {
                ...opcoesBaseEficiencia.scales?.y,
                title: { display: true, text: 'Dias', color: coresAnalytics.textoSuave },
            },
            y1: {
                type: 'linear' as const,
                position: 'right' as const,
                beginAtZero: true,
                max: 100,
                grid: { drawOnChartArea: false },
                ticks: {
                    color: coresAnalytics.textoSuave,
                    callback: (valor: string | number) => `${valor}%`,
                },
                border: { display: false },
                title: { display: true, text: 'OTD', color: coresAnalytics.textoSuave },
            },
        },
    };

    const ordenarCockpit = (campo: string) => {
        if (campoOrdenacao === campo) {
            setOrdenacaoAscendente(!ordenacaoAscendente);
            return;
        }

        setCampoOrdenacao(campo);
        setOrdenacaoAscendente(false);
    };

    const lerCampoCockpit = (item: any, campo: string) => {
        if (campo === 'score') return item.score?.score_final || 0;
        if (campo === 'pct_retrabalho') return item.pct_retrabalho || 0;
        return item[campo] ?? 0;
    };

    const cockpitOrdenado = useMemo(() => {
        return [...dadosCockpit].sort((a, b) => {
            const valorA = lerCampoCockpit(a, campoOrdenacao);
            const valorB = lerCampoCockpit(b, campoOrdenacao);
            if (valorA < valorB) return ordenacaoAscendente ? -1 : 1;
            if (valorA > valorB) return ordenacaoAscendente ? 1 : -1;
            return 0;
        });
    }, [dadosCockpit, campoOrdenacao, ordenacaoAscendente]);

    if (carregando && !kpis) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-zinc-50">
                <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-5 py-4 text-sm font-medium text-zinc-600 shadow-sm">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-[#ff7900]" />
                    Carregando analytics de implantação...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 pb-10">
            <div className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 md:px-8">
                <header className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Analytics de implantação</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
                                Operação, cobrança e performance em uma visão diária
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
                                Mantém os indicadores atuais, separa o financeiro para cobrança e melhora a leitura dos gráficos sem trocar a stack.
                            </p>
                        </div>
                        <FiltrosAnalytics
                            availableImplantadores={implantadoresDisponiveis}
                            onRefresh={recarregar}
                            isRefreshing={carregando}
                        />
                    </div>
                    <div className="mt-5 h-1 w-24 rounded-full bg-[#ff7900]" />
                </header>

                <Tab.Group>
                    <Tab.List className="sticky top-4 z-20 flex w-full gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-sm xl:w-fit">
                        {abasAnalytics.map((aba) => {
                            const Icone = aba.icone;
                            return (
                                <Tab
                                    key={aba.nome}
                                    className={({ selected }) =>
                                        juntarClasses(
                                            'flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orange-200',
                                            selected ? 'bg-[#ff7900] text-white' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950',
                                        )
                                    }
                                >
                                    <Icone size={16} />
                                    {aba.nome}
                                </Tab>
                            );
                        })}
                    </Tab.List>

                    <Tab.Panels className="mt-6">
                        {/* === ABA 1: VISÃO GERAL === */}
                        <Tab.Panel className="space-y-6 focus:outline-none">
                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <CartaoKpi label="Lojas em implantação" value={kpis?.wip_stores || 0} color="orange" icon={IconeLoja} subtext="Carteira ativa em andamento" />
                                <CartaoKpi label="Entregas no período" value={kpis?.throughput_period || 0} color="green" icon={IconeSucesso} subtext="Lojas concluídas no filtro" />
                                <CartaoKpi label="MRR em backlog" value={formatarMoeda(kpis?.mrr_backlog)} color="orange" icon={IconeCarteira} subtext="Receita ainda em implantação" />
                                <CartaoKpi label="Cycle time médio" value={formatarDias(kpis?.cycle_time_avg)} color="slate" icon={IconeRelogio} subtext="Tempo médio até conclusão" />
                            </section>

                            <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-7">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                        <IconeGrafico size={16} className="text-[#ff7900]" />
                                        Vazão de entregas
                                        <InfoTooltip text="Mantém a leitura atual de throughput em linha e compara com a meta variável salva no snapshot." />
                                    </h3>
                                    <p className="mt-1 text-sm text-zinc-500">Volume entregue por mês, preservando o recorte de período, implantador e snapshot da meta recalculada.</p>
                                    <div className="mt-5 h-[360px]">
                                        <GraficoReact type="line" data={dadosGraficoEntregas} options={opcoesEntregas} />
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-orange-100 bg-orange-50/50 p-3 text-xs text-zinc-700 md:grid-cols-4">
                                        <div>
                                            <p className="font-semibold text-zinc-500">Meta geral</p>
                                            <p className="mt-1 font-semibold text-zinc-950">{formatarMoeda(snapshotMetaVariavel.meta_geral_valor)}</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-zinc-500">Ticket médio</p>
                                            <p className="mt-1 font-semibold text-zinc-950">{formatarMoeda(snapshotMetaVariavel.ticket_medio)}</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-zinc-500">Restante</p>
                                            <p className="mt-1 font-semibold text-zinc-950">{Math.max(0, Number(snapshotMetaVariavel.lojas_meta_total || 0) - Number(snapshotMetaVariavel.lojas_entregues_ano || 0)).toFixed(1)} lojas</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-zinc-500">Meta mensal</p>
                                            <p className="mt-1 font-semibold text-zinc-950">{metaMensalVariavel.toFixed(1)} lojas/mês</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 xl:col-span-5">
                                    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Resumo executivo</p>
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div className="rounded-lg bg-zinc-50 p-4">
                                                <p className="text-xs text-zinc-500">Pontos concluídos</p>
                                                <p className="mt-1 text-2xl font-semibold text-zinc-950">{kpis?.total_points_done || 0}</p>
                                            </div>
                                            <div className="rounded-lg bg-zinc-50 p-4">
                                                <p className="text-xs text-zinc-500">Pontos em WIP</p>
                                                <p className="mt-1 text-2xl font-semibold text-zinc-950">{kpis?.total_points_wip || 0}</p>
                                            </div>
                                            <div className="rounded-lg bg-zinc-50 p-4">
                                                <p className="text-xs text-zinc-500">Matrizes</p>
                                                <p className="mt-1 text-2xl font-semibold text-zinc-950">{kpis?.matrix_count || 0}</p>
                                            </div>
                                            <div className="rounded-lg bg-zinc-50 p-4">
                                                <p className="text-xs text-zinc-500">Filiais</p>
                                                <p className="mt-1 text-2xl font-semibold text-zinc-950">{kpis?.filial_count || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <BlocoInteligencia analysts={dadosCockpit} avgMetrics={metricasMedias} />
                                </div>
                            </section>
                        </Tab.Panel>

                        {/* === ABA 2: FINANCEIRO === */}
                        <Tab.Panel className="space-y-6 focus:outline-none">
                            <PainelFinanceiroImplantacao filtros={filtros} kpis={kpis} />
                            {forecast && <GraficoForecastFinanceiro data={forecast} />}
                            <GraficosTendenciaAnual data={tendenciaAnual} />
                        </Tab.Panel>

                        {/* === ABA 3: EFICIÊNCIA E RISCO === */}
                        <Tab.Panel className="space-y-6 focus:outline-none">
                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <CartaoKpi label="OTD" value={`${kpis?.otd_percentage || 0}%`} color={(kpis?.otd_percentage || 0) >= 80 ? 'green' : 'orange'} icon={IconeMeta} subtext="Entregas dentro do prazo" />
                                <CartaoKpi label="Risco preditivo" value={kpis?.avg_risk_score || 0} color="red" icon={IconeAlerta} subtext="Score médio de risco" />
                                <CartaoKpi label="Lojas estagnadas" value={kpis?.idle_stores_count || 0} color="orange" icon={IconeRelogio} subtext="Projetos parados no fluxo" />
                                <CartaoKpi label="Matriz / filial" value={`${kpis?.matrix_count || 0} / ${kpis?.filial_count || 0}`} color="slate" icon={IconeLoja} subtext="Composição da carteira" />
                            </section>

                            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                <GraficoDispersaoRisco />
                                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                        <IconeMeta size={16} className="text-[#128131]" />
                                        Eficiência operacional
                                    </h3>
                                    <p className="mt-1 text-sm text-zinc-500">Cycle time e OTD no mesmo gráfico, com escalas separadas para leitura rápida.</p>
                                    <div className="mt-5 h-[380px]">
                                        <GraficoReact type="line" data={dadosGraficoEficiencia} options={opcoesEficiencia} />
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                    <IconeRelogio size={16} className="text-[#ff7900]" />
                                    Gargalos de processo
                                </h3>
                                <div className="mt-5 grid grid-cols-1 gap-3">
                                    {(Array.isArray(gargalos) ? gargalos : []).slice(0, 8).map((gargalo, indice) => (
                                        <div key={`${gargalo.step_name}-${indice}`} className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-100 bg-zinc-50/70 p-4 md:grid-cols-12 md:items-center">
                                            <div className="md:col-span-6">
                                                <p className="text-sm font-semibold text-zinc-900">{indice + 1}. {gargalo.step_name}</p>
                                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                                                    <div
                                                        className="h-full rounded-full bg-[#ff7900]"
                                                        style={{ width: `${Math.min(100, (gargalo.avg_days / 15) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-sm text-zinc-600 md:col-span-2">{gargalo.avg_days}d média</p>
                                            <p className="text-sm text-zinc-600 md:col-span-2">{gargalo.total_days}d total</p>
                                            <p className={juntarClasses('text-sm font-semibold md:col-span-2', gargalo.reopens > 0 ? 'text-rose-600' : 'text-[#128131]')}>
                                                {gargalo.reopens > 0 ? `${gargalo.reopens} retrabalhos` : 'Fluido'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </Tab.Panel>

                        {/* === ABA 4: TIME E PERFORMANCE === */}
                        <Tab.Panel className="space-y-6 focus:outline-none">
                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <CartaoKpi label="SLA médio" value={`${resumoCockpit?.avg_sla || 0}%`} color={(resumoCockpit?.avg_sla || 0) >= 85 ? 'green' : 'orange'} icon={IconeMeta} subtext="Meta operacional: 85%" />
                                <CartaoKpi label="Vazão mensal" value={resumoCockpit?.total_entregues_mes || 0} color="green" icon={IconeSucesso} subtext="Lojas entregues no mês" />
                                <CartaoKpi label="Retrabalho médio" value={`${resumoCockpit?.avg_retrabalho || 0}%`} color={(resumoCockpit?.avg_retrabalho || 0) > 10 ? 'red' : 'slate'} icon={IconeAlerta} subtext="Indicador de qualidade" />
                                <CartaoKpi label="Analistas ativos" value={resumoCockpit?.total_ativos || dadosCockpit.length} color="slate" icon={IconeUsuarios} subtext="Equipe com carteira ativa" />
                            </section>

                            <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm xl:col-span-9">
                                    <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
                                        <h3 className="text-sm font-semibold text-zinc-950">Mesa comparativa de performance</h3>
                                        <p className="mt-1 text-xs text-zinc-500">Score, risco, carga, WIP, histórico, retrabalho, idle e SLA preservados.</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-zinc-100 bg-zinc-50 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                                                <tr>
                                                    <th className="px-3 py-3">Analista</th>
                                                    <th className="cursor-pointer px-3 py-3 text-center hover:text-[#ff7900]" onClick={() => ordenarCockpit('score')}>Score</th>
                                                    <th className="px-3 py-3 text-center">Risco</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right hover:text-[#ff7900]" onClick={() => ordenarCockpit('carga_ponderada')}>Carga</th>
                                                    <th className="px-3 py-3 text-right">WIP</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right hover:text-[#ff7900]" onClick={() => ordenarCockpit('total_lojas_historico')}>Histórico</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right hover:text-[#ff7900]" onClick={() => ordenarCockpit('entregas_mes')}>Entregas</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right hover:text-[#ff7900]" onClick={() => ordenarCockpit('pct_retrabalho')}>Retr.</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right hover:text-[#ff7900]" onClick={() => ordenarCockpit('idle_medio')}>Idle</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right hover:text-[#ff7900]" onClick={() => ordenarCockpit('pct_sla_concluidas')}>SLA</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100">
                                                {cockpitOrdenado.map((item) => {
                                                    const capacidadeAnalista = Array.isArray(capacidade) ? capacidade.find((cap: any) => cap.implantador === item.implantador) : null;
                                                    const risco = capacidadeAnalista?.risk_level || 'NORMAL';

                                                    return (
                                                        <tr
                                                            key={item.implantador}
                                                            className="cursor-pointer transition-colors hover:bg-orange-50/30"
                                                            onClick={() => navegar(`/team-diagnostics/${encodeURIComponent(item.implantador)}`)}
                                                        >
                                                            <td className="px-3 py-3 font-semibold text-zinc-800">{item.implantador}</td>
                                                            <td className="px-3 py-3 text-center"><SeloScorePerformance score={item.score?.score_final || 0} size="sm" /></td>
                                                            <td className="px-3 py-3 text-center">
                                                                <span className={juntarClasses('rounded-full px-2 py-1 text-[10px] font-bold uppercase', risco === 'CRITICAL' ? 'bg-rose-50 text-rose-600' : risco === 'HIGH' ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700')}>
                                                                    {risco}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-zinc-700">{item.carga_ponderada?.toFixed(1) || 0}</td>
                                                            <td className="px-3 py-3 text-right font-mono text-xs text-zinc-600">{capacidadeAnalista?.store_count || 0}</td>
                                                            <td className="px-3 py-3 text-right font-mono text-xs text-zinc-600">{item.total_lojas_historico || 0}</td>
                                                            <td className="px-3 py-3 text-right font-mono text-xs text-zinc-600">{item.entregas_mes || 0}</td>
                                                            <td className="px-3 py-3 text-right font-mono text-xs text-zinc-600">{item.pct_retrabalho?.toFixed?.(0) || 0}%</td>
                                                            <td className="px-3 py-3 text-right font-mono text-xs text-zinc-600">{item.idle_medio || 0}d</td>
                                                            <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-zinc-700">{item.pct_sla_concluidas || 0}%</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {carregandoCockpit && (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-[#ff7900]" />
                                        </div>
                                    )}
                                </div>

                                <aside className="space-y-6 xl:col-span-3">
                                    <BlocoAcoesTime actions={acoesTime} isVertical />
                                </aside>
                            </section>
                        </Tab.Panel>

                        {/* === ABA 5: PERFIL DOS ANALISTAS === */}
                        <Tab.Panel className="space-y-6 focus:outline-none">
                            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-zinc-950">Perfil dos analistas</h3>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Entrada rápida para o drill-down individual, mantendo plano de ação, Jarvis, radar, gargalos, carteira ativa e entregas recentes na rota atual.
                                </p>
                                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {cockpitOrdenado.map((analista) => (
                                        <button
                                            key={analista.implantador}
                                            onClick={() => navegar(`/team-diagnostics/${encodeURIComponent(analista.implantador)}`)}
                                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left transition-all hover:border-orange-200 hover:bg-orange-50/30"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-zinc-900">{analista.implantador}</p>
                                                    <p className="mt-1 text-xs text-zinc-500">{analista.recommendation || 'Abrir perfil operacional'}</p>
                                                </div>
                                                <SeloScorePerformance score={analista.score?.score_final || 0} size="sm" />
                                            </div>
                                            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                                                <span className="rounded-md bg-white px-2 py-1 text-zinc-600">{analista.entregas_mes || 0} entregas</span>
                                                <span className="rounded-md bg-white px-2 py-1 text-zinc-600">{analista.idle_medio || 0}d idle</span>
                                                <span className="rounded-md bg-white px-2 py-1 text-zinc-600">{analista.pct_sla_concluidas || 0}% SLA</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    );
}
