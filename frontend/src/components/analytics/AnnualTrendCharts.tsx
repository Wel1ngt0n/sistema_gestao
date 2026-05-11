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
                labels: { color: '#71717a' }
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
                ticks: { color: '#71717a' },
                border: { display: false }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: { color: 'rgba(100, 116, 139, 0.12)' },
                ticks: { color: '#71717a', callback: (val: any) => formatCurrency(val) },
                border: { display: false }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                ticks: { color: '#71717a', callback: (val: any) => formatCurrency(val) },
                border: { display: false }
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
                backgroundColor: 'rgba(139, 92, 246, 0.5)', // orange 500
                borderColor: '#f97316',
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
                labels: { color: '#71717a' }
            },
            tooltip: {}
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#71717a' },
                border: { display: false }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: { color: 'rgba(100, 116, 139, 0.12)' },
                ticks: { color: '#71717a' },
                border: { display: false }
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                ticks: { color: '#71717a' },
                border: { display: false }
            }
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
                <div className="h-[300px] mt-6">
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
                <div className="h-[300px] mt-6">
                    <Chart type='bar' data={storesChartData} options={storesOptions} />
                </div>
            </div>
        </div>
    );
};
