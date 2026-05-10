import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { AlertTriangle, CheckCircle2, Network, ShieldCheck, Target, Trophy } from 'lucide-react';
import logo from '../../assets/logo.png';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const BRAND_ORANGE = '#ff7900';
const BRAND_GREEN = '#128131';

const MetricCard = ({
    label,
    value,
    helper,
    accent = BRAND_ORANGE,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    helper: string;
    accent?: string;
    icon: any;
}) => (
    <div className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ backgroundColor: accent }} />
        <div className="mb-5 flex items-start justify-between gap-4">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{value}</p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 transition-colors duration-200 group-hover:bg-white" style={{ color: accent }}>
                <Icon size={18} strokeWidth={2} />
            </div>
        </div>
        <div className="h-1 w-full rounded-full bg-zinc-100">
            <div className="h-1 rounded-full" style={{ width: '42%', backgroundColor: accent }} />
        </div>
        <p className="mt-3 text-sm text-zinc-500">{helper}</p>
    </div>
);

const SectionCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
        <div className="mb-5 flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
            {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {children}
    </section>
);

export default function IntegrationDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [dashRes, trendsRes] = await Promise.all([
                    api.get('/api/integration/dashboard'),
                    api.get('/api/integration/analytics/trends?months=6')
                ]);

                const integrations = dashRes.data.integrations || [];
                const kpisRaw = dashRes.data.kpis || {};
                const trends = trendsRes.data || [];

                const activeIntegrations = integrations.filter((i: any) => i.status !== 'CONCLUÍDO');
                const doneIntegrations = integrations.filter((i: any) => i.status === 'CONCLUÍDO');

                const kpis = {
                    wip: activeIntegrations.length,
                    done_total: doneIntegrations.length,
                    pct_prazo: kpisRaw.sla_pct || 0,
                    quality_pct: kpisRaw.quality_pct || 0,
                    volume_points: kpisRaw.volume_points || 0
                };

                const evo_labels = trends.map((t: any) => t.month);
                const evo_values = trends.map((t: any) => t.done_count);

                const loadMap: Record<string, number> = {};
                activeIntegrations.forEach((i: any) => {
                    const dev = i.assignee || 'Não atribuído';
                    loadMap[dev] = (loadMap[dev] || 0) + 1;
                });
                const impl_labels = Object.keys(loadMap);
                const impl_values = Object.values(loadMap);

                const risk_stores = integrations
                    .filter((i: any) => i.churn_risk || i.post_go_live_bugs > 0)
                    .map((i: any) => ({
                        id: i.id,
                        name: i.store_name,
                        implantador: i.assignee || 'N/A',
                        score: i.churn_risk ? 'CHURN' : `${i.post_go_live_bugs} BUGS`
                    }));

                const rankMap: Record<string, number> = {};
                doneIntegrations.forEach((i: any) => {
                    if (i.assignee) {
                        rankMap[i.assignee] = (rankMap[i.assignee] || 0) + 1;
                    }
                });
                const rankings = Object.entries(rankMap)
                    .map(([implantador, done]) => ({ implantador, done, score: done * 10 }))
                    .sort((a, b) => b.done - a.done);

                setData({
                    kpis,
                    charts: { evo_labels, evo_values, impl_labels, impl_values },
                    risk_stores,
                    rankings
                });

                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-10 w-10 rounded-full border-2 border-zinc-200 border-t-[#ff7900] animate-spin" />
        </div>
    );

    if (!data) return (
        <div className="min-h-screen p-8 text-sm font-medium text-red-600">
            Erro ao carregar dados.
        </div>
    );

    const { kpis = {}, charts = {}, risk_stores = [], rankings = [] } = data;

    const barData = {
        labels: charts?.impl_labels || [],
        datasets: [{
            label: 'Tickets em andamento',
            data: charts?.impl_values || [],
            backgroundColor: BRAND_ORANGE,
            hoverBackgroundColor: '#e86f00',
            borderRadius: 4,
            borderSkipped: false,
            categoryPercentage: 0.55,
            barPercentage: 0.85,
        }],
    };

    const lineData = {
        labels: charts?.evo_labels || [],
        datasets: [{
            label: 'Entregas de integração',
            data: charts?.evo_values || [],
            borderColor: BRAND_GREEN,
            backgroundColor: 'rgba(18, 129, 49, 0.08)',
            tension: 0.35,
            fill: true,
            pointBackgroundColor: BRAND_GREEN,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#18181b',
                titleColor: '#fff',
                bodyColor: '#d4d4d8',
                padding: 12,
                borderColor: '#27272a',
                borderWidth: 1,
                cornerRadius: 6,
                titleFont: { size: 13, weight: '600' as const },
            }
        },
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
        layout: {
            padding: { top: 8, right: 8, bottom: 0, left: 0 },
        },
        scales: {
            y: {
                grid: { color: 'rgba(100, 116, 139, 0.12)', drawTicks: false },
                ticks: { color: '#71717a' },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#71717a', maxRotation: 0, autoSkip: true },
                border: { display: false }
            }
        },
    };

    return (
        <div className="w-full text-zinc-950">
            <div className="space-y-6">
                <header className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                                <img src={logo} alt="Instabuy" className="h-7 w-auto object-contain" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Integração</p>
                                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
                                    Dashboard operacional
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                                    Visão de tickets, SLA, qualidade e riscos da esteira de integrações.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BRAND_GREEN }} />
                            Atualizado em tempo real
                        </div>
                    </div>
                    <div className="mt-5 h-1 w-24 rounded-full" style={{ backgroundColor: BRAND_ORANGE }} />
                </header>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Em andamento"
                        value={kpis.wip || 0}
                        helper="Tickets ativos na esteira"
                        accent={BRAND_ORANGE}
                        icon={Network}
                    />
                    <MetricCard
                        label="Entregas"
                        value={kpis.done_total || 0}
                        helper={`${kpis.pct_prazo || 0}% dentro do SLA`}
                        accent={BRAND_GREEN}
                        icon={CheckCircle2}
                    />
                    <MetricCard
                        label="Qualidade"
                        value={`${kpis.quality_pct || 0}%`}
                        helper={kpis.quality_pct >= 90 ? 'Estabilidade excelente' : 'Acompanhar pontos de atenção'}
                        accent={BRAND_GREEN}
                        icon={ShieldCheck}
                    />
                    <MetricCard
                        label="Volumetria"
                        value={`${kpis.volume_points || 0} pts`}
                        helper="Carga ponderada do período"
                        accent={BRAND_ORANGE}
                        icon={Target}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    <div className="xl:col-span-8">
                        <SectionCard title="Distribuição de carga" subtitle="Tickets em andamento por responsável">
                            <div className="h-[300px]">
                                <Chart type="bar" data={barData} options={chartOptions} />
                            </div>
                        </SectionCard>
                    </div>

                    <div className="xl:col-span-4">
                        <SectionCard title="Evolução mensal" subtitle="Entregas de integração nos últimos meses">
                            <div className="h-[300px]">
                                <Chart type="line" data={lineData} options={chartOptions} />
                            </div>
                        </SectionCard>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md xl:col-span-6">
                        <div className="flex items-center justify-between border-b border-zinc-100 p-5">
                            <div>
                                <h2 className="text-sm font-semibold text-zinc-950">Risco operacional</h2>
                                <p className="mt-1 text-sm text-zinc-500">Churn e bugs pós go-live</p>
                            </div>
                            <AlertTriangle size={18} className="text-[#ff7900]" />
                        </div>
                        <div className="max-h-[360px] overflow-y-auto p-3">
                            {risk_stores.length > 0 ? risk_stores.map((s: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between gap-4 rounded-md border-b border-zinc-100 px-2 py-3 transition-colors last:border-b-0 hover:bg-zinc-50">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-zinc-900">{s.name}</p>
                                        <p className="mt-1 truncate text-xs text-zinc-500">{s.implantador || 'Sem responsável'}</p>
                                    </div>
                                    <span className="rounded-md bg-orange-50 px-2.5 py-1 text-sm font-semibold text-orange-700">
                                        {s.score}
                                    </span>
                                </div>
                            )) : (
                                <div className="flex h-44 items-center justify-center text-sm text-zinc-500">
                                    Nenhum risco crítico encontrado.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md xl:col-span-6">
                        <div className="flex items-center justify-between border-b border-zinc-100 p-5">
                            <div>
                                <h2 className="text-sm font-semibold text-zinc-950">Ranking do time</h2>
                                <p className="mt-1 text-sm text-zinc-500">Entregas por responsável</p>
                            </div>
                            <Trophy size={18} className="text-[#128131]" />
                        </div>
                        <div className="max-h-[360px] overflow-y-auto p-3">
                            {rankings.slice(0, 6).map((r: any, i: number) => (
                                <div key={i} className="flex items-center justify-between gap-4 rounded-md border-b border-zinc-100 px-2 py-3 transition-colors last:border-b-0 hover:bg-zinc-50">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-700">
                                            {i + 1}
                                        </span>
                                        <p className="truncate text-sm font-medium text-zinc-900">{r.implantador}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-zinc-700">{r.done} entregas</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
