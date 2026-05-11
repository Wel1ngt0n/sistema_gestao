import React from 'react';
import { Chart } from 'react-chartjs-2';
import { ForecastData } from './useAnalyticsData';
import { InfoTooltip } from './InfoTooltip';
import { TrendingUp } from 'lucide-react';
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

interface FinancialForecastChartProps {
    data: ForecastData[];
    className?: string;
}

export const FinancialForecastChart: React.FC<FinancialForecastChartProps> = ({ data, className = '' }) => {

    const labels = data.map(d => d.month);
    const realizedData = data.map(d => d.realized);
    const projectedData = data.map(d => d.projected);

    const chartData = {
        labels,
        datasets: [
            {
                type: 'bar' as const,
                label: 'MRR realizado',
                data: realizedData,
                backgroundColor: 'rgba(255, 121, 0, 0.34)',
                hoverBackgroundColor: 'rgba(255, 121, 0, 0.48)',
                borderColor: 'rgba(255, 121, 0, 0.65)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.56,
                categoryPercentage: 0.82,
                order: 1,
                stack: 'stack1',
            },
            {
                type: 'bar' as const,
                label: 'MRR projetado',
                data: projectedData,
                backgroundColor: 'rgba(18, 129, 49, 0.16)',
                hoverBackgroundColor: 'rgba(18, 129, 49, 0.26)',
                borderColor: 'rgba(18, 129, 49, 0.55)',
                borderWidth: 1,
                borderDash: [5, 5],
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.56,
                categoryPercentage: 0.82,
                order: 2,
                stack: 'stack1',
            }
        ]
    };

    const options: ChartOptions<'bar'> = {
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
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        layout: {
            padding: { top: 8, right: 8, bottom: 0, left: 0 },
        },
        scales: {
            y: {
                stacked: true,
                grid: { color: 'rgba(100, 116, 139, 0.12)', drawTicks: false },
                ticks: {
                    color: '#71717a',
                    font: { size: 11 },
                    callback: (val: any) => new Intl.NumberFormat('pt-BR', {
                        notation: 'compact',
                        compactDisplay: 'short',
                    }).format(Number(val)),
                },
                title: {
                    display: true,
                    text: 'MRR previsto',
                    color: '#71717a',
                    font: { size: 11, weight: 500 },
                },
                border: { display: false },
                beginAtZero: true,
            },
            x: {
                stacked: true,
                grid: { display: false },
                ticks: { color: '#71717a', font: { size: 11 } },
                border: { display: false },
            }
        }
    };

    return (
        <div className={`rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md ${className}`}>
            <div className="mb-5 flex flex-col gap-1">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <TrendingUp size={16} className="text-[#ff7900]" />
                    Forecast de Ativação (MRR)
                    <InfoTooltip
                        text="Projeção de receita (MRR) futura. 'Realizado' são lojas já concluídas. 'Projetado' são lojas em andamento alocadas na data estimada de conclusão (Data Início + Cycle Time Médio)."
                        position="left"
                    />
                </h3>
                <p className="text-sm text-zinc-500">
                    Receita ativada e projetada por mês, empilhada para indicar o potencial total.
                </p>
            </div>
            <div className="h-[340px]">
                <Chart type='bar' data={chartData} options={options} />
            </div>
        </div>
    );
};
