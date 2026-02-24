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
    const { kpiData, trendData, performanceData, bottleneckData, capacityData, forecastData, loading, refetch } = useAnalyticsData(filters);
    const [selectedImplantador, setSelectedImplantador] = useState<string | null>(null);

    // Preparar dados dos gráficos
    const safePerformanceData = Array.isArray(performanceData) ? performanceData : [];

    const availableImplantadores = useMemo(() => {
        return safePerformanceData.map(p => p.implantador).sort();
    }, [safePerformanceData]);



    if (loading && !kpiData) {
        return (
            <div className="w-full">
                {/* Header Skeleton */}
                <div className="bg-white dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700/50 sticky top-0 z-30 shadow-sm px-6 py-5">
                    <div className="flex justify-between items-center">
                        <div className="space-y-2">
                            <Skeleton width={200} height={32} />
                            <Skeleton width={150} height={16} />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton width={192} height={40} />
                            <Skeleton width={160} height={40} />
                            <Skeleton width={160} height={40} />
                        </div>
                    </div>
                </div>

                <div className="p-6 lg:p-10 space-y-10 w-full max-w-[1920px] mx-auto">
                    {/* KPIs Skeleton */}
                    <div>
                        <Skeleton width={180} height={24} className="mb-5" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {Array(8).fill(0).map((_, i) => (
                                <Skeleton key={i} height={120} className="rounded-3xl" />
                            ))}
                        </div>
                    </div>

                    {/* Charts Skeleton */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <Skeleton height={400} className="rounded-3xl" />
                        <Skeleton height={400} className="rounded-3xl" />
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
                label: 'Lojas Entregues',
                data: safeTrendData.map(d => d.throughput),
                backgroundColor: '#f97316', // Orange-500
                hoverBackgroundColor: '#ea580c', // Orange-600
                borderRadius: 6,
                borderSkipped: false,
                barPercentage: 0.6,
                categoryPercentage: 0.8,
                maxBarThickness: 40
            },
        ],
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
        <div className="min-h-screen w-full bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 p-0 font-sans selection:bg-orange-500/30 selection:text-orange-500 animate-in fade-in duration-700 transition-colors duration-300">
            {/* Header: Nexus Style */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-end">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Sistema de Gestão de Operações
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm tracking-wide mt-1 uppercase">
                        Deep Dive Operacional & Performance
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <AnalyticsFilters
                        availableImplantadores={availableImplantadores}
                        onRefresh={refetch}
                        isRefreshing={loading}
                    />
                </div>
            </header>

            <Tab.Group>
                <Tab.List className="flex space-x-2 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 p-1.5 mb-10 max-w-fit mx-auto md:mx-0 border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm sticky top-5 z-20 shadow-lg shadow-black/5 dark:shadow-black/20">
                    {['Visão Geral', 'Eficiência & Risco', 'Time & Performance'].map((tabName) => (
                        <Tab as={Fragment} key={tabName}>
                            {({ selected }) => (
                                <button
                                    className={classNames(
                                        'rounded-full px-6 py-2.5 text-sm font-bold tracking-wide transition-all duration-300 ease-out',
                                        'focus:outline-none focus:ring-2 focus:ring-orange-500/20',
                                        selected
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-700/50'
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up animation-delay-100 opacity-0">
                                <KPICard label="WIP (Pipeline Ativo)" value={kpiData.wip_stores} color="indigo" icon="🚀" subtext="Lojas em implantação" tooltip="Work In Progress. Número total de lojas que estão atualmente em fase de implantação." />
                                <KPICard label="Entregas (No Período)" value={kpiData.throughput_period} color="green" icon="✅" subtext="Projetos concluídos" tooltip="Total de projetos concluídos no período." />
                                <KPICard label="MRR em Backlog" value={`R$ ${(kpiData.mrr_backlog || 0).toLocaleString('pt-BR')}`} color="blue" icon="💰" subtext="Pipeline de receita" tooltip="Valor total da mensalidade (MRR) de todas as lojas em WIP." />
                                <KPICard label="MRR Ativado" value={`R$ ${(kpiData.mrr_done_period || 0).toLocaleString('pt-BR')}`} color="purple" icon="📈" subtext="Receita entregue" tooltip="Valor total de MRR acumulado das lojas concluídas no período." />
                                <KPICard label="Pontos Entregues" value={kpiData.total_points_done} color="yellow" icon="🏅" subtext="Pontuação conquistada" tooltip="Soma dos pontos de todas as lojas entregues no período." />
                                <KPICard label="Cycle Time Médio" value={`${kpiData.cycle_time_avg || 0} dias`} color="slate" icon="⏱️" subtext="Tempo de navegação" tooltip="Média de dias decorridos entre o início e a conclusão." />
                            </div>
                        )}

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fade-in-up animation-delay-200 opacity-0">
                            {/* Forecast Financeiro */}
                            {forecastData && <FinancialForecastChart data={forecastData} />}

                            {/* Evolução de Entregas */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow duration-300">
                                <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-6 flex items-center gap-2">
                                    Evolução de Entregas
                                    <InfoTooltip text="Número absoluto de lojas implantadas (status DONE) por mês." />
                                </h3>
                                <div className="h-[350px]">
                                    <Chart type='bar' data={throughputChartData} options={chartOptions} />
                                </div>
                            </div>
                        </div>

                    </Tab.Panel>

                    {/* --- ABA 2: EFICIÊNCIA & RISCO --- */}
                    <Tab.Panel className="space-y-8 animate-fade-in-up focus:outline-none">
                        {/* 1. KPIs Operacionais (Topo) */}
                        {kpiData && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up animation-delay-100 opacity-0">
                                <KPICard label="On-Time Delivery (OTD)" value={`${kpiData.otd_percentage || 0}%`} color={(kpiData.otd_percentage || 0) >= 80 ? 'green' : 'red'} icon="🎯" subtext="Aderência ao prazo" tooltip="% de projetos entregues dentro do prazo." />
                                <KPICard label="Risco Preditivo" value={kpiData.avg_risk_score} color="red" icon="🤖" subtext="Score médio de risco" tooltip="Fórmula: (Prazo x 45%) + (Ociosidade x 25%) + (Financeiro x 20%) + (Qualidade x 10%)" />
                                <KPICard label="Lojas Estagnadas" value={kpiData.idle_stores_count} color="orange" icon="⚠️" subtext="> 5 dias sem updates" tooltip="Lojas sem movimentação recente em tarefas." />
                                <KPICard label="Matriz vs Filial (WIP)" value={`${kpiData.matrix_count} / ${kpiData.filial_count}`} color="slate" icon="🏢" subtext="Mix de complexidade" tooltip="Proporção de lojas Matriz (Complexas) vs Filiais (Simples) em andamento." />
                            </div>
                        )}

                        {/* 2. Gráficos Lado a Lado */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fade-in-up animation-delay-200 opacity-0">
                            {/* Gráfico de Risco */}
                            <div className="h-full">
                                <RiskScatterPlot />
                            </div>

                            {/* Eficiência Operacional */}
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm h-full hover:shadow-md transition-shadow duration-300">
                                <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-6 flex items-center gap-2">
                                    Eficiência Operacional
                                    <InfoTooltip text="Combinação de Cycle Time e OTD ao longo do tempo." />
                                </h3>
                                <div className="h-[350px]">
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
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden animate-fade-in-up animation-delay-300 opacity-0 hover:shadow-md transition-shadow duration-300">
                            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                <h3 className="text-xl font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                                    <span className="text-amber-500">⏳</span> Gargalos de Processo
                                    <InfoTooltip text="Etapas onde os projetos passam mais tempo parados." />
                                </h3>
                            </div>

                            <div className="p-6 grid grid-cols-1 gap-4">
                                {(Array.isArray(bottleneckData) ? bottleneckData : []).slice(0, 8).map((b, i) => (
                                    <div key={i} className="group relative flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all cursor-default border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700/50">

                                        {/* Rank Number */}
                                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-bold text-sm">
                                            {i + 1}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                                            {/* Name & Progress */}
                                            <div className="md:col-span-6">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-bold text-zinc-700 dark:text-zinc-200 text-sm">{b.step_name}</span>
                                                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{b.avg_days}d média</span>
                                                </div>
                                                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.4)] transition-all duration-1000 ease-out group-hover:brightness-110"
                                                        style={{ width: `${Math.min(100, (b.avg_days / 15) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="md:col-span-3 flex flex-col items-center md:items-start pl-4 border-l border-zinc-100 dark:border-zinc-800/50">
                                                <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Tempo Total</span>
                                                <span className="text-zinc-700 dark:text-zinc-300 font-mono font-bold">{b.total_days}d</span>
                                            </div>

                                            {/* Retrabalhos */}
                                            <div className="md:col-span-3 flex justify-end">
                                                {b.reopens > 0 ? (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{b.reopens} Retrabalhos</span>
                                                    </div>
                                                ) : (
                                                    <div className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 opacity-50">
                                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Fluido</span>
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
                        <div className="space-y-8 animate-fade-in-up duration-300">
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
