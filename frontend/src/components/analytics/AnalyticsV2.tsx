import { useState, useMemo, Fragment } from 'react';
import { Tab } from '@headlessui/react';
import PerformanceDetailModal from './PerformanceDetailModal';
import { useDashboardUrlParams } from '../../hooks/useDashboardUrlParams';
import { AnalyticsFilters } from './AnalyticsFilters';
import { useAnalyticsData } from './useAnalyticsData';
import { KPICard } from './KPICard';
import { TeamCapacityWidget } from './TeamCapacityWidget';
import { EfficiencyImplantadorCard } from './EfficiencyImplantadorCard';
import { TeamPerformanceMatrix } from './TeamPerformanceMatrix';
import { AnalyticsOverviewPage } from './AnalyticsOverviewPage';
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
    PieController
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { Zap, Trophy, AlertTriangle } from 'lucide-react';

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

export default function AnalyticsV2() {
    const { filters } = useDashboardUrlParams();
    const { kpiData, trendData, performanceData, bottleneckData, capacityData, forecastData, loading, refetch } = useAnalyticsData(filters);
    const [performanceViewMode, setPerformanceViewMode] = useState<'cards' | 'matrix'>('matrix');
    const [selectedImplantador, setSelectedImplantador] = useState<string | null>(null);

    // Busca a meta anual de lojas e calcula a meta mensal semestral
    // Logica: meta semestral = annual / 2 → meta mensal = semestral / 6
    const [monthlyGoal, setMonthlyGoal] = useState<number>(15);
    useMemo(() => {
        import('../../services/api').then(({ api }) => {
            api.get('/api/config').then((res: any) => {
                const goals: any[] = res.data?.goals || [];
                const found = goals.find((g: any) => g.key === 'annual_stores_target');
                if (found) {
                    const annual = parseInt(found.value, 10) || 180;
                    setMonthlyGoal(Math.round((annual / 2) / 6));
                }
            }).catch(() => { });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Preparar dados dos gráficos
    const safePerformanceData = Array.isArray(performanceData) ? performanceData : [];

    const availableImplantadores = useMemo(() => {
        return safePerformanceData.map(p => p.implantador).sort();
    }, [safePerformanceData]);

    if (loading && !kpiData) {
        return (
            <div className="w-full min-h-screen bg-slate-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 dark:text-zinc-500 font-mono text-sm animate-pulse">Carregando Analytics...</p>
                </div>
            </div>
        );
    }

    // Regra global: considera apenas dados a partir de 01/01/2026
    const ANALYTICS_START = '2026-01';
    const safeTrendData = (Array.isArray(trendData) ? trendData : []).filter(d => d.month >= ANALYTICS_START);
    const trendLabels = safeTrendData.map(d => d.month);

    // Configuração de Gráficos (Estilo Dashboard V2)
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                grid: { color: 'rgba(128, 128, 128, 0.1)' },
                ticks: { color: '#9ca3af' }, // gray-400
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#9ca3af' }
            }
        },
        plugins: {
            legend: {
                labels: { color: '#9ca3af' },
                display: false
            },
            tooltip: {
                backgroundColor: '#18181b',
                titleColor: '#fff',
                bodyColor: '#a1a1aa',
                padding: 12,
                borderColor: '#27272a',
                borderWidth: 1,
                cornerRadius: 8,
                titleFont: { size: 13, weight: 'bold' },
            }
        },
        maxBarThickness: 40,
        animation: {
            duration: 1000,
            easing: 'easeOutQuart' as const,
        },
    };

    // throughputChartData moved to AnalyticsOverviewPage

    // Gráfico 1.5: Pontuação Mensal
    const pointsChartData = {
        labels: trendLabels,
        datasets: [
            {
                label: 'Pontos Entregues',
                data: safeTrendData.map(d => d.total_points),
                backgroundColor: '#8b5cf6', // Violet-500
                hoverBackgroundColor: '#a78bfa',
                borderRadius: 8,
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
                borderColor: '#f59e0b', // Amber-500
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#fff',
                yAxisID: 'y',
            },
            {
                type: 'bar' as const,
                label: 'OTD %',
                data: safeTrendData.map(d => d.otd_percentage),
                backgroundColor: '#10b981', // Emerald-500
                borderRadius: 8,
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
                backgroundColor: '#10b981', // Emerald-500
                borderRadius: 6,
            },
            {
                label: 'Em Progresso (WIP)',
                data: safePerformanceData.map(p => p.wip),
                backgroundColor: '#f97316', // Orange-500
                borderRadius: 6,
            },
        ],
    };

    // getTrendProps moved to AnalyticsOverviewPage

    return (
        <div className="min-h-screen w-full bg-[#f7f7f8] dark:bg-zinc-900 font-sans selection:bg-orange-500/30 selection:text-orange-500 transition-colors duration-300">

            {/* Header Sticky */}
            <div className="sticky top-0 z-30 bg-[#f7f7f8]/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800">
                <div className="w-full px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1400px]">
                    <div>
                        <h1 className="text-[24px] font-bold tracking-tight text-[#111827] dark:text-white">
                            Sistema de Gestão de Operações
                        </h1>
                        <p className="text-[#6b7280] dark:text-zinc-400 text-[14px]">
                            Deep Dive Operacional & Performance
                        </p>
                    </div>
                    <div className="flex-none flex items-center gap-4">
                        <AnalyticsFilters
                            availableImplantadores={availableImplantadores}
                            onRefresh={refetch}
                            isRefreshing={loading}
                        />
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-2 hidden md:block"></div>
                        <div className="hidden md:flex items-center bg-white dark:bg-zinc-800 rounded-[14px] px-3 py-1.5 shadow-sm border border-slate-100 dark:border-zinc-700">
                            <img src="https://ui-avatars.com/api/?name=Administrador&background=ff6c00&color=fff" alt="Administrador" className="w-6 h-6 rounded-full" />
                            <span className="ml-2 text-[13px] font-semibold text-slate-700 dark:text-zinc-300">Administrador</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full px-6 lg:px-8 py-8">
                <Tab.Group>
                    <Tab.List className="flex space-x-1 rounded-full bg-slate-100 dark:bg-zinc-800 p-1 mb-8 max-w-fit mx-auto md:mx-0">
                        {['Visão Geral', 'Eficiência & Risco', 'Time & Performance'].map((tab) => (
                            <Tab as={Fragment} key={tab}>
                                {({ selected }: { selected: boolean }) => (
                                    <button
                                        className={classNames(
                                            'rounded-full px-6 py-2.5 text-[13.5px] font-bold transition-all duration-200 outline-none',
                                            selected
                                                ? 'bg-white dark:bg-zinc-700 text-[#ff6c00] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
                                        )}
                                    >
                                        {tab}
                                    </button>
                                )}
                            </Tab>
                        ))}
                    </Tab.List>

                    <Tab.Panels>
                        {/* --- ABA 1: VISÃO GERAL --- */}
                        <Tab.Panel className="focus:outline-none">
                            <AnalyticsOverviewPage
                                kpiData={kpiData}
                                trendData={safeTrendData}
                                forecastData={forecastData || null}
                                bottleneckData={bottleneckData || []}
                                performanceData={performanceData || []}
                                monthlyGoal={monthlyGoal}
                            />
                        </Tab.Panel>

                        {/* --- ABA 2: EFICIÊNCIA & RISCO --- */}
                        <Tab.Panel className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 focus:outline-none">
                            {kpiData && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <KPICard label="OTD %" value={`${kpiData?.otd_percentage || 0}%`} color={(kpiData?.otd_percentage || 0) >= 80 ? 'green' : 'red'} icon="🎯" subtext="No Prazo" className="bg-white dark:bg-zinc-800 rounded-3xl" />
                                    <KPICard label="Risco Médio" value={kpiData?.avg_risk_score} color="red" icon="🔥" subtext="Score Preditivo" className="bg-white dark:bg-zinc-800 rounded-3xl" />
                                    <KPICard label="Estagnadas" value={kpiData?.idle_stores_count} color="orange" icon="⚠️" subtext="> 5 dias" className="bg-white dark:bg-zinc-800 rounded-3xl" />
                                    <KPICard label="Mix M/F" value={`${kpiData?.matrix_count}/${kpiData?.filial_count}`} color="slate" icon="🏢" subtext="Matriz vs Filial" className="bg-white dark:bg-zinc-800 rounded-3xl" />
                                </div>
                            )}

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* NOVO: Gráfico de Eficiência comparando Implantadores */}
                                <EfficiencyImplantadorCard data={performanceData || []} />

                                {/* Gráfico Histórico de Eficiência Geral */}
                                <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm h-full max-h-[500px]">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-sm opacity-80">
                                        <Zap size={18} className="text-yellow-500" />
                                        Evolução (Cycle Time vs OTD)
                                    </h3>
                                    <div className="h-[350px]">
                                        <Chart
                                            type='line'
                                            data={efficiencyChartData}
                                            options={{
                                                ...chartOptions,
                                                scales: {
                                                    y: { ...chartOptions.scales.y, position: 'left' },
                                                    y1: { ...chartOptions.scales.y, position: 'right', grid: { display: false } }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Gargalos */}
                            <div className="bg-white dark:bg-zinc-800 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-100 dark:border-zinc-700/50">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide text-sm opacity-80">
                                        <AlertTriangle size={18} className="text-red-500" />
                                        Gargalos de Processo
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-zinc-900/50 text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-8 py-4">Etapa</th>
                                                <th className="px-8 py-4">Tempo Acumulado</th>
                                                <th className="px-8 py-4">Média / Loja</th>
                                                <th className="px-8 py-4 text-center">Retrabalhos</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-700/50">
                                            {(Array.isArray(bottleneckData) ? bottleneckData : []).slice(0, 8).map((b, i) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-zinc-700/20 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <p className="font-bold text-slate-700 dark:text-zinc-200 text-sm">{b.step_name}</p>
                                                        <div className="w-full bg-slate-100 dark:bg-zinc-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${Math.min(100, (b.avg_days / 15) * 100)}%` }}></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-slate-600 dark:text-zinc-400 text-sm font-mono">{b.total_days}d</td>
                                                    <td className="px-8 py-5 text-sm font-bold text-slate-800 dark:text-white">{b.avg_days}d</td>
                                                    <td className="px-8 py-5 text-center">
                                                        {b.reopens > 0 ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400">
                                                                {b.reopens}
                                                            </span>
                                                        ) : <span className="text-slate-300 dark:text-zinc-600">-</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Tab.Panel>



                        {/* --- ABA 3: TIME & PERFORMANCE --- */}
                        <Tab.Panel className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 focus:outline-none">

                            {/* View Switcher Controls */}
                            <div className="flex justify-end mb-4">
                                <div className="bg-slate-200 dark:bg-zinc-800 p-1 rounded-lg flex items-center gap-1">
                                    <button
                                        onClick={() => setPerformanceViewMode('cards')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${performanceViewMode === 'cards'
                                            ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'
                                            }`}
                                    >
                                        🧩 Cards
                                    </button>
                                    <button
                                        onClick={() => setPerformanceViewMode('matrix')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${performanceViewMode === 'matrix'
                                            ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'
                                            }`}
                                    >
                                        📅 Matriz
                                    </button>
                                </div>
                            </div>

                            {performanceViewMode === 'cards' ? (
                                <>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                        {capacityData && <TeamCapacityWidget data={capacityData} className="bg-white dark:bg-zinc-800 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm" />}

                                        <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-sm opacity-80">
                                                <Trophy size={18} className="text-yellow-500" />
                                                Performance do Time
                                            </h3>
                                            <div className="h-[400px]">
                                                <Chart type='bar' data={performanceChartData} options={{ ...chartOptions, indexAxis: 'y' as const }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                        <div className="xl:col-span-1 bg-white dark:bg-zinc-800 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm flex flex-col overflow-hidden">
                                            <div className="p-6 border-b border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-zinc-900/30">
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                                                    🏆 Top Ranking
                                                </h3>
                                            </div>
                                            <div className="overflow-auto flex-1 p-4 space-y-2 custom-scrollbar">
                                                {safePerformanceData.slice(0, 6).map((p, idx) => (
                                                    <div key={p.implantador} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-700/20 border border-slate-100 dark:border-zinc-700/30 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-700/40 transition-all cursor-pointer group" onClick={() => setSelectedImplantador(p.implantador)}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`flex items-center justify-center w-8 h-8 rounded-xl font-bold text-sm shadow-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500 dark:text-black' : 'bg-slate-200 text-slate-600 dark:bg-zinc-600 dark:text-zinc-300'}`}>
                                                                #{idx + 1}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm text-slate-700 dark:text-zinc-200 group-hover:text-orange-500 transition-colors">
                                                                    {p.implantador}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
                                                                    <span>Score: <b className="text-emerald-500">{p.score.toFixed(1)}</b></span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-black text-slate-800 dark:text-white">{p.done}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="xl:col-span-2 bg-white dark:bg-zinc-800 p-8 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-sm opacity-80">
                                                Histórico de Pontuação
                                            </h3>
                                            <div className="h-[350px]">
                                                <Chart type='bar' data={pointsChartData} options={chartOptions} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    {capacityData && safePerformanceData && (
                                        <TeamPerformanceMatrix
                                            capacityData={capacityData}
                                            performanceData={safePerformanceData}
                                        />
                                    )}
                                </div>
                            )}
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>

            {selectedImplantador && (
                <PerformanceDetailModal
                    implantadorName={selectedImplantador!}
                    onClose={() => setSelectedImplantador(null)}
                />
            )}
        </div>
    );
}
