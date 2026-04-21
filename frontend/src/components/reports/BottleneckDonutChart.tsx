import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController
);

interface BottleneckDonutChartProps {
    data: Record<string, number> | null;
}

export const BottleneckDonutChart: React.FC<BottleneckDonutChartProps> = ({ data }) => {
    if (!data) return null;

    // Use labels mapping
    const parseLabel = (l: string) => {
        if (l === "CLIENTE") return "Cliente / Fator Externo"
        if (l === "IMPLANTADOR") return "Analista / Fator Interno"
        if (l === "CARGA") return "Sobrecarga de Trabalho"
        if (l === "ETAPA") return "Demora Natural / Processo"
        if (l === "NO_PRAZO") return "Em Fluxo Normal"
        return l
    }

    const labels = Object.keys(data).map(k => parseLabel(k));
    const values = Object.values(data);

    if (values.every(v => v === 0)) {
        return (
            <div className="w-full h-full min-h-[250px] flex items-center justify-center text-zinc-500 text-sm">
                Nenhum gargalo identificado.
            </div>
        );
    }

    const bgMap: Record<string, string> = {
        CLIENTE: 'rgba(99, 102, 241, 0.85)', // orange-500
        IMPLANTADOR: 'rgba(249, 115, 22, 0.85)', // orange-500
        CARGA: 'rgba(239, 68, 68, 0.85)', // red-500
        ETAPA: 'rgba(14, 165, 233, 0.85)', // sky-500
        NO_PRAZO: 'rgba(16, 185, 129, 0.85)' // emerald-500
    };

    const borderMap: Record<string, string> = {
        CLIENTE: 'rgba(99, 102, 241, 1)',
        IMPLANTADOR: 'rgba(249, 115, 22, 1)',
        CARGA: 'rgba(239, 68, 68, 1)',
        ETAPA: 'rgba(14, 165, 233, 1)',
        NO_PRAZO: 'rgba(16, 185, 129, 1)'
    };

    const backgroundColor = Object.keys(data).map(k => bgMap[k] || 'rgba(156, 163, 175, 0.85)');
    const borderColor = Object.keys(data).map(k => borderMap[k] || 'rgba(156, 163, 175, 1)');

    const chartData = {
        labels,
        datasets: [
            {
                data: values,
                backgroundColor,
                borderColor,
                borderWidth: 2,
                hoverOffset: 15,
                borderRadius: 4,
                spacing: 2
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: '#94a3b8', // slate-400
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: {
                        size: 10,
                        weight: '600',
                        family: "'Inter', sans-serif"
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#fff',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                boxPadding: 8,
                cornerRadius: 12,
                displayColors: true,
            }
        },
        cutout: '72%',
    };

    return (
        <div className="w-full h-full min-h-[250px] p-2">
            <Chart type="doughnut" data={chartData} options={options} />
        </div>
    );
};
