import { useState, useMemo, Fragment } from 'react';
import { Tab } from '@headlessui/react';
import { Skeleton } from '../ui/Skeleton';
import PerformanceDetailModal from './PerformanceDetailModal';

// REMOVED DashboardContext usage in favor of URL Params
import { useDashboardUrlParams } from '../../hooks/useDashboardUrlParams';
import { AnalyticsFilters } from './AnalyticsFilters';
import { useAnalyticsData } from './useAnalyticsData';
import { KPICard } from './KPICard';
import { FinancialForecastChart } from './FinancialForecastChart';
import { AnnualTrendCharts } from './AnnualTrendCharts';
import { InfoTooltip } from './InfoTooltip';
import { RiskScatterPlot } from './RiskScatterPlot';
import { TeamPerformanceMatrix } from './TeamPerformanceMatrix';
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
                borderColor: '#84cc16', // Lime-500
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(132, 204, 22, 0.4)');
                    gradient.addColorStop(1, 'rgba(132, 204, 22, 0.0)');
                    return gradient;
                },
                pointBackgroundColor: '#84cc16',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                yAxisID: 'y',
            },
            {
                type: 'bar' as const,
                label: 'OTD %',
                data: safeTrendData.map(d => d.otd_percentage),
                backgroundColor: '#10b981', // Emerald-500
                hoverBackgroundColor: '#059669', // Emerald-600
                borderRadius: 4,
                barPercentage: 0.4,
                yAxisID: 'y1',
            },
        ],
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
                                <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                    <Target size={16} className="text-[#128131]" />
                                    Eficiência Operacional
                                    <InfoTooltip text="Combinação de Cycle Time e OTD ao longo do tempo." />
                                </h3>
                                <div aria-label="Dashboard Analytics" className="h-[350px]">
                                    <Chart
                                        type='line'
                                        data={efficiencyChartData}
                                        options={{
                                            ...chartOptions,
                                            scales: {
                                                y: { ...chartOptions.scales!.y, position: 'left' },
                                                y1: { ...chartOptions.scales!.y, position: 'right', grid: { drawOnChartArea: false } }
                                            }
                                        }}
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
                        <div aria-label="Dashboard Analytics" className="space-y-8 animate-fade-in-up duration-300">
                            {capacityData && safePerformanceData && (
                                <TeamPerformanceMatrix
                                    capacityData={capacityData}
                                    performanceData={safePerformanceData}
                                    onSelectImplantador={setSelectedImplantador}
                                />
                            )}
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
