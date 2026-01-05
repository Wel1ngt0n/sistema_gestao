import { useState, useMemo, Fragment } from 'react';
import { Tab } from '@headlessui/react';
import { Skeleton } from '../ui/Skeleton';
import PerformanceDetailModal from './PerformanceDetailModal';

// REMOVED DashboardContext usage in favor of URL Params
import { useDashboardUrlParams } from '../../hooks/useDashboardUrlParams';
import { AnalyticsFilters } from './AnalyticsFilters';
import { useAnalyticsData } from './useAnalyticsData';
import { KPICard } from './KPICard';
import { TeamCapacityWidget } from './TeamCapacityWidget';
import { FinancialForecastChart } from './FinancialForecastChart';
import { InfoTooltip } from './InfoTooltip';
import { RiskScatterPlot } from './RiskScatterPlot';
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
    Filler
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
    Filler
);

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export default function DashboardAnalytics() {
    const { filters } = useDashboardUrlParams();
    const { kpiData, trendData, performanceData, bottleneckData, capacityData, forecastData, loading } = useAnalyticsData(filters);
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
                <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm px-6 py-5">
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
                                <Skeleton key={i} height={120} className="rounded-2xl" />
                            ))}
                        </div>
                    </div>

                    {/* Charts Skeleton */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <Skeleton height={400} className="rounded-2xl" />
                        <Skeleton height={400} className="rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    const safeTrendData = Array.isArray(trendData) ? trendData : [];
    const trendLabels = safeTrendData.map(d => d.month);

    // Configuração de Gráficos (Estilo Dashboard Executivo)
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        },
        plugins: {
            legend: {
                labels: { color: '#94a3b8' },
                display: false
            }
        },
        // Evita barras gigantes quando tem poucos dados
        maxBarThickness: 40,
        animation: {
            duration: 1000,
            easing: 'easeOutQuart' as const,
        },
    };

    // Gráfico 1: Throughput Mensal
    const throughputChartData = {
        labels: trendLabels,
        datasets: [
            {
                label: 'Lojas Entregues',
                data: safeTrendData.map(d => d.throughput),
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
                borderRadius: 4,
            },
        ],
    };

    // Gráfico 1.5: Pontuação Mensal
    const pointsChartData = {
        labels: trendLabels,
        datasets: [
            {
                label: 'Pontos Entregues',
                data: safeTrendData.map(d => d.total_points),
                backgroundColor: 'rgba(139, 92, 246, 0.7)',
                hoverBackgroundColor: 'rgba(139, 92, 246, 1)',
                borderRadius: 4,
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
                borderColor: 'rgb(245, 158, 11)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                yAxisID: 'y',
            },
            {
                type: 'bar' as const,
                label: 'OTD %',
                data: safeTrendData.map(d => d.otd_percentage),
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderRadius: 4,
                yAxisID: 'y1',
            },
        ],
    };

    // Performance por Implantador
    const perfLabels = safePerformanceData.map(p => p.implantador);
    const performanceChartData = {
        labels: perfLabels,
        datasets: [
            {
                label: 'Entregues (Done)',
                data: safePerformanceData.map(p => p.done),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderRadius: 4,
            },
            {
                label: 'Em Progresso (WIP)',
                data: safePerformanceData.map(p => p.wip),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 4,
            },
        ],
    };

    return (
        <div className="w-full h-full min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header Premium (Fixo) */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
                <div className="max-w-[1920px] mx-auto w-full px-6 py-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Análise de Dados</h1>
                        </div>
                        <div className="flex-none">
                            <AnalyticsFilters availableImplantadores={availableImplantadores} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1920px] mx-auto w-full px-6 lg:px-10 py-8">
                <Tab.Group>
                    <Tab.List className="flex space-x-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 p-1 mb-8 max-w-2xl">
                        <Tab as={Fragment}>
                            {({ selected }) => (
                                <button
                                    className={classNames(
                                        'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                        'ring-white/60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2',
                                        selected
                                            ? 'bg-white text-indigo-700 shadow dark:bg-slate-700 dark:text-indigo-300'
                                            : 'text-slate-600 hover:bg-white/[0.12] hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300'
                                    )}
                                >
                                    📊 Visão Geral
                                </button>
                            )}
                        </Tab>
                        <Tab as={Fragment}>
                            {({ selected }) => (
                                <button
                                    className={classNames(
                                        'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                        'ring-white/60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2',
                                        selected
                                            ? 'bg-white text-indigo-700 shadow dark:bg-slate-700 dark:text-indigo-300'
                                            : 'text-slate-600 hover:bg-white/[0.12] hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300'
                                    )}
                                >
                                    ⚡ Eficiência & Risco
                                </button>
                            )}
                        </Tab>
                        <Tab as={Fragment}>
                            {({ selected }) => (
                                <button
                                    className={classNames(
                                        'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                        'ring-white/60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2',
                                        selected
                                            ? 'bg-white text-indigo-700 shadow dark:bg-slate-700 dark:text-indigo-300'
                                            : 'text-slate-600 hover:bg-white/[0.12] hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300'
                                    )}
                                >
                                    👥 Time & Performance
                                </button>
                            )}
                        </Tab>
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
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
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
                                    <KPICard label="Risco Preditivo" value={kpiData.avg_risk_score} color="red" icon="🤖" subtext="Score médio de risco" tooltip="Média do score de risco IA." />
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
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-full">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
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
                                                    y: { ...chartOptions.scales.y, position: 'left' },
                                                    y1: { ...chartOptions.scales.y, position: 'right', grid: { drawOnChartArea: false } }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Gargalos (Full Width) */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in-up animation-delay-300 opacity-0">
                                <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <span className="text-amber-500">⏳</span> Gargalos de Processo
                                        <InfoTooltip text="Etapas onde os projetos passam mais tempo parados." />
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-8 py-4">Etapa</th>
                                                <th className="px-8 py-4 w-48">Tempo Acumulado</th>
                                                <th className="px-8 py-4 w-48">Média / Loja</th>
                                                <th className="px-8 py-4 w-32 text-center">Retrabalhos</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {(Array.isArray(bottleneckData) ? bottleneckData : []).slice(0, 10).map((b, i) => (
                                                <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{b.step_name}</p>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full" style={{ width: `${Math.min(100, (b.avg_days / 15) * 100)}%` }}></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-slate-600 dark:text-slate-400 text-sm font-mono">{b.total_days}d</td>
                                                    <td className="px-8 py-5 text-sm font-bold text-slate-800 dark:text-white">{b.avg_days}d</td>
                                                    <td className="px-8 py-5 text-center">
                                                        {b.reopens > 0 ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                                                                {b.reopens}
                                                            </span>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* --- ABA 3: TIME & PERFORMANCE --- */}
                        <Tab.Panel className="space-y-8 animate-fade-in-up focus:outline-none">
                            {/* Capacidade e Charts */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fade-in-up animation-delay-100 opacity-0">
                                {capacityData && <TeamCapacityWidget data={capacityData} />}

                                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                        Performance do Time
                                        <InfoTooltip text="Comparativo: Entregas (Verde) vs WIP (Roxo)" />
                                    </h3>
                                    <div className="h-[400px]">
                                        <Chart type='bar' data={performanceChartData} options={{ ...chartOptions, indexAxis: 'y' as const }} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in-up animation-delay-200 opacity-0">
                                {/* Top Performers List */}
                                <div className="xl:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            🏆 Ranking (Top 6)
                                        </h3>
                                    </div>
                                    <div className="overflow-auto flex-1 p-4 space-y-2">
                                        {safePerformanceData.slice(0, 6).map((p, idx) => (
                                            <div key={p.implantador} className="flex items-center justify-between p-4 bg-white dark:bg-slate-700/20 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm shadow-sm ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'}`}>
                                                        #{idx + 1}
                                                    </div>
                                                    <div>
                                                        <button onClick={() => setSelectedImplantador(p.implantador)} className="font-bold text-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:underline transition-colors text-left">
                                                            {p.implantador}
                                                        </button>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] font-bold text-slate-400">PONTOS:</span>
                                                                <span className="text-xs font-bold text-indigo-600">{p.points}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] font-bold text-slate-400">SCORE:</span>
                                                                <span className="text-xs font-bold text-emerald-600">{p.score}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-slate-800 dark:text-white">{p.done}</p>
                                                    <p className="text-[10px] font-bold text-emerald-500">{p.otd_percentage}% OTD</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Histórico de Pontos */}
                                <div className="xl:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                        🏆 Pontuação Entregue por Mês
                                        <InfoTooltip text="Volume real de trabalho entregue (ponderado)." />
                                    </h3>
                                    <div className="h-[350px]">
                                        <Chart type='bar' data={pointsChartData} options={chartOptions} />
                                    </div>
                                </div>
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>

            {selectedImplantador && (
                <PerformanceDetailModal
                    implantadorName={selectedImplantador}
                    onClose={() => setSelectedImplantador(null)}
                />
            )}
        </div>
    );
}
