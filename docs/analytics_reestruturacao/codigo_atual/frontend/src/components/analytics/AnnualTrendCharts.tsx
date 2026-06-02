import React from 'react';
import { Chart } from 'react-chartjs-2';
import { AnnualTrendData } from './useAnalyticsData';
import { InfoTooltip } from './InfoTooltip';
import { Store, TrendingUp } from 'lucide-react';
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
    ChartOptions
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface AnnualTrendChartsProps {
    data: AnnualTrendData | null;
}

export const AnnualTrendCharts: React.FC<AnnualTrendChartsProps> = ({ data }) => {
    if (!data || !data.trends) return null;

    const labels = data.trends.map(t => {
        const [_, m] = t.month.split('-');
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return months[parseInt(m) - 1];
    });

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const commonChartOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        plugins: {
            legend: {
                position: 'bottom',
                align: 'start',
                labels: {
                    boxHeight: 8,
                    boxWidth: 18,
                    color: '#52525b',
                    padding: 18,
                    usePointStyle: true,
                    font: { size: 11, weight: 500 },
                },
            },
            tooltip: {
                backgroundColor: '#18181b',
                titleColor: '#fff',
                bodyColor: '#e4e4e7',
                borderColor: '#27272a',
                borderWidth: 1,
                cornerRadius: 6,
                displayColors: true,
                padding: 12,
            },
        },
        layout: {
            padding: { top: 8, right: 8, bottom: 0, left: 0 },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#71717a', font: { size: 11 } },
                border: { display: false },
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: { color: 'rgba(100, 116, 139, 0.12)', drawTicks: false },
                ticks: { color: '#71717a', font: { size: 11 } },
                border: { display: false },
                beginAtZero: true,
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { drawOnChartArea: false, drawTicks: false },
                ticks: { color: '#71717a', font: { size: 11 } },
                border: { display: false },
                beginAtZero: true,
            },
        },
    };

    // 1. Gráfico de MRR (Acumulado vs Meta)
    const mrrChartData = {
        labels,
        datasets: [
            {
                type: 'bar' as const,
                label: 'MRR mensal entregue',
                data: data.trends.map(t => t.mrr_monthly),
                backgroundColor: 'rgba(255, 121, 0, 0.28)',
                hoverBackgroundColor: 'rgba(255, 121, 0, 0.42)',
                borderColor: 'rgba(255, 121, 0, 0.55)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.55,
                categoryPercentage: 0.8,
                order: 3,
                yAxisID: 'y'
            },
            {
                type: 'line' as const,
                label: 'MRR acumulado no ano',
                data: data.trends.map(t => t.cumulative_mrr),
                borderColor: '#128131',
                backgroundColor: '#128131',
                borderWidth: 2.5,
                pointBackgroundColor: '#128131',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.35,
                order: 2,
                yAxisID: 'y1'
            },
            {
                type: 'line' as const,
                label: 'Meta acumulada',
                data: data.trends.map(t => t.target_cumulative_mrr),
                borderColor: '#71717a',
                backgroundColor: '#71717a',
                borderWidth: 2,
                borderDash: [6, 5],
                pointRadius: 0,
                tension: 0,
                order: 1,
                yAxisID: 'y1'
            }
        ]
    };

    const mrrOptions: ChartOptions<'bar'> = {
        ...commonChartOptions,
        plugins: {
            ...commonChartOptions.plugins,
            tooltip: {
                ...commonChartOptions.plugins?.tooltip,
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            label += formatCurrency(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            ...commonChartOptions.scales,
            y: {
                ...commonChartOptions.scales?.y,
                title: { display: true, text: 'MRR mensal', color: '#71717a', font: { size: 11, weight: 500 } },
                ticks: { color: '#71717a', callback: (val: any) => formatCurrency(val) },
            },
            y1: {
                ...commonChartOptions.scales?.y1,
                title: { display: true, text: 'Acumulado', color: '#71717a', font: { size: 11, weight: 500 } },
                ticks: { color: '#71717a', callback: (val: any) => formatCurrency(val) },
            },
        }
    };

    // 2. Gráfico de Lojas (Acumulado vs Meta)
    const storesChartData = {
        labels,
        datasets: [
            {
                type: 'bar' as const,
                label: 'Lojas entregues no mês',
                data: data.trends.map(t => t.stores_monthly),
                backgroundColor: 'rgba(255, 121, 0, 0.28)',
                hoverBackgroundColor: 'rgba(255, 121, 0, 0.42)',
                borderColor: 'rgba(255, 121, 0, 0.55)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.55,
                categoryPercentage: 0.8,
                order: 3,
                yAxisID: 'y'
            },
            {
                type: 'line' as const,
                label: 'Lojas acumuladas no ano',
                data: data.trends.map(t => t.cumulative_stores),
                borderColor: '#128131',
                backgroundColor: '#128131',
                borderWidth: 2.5,
                pointBackgroundColor: '#128131',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.35,
                order: 2,
                yAxisID: 'y1'
            },
            {
                type: 'line' as const,
                label: 'Meta acumulada',
                data: data.trends.map(t => t.target_cumulative_stores),
                borderColor: '#71717a',
                backgroundColor: '#71717a',
                borderWidth: 2,
                borderDash: [6, 5],
                pointRadius: 0,
                tension: 0,
                order: 1,
                yAxisID: 'y1'
            }
        ]
    };

    const storesOptions: ChartOptions<'bar'> = {
        ...commonChartOptions,
        plugins: {
            ...commonChartOptions.plugins,
            tooltip: {
                ...commonChartOptions.plugins?.tooltip,
                callbacks: {
                    label: function (context: any) {
                        const label = context.dataset.label || '';
                        return `${label}: ${context.parsed.y ?? 0}`;
                    }
                }
            }
        },
        scales: {
            ...commonChartOptions.scales,
            y: {
                ...commonChartOptions.scales?.y,
                title: { display: true, text: 'Entregas mensais', color: '#71717a', font: { size: 11, weight: 500 } },
            },
            y1: {
                ...commonChartOptions.scales?.y1,
                title: { display: true, text: 'Acumulado', color: '#71717a', font: { size: 11, weight: 500 } },
            },
        }
    };

    return (
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <TrendingUp size={16} className="text-[#128131]" />
                    Evolução MRR ({data.year})
                    <InfoTooltip
                        text="Acompanhe o MRR mensal entregue e a linha acumulada no ano para atingimento da meta."
                        position="right"
                    />
                </h3>
                <p className="text-sm text-zinc-500">Barras mostram o realizado no mês; linhas mostram acumulado e meta.</p>
                <div className="mt-5 h-[340px]">
                    <Chart type='bar' data={mrrChartData} options={mrrOptions} />
                </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <Store size={16} className="text-[#ff7900]" />
                    Entregas de Lojas ({data.year})
                    <InfoTooltip
                        text="Acompanhe as lojas entregues por mês e a linha acumulada no ano contra a meta."
                        position="left"
                    />
                </h3>
                <p className="text-sm text-zinc-500">Compare o volume mensal com a curva acumulada de entregas no ano.</p>
                <div className="mt-5 h-[340px]">
                    <Chart type='bar' data={storesChartData} options={storesOptions} />
                </div>
            </div>
        </div>
    );
};
