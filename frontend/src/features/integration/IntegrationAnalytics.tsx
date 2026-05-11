// UX Audit: placeholder aria-label
import { useState, Fragment, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Skeleton } from '../../components/ui/Skeleton';
import { api } from '../../services/api';
import { IntegrationTeamMatrix } from './components/IntegrationTeamMatrix';
import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Clock3,
    LayoutDashboard,
    ShieldCheck,
    Trophy,
} from 'lucide-react';
import logo from '../../assets/logo.png';
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

const KPICard = ({ label, value, color, icon, subtext, tooltip }: any) => {
    const Icon = icon;

    const textColors: any = {
        orange: 'text-[#ff7900]',
        green: 'text-emerald-600',
        blue: 'text-blue-600',
        amber: 'text-amber-600',
        yellow: 'text-amber-600',
        slate: 'text-slate-600',
        red: 'text-rose-600'
    };

    const accentColors: any = {
        orange: 'bg-[#ff7900]',
        green: 'bg-emerald-600',
        blue: 'bg-blue-600',
        amber: 'bg-amber-500',
        yellow: 'bg-amber-500',
        slate: 'bg-slate-600',
        red: 'bg-rose-600'
    };

    return (
        <div className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg">
            <div className={`absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${accentColors[color]}`} />

            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</h3>
                    <div className={`mt-2 text-3xl font-semibold tracking-tight ${textColors[color]}`}>
                        {value}
                    </div>
                </div>
                <div className={`rounded-md border border-zinc-200 bg-zinc-50 p-2 transition-colors duration-200 group-hover:bg-white ${textColors[color]}`}>
                    <Icon size={18} strokeWidth={2} />
                </div>
                {tooltip && (
                    <span className="sr-only">{tooltip}</span>
                )}
            </div>

            <div className="h-1 w-full rounded-full bg-zinc-100">
                <div className={`h-1 w-2/5 rounded-full ${accentColors[color]}`} />
            </div>
            {subtext && <p className="mt-3 text-sm text-zinc-500">{subtext}</p>}
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
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {Array(8).fill(0).map((_, i) => (
                                <Skeleton key={i} height={120} className="rounded-lg" />
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <Skeleton height={400} className="rounded-lg" />
                        <Skeleton height={400} className="rounded-lg" />
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
        <div className="w-full space-y-6 text-zinc-950">
            <header className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                            <img src={logo} alt="Instabuy" className="h-7 w-auto object-contain" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Integração</p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
                                Analytics operacional
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                                Deep dive de SLA, qualidade, bugs, riscos e performance do time.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
                        <span className="h-2 w-2 rounded-full bg-[#128131]" />
                        Atualizado em tempo real
                    </div>
                </div>
                <div className="mt-5 h-1 w-24 rounded-full bg-[#ff7900]" />
            </header>

            <Tab.Group>
                <Tab.List className="sticky top-5 z-20 mb-6 flex max-w-fit gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
                    {['Visão Geral', 'Eficiência', 'Time & Performance'].map((tabName) => (
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
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-up animation-delay-100">
                            <KPICard label="WIP (Integrações Ativas)" value={kpis.wip} color="orange" icon={LayoutDashboard} subtext="Lojas sendo integradas" />
                            <KPICard label="SLA (No Prazo)" value={`${kpis.pct_prazo}%`} color={kpis.pct_prazo >= 90 ? 'green' : 'red'} icon={CheckCircle2} subtext="Integrações em dias" />
                            <KPICard label="Qualidade" value={`${kpis.quality_pct}%`} color="blue" icon={ShieldCheck} subtext="Sem bugs pós go-live" />
                            <KPICard label="Volume de Pontos" value={kpis.volume_points} color="amber" icon={Trophy} subtext="Complexidade em andamento" />
                            <KPICard label="Risco de Churn" value={kpis.risk_count} color="red" icon={AlertTriangle} subtext="Integrações com alerta" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 animate-fade-in-up animation-delay-200">
                            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md xl:col-span-2">
                                <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                    <BarChart3 size={16} className="text-[#ff7900]" />
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
                        <div className="h-full rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                            <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                <Clock3 size={16} className="text-[#128131]" />
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
