import { InfoTooltip } from './InfoTooltip';
import React, { useMemo } from 'react';
import { EChartWrapper } from './EChartWrapper';
import { useAnalyticsData } from './useAnalyticsData';
import { useDashboardUrlParams } from '../../hooks/useDashboardUrlParams';
import * as echarts from 'echarts'; // Import full echarts for Gradient

export const RiskScatterPlot: React.FC = () => {
    const { filters } = useDashboardUrlParams();
    const { riskData } = useAnalyticsData(filters);

    const chartData = useMemo(() => {
        if (!riskData || riskData.length === 0) return [];
        return riskData;
    }, [riskData]);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(24, 24, 27, 0.8)', // Zinc-900 (High Opacity)
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 0,
            textStyle: { color: '#f4f4f5' },
            extraCssText: 'backdrop-filter: blur(12px); border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3);',
            formatter: (params: any) => {
                const [days, score, mrr, name, status] = params.data;
                const mrrFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrr || 0);

                let statusColor = '#10b981'; // Emerald
                if (score > 80) statusColor = '#ef4444'; // Red
                else if (score > 50) statusColor = '#f97316'; // Orange (Nexus)

                return `
                    <div style="padding: 16px; min-width: 220px; font-family: 'Inter', sans-serif;">
                        <div style="font-weight: 800; font-size: 14px; margin-bottom: 8px; color: #fff; letter-spacing: -0.02em;">
                            ${name}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                             <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor}; box-shadow: 0 0 8px ${statusColor};"></span>
                             <span style="font-size: 12px; font-weight: 600; color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.05em;">${status}</span>
                        </div>
                        
                        <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px; display: grid; gap: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #a1a1aa; font-size: 12px;">Risco</span>
                                <b style="color: #fff; font-size: 13px;">${score}/100</b>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #a1a1aa; font-size: 12px;">Tempo (Gargalo)</span>
                                <b style="color: #fff; font-size: 13px;">${days} dias</b>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #a1a1aa; font-size: 12px;">MRR</span>
                                <b style="color: #fff; font-size: 13px;">${mrrFormatted}</b>
                            </div>
                        </div>
                    </div>
                `;
            }
        },
        grid: {
            left: '5%',
            right: '5%',
            top: '8%',
            bottom: '12%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: 'Dias na Etapa',
            nameLocation: 'middle',
            nameGap: 30,
            splitLine: { show: false }, // Cleaner look
            axisLine: { lineStyle: { color: '#52525b' } }, // Zinc-600
            axisLabel: { color: '#a1a1aa', fontFamily: 'Inter' } // Zinc-400
        },
        yAxis: {
            type: 'value',
            name: 'Score de Risco',
            nameLocation: 'middle',
            nameGap: 40,
            min: 0,
            max: 100,
            splitLine: {
                lineStyle: { type: 'dashed', opacity: 0.15, color: '#a1a1aa' }
            },
            axisLine: { show: false },
            axisLabel: { color: '#a1a1aa', fontFamily: 'Inter' }
        },
        series: [
            {
                type: 'scatter',
                name: 'Lojas',
                symbolSize: (data: any) => {
                    const mrr = data[2];
                    return Math.max(12, Math.min(70, Math.sqrt(mrr || 0) * 0.9));
                },
                data: chartData,
                itemStyle: {
                    color: (params: any) => {
                        const score = params.data[1];
                        let colorStops;

                        if (score >= 80) { // High Risk (Red)
                            colorStops = [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#dc2626' }];
                        } else if (score >= 50) { // Medium (Orange)
                            colorStops = [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#f97316' }];
                        } else { // Low (Emerald)
                            colorStops = [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' }];
                        }

                        return new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
                            ...colorStops,
                        ]);
                    },
                    shadowBlur: 15,
                    shadowColor: 'rgba(0, 0, 0, 0.3)',
                    opacity: 0.9
                },
                markLine: {
                    silent: true,
                    symbol: 'none',
                    label: {
                        position: 'insideEndTop',
                        formatter: '{b}',
                        color: '#71717a', // Zinc-500
                        fontSize: 11,
                        fontWeight: 'bold',
                        padding: [4, 8],
                        borderRadius: 4,
                        backgroundColor: 'rgba(24, 24, 27, 0.5)'
                    },
                    data: [
                        {
                            yAxis: 80,
                            name: 'CRÍTICO',
                            lineStyle: { color: '#ef4444', type: 'solid', width: 2, shadowBlur: 5, shadowColor: '#ef4444' }
                        },
                        {
                            yAxis: 50,
                            name: 'ATENÇÃO',
                            lineStyle: { color: '#f97316', type: 'dashed', width: 1.5 }
                        }
                    ]
                }
            }
        ]
    };

    return (
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700/50 h-full hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span>🎯</span> Matriz de Risco vs. Tempo
                    <InfoTooltip text="Eixo Y: Score de Risco Calculado. Eixo X: Dias parado no gargalo atual. Bolha: Valor do Contrato (MRR)." />
                </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mb-4">
                Lojas no topo (risco) e à direita (tempo parado) são críticas. Bolha indica MRR.
            </p>

            <div className="relative w-full h-[400px]">
                {(!chartData || chartData.length === 0) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-800/80 z-10 backdrop-blur-sm rounded-xl">
                        <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">Aguardando dados...</span>
                    </div>
                )}
                <EChartWrapper option={option} height="100%" />
            </div>
        </div>
    );
};
