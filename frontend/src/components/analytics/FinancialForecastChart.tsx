import React from 'react';
import { Chart } from 'react-chartjs-2';
import { ForecastData } from './useAnalyticsData';
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

interface FinancialForecastChartProps {
    data: ForecastData[];
    className?: string;
}

export const FinancialForecastChart: React.FC<FinancialForecastChartProps> = ({ data, className = '' }) => {

    // Preparar dados
    // Preparar dados
    const labels = data.map(d => d.month);
    // Mostrar SEMPRE o realizado e o projetado, permitindo sobreposição no mês atual
    const realizedData = data.map(d => d.realized);
    const projectedData = data.map(d => d.projected);

    const chartData = {
        labels,
        datasets: [
            {
                type: 'bar' as const,
                label: 'Realizado (Histórico)',
                data: realizedData,
                backgroundColor: '#f97316', // Orange-500
                hoverBackgroundColor: '#ea580c',
                borderRadius: 4,
                order: 1, // Draw First (Bottom)
                stack: 'stack1'
            },
            {
                type: 'bar' as const,
                label: 'Projetado (Forecast)',
                data: projectedData,
                backgroundColor: 'rgba(132, 204, 22, 0.2)', // Lime-500 Transparent
                borderColor: '#84cc16', // Lime-500
                borderWidth: 1,
                borderDash: [5, 5], // Tracejado
                borderRadius: 4,
                order: 2, // Draw Second (Top)
                stack: 'stack1'
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        maxBarThickness: 50, // Limita largura da barra
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: '#94a3b8' }
            },
            tooltip: {
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
        scales: {
            y: {
                stacked: true,
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                stacked: true,
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    return (
        <div className={`bg-white dark:bg-zinc-800 p-8 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm hover:shadow-md transition-shadow ${className}`}>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                🔮 Forecast de Ativação (MRR)
                <InfoTooltip
                    text="Projeção de receita (MRR) futura. 'Realizado' são lojas já concluídas. 'Projetado' são lojas em andamento alocadas na data estimada de conclusão (Data Início + Cycle Time Médio)."
                    position="left"
                />
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Projeção de entrada de receita baseada no ritmo atual e data estimada de conclusão.
            </p>
            <div className="h-[300px]">
                <Chart type='bar' data={chartData} options={options} />
            </div>
        </div>
    );
};
