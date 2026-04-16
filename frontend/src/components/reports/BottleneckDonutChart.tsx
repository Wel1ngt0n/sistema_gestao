import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
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
        CLIENTE: 'rgba(99, 102, 241, 0.8)', // indigo-500
        IMPLANTADOR: 'rgba(245, 158, 11, 0.8)', // amber-500
        CARGA: 'rgba(239, 68, 68, 0.8)', // red-500
        ETAPA: 'rgba(59, 130, 246, 0.8)', // blue-500
        NO_PRAZO: 'rgba(16, 185, 129, 0.8)' // emerald-500
    };

    const borderMap: Record<string, string> = {
        CLIENTE: 'rgba(99, 102, 241, 1)',
        IMPLANTADOR: 'rgba(245, 158, 11, 1)',
        CARGA: 'rgba(239, 68, 68, 1)',
        ETAPA: 'rgba(59, 130, 246, 1)',
        NO_PRAZO: 'rgba(16, 185, 129, 1)'
    };

    const backgroundColor = Object.keys(data).map(k => bgMap[k] || 'rgba(156, 163, 175, 0.8)');
    const borderColor = Object.keys(data).map(k => borderMap[k] || 'rgba(156, 163, 175, 1)');

    const chartData = {
        labels,
        datasets: [
            {
                data: values,
                backgroundColor,
                borderColor,
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    color: 'rgba(100, 116, 139, 1)',
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 11
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#fff',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
            }
        },
        cutout: '65%',
    };

    return (
        <div className="w-full h-full min-h-[250px] p-2">
            <Doughnut data={chartData} options={options} />
        </div>
    );
};
