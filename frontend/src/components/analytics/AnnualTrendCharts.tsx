import React from 'react';
import { Chart } from 'react-chartjs-2';
import { AnnualTrendData } from './useAnalyticsData';
import { InfoTooltip } from './InfoTooltip';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
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

    // 1. Gráfico de MRR (Acumulado vs Meta)
    const mrrChartData = {
        labels,
        datasets: [
            {
                type: 'bar' as const,
                label: 'MRR Entregue no Mês',
                data: data.trends.map(t => t.mrr_monthly),
                backgroundColor: 'rgba(20, 184, 166, 0.5)', // Teal 500
                borderColor: '#14b8a6',
                borderWidth: 1,
                order: 3,
                yAxisID: 'y'
            },
            {
                type: 'line' as const,
                label: 'MRR Acumulado (YTD)',
                data: data.trends.map(t => t.cumulative_mrr),
                borderColor: '#0ea5e9', // Sky 500
                backgroundColor: '#0ea5e9',
                borderWidth: 3,
                tension: 0.3,
                order: 2,
                yAxisID: 'y1'
            },
            {
                type: 'line' as const,
                label: 'Meta Ideal Acumulada',
                data: data.trends.map(t => t.target_cumulative_mrr),
                borderColor: '#ef4444', // Red 500
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0,
                order: 1,
                yAxisID: 'y1'
            }
        ]
    };

    const mrrOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: '#94a3b8' }
            },
            tooltip: {
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
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8', callback: (val: any) => formatCurrency(val) }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                ticks: { color: '#94a3b8', callback: (val: any) => formatCurrency(val) }
            }
        }
    };

    // 2. Gráfico de Lojas (Acumulado vs Meta)
    const storesChartData = {
        labels,
        datasets: [
            {
                type: 'bar' as const,
                label: 'Lojas Entregues (Mês)',
                data: data.trends.map(t => t.stores_monthly),
                backgroundColor: 'rgba(139, 92, 246, 0.5)', // Violet 500
                borderColor: '#8b5cf6',
                borderWidth: 1,
                order: 3,
                yAxisID: 'y'
            },
            {
                type: 'line' as const,
                label: 'Lojas Acumuladas (YTD)',
                data: data.trends.map(t => t.cumulative_stores),
                borderColor: '#f59e0b', // Amber 500
                backgroundColor: '#f59e0b',
                borderWidth: 3,
                tension: 0.3,
                order: 2,
                yAxisID: 'y1'
            },
            {
                type: 'line' as const,
                label: 'Meta Ideal Acumulada',
                data: data.trends.map(t => t.target_cumulative_stores),
                borderColor: '#ef4444', // Red 500
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0,
                order: 1,
                yAxisID: 'y1'
            }
        ]
    };

    const storesOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: '#94a3b8' }
            },
            tooltip: {}
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8' }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            <div className="bg-white dark:bg-zinc-800 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    📈 Evolução MRR ({data.year})
                    <InfoTooltip
                        text="Acompanhe o MRR mensal entregue e a linha acumulada no ano para atingimento da meta."
                        position="right"
                    />
                </h3>
                <div className="h-[300px] mt-6">
                    <Chart type='bar' data={mrrChartData} options={mrrOptions} />
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    🏪 Entregas de Lojas ({data.year})
                    <InfoTooltip
                        text="Acompanhe as lojas entregues por mês e a linha acumulada no ano contra a meta."
                        position="left"
                    />
                </h3>
                <div className="h-[300px] mt-6">
                    <Chart type='bar' data={storesChartData} options={storesOptions} />
                </div>
            </div>
        </div>
    );
};
