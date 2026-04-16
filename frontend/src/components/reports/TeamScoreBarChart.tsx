import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TeamScoreBarChartProps {
    data: any[];
}

export const TeamScoreBarChart: React.FC<TeamScoreBarChartProps> = ({ data }) => {
    if (!data || data.length === 0) return null;

    // Filter and sort by score descending
    const sortedData = [...data]
        .filter(d => d.score !== undefined && d.score.score_final !== undefined)
        .sort((a, b) => b.score.score_final - a.score.score_final);

    const labels = sortedData.map(d => d.implantador);
    const scores = sortedData.map(d => d.score.score_final);
    
    // Assign colors based on zone
    const backgroundColors = scores.map(score => {
        if (score >= 80) return 'rgba(16, 185, 129, 0.8)'; // emerald-500
        if (score >= 60) return 'rgba(245, 158, 11, 0.8)'; // amber-500
        return 'rgba(239, 68, 68, 0.8)'; // red-500
    });

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Score Consolidado',
                data: scores,
                backgroundColor: backgroundColors,
                borderRadius: 4,
            }
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
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
                callbacks: {
                    label: function(context: any) {
                        return `Score: ${context.raw}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    color: 'rgba(148, 163, 184, 1)',
                }
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: 'rgba(100, 116, 139, 1)',
                    maxRotation: 45,
                    minRotation: 45,
                }
            }
        }
    };

    return (
        <div className="w-full h-full min-h-[300px] p-2">
            <Chart type="bar" data={chartData} options={options} />
        </div>
    );
};
