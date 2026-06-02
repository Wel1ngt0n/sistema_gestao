import { useState, useMemo, useEffect, Fragment } from 'react';
import { Tab } from '@headlessui/react';
import { Skeleton } from '../ui/Skeleton';
import PerformanceDetailModal from './PerformanceDetailModal';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

// REMOVED DashboardContext usage in favor of URL Params
import { useDashboardUrlParams } from '../../hooks/useDashboardUrlParams';
import { AnalyticsFilters } from './AnalyticsFilters';
import { useAnalyticsData } from './useAnalyticsData';
import { KPICard } from './KPICard';
import { FinancialForecastChart } from './FinancialForecastChart';
import { AnnualTrendCharts } from './AnnualTrendCharts';
import { InfoTooltip } from './InfoTooltip';
import { RiskScatterPlot } from './RiskScatterPlot';
import { PerformanceScoreBadge } from '../reports/PerformanceScoreBadge';
import { TeamActionsBlock } from './TeamActionsBlock';
import { IntelligenceInsightBlock } from './IntelligenceInsightBlock';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler,
    BarController,
    LineController,
    PieController,
    ChartOptions
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import {
    AlertTriangle,
    BarChart3,
    Building2,
    CheckCircle2,
    Clock3,
    LayoutDashboard,
    Target,
    Trophy,
    WalletCards,
    Users,
} from 'lucide-react';
import logo from '../../assets/logo.png';


ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler,
    BarController,
    LineController,
    PieController
);

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export default function DashboardAnalytics() {
    const { filters } = useDashboardUrlParams();
    const { kpiData, trendData, annualTrendData, performanceData, bottleneckData, capacityData, forecastData, loading, refetch } = useAnalyticsData(filters);
    const [selectedImplantador, setSelectedImplantador] = useState<string | null>(null);
    const navigate = useNavigate();

    // Cockpit data for enriched Team & Performance tab
    const [cockpitData, setCockpitData] = useState<any[]>([]);
    const [cockpitSummary, setCockpitSummary] = useState<any>(null);
    const [avgMetrics, setAvgMetrics] = useState<any>(null);
    const [teamActions, setTeamActions] = useState<any[]>([]);
    const [cockpitLoading, setCockpitLoading] = useState(false);
    const [cockpitSortField, setCockpitSortField] = useState<string>('score');
    const [cockpitSortAsc, setCockpitSortAsc] = useState(false);

    useEffect(() => {
        const fetchCockpit = async () => {
            setCockpitLoading(true);
            try {
                const res = await api.get('/api/reports/implantadores/cockpit?period=all');
                setCockpitData(res.data.analysts || []);
                setCockpitSummary(res.data.summary);
                setAvgMetrics(res.data.avg_metrics);
                setTeamActions(res.data.team_actions || []);
            } catch (err) {
                console.error('Erro ao carregar cockpit:', err);
            } finally {
                setCockpitLoading(false);
            }
        };
        fetchCockpit();
    }, []);

    const handleCockpitSort = (field: string) => {
        if (cockpitSortField === field) setCockpitSortAsc(!cockpitSortAsc);
        else { setCockpitSortField(field); setCockpitSortAsc(false); }
    };

    const sortedCockpitData = useMemo(() => {
        return [...cockpitData].sort((a, b) => {
            let valA: any = field(a, cockpitSortField);
            let valB: any = field(b, cockpitSortField);
            if (valA < valB) return cockpitSortAsc ? -1 : 1;
            if (valA > valB) return cockpitSortAsc ? 1 : -1;
            return 0;
        });
    }, [cockpitData, cockpitSortField, cockpitSortAsc]);

    function field(obj: any, f: string): number {
        if (f === 'score') return obj.score?.score_final || 0;
        if (f === 'pct_retrabalho') return (obj as any).pct_retrabalho || 0;
        return obj[f] ?? 0;
    }

    // Preparar dados dos gráficos
    const safePerformanceData = Array.isArray(performanceData) ? performanceData : [];

    const availableImplantadores = useMemo(() => {
        return safePerformanceData.map(p => p.implantador).sort();
    }, [safePerformanceData]);



    if (loading && !kpiData) {
        return (
            <div aria-label="Dashboard Analytics" className="w-full">
                {/* Header Skeleton */}
                <div aria-label="Dashboard Analytics" className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div aria-label="Dashboard Analytics" className="flex justify-between items-center">
                        <div aria-label="Dashboard Analytics" className="space-y-2">
                            <Skeleton width={200} height={32} />
                            <Skeleton width={150} height={16} />
                        </div>
                        <div aria-label="Dashboard Analytics" className="flex gap-4">
                            <Skeleton width={192} height={40} />
                            <Skeleton width={160} height={40} />
                            <Skeleton width={160} height={40} />
                        </div>
                    </div>
                </div>

                <div aria-label="Dashboard Analytics" className="p-6 lg:p-10 space-y-10 w-full max-w-[1920px] mx-auto">
                    {/* KPIs Skeleton */}
                    <div>
                        <Skeleton width={180} height={24} className="mb-5" />
                        <div aria-label="Dashboard Analytics" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {Array(8).fill(0).map((_, i) => (
                                <Skeleton key={i} height={120} className="rounded-lg" />
                            ))}
                        </div>
                    </div>

                    {/* Charts Skeleton */}
                    <div aria-label="Dashboard Analytics" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <Skeleton height={400} className="rounded-lg" />
                        <Skeleton height={400} className="rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    const safeTrendData = Array.isArray(trendData) ? trendData : [];
    const trendLabels = safeTrendData.map(d => d.month);


    // Configuração de Gráficos (Estilo Dashboard Executivo)
    const chartOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            y: {
                grid: {
                    color: 'rgba(161, 161, 170, 0.1)', // Zinc-400 with opacity
                },
                ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 11 } },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 11 } },
                border: { display: false }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(24, 24, 27, 0.9)', // Zinc-950
                titleColor: '#fff',
                bodyColor: '#e4e4e7', // Zinc-200
                padding: 12,
                cornerRadius: 12,
                displayColors: true,
                boxPadding: 4,
                titleFont: { family: 'Inter', size: 13, weight: 'bold' },
                bodyFont: { family: 'Inter', size: 12 },
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
            }
        },
        layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
    };

    // Gráfico 1: Throughput Mensal
    const throughputChartData = {
        labels: trendLabels,
        datasets: [
            {
                label: 'Lojas entregues',
                data: safeTrendData.map(d => d.throughput),
                backgroundColor: 'rgba(255, 121, 0, 0.32)',
                hoverBackgroundColor: 'rgba(255, 121, 0, 0.46)',
                borderColor: 'rgba(255, 121, 0, 0.65)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.56,
                categoryPercentage: 0.82,
                maxBarThickness: 44,
            },
        ],
    };

    const throughputChartOptions: ChartOptions = {
        ...chartOptions,
        plugins: {
            ...chartOptions.plugins,
            legend: {
                display: true,
                position: 'bottom' as const,
                align: 'start' as const,
                labels: {
                    boxHeight: 8,
                    boxWidth: 18,
                    color: '#52525b',
                    padding: 18,
                    usePointStyle: true,
                    font: { size: 11, weight: 500 },
                },
            },
            tooltip: {
                ...chartOptions.plugins?.tooltip,
                callbacks: {
                    label: function (context: any) {
                        return `Lojas entregues: ${context.parsed.y ?? 0}`;
                    }
                }
            }
        },
        layout: { padding: { top: 8, right: 8, bottom: 0, left: 0 } },
        scales: {
            y: {
                grid: { color: 'rgba(100, 116, 139, 0.12)', drawTicks: false },
                ticks: { color: '#71717a', font: { size: 11 }, precision: 0 },
                title: {
                    display: true,
                    text: 'Entregas no mês',
                    color: '#71717a',
                    font: { size: 11, weight: 500 },
                },
                border: { display: false },
                beginAtZero: true,
            },
            x: {
                grid: { display: false },
                ticks: { color: '#71717a', font: { size: 11 }, maxRotation: 0, autoSkip: true },
                border: { display: false },
            }
        },
    };


    // Gráfico 2: OTD & Cycle Time
    const efficiencyChartData = {
        labels: trendLabels,
        datasets: [
            {
                type: 'line' as const,
                label: 'Cycle Time Médio (dias)',
                data: safeTrendData.map(d => d.cycle_time_avg),
                borderColor: '#128131',
                backgroundColor: 'rgba(18, 129, 49, 0.08)',
                pointBackgroundColor: '#128131',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 2.5,
                tension: 0.35,
                fill: true,
                yAxisID: 'y',
            },
            {
                type: 'bar' as const,
                label: 'OTD %',
                data: safeTrendData.map(d => d.otd_percentage),
                backgroundColor: 'rgba(255, 121, 0, 0.24)',
                hoverBackgroundColor: 'rgba(255, 121, 0, 0.36)',
                borderColor: 'rgba(255, 121, 0, 0.55)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.45,
                categoryPercentage: 0.8,
                yAxisID: 'y1',
            },
        ],
    };

    const efficiencyChartOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom' as const,
                align: 'start' as const,
                labels: {
                    boxHeight: 8,
                    boxWidth: 18,
                    color: '#52525b',
                    padding: 18,
                    usePointStyle: true,
                    font: { size: 11, weight: 500 },
                },
            },
            tooltip: {
                backgroundColor: '#18181b',
                titleColor: '#fff',
                bodyColor: '#e4e4e7',
                borderColor: '#27272a',
                borderWidth: 1,
                cornerRadius: 6,
                displayColors: true,
                padding: 12,
                callbacks: {
                    label: function (context: any) {
                        if (context.dataset.label === 'OTD %') {
                            return `OTD: ${context.parsed.y ?? 0}%`;
                        }
                        return `Cycle time: ${context.parsed.y ?? 0} dias`;
                    }
                }
            },
        },
        layout: { padding: { top: 8, right: 8, bottom: 0, left: 0 } },
        scales: {
            y: {
                position: 'left' as const,
                grid: { color: 'rgba(100, 116, 139, 0.12)', drawTicks: false },
                ticks: { color: '#71717a', font: { size: 11 } },
                title: {
                    display: true,
                    text: 'Cycle time (dias)',
                    color: '#71717a',
                    font: { size: 11, weight: 500 },
                },
                border: { display: false },
                beginAtZero: true,
            },
            y1: {
                position: 'right' as const,
                grid: { drawOnChartArea: false, drawTicks: false },
                ticks: {
                    color: '#71717a',
                    font: { size: 11 },
                    callback: (val: any) => `${val}%`,
                },
                title: {
                    display: true,
                    text: 'OTD',
                    color: '#71717a',
                    font: { size: 11, weight: 500 },
                },
                border: { display: false },
                min: 0,
                max: 100,
            },
            x: {
                grid: { display: false },
                ticks: { color: '#71717a', font: { size: 11 }, maxRotation: 0, autoSkip: true },
                border: { display: false },
            },
        },
    };

    return (
        <div aria-label="Dashboard Analytics" className="w-full space-y-6 text-zinc-950">
            <header className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                            <img src={logo} alt="Instabuy" className="h-7 w-auto object-contain" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Implantação</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
                                Analytics operacional
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                                Deep dive de performance, eficiência, risco e capacidade do time.
                            </p>
                        </div>
                    </div>
                    <div aria-label="Dashboard Analytics" className="flex flex-col items-start gap-3 lg:items-end">
                        <AnalyticsFilters
                            availableImplantadores={availableImplantadores}
                            onRefresh={refetch}
                            isRefreshing={loading}
                        />
                    </div>
                </div>
                <div className="mt-5 h-1 w-24 rounded-full bg-[#ff7900]" />
            </header>

            <Tab.Group>
                <Tab.List className="sticky top-5 z-20 mb-6 flex max-w-fit gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
                    {['Visão Geral', 'Eficiência & Risco', 'Time & Performance'].map((tabName) => (
                        <Tab as={Fragment} key={tabName}>
                            {({ selected }) => (
                                <button
                                    className={classNames(
                                        'rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200',
                                        'focus:outline-none focus:ring-2 focus:ring-orange-500/20',
                                        selected
                                            ? 'bg-[#ff7900] text-white shadow-sm'
                                            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950'
                                    )}
                                >
                                    {tabName}
                                </button>
                            )}
                        </Tab>
                    ))}
                </Tab.List>

                <Tab.Panels>
                    {/* --- ABA 1: VISÃO GERAL --- */}
                    <Tab.Panel className="space-y-8 animate-fade-in-up focus:outline-none">
                        {/* KPIs Executivos */}
                        {kpiData && (
                            <div aria-label="Dashboard Analytics" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-up animation-delay-100 opacity-0">
                                <KPICard label="WIP (Pipeline Ativo)" value={kpiData.wip_stores} color="orange" icon={LayoutDashboard} subtext="Lojas em implantação" tooltip="Work In Progress. Número total de lojas que estão atualmente em fase de implantação." />
                                <KPICard label="Entregas (No Período)" value={kpiData.throughput_period} color="green" icon={CheckCircle2} subtext="Projetos concluídos" tooltip="Total de projetos concluídos no período." />
                                <KPICard label="MRR em Backlog" value={`R$ ${(kpiData.mrr_backlog || 0).toLocaleString('pt-BR')}`} color="blue" icon={WalletCards} subtext="Pipeline de receita" tooltip="Valor total da mensalidade (MRR) de todas as lojas em WIP." />
                                <KPICard label="MRR Ativado" value={`R$ ${(kpiData.mrr_done_period || 0).toLocaleString('pt-BR')}`} color="amber" icon={BarChart3} subtext="Receita entregue" tooltip="Valor total de MRR acumulado das lojas concluídas no período." />
                                <KPICard label="Pontos Entregues" value={kpiData.total_points_done} color="yellow" icon={Trophy} subtext="Pontuação conquistada" tooltip="Soma dos pontos de todas as lojas entregues no período." />
                                <KPICard label="Cycle Time Médio" value={`${kpiData.cycle_time_avg || 0} dias`} color="slate" icon={Clock3} subtext="Tempo de navegação" tooltip="Média de dias decorridos entre o início e a conclusão." />
                            </div>
                        )}

                        <div aria-label="Dashboard Analytics" className="grid grid-cols-1 gap-4 xl:grid-cols-2 animate-fade-in-up animation-delay-200 opacity-0">
                            {/* Forecast Financeiro */}
                            {forecastData && <FinancialForecastChart data={forecastData} />}

                            {/* Evolução de Entregas */}
                            <div aria-label="Dashboard Analytics" className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                    <BarChart3 size={16} className="text-[#ff7900]" />
                                    Evolução de Entregas
                                    <InfoTooltip text="Número absoluto de lojas implantadas (status DONE) por mês." />
                                </h3>
                                <p className="text-sm text-zinc-500">Volume mensal de lojas concluídas no período selecionado.</p>
                                <div aria-label="Dashboard Analytics" className="mt-5 h-[340px]">
                                    <Chart type='bar' data={throughputChartData} options={throughputChartOptions} />
                                </div>
                            </div>
                        </div>

                        {/* Trend Charts Acumulados (Burn-down) */}
                        <div aria-label="Dashboard Analytics" className="animate-fade-in-up animation-delay-300 opacity-0">
                            <AnnualTrendCharts data={annualTrendData} />
                        </div>

                    </Tab.Panel>

                    {/* --- ABA 2: EFICIÊNCIA & RISCO --- */}
                    <Tab.Panel className="space-y-8 animate-fade-in-up focus:outline-none">
                        {/* 1. KPIs Operacionais (Topo) */}
                        {kpiData && (
                            <div aria-label="Dashboard Analytics" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up animation-delay-100 opacity-0">
                                <KPICard label="On-Time Delivery (OTD)" value={`${kpiData.otd_percentage || 0}%`} color={(kpiData.otd_percentage || 0) >= 80 ? 'green' : 'red'} icon={Target} subtext="Aderência ao prazo" tooltip="% de projetos entregues dentro do prazo." />
                                <KPICard label="Risco Preditivo" value={kpiData.avg_risk_score} color="red" icon={AlertTriangle} subtext="Score médio de risco" tooltip="Fórmula: (Prazo x 45%) + (Ociosidade x 25%) + (Financeiro x 20%) + (Qualidade x 10%)" />
                                <KPICard label="Lojas Estagnadas" value={kpiData.idle_stores_count} color="orange" icon={Clock3} subtext="> 5 dias sem updates" tooltip="Lojas sem movimentação recente em tarefas." />
                                <KPICard label="Matriz vs Filial (WIP)" value={`${kpiData.matrix_count} / ${kpiData.filial_count}`} color="slate" icon={Building2} subtext="Mix de complexidade" tooltip="Proporção de lojas Matriz (Complexas) vs Filiais (Simples) em andamento." />
                            </div>
                        )}

                        {/* 2. Gráficos Lado a Lado */}
                        <div aria-label="Dashboard Analytics" className="grid grid-cols-1 gap-4 xl:grid-cols-2 animate-fade-in-up animation-delay-200 opacity-0">
                            {/* Gráfico de Risco */}
                            <div aria-label="Dashboard Analytics" className="h-full">
                                <RiskScatterPlot />
                            </div>

                            {/* Eficiência Operacional */}
                            <div aria-label="Dashboard Analytics" className="h-full rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                    <Target size={16} className="text-[#128131]" />
                                    Eficiência Operacional
                                    <InfoTooltip text="Combinação de Cycle Time e OTD ao longo do tempo." />
                                </h3>
                                <p className="text-sm text-zinc-500">Acompanhe prazo médio de entrega e percentual no prazo ao longo dos meses.</p>
                                <div aria-label="Dashboard Analytics" className="mt-5 h-[400px]">
                                    <Chart
                                        type='line'
                                        data={efficiencyChartData}
                                        options={efficiencyChartOptions}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Gargalos (Visual Moderno - Progress List) */}
                        <div aria-label="Dashboard Analytics" className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md animate-fade-in-up animation-delay-300 opacity-0">
                            <div aria-label="Dashboard Analytics" className="border-b border-zinc-100 bg-zinc-50 p-5">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                    <Clock3 size={16} className="text-amber-500" />
                                    Gargalos de Processo
                                    <InfoTooltip text="Etapas onde os projetos passam mais tempo parados." />
                                </h3>
                            </div>

                            <div aria-label="Dashboard Analytics" className="grid grid-cols-1 gap-3 p-5">
                                {(Array.isArray(bottleneckData) ? bottleneckData : []).slice(0, 8).map((b, i) => (
                                    <div key={i} className="group relative flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-50/30 transition-all cursor-default border border-transparent hover:border-zinc-200/50">

                                        {/* Rank Number */}
                                        <div aria-label="Dashboard Analytics" className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100/50 text-zinc-500 font-bold text-sm">
                                            {i + 1}
                                        </div>

                                        {/* Content */}
                                        <div aria-label="Dashboard Analytics" className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                                            {/* Name & Progress */}
                                            <div aria-label="Dashboard Analytics" className="md:col-span-6">
                                                <div aria-label="Dashboard Analytics" className="flex justify-between mb-2">
                                                    <span className="font-bold text-zinc-700 text-sm">{b.step_name}</span>
                                                    <span className="text-xs font-mono text-zinc-500">{b.avg_days}d média</span>
                                                </div>
                                                <div aria-label="Dashboard Analytics" className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.4)] transition-all duration-1000 ease-out group-hover:brightness-110"
                                                        style={{ width: `${Math.min(100, (b.avg_days / 15) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div aria-label="Dashboard Analytics" className="md:col-span-3 flex flex-col items-center md:items-start pl-4 border-l border-zinc-100/50">
                                                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Tempo Total</span>
                                                <span className="text-zinc-700 font-mono font-bold">{b.total_days}d</span>
                                            </div>

                                            {/* Retrabalhos */}
                                            <div aria-label="Dashboard Analytics" className="md:col-span-3 flex justify-end">
                                                {b.reopens > 0 ? (
                                                    <div aria-label="Dashboard Analytics" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                                        <span className="text-xs font-bold text-rose-600">{b.reopens} Retrabalhos</span>
                                                    </div>
                                                ) : (
                                                    <div aria-label="Dashboard Analytics" className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 opacity-50">
                                                        <span className="text-xs font-bold text-emerald-600">Fluido</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Tab.Panel>

                    {/* --- ABA 3: TIME & PERFORMANCE --- */}
                    <Tab.Panel className="space-y-6 animate-fade-in-up focus:outline-none">
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                            {/* Main Column: Table + Intelligence */}
                            <div className="space-y-6 xl:col-span-9">
                                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300">
                                    <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-4">
                                        <div>
                                            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                                <Users size={16} className="text-[#128131]" />
                                                Mesa Comparativa de Performance
                                            </h3>
                                            <p className="mt-1 text-xs text-zinc-500">Métricas consolidadas de esforço, risco e score final.</p>
                                        </div>
                                        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 shadow-xs">
                                            <span className="text-xs font-bold text-zinc-600">{cockpitData.length}</span>
                                            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Analistas</span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="border-b border-zinc-100 bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                                <tr>
                                                    <th className="w-8 px-3 py-3 text-center">#</th>
                                                    <th className="cursor-pointer px-3 py-3 transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('implantador')}>Analista</th>
                                                    <th className="cursor-pointer px-3 py-3 text-center transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('score')}>Score</th>
                                                    <th className="px-3 py-3 text-center">Risco</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('carga_ponderada')}>Carga</th>
                                                    <th className="px-3 py-3 text-right">WIP</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('total_lojas_historico')}>Lojas Totais</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('matrizes_historico')}>Matriz/Filial (Hist.)</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('entregas_mes')}>Entregas</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('pct_retrabalho')}>Retr.</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('idle_medio')}>Idle</th>
                                                    <th className="cursor-pointer px-3 py-3 text-right transition-colors hover:text-[#ff7900]" onClick={() => handleCockpitSort('pct_sla_concluidas')}>SLA</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100">
                                                {sortedCockpitData.map((item, idx) => {
                                                    const cap = Array.isArray(capacityData) ? capacityData.find((c: any) => c.implantador === item.implantador) : null;
                                                    const risk = cap?.risk_level || 'NORMAL';
                                                    const wipCount = cap?.store_count || 0;
                                                    const wipPts = cap?.current_points || 0;
                                                    return (
                                                        <tr
                                                            key={idx}
                                                            onClick={() => navigate(`/team-diagnostics/${encodeURIComponent(item.implantador)}`)}
                                                            className={`group cursor-pointer transition-all hover:bg-zinc-50/80 ${idx === 0 ? 'bg-orange-50/20' : ''}`}
                                                        >
                                                            <td className="px-3 py-2.5 text-center">
                                                                <div className={`mx-auto flex h-5 w-5 items-center justify-center rounded text-[10px] font-black ${idx === 0 ? 'bg-orange-100 text-orange-700' : idx === 1 ? 'bg-zinc-100 text-zinc-500' : idx === 2 ? 'bg-amber-100 text-amber-700' : 'text-zinc-300'}`}>
                                                                    {idx + 1}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-400 group-hover:border-orange-200 group-hover:text-orange-500 transition-colors">
                                                                        {item.implantador.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <span className="font-semibold text-zinc-700 group-hover:text-zinc-950 transition-colors">{item.implantador}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <PerformanceScoreBadge score={item.score?.score_final || 0} size="sm" />
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                 <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${risk === 'CRITICAL' ? 'bg-red-50 text-red-600' : risk === 'HIGH' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                     {risk}
                                                                 </span>
                                                             </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-zinc-600">
                                                                {item.carga_ponderada?.toFixed(1)}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-xs font-bold text-zinc-700">{wipCount}</span>
                                                                    <span className="text-[9px] font-medium text-zinc-400">{wipPts?.toFixed(0)} pts</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-zinc-600">
                                                                {item.total_lojas_historico ?? 0}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-zinc-600">
                                                                {item.matrizes_historico ?? 0} / {item.filiais_historico ?? 0}
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold text-zinc-600">
                                                                {item.entregas_mes}
                                                            </td>
                                                            <td className={`px-4 py-4 text-right font-mono text-xs font-bold ${((item as any).pct_retrabalho || 0) > 10 ? 'text-rose-600' : 'text-zinc-600'}`}>
                                                                {(item as any).pct_retrabalho?.toFixed(0)}%
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-mono text-xs font-bold text-zinc-600">
                                                                {item.idle_medio}d
                                                            </td>
                                                            <td className={`px-4 py-4 text-right font-mono text-xs font-bold ${item.pct_sla_concluidas >= 85 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {item.pct_sla_concluidas}%
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {cockpitLoading && (
                                        <div className="flex items-center justify-center py-10">
                                            <div className="h-6 w-6 rounded-full border-2 border-zinc-200 border-t-[#ff7900] animate-spin" />
                                        </div>
                                    )}
                                </div>

                                <IntelligenceInsightBlock
                                    analysts={cockpitData}
                                    avgMetrics={avgMetrics}
                                />
                            </div>

                            {/* Sidebar Column: Metrics + Actions + Ranking */}
                            <aside className="space-y-6 xl:col-span-3">
                                {/* Compact Summary Metrics */}
                                {cockpitSummary && (
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">SLA Médio</p>
                                            <div className="mt-1 flex items-baseline justify-between">
                                                <p className="text-2xl font-bold text-zinc-900">{cockpitSummary.avg_sla || 0}%</p>
                                                <span className={`text-[10px] font-bold ${cockpitSummary.avg_sla >= 85 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                    {cockpitSummary.avg_sla >= 85 ? 'Meta Atingida' : 'Abaixo da Meta'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Vazão Mensal</p>
                                            <div className="mt-1 flex items-baseline justify-between">
                                                <p className="text-2xl font-bold text-zinc-900">{cockpitSummary.total_entregues_mes || 0}</p>
                                                <span className="text-[10px] font-bold text-zinc-500">Lojas Entregues</span>
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Taxa de Retrabalho</p>
                                            <div className="mt-1 flex items-baseline justify-between">
                                                <p className="text-2xl font-bold text-zinc-900">{cockpitSummary.avg_retrabalho || 0}%</p>
                                                <span className={`text-[10px] font-bold ${cockpitSummary.avg_retrabalho > 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {cockpitSummary.avg_retrabalho > 10 ? 'Crítico' : 'Saudável'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Saúde do Time</p>
                                            <div className="mt-1 flex items-baseline justify-between">
                                                <p className="text-xl font-bold text-zinc-900">
                                                    {cockpitSummary.team_health === 'Good' ? 'Consistente' : 'Alerta'}
                                                </p>
                                                <span className="text-[10px] font-bold text-zinc-500">{cockpitSummary.total_ativos || 0} Ativos</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <TeamActionsBlock actions={teamActions} isVertical={true} />
                            </aside>
                        </div>
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>

            {selectedImplantador && (
                <PerformanceDetailModal
                    implantadorName={selectedImplantador}
                    onClose={() => setSelectedImplantador(null)}
                />
            )}
        </div>
    );
}
