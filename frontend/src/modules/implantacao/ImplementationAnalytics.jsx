import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
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
    Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Activity, DollarSign, Trophy, Clock, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { RiskScatterPlot, FinancialForecastChart, BottleneckTable } from './ImplementationCharts';

// Registrando componentes do Chart.js
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

// --- Componentes UX ---

const KPICard = ({ label, value, color, icon: Icon, subtext }) => {
    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-600',
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        slate: 'bg-slate-50 text-slate-600',
        red: 'bg-red-50 text-red-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
                <p className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1">{label}</p>
                <h3 className="text-2xl font-black text-gray-900 mb-1">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 font-medium">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-xl ${colorClasses[color] || 'bg-gray-100'}`}>
                {Icon && <Icon size={24} />}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${active
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
            }`}
    >
        {children}
    </button>
);

// --- Main Component ---

export default function ImplementationAnalytics() {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await api.get('/implantacao/analytics');
            setData(res.data);
        } catch (error) {
            console.error("Erro ao carregar analytics", error);
        } finally {
            setLoading(false);
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f3f4f6' }, border: { display: false } }
        },
        maxBarThickness: 40
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Carregando dados...</div>;
    if (!data) return <div className="p-10 text-center text-gray-500">Erro ao carregar dados.</div>;

    const { kpi_data, performance_data, risk_data, bottleneck_data, forecast_data } = data;

    // Transform Data for Charts
    const performanceLabels = performance_data.map(p => p.implantador);
    const performanceChartData = {
        labels: performanceLabels,
        datasets: [
            {
                label: 'Entregues',
                data: performance_data.map(p => p.done),
                backgroundColor: '#10b981',
                borderRadius: 4
            },
            {
                label: 'Em Progresso',
                data: performance_data.map(p => p.wip),
                backgroundColor: '#6366f1',
                borderRadius: 4
            }
        ]
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Relatórios e Analytics</h1>
                    <p className="text-sm text-gray-500">Visão estratégica da operação de implantação.</p>
                </div>
                <div className="bg-gray-100 p-1 rounded-xl flex">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Visão Geral</TabButton>
                    <TabButton active={activeTab === 'efficiency'} onClick={() => setActiveTab('efficiency')}>Eficiência & Risco</TabButton>
                    <TabButton active={activeTab === 'performance'} onClick={() => setActiveTab('performance')}>Time & Performance</TabButton>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Executive KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard
                            label="WIP Global"
                            value={kpi_data.wip_stores}
                            subtext="Lojas em andamento"
                            color="indigo"
                            icon={Activity}
                        />
                        <KPICard
                            label="Entregas (Mês)"
                            value={kpi_data.throughput_period}
                            subtext="Lojas concluídas"
                            color="green"
                            icon={TrendingUp}
                        />
                        <KPICard
                            label="MRR Ativado"
                            value={`R$ ${kpi_data.mrr_done_period.toLocaleString('pt-BR')}`}
                            subtext="Receita nova neste mês"
                            color="purple"
                            icon={DollarSign}
                        />
                        <KPICard
                            label="MRR Backlog"
                            value={`R$ ${kpi_data.mrr_backlog.toLocaleString('pt-BR')}`}
                            subtext="Receita em pipeline"
                            color="blue"
                            icon={Clock}
                        />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* Forecast Financeiro */}
                        <div className="md:col-span-1">
                            <FinancialForecastChart data={forecast_data} />
                        </div>

                        {/* Evolução (Placeholder por enquanto) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4">📈 Evolução de Entregas</h3>
                            <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                                <p className="text-gray-400">Dados históricos insuficientes.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'efficiency' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* 1. Risk Matrix & Efficiency */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <div className="h-[400px]">
                            <RiskScatterPlot data={risk_data} />
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
                            <h3 className="font-bold text-gray-900 mb-4">⚡ Eficiência Operacional (OTD vs Dias)</h3>
                            <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                                <p className="text-gray-400">Implementação em breve.</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Bottlenecks */}
                    <div className="mt-8">
                        <BottleneckTable data={bottleneck_data} />
                    </div>
                </div>
            )}

            {activeTab === 'performance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Chart */}
                        <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Trophy className="text-yellow-500" size={20} />
                                Performance por Implantador
                            </h3>
                            <div className="h-[400px]">
                                <Bar data={performanceChartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Ranking List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-900">🏆 Ranking de Volume</h3>
                            </div>
                            <div className="flex-1 overflow-auto p-4 space-y-2">
                                {performance_data.sort((a, b) => b.done - a.done).map((p, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 flex items-center justify-center rounded font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                #{idx + 1}
                                            </span>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900">{p.implantador}</p>
                                                <p className="text-xs text-gray-500">{p.wip} em andamento</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-emerald-600">{p.done}</p>
                                            <p className="text-[10px] uppercase font-bold text-gray-400">Entregues</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            )}

        </div>
    );
}
