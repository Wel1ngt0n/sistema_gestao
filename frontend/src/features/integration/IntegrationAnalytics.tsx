// UX Audit: placeholder aria-label
import { useState, Fragment, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Skeleton } from '../../components/ui/Skeleton';
import { api } from '../../services/api';
import { IntegrationTeamMatrix } from './components/IntegrationTeamMatrix';
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
    Filler,
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
    Filler
);

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

// Inline Generic KPI Card for Integration
const KPICard = ({ label, value, color, icon, subtext, tooltip }: any) => {
    const bgColors: any = {
        orange: 'bg-orange-500',
        green: 'bg-emerald-500',
        blue: 'bg-blue-500',
        amber: 'bg-amber-500',
        yellow: 'bg-amber-500',
        slate: 'bg-slate-500',
        red: 'bg-rose-500'
    };

    const textColors: any = {
        orange: 'text-orange-600',
        green: 'text-emerald-600',
        blue: 'text-blue-600',
        amber: 'text-amber-600',
        yellow: 'text-amber-600',
        slate: 'text-slate-600',
        red: 'text-rose-600'
    };

    return (
        <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-xl transition-transform group-hover:scale-150 ${bgColors[color]}`}></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{icon}</span>
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{label}</h3>
                </div>
                {tooltip && (
                    <div className="text-zinc-300 cursor-help" title={tooltip}>
                        ℹ️
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <div className={`text-4xl font-extrabold tracking-tight mb-2 ${textColors[color]}`}>
                    {value}
                </div>
                {subtext && <p className="text-xs font-medium text-zinc-500">{subtext}</p>}
            </div>
        </div>
    );
};

export default function IntegrationAnalytics() {
    const [loading, setLoading] = useState(true);
    const [dashData, setDashData] = useState<any>(null);
    const [trendData, setTrendData] = useState<any[]>([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const [dashRes, trendsRes] = await Promise.all([
                    api.get('/api/integration/dashboard'),
                    api.get('/api/integration/analytics/trends?months=6')
                ]);

                setDashData(dashRes.data);
                setTrendData(trendsRes.data || []);
            } catch (error) {
                console.error("Erro ao carregar analytics da integração", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="w-full">
                <div className="p-6 lg:p-10 space-y-10 w-full max-w-[1920px] mx-auto">
                    <div>
                        <Skeleton width={180} height={24} className="mb-5" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {Array(8).fill(0).map((_, i) => (
                                <Skeleton key={i} height={120} className="rounded-3xl" />
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <Skeleton height={400} className="rounded-3xl" />
                        <Skeleton height={400} className="rounded-3xl" />
                    </div>
                </div>
            </div>
        );
    }

    const integrations = dashData?.integrations || [];
    const kpisRaw = dashData?.kpis || {};

    // Synthesize KPI Data
    const activeIntegrations = integrations.filter((i: any) => i.status !== 'CONCLUÍDO');
    const pointsTotal = activeIntegrations.reduce((acc: number, val: any) => acc + (val.points || 0), 0);
    const riskTotal = integrations.filter((i: any) => i.churn_risk).length;

    const kpis = {
        wip: activeIntegrations.length,
        done_total: kpisRaw.done_total || 0,
        pct_prazo: kpisRaw.sla_pct || 0,
        quality_pct: kpisRaw.quality_pct || 0,
        volume_points: kpisRaw.volume_points || pointsTotal,
        risk_count: riskTotal
    };

    const trendLabels = trendData.map((d: any) => d.month);

    // Chart Configuration Options
    const chartOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            y: {
                grid: { color: 'rgba(161, 161, 170, 0.1)' },
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
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(24, 24, 27, 0.9)',
                titleColor: '#fff',
                bodyColor: '#e4e4e7',
                padding: 12,
                cornerRadius: 12,
                displayColors: true,
                titleFont: { family: 'Inter', size: 13, weight: 'bold' },
                bodyFont: { family: 'Inter', size: 12 },
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
            }
        },
        layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
    };

    // Chart 1: Throughput and Bugs
    const throughputChartData = {
        labels: trendLabels,
        datasets: [
            {
                type: 'bar' as const,
                label: 'Lojas Integradas',
                data: trendData.map((d: any) => d.done_count),
                backgroundColor: '#f97316', // Orange-500
                hoverBackgroundColor: '#ea580c',
                borderRadius: 6,
                barPercentage: 0.6,
                categoryPercentage: 0.8,
            },
            {
                type: 'line' as const,
                label: 'Volume de Bugs',
                data: trendData.map((d: any) => d.bugs_count),
                borderColor: '#ef4444', // Red-500
                backgroundColor: '#ef4444',
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                borderWidth: 3,
                tension: 0.4,
                yAxisID: 'y1'
            }
        ],
    };

    // Chart 2: Cycle Time / Lead Time
    const efficiencyChartData = {
        labels: trendLabels,
        datasets: [
            {
                type: 'line' as const,
                label: 'Lead Time Médio (dias)',
                data: trendData.map((d: any) => d.avg_lead_time),
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
                borderWidth: 3,
                tension: 0.4,
                fill: true,
            }
        ],
    };

    return (
        <div className="min-h-screen w-full text-zinc-900 p-0 font-sans selection:bg-orange-500/30 selection:text-orange-500 animate-in fade-in duration-700 transition-colors duration-300">
            {/* Header: Nexus Style */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-end">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
                        Analytics de Integração
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm tracking-wide mt-1 uppercase">
                        Deep Dive Operacional & Qualidade
                    </p>
                </div>
            </header>

            <Tab.Group>
                <Tab.List className="flex space-x-2 rounded-full bg-zinc-200/50/50 p-1.5 mb-10 max-w-fit mx-auto md:mx-0 border border-zinc-200 backdrop-blur-sm sticky top-5 z-20 shadow-lg shadow-black/5">
                    {['Visão Geral', 'Eficiência', 'Time & Performance'].map((tabName) => (
                        <Tab as={Fragment} key={tabName}>
                            {({ selected }) => (
                                <button
                                    className={classNames(
                                        'rounded-full px-6 py-2.5 text-sm font-bold tracking-wide transition-all duration-300 ease-out',
                                        'focus:outline-none focus:ring-2 focus:ring-orange-500/20',
                                        selected
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                                            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50'
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up animation-delay-100">
                            <KPICard label="WIP (Integrações Ativas)" value={kpis.wip} color="orange" icon="🚀" subtext="Lojas sendo integradas" />
                            <KPICard label="SLA (No Prazo)" value={`${kpis.pct_prazo}%`} color={kpis.pct_prazo >= 90 ? 'green' : 'red'} icon="✅" subtext="Integrações em dias" />
                            <KPICard label="Qualidade" value={`${kpis.quality_pct}%`} color="blue" icon="💎" subtext="Sem bugs pós go-live" />
                            <KPICard label="Volume de Pontos" value={kpis.volume_points} color="amber" icon="🏅" subtext="Complexidade em andamento" />
                            <KPICard label="Risco de Churn" value={kpis.risk_count} color="red" icon="⚠️" subtext="Integrações com alerta" />
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fade-in-up animation-delay-200">
                            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow duration-300 xl:col-span-2">
                                <h3 className="text-xl font-bold text-zinc-800 mb-6 flex items-center gap-2">
                                    Evolução Mensal (Integração vs Bugs)
                                </h3>
                                <div className="h-[350px]">
                                    <Chart
                                        type='bar'
                                        data={throughputChartData}
                                        options={{
                                            ...chartOptions,
                                            scales: {
                                                ...chartOptions.scales,
                                                y1: {
                                                    type: 'linear',
                                                    display: true,
                                                    position: 'right',
                                                    grid: { drawOnChartArea: false },
                                                    ticks: { color: '#ef4444' }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </Tab.Panel>

                    {/* --- ABA 2: EFICIÊNCIA --- */}
                    <Tab.Panel className="space-y-8 animate-fade-in-up focus:outline-none">
                        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm h-full hover:shadow-md transition-shadow duration-300">
                            <h3 className="text-xl font-bold text-zinc-800 mb-6 flex items-center gap-2">
                                Lead Time de Integração
                            </h3>
                            <div className="h-[400px]">
                                <Chart
                                    type='line'
                                    data={efficiencyChartData}
                                    options={chartOptions}
                                />
                            </div>
                        </div>
                    </Tab.Panel>

                    {/* --- ABA 3: TIME & PERFORMANCE --- */}
                    <Tab.Panel className="space-y-8 animate-fade-in-up focus:outline-none">
                        <div className="space-y-8 animate-fade-in-up duration-300">
                            <IntegrationTeamMatrix integrations={integrations} />
                        </div>
                    </Tab.Panel>
                </Tab.Panels>
            </Tab.Group>
        </div>
    );
}
