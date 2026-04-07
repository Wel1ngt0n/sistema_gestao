import { useEffect, useState } from 'react';
import { api } from '../services/api';
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
import { Chart } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

export default function Dashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/dashboard')
            .then((res: any) => {
                setData(res.data);
                setLoading(false);
            })
            .catch((err: any) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center p-20 w-full min-h-[500px]">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
        </div>
    );

    if (!data || !data.kpis || !data.kpis.projetos) return <div className="p-10 text-red-500 min-h-screen">Erro ao carregar dados do dashboard. Verifique a API.</div>;

    const { kpis = {}, charts = {}, risk_stores = [], rankings = [] } = data;

    // Format numbers
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(val);

    // Line Chart Data
    const lineData = {
        labels: charts?.evo_labels || ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [{
            data: charts?.evo_values || [12, 15, 15, 17, 21, 26],
            borderColor: '#f97316', // orange-500
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3,
            pointBackgroundColor: '#f97316',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHitRadius: 10,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#111827',
                titleColor: '#f9fafb',
                bodyColor: '#f3f4f6',
                padding: 10,
                cornerRadius: 8,
                titleFont: { size: 12, family: 'Inter', weight: '500' },
                bodyFont: { size: 12, family: 'Inter' },
                displayColors: false,
                callbacks: {
                    label: (context: any) => `${context.raw} entregas`
                }
            }
        },
        scales: {
            y: {
                grid: { color: '#f3f4f6', drawBorder: false, borderDash: [4, 4] },
                ticks: { color: '#9ca3af', font: { size: 11, family: 'Inter' }, padding: 12, maxTicksLimit: 5 },
                border: { display: false },
                beginAtZero: true,
            },
            x: {
                grid: { display: false },
                ticks: { color: '#9ca3af', font: { size: 11, family: 'Inter' }, padding: 12 },
                border: { display: false }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    const StatusBadge = ({ score }: { score: number }) => {
        if (score >= 75) return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10">Crítico</span>;
        if (score >= 50) return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">Atenção</span>;
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">Normal</span>;
    };

    const TrendBadge = ({ type, value }: { type: 'positive' | 'negative' | 'neutral', value: string }) => {
        const styles = {
            positive: "bg-emerald-50 text-emerald-700",
            negative: "bg-red-50 text-red-700",
            neutral: "bg-gray-50 text-gray-700"
        };
        const icons = {
            positive: <TrendingUp className="w-3 h-3 mr-1" />,
            negative: <TrendingDown className="w-3 h-3 mr-1" />,
            neutral: <Minus className="w-3 h-3 mr-1" />
        };
        return (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium ${styles[type]}`}>
                {icons[type]}
                {value}
            </span>
        );
    };

    return (
        <div className="w-full pb-12 animate-in fade-in duration-500 font-sans">
            <div className="max-w-[1200px] w-full mx-auto flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Overview</h1>
                        <p className="text-sm text-gray-500 mt-1">Visão geral da operação. Bem-vindo de volta.</p>
                    </div>
                    {/* Optional actions/filters can go here */}
                </div>

                {/* 4 KPIs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Projetos em andamento */}
                    <div className="bg-white rounded-[16px] p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-[130px] transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-gray-300 cursor-default group">
                        <h3 className="text-[13px] font-medium text-gray-500">{kpis.projetos?.label || 'Projetos em andamento'}</h3>
                        <div>
                            <div className="flex items-end gap-3 mb-1">
                                <span className="text-3xl font-semibold text-gray-900 tracking-tight leading-none">{kpis.projetos?.value || 0}</span>
                                <TrendBadge type={kpis.projetos?.trend?.type || 'neutral'} value={kpis.projetos?.trend?.value || '0'} />
                            </div>
                            <div className="flex justify-between items-center w-full">
                                <span className="text-[12px] text-gray-400 font-medium">{kpis.projetos?.trend?.label || "vs semana passada"}</span>
                                {kpis.projetos?.total_ano && <span className="text-[11px] text-gray-300 font-medium">{kpis.projetos.total_ano}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Entregas concluídas */}
                    <div className="bg-white rounded-[16px] p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-[130px] transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-gray-300 cursor-default group">
                        <h3 className="text-[13px] font-medium text-gray-500">{kpis.entregas?.label || 'Entregas concluídas'}</h3>
                        <div>
                            <div className="flex items-end gap-3 mb-1">
                                <span className="text-3xl font-semibold text-gray-900 tracking-tight leading-none">{kpis.entregas?.value || 0}</span>
                                <TrendBadge type={kpis.entregas?.trend?.type || 'neutral'} value={kpis.entregas?.trend?.value || '0'} />
                            </div>
                            <div className="flex justify-between items-center w-full">
                                <span className="text-[12px] text-gray-400 font-medium">{kpis.entregas?.trend?.label || "vs mês anterior"}</span>
                                {kpis.entregas?.total_ano && <span className="text-[11px] text-gray-300 font-medium">{kpis.entregas.total_ano}</span>}
                            </div>
                        </div>
                    </div>

                    {/* SLA */}
                    <div className="bg-white rounded-[16px] p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-[130px] transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-gray-300 cursor-default group">
                        <h3 className="text-[13px] font-medium text-gray-500">{kpis.sla?.label || 'SLA'}</h3>
                        <div>
                            <div className="flex items-end gap-3 mb-1">
                                <span className="text-3xl font-semibold text-gray-900 tracking-tight leading-none">{kpis.sla?.value || 0}</span>
                                <TrendBadge type={kpis.sla?.trend?.type || 'neutral'} value={kpis.sla?.trend?.value || '0'} />
                            </div>
                            <div className="flex justify-between items-center w-full">
                                <span className="text-[12px] text-gray-400 font-medium">{kpis.sla?.trend?.label || "vs mês anterior"}</span>
                                {kpis.sla?.total_ano && <span className="text-[11px] text-gray-300 font-medium">{kpis.sla.total_ano}</span>}
                            </div>
                        </div>
                    </div>

                    {/* MRR Ativo no Mês */}
                    <div className="bg-white rounded-[16px] p-5 border border-gray-200 shadow-sm flex flex-col justify-between h-[130px] transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-gray-300 cursor-default group">
                        <h3 className="text-[13px] font-medium text-gray-500">{kpis.mrr_ativo?.label || 'MRR ativo no mês'}</h3>
                        <div>
                            <div className="flex items-end gap-2 mb-1">
                                <span className="text-xl font-semibold text-gray-500 leading-none pb-0.5">R$</span>
                                <span className="text-3xl font-semibold text-gray-900 tracking-tight leading-none">{formatCurrency(kpis.mrr_ativo?.value || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1 w-full">
                                <div className="flex gap-2 items-center">
                                    <TrendBadge type={kpis.mrr_ativo?.trend?.type || 'neutral'} value={kpis.mrr_ativo?.trend?.value || '0'} />
                                    <span className="text-[12px] text-gray-400 font-medium">{kpis.mrr_ativo?.trend?.label || "vs semana passada"}</span>
                                </div>
                                {kpis.mrr_ativo?.total_ano && <span className="text-[11px] text-gray-300 font-medium">{kpis.mrr_ativo.total_ano}</span>}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Main Content Grid: 8/4 split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column (2/3 width) */}
                    <div className="lg:col-span-2 flex flex-col gap-6">

                        {/* Tendência Chart */}
                        <div className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[15px] font-semibold text-gray-900">Evolução Mensal de Entregas</h3>
                                <button className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg">Este ano</button>
                            </div>
                            <div className="h-[240px] w-full">
                                <Chart type="line" data={lineData} options={chartOptions as any} />
                            </div>
                        </div>

                        {/* Distribuição de carga */}
                        <div className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[15px] font-semibold text-gray-900">Distribuição de Carga</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-[12px] font-medium text-gray-500">Online</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-5">
                                {(charts?.impl_labels || []).length > 0 ? charts.impl_labels.slice(0, 4).map((label: string, idx: number) => {
                                    const val = charts.impl_values[idx] || 0;
                                    const total = charts.impl_values.reduce((a: number, b: number) => a + b, 0) || 1;
                                    const pct = Math.round((val / total) * 100);

                                    const colors = ['bg-orange-500', 'bg-emerald-500', 'bg-gray-500', 'bg-blue-500'];
                                    const bgClass = colors[idx % colors.length];

                                    return (
                                        <div key={idx} className="flex flex-col gap-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[13px] font-medium text-gray-700">{label}</span>
                                                <span className="text-[13px] font-semibold text-gray-900">{pct}% <span className="text-gray-400 font-normal ml-1">{val} obj.</span></span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`${bgClass} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <div className="text-sm text-gray-400 text-center py-4">Sem dados no período</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column (1/3 width) */}
                    <div className="flex flex-col gap-6">

                        {/* Receita Operacional */}
                        <div className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                            <h3 className="text-[13px] font-medium text-gray-500 mb-2">{kpis.mrr?.label || "Receita Operacional"}</h3>
                            <div className="text-3xl font-semibold text-gray-900 mb-4 tracking-tight">R$ {formatCurrency(kpis.mrr_implantacao || 0)}</div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-[13px] text-gray-600 font-medium">Pagando (Ativas)</span>
                                    </div>
                                    <span className="text-[13px] font-semibold text-gray-900">R$ {formatCurrency(kpis.mrr_pagando || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                        <span className="text-[13px] text-gray-600 font-medium">Em atraso / Devendo</span>
                                    </div>
                                    <span className="text-[13px] font-semibold text-gray-900 drop-shadow-sm">R$ {formatCurrency(kpis.mrr_devendo || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-sm flex-1">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-[14px] font-semibold text-gray-900 tracking-tight">Top Performers</h3>
                                <button className="text-[12px] font-medium text-orange-500 hover:text-orange-600 transition-colors">Ver ranking</button>
                            </div>
                            <div className="space-y-4">
                                {rankings.slice(0, 4).map((r: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 text-[12px] font-bold text-gray-400">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-[13px] font-medium text-gray-900 truncate pr-2" title={r.implantador}>{r.implantador || 'N/A'}</div>
                                                <div className="text-[11px] text-gray-500">{r.done} <span className="text-gray-400">entregas</span> • <span className="text-orange-500 font-medium bg-orange-50 px-1 py-0.5 rounded leading-none">{r.wip} WIP</span></div>
                                            </div>
                                        </div>
                                        <div className="text-[13px] font-semibold text-gray-900">
                                            {r.pct_prazo}%
                                        </div>
                                    </div>
                                ))}
                                {(!rankings || rankings.length === 0) && (
                                    <div className="text-sm text-gray-400 text-center py-4">Sem dados no período</div>
                                )}
                            </div>
                        </div>

                        {/* Risco Operacional */}
                        <div className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-sm flex-1">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-[14px] font-semibold text-gray-900 tracking-tight">Risco Operacional</h3>
                                <button className="text-[12px] font-medium text-orange-500 hover:text-orange-600 transition-colors">Painel completo</button>
                            </div>
                            <div className="space-y-4">
                                {risk_stores.slice(0, 4).map((store: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3 max-w-[65%]">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center overflow-hidden shrink-0">
                                                <span className="text-[11px] font-semibold text-orange-600">{store.name?.substring(0, 2).toUpperCase() || 'ST'}</span>
                                            </div>
                                            <div className="truncate">
                                                <div className="text-[13px] font-medium text-gray-900 truncate">{store.name}</div>
                                                <div className="text-[11px] text-gray-500 truncate" title={store.etapa_parada}>{store.etapa_parada || '-'}</div>
                                            </div>
                                        </div>
                                        <StatusBadge score={store.score} />
                                    </div>
                                ))}
                                {(!risk_stores || risk_stores.length === 0) && (
                                    <div className="text-sm text-gray-400 text-center py-4">Nenhum risco detectado.</div>
                                )}
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    );
}
