import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { PerformanceData } from './useAnalyticsData';
import { Users } from 'lucide-react';

interface Props {
    data: PerformanceData[];
}

export const EfficiencyImplantadorCard: React.FC<Props> = ({ data }) => {
    // Ordena por cycle time do maior pro menor, ou OTD
    const sortedData = [...data].sort((a, b) => b.avg_cycle_time - a.avg_cycle_time).slice(0, 8); // top 8

    return (
        <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl border border-slate-200 dark:border-zinc-700/50 shadow-sm h-full max-h-[500px]">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wide text-sm opacity-80">
                <Users size={18} className="text-blue-500" />
                Eficiência por Implantador (Cycle Time vs OTD)
            </h3>

            <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={sortedData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="implantador"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            dy={10}
                        />
                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            tickFormatter={(v) => `${v}d`}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar
                            yAxisId="left"
                            dataKey="avg_cycle_time"
                            name="Cycle Time Médio (dias)"
                            fill="#60a5fa"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="otd_percentage"
                            name="OTD no Prazo (%)"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
