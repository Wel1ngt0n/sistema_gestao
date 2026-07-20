import { InfoTooltip } from './InfoTooltip';
import React, { useMemo } from 'react';
import { EChartWrapper } from './EChartWrapper';
import { useAnalyticsData } from './useAnalyticsData';
import { useDashboardUrlParams } from '../../hooks/useDashboardUrlParams';
import { Target } from 'lucide-react';

const escapeHtml = (value: unknown): string => String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    }[character] ?? character),
);

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
            backgroundColor: '#fff',
            borderColor: '#e4e4e7',
            borderWidth: 1,
            padding: 0,
            textStyle: { color: '#3f3f46' },
            extraCssText: 'border-radius: 8px; box-shadow: 0 16px 30px -18px rgba(24, 24, 27, 0.35);',
            formatter: (params: any) => {
                const [days, score, mrr, name, status] = params.data;
                const mrrFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrr || 0);

                let statusColor = '#128131';
                if (score > 80) statusColor = '#dc2626';
                else if (score > 50) statusColor = '#ff7900';

                const safeName = escapeHtml(name);
                const safeStatus = escapeHtml(status);
                const safeStatusColor = escapeHtml(statusColor);
                const safeScore = escapeHtml(score);
                const safeDays = escapeHtml(days);
                const safeMrr = escapeHtml(mrrFormatted);

                return `
                    <div style="padding: 14px; min-width: 220px; font-family: 'Inter', sans-serif;">
                        <div style="font-weight: 700; font-size: 13px; margin-bottom: 8px; color: #18181b;">
                            ${safeName}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                             <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${safeStatusColor};"></span>
                             <span style="font-size: 11px; font-weight: 700; color: ${safeStatusColor}; text-transform: uppercase; letter-spacing: 0.04em;">${safeStatus}</span>
                        </div>

                        <div style="background: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; padding: 10px; display: grid; gap: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #71717a; font-size: 12px;">Risco</span>
                                <b style="color: #18181b; font-size: 13px;">${safeScore}/100</b>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #71717a; font-size: 12px;">Dias no gargalo</span>
                                <b style="color: #18181b; font-size: 13px;">${safeDays} dias</b>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #71717a; font-size: 12px;">MRR</span>
                                <b style="color: #18181b; font-size: 13px;">${safeMrr}</b>
                            </div>
                        </div>
                    </div>
                `;
            }
        },
        grid: {
            left: '4%',
            right: '4%',
            top: '8%',
            bottom: '13%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: 'Dias na Etapa',
            nameLocation: 'middle',
            nameGap: 30,
            splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.08)' } },
            axisLine: { lineStyle: { color: '#d4d4d8' } },
            axisLabel: { color: '#71717a', fontFamily: 'Inter', fontSize: 11 },
            nameTextStyle: { color: '#71717a', fontSize: 11, fontWeight: 500 }
        },
        yAxis: {
            type: 'value',
            name: 'Score de Risco',
            nameLocation: 'middle',
            nameGap: 40,
            min: 0,
            max: 100,
            splitLine: {
                lineStyle: { type: 'dashed', opacity: 0.2, color: '#a1a1aa' }
            },
            axisLine: { show: false },
            axisLabel: { color: '#71717a', fontFamily: 'Inter', fontSize: 11 },
            nameTextStyle: { color: '#71717a', fontSize: 11, fontWeight: 500 }
        },
        series: [
            {
                type: 'scatter',
                name: 'Lojas',
                symbolSize: (data: any) => {
                    const mrr = data[2];
                    return Math.max(10, Math.min(42, Math.sqrt(mrr || 0) * 0.58));
                },
                data: chartData,
                itemStyle: {
                    color: (params: any) => {
                        const score = params.data[1];
                        if (score >= 80) return 'rgba(220, 38, 38, 0.68)';
                        if (score >= 50) return 'rgba(255, 121, 0, 0.68)';
                        return 'rgba(18, 129, 49, 0.66)';
                    },
                    borderColor: '#fff',
                    borderWidth: 1,
                    shadowBlur: 0,
                    opacity: 0.9,
                },
                markLine: {
                    silent: true,
                    symbol: 'none',
                    label: {
                        position: 'insideEndTop',
                        formatter: '{b}',
                        color: '#52525b',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: [4, 8],
                        borderRadius: 4,
                        backgroundColor: '#f4f4f5'
                    },
                    data: [
                        {
                            yAxis: 80,
                            name: 'CRÍTICO',
                            lineStyle: { color: 'rgba(220, 38, 38, 0.45)', type: 'solid', width: 1.5 }
                        },
                        {
                            yAxis: 50,
                            name: 'ATENÇÃO',
                            lineStyle: { color: 'rgba(255, 121, 0, 0.55)', type: 'dashed', width: 1.5 }
                        }
                    ]
                }
            }
        ]
    };

    return (
        <div className="h-full rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <Target size={16} className="text-[#ff7900]" />
                    Matriz de Risco vs. Tempo
                    <InfoTooltip text="Eixo Y: Score de Risco Calculado. Eixo X: Dias parado no gargalo atual. Bolha: Valor do Contrato (MRR)." />
                </h3>
            </div>
            <p className="mb-4 text-sm text-zinc-500">
                Lojas no topo (risco) e à direita (tempo parado) são críticas. Bolha indica MRR.
            </p>
            <div className="mb-3 flex flex-wrap gap-3 text-xs font-medium text-zinc-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#128131]" /> Baixo</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff7900]" /> Atenção</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-600" /> Crítico</span>
            </div>

            <div className="relative h-[380px] w-full">
                {(!chartData || chartData.length === 0) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50/80 z-10 backdrop-blur-sm rounded-xl">
                        <span className="text-sm font-medium text-slate-500">Aguardando dados...</span>
                    </div>
                )}
                <EChartWrapper option={option} height="100%" />
            </div>
        </div>
    );
};
