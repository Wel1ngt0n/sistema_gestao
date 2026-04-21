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
import { Target, Trophy, AlertTriangle, ArrowRight, TrendingUp, CheckCircle } from 'lucide-react';

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

                // Synthesize Data
                const activeIntegrations = integrations.filter((i: any) => i.status !== 'CONCLUÍDO');
                const doneIntegrations = integrations.filter((i: any) => i.status === 'CONCLUÍDO');

                const kpis = {
                    wip: activeIntegrations.length,
                    done_total: doneIntegrations.length,
                    pct_prazo: kpisRaw.sla_pct || 0,
                    quality_pct: kpisRaw.quality_pct || 0,
                    volume_points: kpisRaw.volume_points || 0
                };

                // Charts: Evolution (Trends)
                const evo_labels = trends.map((t: any) => t.month);
                const evo_values = trends.map((t: any) => t.done_count);

                // Charts: Load Distribution (Active integrations per assignee)
                const loadMap: Record<string, number> = {};
                activeIntegrations.forEach((i: any) => {
                    const dev = i.assignee || 'Não Atribuído';
                    loadMap[dev] = (loadMap[dev] || 0) + 1;
                });
                const impl_labels = Object.keys(loadMap);
                const impl_values = Object.values(loadMap);

                // Risk Stores (Churn Risk or Bugs)
                const risk_stores = integrations
                    .filter((i: any) => i.churn_risk || i.post_go_live_bugs > 0)
                    .map((i: any) => ({
                        id: i.id,
                        name: i.store_name,
                        implantador: i.assignee || 'N/A',
                        score: i.churn_risk ? 'CHURN' : `${i.post_go_live_bugs} BUGS`
                    }));

                // Rankings (Top integrators by done)
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
        <div className="flex items-center justify-center h-screen w-full bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        </div>
    );

    if (!data) return <div className="p-10 text-red-500 bg-slate-50 min-h-screen">Erro ao carregar dados.</div>;

    const { kpis = {}, charts = {}, risk_stores = [], rankings = [] } = data;

    // Chart Data
    const barData = {
        labels: charts?.impl_labels || [],
        datasets: [{
            label: 'Tickets em Andamento',
            data: charts?.impl_values || [],
            backgroundColor: '#f97316', // Orange-500
            borderRadius: 8,
            barThickness: 40,
        }],
    };

    const lineData = {
        labels: charts?.evo_labels || [],
        datasets: [{
            label: 'Entregas de Integração',
            data: charts?.evo_values || [],
            borderColor: '#84cc16', // Lime-500
            backgroundColor: 'rgba(132, 204, 22, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#84cc16',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#18181b', // Always dark tooltip for contrast
                titleColor: '#fff',
                bodyColor: '#a1a1aa',
                padding: 12,
                borderColor: '#27272a',
                borderWidth: 1,
                cornerRadius: 8,
                titleFont: { size: 13, weight: 'bold' as const },
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(128, 128, 128, 0.1)' },
                ticks: { color: '#9ca3af' }, // gray-400
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#9ca3af' }, // gray-400
                border: { display: false }
            }
        },
    };

    return (
        <div className="min-h-screen w-full bg-zinc-50#09090b] text-zinc-900 p-0 font-sans selection:bg-orange-500/30 selection:text-orange-500 animate-in fade-in duration-700 transition-colors duration-300">

            {/* Header: Soft Modern Typography */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-end">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
                        Sistema de Gestão de Integrações
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm tracking-wide mt-1 uppercase">
                        Visão Geral de Engenharias
                    </p>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs mt-4 md:mt-0 bg-white px-3 py-1.5 rounded-full shadow-sm border border-zinc-200">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    ONLINE :: {new Date().toLocaleTimeString()}
                </div>
            </header>

            {/* Grid Layout: Bento-Break Style (Soft) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* KPI: WIP (Large Emphasis) */}
                <div className="md:col-span-4 bg-white border border-zinc-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between h-[220px]">
                    <div className="absolute -right-10 -top-10 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity rotate-12">
                        <Target size={180} className="text-zinc-900" />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Em andamento</h3>
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                        </div>
                        <div className="text-6xl font-black text-zinc-900 group-hover:text-orange-500 transition-colors tracking-tighter">
                            {kpis.wip}
                        </div>
                    </div>

                    <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-4 mb-4 overflow-hidden">
                        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                    </div>

                    <div className="inline-flex items-center gap-2 text-sm font-bold text-orange-600">
                        <span>Pipeline ativo</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

                {/* KPI: Done (Efficiency) */}
                <div className="md:col-span-3 bg-white border border-zinc-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[220px] relative overflow-hidden group">
                    <div className="absolute right-0 bottom-0 opacity-[0.03] group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 group-hover:-rotate-12 origin-bottom-right">
                        <Trophy size={140} className="text-zinc-900 translate-y-8 translate-x-4" />
                    </div>

                    <div>
                        <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-wider mb-2">Entregas Totais</h3>
                        <div className="text-6xl font-black text-zinc-900 mb-2 tracking-tighter group-hover:text-lime-500 transition-colors duration-300">
                            {kpis.done_total}
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between text-xs font-medium text-zinc-4000 mb-1.5">
                            <span className="group-hover:text-zinc-600 transition-colors">Meta de Prazo C.</span>
                            <span className={kpis.pct_prazo >= 85 ? 'text-lime-500' : 'text-red-500'}>{kpis.pct_prazo}%</span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-2 rounded-full transition-all duration-1000 ${kpis.pct_prazo >= 85 ? 'bg-lime-500 group-hover:bg-lime-400' : 'bg-red-500 group-hover:bg-red-400'}`}
                                style={{ width: `${Math.min(kpis.pct_prazo, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* KPI: Quality (Integration specific) */}
                <div className="md:col-span-5 bg-gradient-to-br from-zinc-900 to-zinc-800#000] border border-zinc-700 p-8 rounded-3xl shadow-lg relative overflow-hidden text-white flex flex-col justify-between h-[220px] group transition-all hover:scale-[1.01] hover:shadow-xl">
                    <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:24px_24px] group-hover:opacity-20 transition-opacity duration-700"></div>
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-700"></div>

                    <div className="relative z-10 grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-wider mb-1">Quality Score</h3>
                            <div className="text-3xl lg:text-4xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors duration-300">{kpis.quality_pct}%</div>
                        </div>
                        <div className="text-right border-l border-white/10 pl-6 group-hover:border-white/20 transition-colors">
                            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-wider mb-1">Volumetria</h3>
                            <div className="text-xl lg:text-3xl font-bold text-zinc-300 group-hover:text-white transition-colors">{kpis.volume_points} pts</div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <div className="w-full bg-white/5 rounded-xl p-3 flex items-center justify-between backdrop-blur-sm border border-white/5 group-hover:bg-white/10 group-hover:border-white/10 transition-all duration-300">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span className="text-xs text-zinc-300 font-medium group-hover:text-white transition-colors">Taxa de Estabilidade</span>
                            </div>
                            <span className="text-lg font-mono font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">{kpis.quality_pct >= 90 ? 'Excelente' : 'Atenção'}</span>
                        </div>
                    </div>
                </div>

                {/* Chart: Volume */}
                <div className="md:col-span-8 bg-white border border-zinc-200 p-8 rounded-3xl shadow-sm min-h-[380px]">
                    <h3 className="text-zinc-400 font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Target size={16} className="text-orange-500" />
                        Distribuição de Carga
                    </h3>
                    <div className="h-[280px]">
                        <Chart type="bar" data={barData} options={chartOptions as any} />
                    </div>
                </div>

                {/* Chart: Evolution */}
                <div className="md:col-span-4 bg-white border border-zinc-200 p-8 rounded-3xl shadow-sm min-h-[380px]">
                    <h3 className="text-zinc-400 font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <TrendingUp size={16} className="text-lime-500" />
                        Evolução Mensal
                    </h3>
                    <div className="h-[280px]">
                        <Chart type="line" data={lineData} options={chartOptions as any} />
                    </div>
                </div>

                {/* Risk Radar */}
                <div className="md:col-span-6 bg-white border border-zinc-200 p-0 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-6 border-b border-zinc-100 bg-red-50/50">
                        <h3 className="text-red-600 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                            <AlertTriangle size={16} />
                            Risco Operacional (Bugs & Churn)
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {risk_stores.length > 0 ? risk_stores.map((s: any, idx: number) => (
                            <div key={idx} className="p-4 bg-zinc-50/20 border border-zinc-100 rounded-2xl hover:border-red-500/30 transition-colors flex justify-between items-center group">
                                <div className="truncate pr-4">
                                    <div className="font-bold text-sm text-zinc-800 truncate">{s.name}</div>
                                    <div className="text-xs text-zinc-5000 mt-0.5">{s.implantador}</div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`text-sm font-black font-mono ${s.score === 'CHURN' ? 'text-red-600' : 'text-orange-500'}`}>
                                        {s.score}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                                <div className="mb-2 opacity-50"><CheckCircle size={24} className="text-emerald-500" /></div>
                                <div className="text-sm">Nenhum risco crítico encontrado.</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ranking Section */}
                <div className="md:col-span-6 bg-white border border-zinc-200 p-8 rounded-3xl shadow-sm h-[400px] overflow-hidden flex flex-col">
                    <h3 className="text-zinc-400 font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Trophy size={16} className="text-yellow-500" />
                        Top Integradores
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {rankings.slice(0, 5).map((r: any, i: number) => (
                            <div key={i} className="bg-zinc-50/30 border border-zinc-100 p-4 rounded-2xl flex items-center justify-between group hover:bg-zinc-100/50 transition-all">
                                <div className="flex items-center gap-4">
                                    <span className={`font-black text-sm w-8 h-8 flex items-center justify-center rounded-xl ${i === 0 ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'bg-zinc-200 text-zinc-600'}`}>
                                        {i + 1}
                                    </span>
                                    <div className="font-bold text-sm text-zinc-800">{r.implantador}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-xs font-medium text-zinc-5000">
                                        {r.done} Entregas
                                    </div>
                                    <span className="font-mono font-bold text-zinc-900 text-lg">{r.score}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
