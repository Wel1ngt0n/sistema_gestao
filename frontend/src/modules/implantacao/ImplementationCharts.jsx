import React from 'react';
import ReactECharts from 'echarts-for-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AlertTriangle, HelpCircle } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// --- 1. Risk Scatter Plot (ECharts) ---

export const RiskScatterPlot = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="h-[300px] flex justify-center items-center text-gray-400">Sem dados de risco.</div>;
    }

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                const [days, score, mrr, name] = params.data;
                return `<b>${name}</b><br/>Dias: ${days}<br/>Risco: ${score}<br/>MRR: R$ ${mrr.toFixed(2)}`;
            }
        },
        xAxis: { name: 'Dias Parado', splitLine: { show: false } },
        yAxis: { name: 'Risco (0-100)', max: 100, min: 0 },
        series: [{
            symbolSize: (data) => Math.max(10, Math.min(50, Math.sqrt(data[2]))), // MRR based size
            data: data,
            type: 'scatter',
            itemStyle: {
                color: (params) => {
                    const score = params.data[1];
                    return score > 80 ? '#ef4444' : score > 50 ? '#f59e0b' : '#10b981';
                }
            }
        }]
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                🎯 Matriz de Risco
            </h3>
            <ReactECharts option={option} style={{ height: '350px', width: '100%' }} />
        </div>
    );
};

// --- 2. Financial Forecast Chart (Chart.js) ---

export const FinancialForecastChart = ({ data }) => {
    if (!data) return null;

    const chartData = {
        labels: data.map(d => d.month),
        datasets: [
            {
                label: 'Realizado',
                data: data.map(d => d.realized),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                order: 1
            },
            {
                label: 'Projetado',
                data: data.map(d => d.projected),
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderDash: [5, 5],
                eventType: 'bar', // Should be 'bar' but typescript might complain if strict
                order: 2
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
            <h3 className="font-bold text-gray-900 mb-4">🔮 Forecast Financeiro</h3>
            <div className="h-[300px]">
                <Bar data={chartData} options={options} />
            </div>
        </div>
    );
};

// --- 3. Bottleneck Table ---

export const BottleneckTable = ({ data }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={20} /> Gargalos de Processo
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-4">Etapa</th>
                            <th className="px-6 py-4">Tempo Total</th>
                            <th className="px-6 py-4">Média / Loja</th>
                            <th className="px-6 py-4">Retrabalhos</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{row.step_name}</td>
                                <td className="px-6 py-4 text-gray-600">{row.total_days}d</td>
                                <td className="px-6 py-4 font-bold text-gray-800">{row.avg_days}d</td>
                                <td className="px-6 py-4 text-red-600 font-medium">{row.reopens}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
