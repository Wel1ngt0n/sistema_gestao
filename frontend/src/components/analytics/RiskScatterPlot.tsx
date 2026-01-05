import { InfoTooltip } from './InfoTooltip';
import React, { useMemo } from 'react';
import { EChartWrapper } from './EChartWrapper';
import { useAnalyticsData } from './useAnalyticsData';
import { useDashboardUrlParams } from '../../hooks/useDashboardUrlParams';

export const RiskScatterPlot: React.FC = () => {
    const { filters } = useDashboardUrlParams();
    // Agora useAnalyticsData retorna riskData
    const { riskData } = useAnalyticsData(filters);

    const chartData = useMemo(() => {
        if (!riskData || riskData.length === 0) return [];
        return riskData;
    }, [riskData]);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            borderColor: '#475569',
            textStyle: { color: '#f8fafc' },
            formatter: (params: any) => {
                const [days, score, mrr, name, status] = params.data;
                const mrrFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrr || 0);
                return `
                    <div style="font-family: sans-serif;">
                        <div style="font-weight: bold; border-bottom: 1px solid #475569; padding-bottom: 4px; margin-bottom: 4px;">
                            ${name}
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 10px;">
                            <span>Status:</span> <b style="color: ${score > 80 ? '#ef4444' : score > 50 ? '#f59e0b' : '#10b981'}">${status}</b>
                        </div>
                        <div style="display: flex; justify-content: space-between; gap: 10px;">
                            <span>Risco:</span> <b>${score}/100</b>
                        </div>
                         <div style="display: flex; justify-content: space-between; gap: 10px;">
                            <span>Tempo na Etapa:</span> <b>${days} dias</b>
                        </div>
                         <div style="display: flex; justify-content: space-between; gap: 10px;">
                            <span>MRR:</span> <b>${mrrFormatted}</b>
                        </div>
                    </div>
                `;
            }
        },
        grid: {
            left: '8%',
            right: '8%',
            top: '10%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: 'Dias na Etapa (Gargalo)',
            nameLocation: 'center',
            nameGap: 30,
            splitLine: { show: false },
            axisLine: { lineStyle: { color: '#94a3b8' } },
            axisLabel: { color: '#64748b' }
        },
        yAxis: {
            type: 'value',
            name: 'Score de Risco (0-100)',
            nameLocation: 'center',
            nameGap: 40,
            min: 0,
            max: 100,
            splitLine: {
                lineStyle: { type: 'dashed', opacity: 0.1, color: '#94a3b8' }
            },
            axisLine: { show: false },
            axisLabel: { color: '#64748b' }
        },
        series: [
            {
                type: 'scatter',
                name: 'Lojas',
                symbolSize: (data: any) => {
                    const mrr = data[2];
                    // Escala logaritmica suave para bolhas não ficarem gigantes nem sumirem
                    return Math.max(8, Math.min(60, Math.sqrt(mrr || 0) * 0.8));
                },
                data: chartData,
                itemStyle: {
                    color: (params: any) => {
                        const score = params.data[1];
                        if (score >= 80) return '#ef4444'; // High Risk
                        if (score >= 50) return '#f59e0b'; // Medium Risk
                        return '#10b981'; // Low Risk
                    },
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.2)',
                    opacity: 0.8
                },
                markLine: {
                    silent: true,
                    symbol: 'none',
                    label: {
                        position: 'insideEndTop',
                        formatter: '{b}',
                        color: '#64748b',
                        fontSize: 10
                    },
                    data: [
                        {
                            yAxis: 80,
                            name: 'LIMITE CRÍTICO',
                            lineStyle: { color: '#ef4444', type: 'solid', width: 1 }
                        },
                        {
                            yAxis: 50,
                            name: 'ATENÇÃO',
                            lineStyle: { color: '#f59e0b', type: 'dashed' }
                        }
                    ]
                },
                markArea: {
                    silent: true,
                    itemStyle: {
                        color: 'rgba(239, 68, 68, 0.05)'
                    },
                    data: [
                        [
                            { yAxis: 80, xAxis: 30 }, // Quadrante Crítico: Risco > 80 AND Dias > 30 (exemplo)
                            { yAxis: 100, xAxis: 9999 } // Até o infinito
                        ]
                    ]
                }
            }
        ]
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span>🎯</span> Matriz de Risco vs. Tempo
                    <InfoTooltip text="Eixo Y: Score de Risco Calculado. Eixo X: Dias parado no gargalo atual. Bolha: Valor do Contrato (MRR)." />
                </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Lojas posicionadas no topo (alto risco) e à direita (muito tempo parado) exigem ação imediata.
                O tamanho da bolha representa o valor do contrato (MRR).
            </p>

            <div className="relative w-full h-[400px]">
                {(!chartData || chartData.length === 0) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800/50 z-10 backdrop-blur-sm">
                        <span className="text-sm font-medium text-slate-500">Aguardando dados...</span>
                        <span className="text-xs text-slate-400 mt-1">Verifique se o snapshot diário foi gerado.</span>
                    </div>
                )}
                <EChartWrapper option={option} height="100%" />
            </div>
        </div>
    );
};
