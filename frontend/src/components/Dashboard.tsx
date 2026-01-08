import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement,
    Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { KPICard } from './analytics/KPICard';
import { LayoutDashboard, AlertCircle, Trophy, TrendingUp } from 'lucide-react';

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

// Format BRL
const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export default function Dashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        axios.get('http://localhost:5000/api/dashboard')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);


    if (loading) return (
        <div className="flex items-center justify-center h-screen w-full">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-indigo-500 rounded-full"></div>
                <div className="text-slate-500 font-medium">Carregando dados...</div>
            </div>
        </div>
    );

    if (!data) return <div className="p-10 text-red-600 dark:text-red-400">Erro ao carregar dados.</div>;

    // Helper para cor do risco
    const getRiskColor = (score: number) => {
        if (score >= 75) return 'text-red-500 dark:text-red-400';
        if (score >= 50) return 'text-orange-500 dark:text-orange-400';
        if (score >= 25) return 'text-yellow-500 dark:text-yellow-400';
        return 'text-emerald-500 dark:text-emerald-400';
    };

    const { kpis = {}, charts = {}, risk_stores = [], rankings = [] } = data || {};

    // Get Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Chart Data Preparation
    const barData = {
        labels: charts?.impl_labels || [],
        datasets: [
            {
                label: 'Lojas em Andamento',
                data: charts?.impl_values || [],
                backgroundColor: 'rgba(99, 102, 241, 0.8)', // Indigo-500
                hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
                borderRadius: 6,
                barThickness: 30,
            },
        ],
    };

    const lineData = {
        labels: charts?.evo_labels || [],
        datasets: [
            {
                label: 'Lojas Concluídas',
                data: charts?.evo_values || [],
                borderColor: 'rgba(16, 185, 129, 1)', // Emerald-500
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                pointBackgroundColor: '#fff',
                pointBorderColor: 'rgba(16, 185, 129, 1)',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 1000,
            easing: 'easeOutQuart' as const,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                cornerRadius: 8,
                displayColors: false,
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(148, 163, 184, 0.05)' },
                ticks: { color: '#64748b', font: { size: 11 } },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 11 } },
                border: { display: false }
            }
        },
    };

    return (
        <div className="min-h-screen w-full bg-slate-50/50 dark:bg-[#0B1120] p-6 lg:p-10 space-y-8 animate-fade-in-up">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {greeting}, Gestor(a)! 👋
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 first-letter:capitalize">
                        {today}
                    </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wide">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Sistema Operacional
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up animation-delay-100 opacity-0">
                <KPICard
                    label="Lojas em Progresso"
                    value={kpis.wip}
                    icon="🚀"
                    color="indigo"
                    subtext="Pipeline Ativo"
                    tooltip="Total de lojas atualmente em fase de implantação."
                />
                <KPICard
                    label="Entregas Totais"
                    value={kpis.done_total}
                    icon="✅"
                    color="green"
                    subtext={`${kpis.pct_prazo}% no prazo`}
                    trend={kpis.pct_prazo >= 85 ? 'up' : 'neutral'}
                    tooltip="Total acumulado de projetos concluídos."
                />
                <KPICard
                    label="MRR em Implantação"
                    value={formatCurrency(kpis.mrr_implantacao)}
                    icon="💰"
                    color="blue"
                    subtext={`Devendo: ${formatCurrency(kpis.mrr_devendo)}`}
                    tooltip="Receita Recorrente Mensal que está em processo de ativação."
                />
                <KPICard
                    label="MRR Entregue (Ano)"
                    value={formatCurrency(kpis.mrr_concluidas_ano)}
                    icon="📅"
                    color="purple"
                    subtext="Acumulado anual"
                    tooltip={`Valor total de MRR entregue no ano de ${new Date().getFullYear()}.`}
                />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left Column (Charts) */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Volume Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in-up animation-delay-200 opacity-0">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                                    Volume por Implantador
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Distribuição de carga de trabalho atual</p>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <Chart type="bar" data={barData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Evolution Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in-up animation-delay-200 opacity-0">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                                    Evolução de Entregas
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Histórico de projetos concluídos mês a mês</p>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <Chart type="line" data={lineData} options={chartOptions} />
                        </div>
                    </div>
                </div>

                {/* Right Column (Tables/Lists) */}
                <div className="space-y-8">

                    {/* Top Risk Widget */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in-up animation-delay-300 opacity-0">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-rose-50/50 dark:bg-rose-900/10">
                            <div>
                                <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Atenção Necessária
                                </h3>
                                <p className="text-[10px] text-rose-500/80 font-medium">Lojas com maior risco operacional</p>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[350px] overflow-y-auto custom-scrollbar">
                            {risk_stores.length > 0 ? risk_stores.map((s: any) => (
                                <div key={s.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between group">
                                    <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">{s.name}</div>
                                        <div className="text-xs text-slate-400 mt-1 flex flex-col gap-0.5">
                                            <span className="flex items-center gap-1">
                                                👤 {s.implantador || 'Sem implantador'}
                                            </span>
                                            <span className="flex items-center gap-1 truncate max-w-[200px]" title={s.etapa_parada}>
                                                ⏳ {s.etapa_parada || 'Nenhuma etapa ativa'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-bold ${getRiskColor(s.score)}`}>{s.score}</div>
                                        <div className="text-[10px] text-slate-400">Score de Risco</div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-slate-400 text-sm">Nenhum risco crítico detectado.</div>
                            )}
                        </div>
                    </div>

                    {/* Ranking Widget */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in-up animation-delay-300 opacity-0">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                Top Performance
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {rankings.slice(0, 5).map((r: any, i: number) => (
                                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            i === 1 ? 'bg-slate-100 text-slate-700' :
                                                i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.implantador}</span>
                                    </div>
                                    <div className="text-right group/score relative">
                                        <div className="text-xs text-slate-500 font-medium">Score</div>
                                        <div className="text-lg font-bold text-slate-800 dark:text-white cursor-help border-b border-dotted border-slate-400 inline-block leading-none">{r.score}</div>

                                        {/* Score Breakdown Tooltip */}
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl z-50 invisible group-hover/score:visible animate-in fade-in zoom-in-95 pointer-events-none">
                                            <div className="font-bold text-amber-500 mb-2 border-b border-slate-600 pb-1">Composição da Nota</div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between">
                                                    <span>📦 Volume (40%):</span>
                                                    <span className="font-mono">{r.breakdown?.volume || 0} pts</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>⏱️ OTD (30%):</span>
                                                    <span className="font-mono">{r.breakdown?.otd || 0}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>⭐ Qualidade (20%):</span>
                                                    <span className="font-mono">{r.breakdown?.quality || 0}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>⚡ Tempo (10%):</span>
                                                    <span className="font-mono">{r.breakdown?.time_score || 0} pts</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-slate-400 flex gap-2 justify-end mt-1">
                                            <span title="Volume">{r.done} Entregas</span>
                                            <span title="On Time Delivery" className={`${r.pct_prazo >= 85 ? 'text-emerald-500' : 'text-orange-500'}`}>{r.pct_prazo}% OTD</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
