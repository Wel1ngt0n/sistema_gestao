import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  RadarController
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  RadarController
);

interface AnalystRadarChartProps {
    data: {
        sla_concluidas: number;
        sla_ativas: number;
        idle_invertido: number;
        entregas: number;
        qualidade: number;
    } | null;
}

export const AnalystRadarChart: React.FC<AnalystRadarChartProps> = ({ data }) => {
    if (!data) return null;

    const chartData = {
        labels: [
            'SLA Concluídas', 
            'SLA Ativas (Saúde)', 
            'Cadência (Idle)', 
            'Entregas (Meta)', 
            'Qualidade (Zero Retrabalho)'
        ],
        datasets: [
            {
                label: 'Performance Geral',
                data: [
                    data.sla_concluidas,
                    data.sla_ativas,
                    data.idle_invertido,
                    data.entregas,
                    data.qualidade
                ],
                backgroundColor: 'rgba(56, 189, 248, 0.2)', // brand primary (sky 400) alpha
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(56, 189, 248, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(56, 189, 248, 1)',
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#fff',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
            }
        },
        scales: {
            r: {
                min: 0,
                max: 100,
                ticks: {
                    display: false,
                    stepSize: 20
                },
                grid: {
                    circular: true,
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                pointLabels: {
                    color: 'rgba(148, 163, 184, 1)',
                    font: {
                        size: 11
                    }
                },
                angleLines: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            }
        }
    };

    return (
        <div className="w-full h-full min-h-[300px] flex items-center justify-center p-4">
            <Chart type="radar" data={chartData} options={options} />
        </div>
    );
};
