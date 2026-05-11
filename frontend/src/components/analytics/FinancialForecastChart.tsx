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
                labels: { color: '#71717a' }
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
                grid: { color: 'rgba(100, 116, 139, 0.12)' },
                ticks: { color: '#71717a' },
                border: { display: false }
            },
            x: {
                stacked: true,
                grid: { display: false },
                ticks: { color: '#71717a' },
                border: { display: false }
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
                Projeção de entrada de receita baseada no ritmo atual e data estimada de conclusão.
                </p>
            </div>
            <div className="h-[300px]">
                <Chart type='bar' data={chartData} options={options} />
            </div>
        </div>
    );
};
