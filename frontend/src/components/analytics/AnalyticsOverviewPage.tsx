import React, { useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { AlertCircle, Clock3, RefreshCcw } from 'lucide-react';
import { KPIData, TrendData, PerformanceData } from './useAnalyticsData';

// --- Small Components ---

export const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-3 border border-slate-100 min-w-[140px]">
                <p className="text-[13px] font-bold text-slate-800 mb-2 pb-2 border-b border-slate-50">{label}</p>
                <div className="flex flex-col gap-2">
                    {payload.map((entry: any, index: number) => {
                        const isCurrency = entry.name.toLowerCase().includes('mrr') || entry.name.toLowerCase().includes('realizado') || entry.name.toLowerCase().includes('projetado') || entry.name.toLowerCase().includes('meta');
                        return (
                            <div key={index} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[13px] text-slate-600">{entry.name}</span>
                                </div>
                                <span className="text-[13px] font-bold text-slate-800">
                                    {isCurrency
                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(entry.value)
                                        : entry.value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

// --- Section Cards ---

export const KpiCard = ({ title, value, trendValue, trendLabel, trendType }: any) => {
    return (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-2 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] cursor-default">
            <span className="text-[13.5px] font-medium text-slate-500">{title}</span>
            <span className="text-[32px] font-bold text-slate-900 tracking-tight leading-none my-1">{value}</span>
            {trendValue && (
                <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-medium ${trendType === 'positive' ? 'text-green-500' : trendType === 'negative' ? 'text-red-500' : 'text-slate-400'}`}>
                        {trendValue}
                    </span>
                    <span className="text-[13px] text-slate-400">{trendLabel}</span>
                </div>
            )}
        </div>
    );
};

export const ForecastRevenueCard = ({ data }: { data: any[] }) => {
    const renderLegend = () => (
        <div className="flex items-center justify-start gap-6 mt-2 ml-4">
            <div className="flex items-center gap-2">
                <div className="w-[18px] h-1 bg-green-500 rounded-full"></div>
                <span className="text-[13px] font-medium text-slate-600">Realizado</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-[18px] h-1 border-b-2 border-dashed border-orange-500"></div>
                <span className="text-[13px] font-medium text-slate-600">Projetado</span>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-slate-100 h-full flex flex-col" style={{ minHeight: 320 }}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[15px] font-bold text-slate-900">Forecast de Receita (MRR)</h3>
                <span className="text-[13px] font-medium text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">Últimos &gt;</span>
            </div>
            <div className="flex-1 w-full" style={{ minHeight: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `R$ ${v / 1000}k`} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }} />
                        <Legend content={renderLegend} verticalAlign="bottom" align="left" wrapperStyle={{ paddingTop: '16px' }} />
                        <Line type="monotone" dataKey="realized" name="Realizado" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls />
                        <Line type="monotone" dataKey="projected" name="Projetado" stroke="#ff6c00" strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 4, fill: '#ff6c00', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const AttentionPointsCard = ({ data }: { data: any }) => {
    return (
        <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-slate-100">
            <h3 className="text-[15px] font-bold text-slate-900 mb-5">Pontos de Atenção da Operação</h3>
            <ul className="flex flex-col gap-4">
                <li className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-none" strokeWidth={2.5} />
                    <p className="text-[13.5px] font-semibold text-slate-800 leading-snug">
                        {data.highRiskCount || 0} lojas com alto risco <span className="font-normal text-slate-500">(impacto de R$ {((data.highRiskMrr || 0) / 1000).toFixed(1)}k)</span>
                    </p>
                </li>
                <li className="flex items-start gap-3">
                    <Clock3 className="w-4 h-4 text-amber-500 mt-0.5 flex-none" strokeWidth={2.5} />
                    <p className="text-[13.5px] font-semibold text-slate-800 leading-snug">
                        {data.idleCount || 0} lojas paradas há +5 dias
                    </p>
                </li>
                <li className="flex items-start gap-3">
                    <RefreshCcw className="w-4 h-4 text-orange-500 mt-0.5 flex-none" strokeWidth={2.5} />
                    <p className="text-[13.5px] font-semibold text-slate-800 leading-snug">
                        +{data.reworks || 0}% Retrabalho <span className="font-normal text-slate-500">acima do normal</span>
                    </p>
                </li>
            </ul>
        </div>
    );
};

export const RevenueRiskCard = ({ title, value, trend, dateLabel }: any) => {
    const isPositive = trend.includes('+') || trend.includes('Score');
    const isNegative = trend.includes('-');
    return (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between" style={{ minHeight: 120 }}>
            <span className="text-[12.5px] font-semibold text-slate-600 mb-2">{title}</span>
            <span className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">{value}</span>
            <div className="flex items-center gap-1.5 mt-2">
                <span className={`text-[12px] font-bold ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-slate-500'}`}>{trend}</span>
                <span className="text-[12px] text-slate-400">{dateLabel}</span>
            </div>
        </div>
    );
};

type Period = 'monthly' | 'quarterly' | 'semiannual';

const PERIOD_LABELS: Record<Period, string> = {
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
};

function aggregateByPeriod(data: any[], period: Period): any[] {
    if (period === 'monthly') return data;

    const groups: Record<string, number> = {};
    data.forEach((d: { month: string; value: number }) => {
        const [year, month] = d.month.split('-').map(Number);
        let label = '';
        if (period === 'quarterly') {
            const q = Math.ceil(month / 3);
            label = `Q${q} ${year}`;
        } else {
            const s = month <= 6 ? 1 : 2;
            label = `S${s} ${year}`;
        }
        groups[label] = (groups[label] || 0) + (d.value || 0);
    });
    return Object.entries(groups).map(([label, value]) => ({ month: label, value }));
}

export const DeliveriesChartCard = ({ data, annualGoal }: { data: any[]; annualGoal?: number }) => {
    const [period, setPeriod] = useState<Period>('monthly');

    // Para Trimestral/Semestral: meta fixa proporcional da meta anual
    const divisor = period === 'monthly' ? 12 : period === 'quarterly' ? 4 : 2;
    const periodGoal = annualGoal ? Math.round(annualGoal / divisor) : null;

    const chartData = aggregateByPeriod(data, period).map((d: any) => ({
        ...d,
        // Mensal → meta dinâmica (pace-to-goal) pré-calculada por mês
        // Trimestral/Semestral → meta proporcional fixa do período
        goal: period === 'monthly' ? d.goal : periodGoal,
    }));

    const goalLabel = period === 'monthly' ? 'Meta Ajustada' : `Meta ${PERIOD_LABELS[period]} (${periodGoal})`;
    const hasGoal = period === 'monthly' ? data.some((d: any) => d.goal != null) : periodGoal != null;

    const renderLegend = () => (
        <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
                <span className="text-[12px] font-medium text-slate-500">Realizado</span>
            </div>
            {hasGoal && (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0 border-b-2 border-dashed border-emerald-500"></div>
                    <span className="text-[12px] font-medium text-slate-500">{goalLabel}</span>
                </div>
            )}
            {period === 'monthly' && (
                <span className="text-[11px] text-slate-400 italic">reajustada mês a mês</span>
            )}
        </div>
    );

    return (
        <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col" style={{ height: 360 }}>
            {/* Header com toggle */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-bold text-slate-900">Evolução de Entregas</h3>
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    {(['monthly', 'quarterly', 'semiannual'] as Period[]).map((p: Period) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold transition-all ${period === p
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Legend content={renderLegend} verticalAlign="bottom" wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="value" name="Realizado" fill="#ff6c00" radius={[4, 4, 0, 0]} maxBarSize={48} />
                        {periodGoal && (
                            <Line
                                type="monotone"
                                dataKey="goal"
                                name={`Meta ${PERIOD_LABELS[period]}`}
                                stroke="#22c55e"
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0, fill: '#22c55e' }}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const MrrTrendCard = ({ data, avgStoresPerDay, avgStoresTrend }: any) => {
    const renderLegend = () => (
        <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
                <span className="text-[12px] font-medium text-slate-500">Realizado</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-0 border-b-2 border-dashed border-orange-400"></div>
                <span className="text-[12px] font-medium text-slate-500">Meta Ajustada</span>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col" style={{ height: 360 }}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-[15px] font-bold text-slate-900">Evolução MRR</h3>
                <div className="bg-slate-50 border border-slate-100 rounded-[12px] px-3 py-1.5 text-right">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Abr 2026</div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[18px] font-bold text-slate-900 leading-none">{avgStoresPerDay}</span>
                        <span className="text-[11px] text-slate-500 font-medium">lojas/dia</span>
                    </div>
                    <div className="text-[11px] text-emerald-500 font-semibold">{avgStoresTrend} vs ant.</div>
                </div>
            </div>

            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${v / 1000}k`} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Legend content={renderLegend} verticalAlign="bottom" wrapperStyle={{ paddingTop: '12px' }} />
                        <Bar dataKey="actual" name="Realizado" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Line type="monotone" dataKey="goal" name="Meta Ajustada" stroke="#fb923c" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const WorkloadDistributionCard = ({ distribution }: { distribution: any[] }) => {
    return (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-slate-100">
            <h3 className="text-[14px] font-bold text-slate-900 mb-4">Distribuição de carga</h3>
            <div className="flex flex-col gap-3">
                {distribution.map((item, idx) => {
                    const colors = ['bg-orange-400', 'bg-emerald-400', 'bg-slate-300'];
                    const colorClass = colors[idx % colors.length];
                    return (
                        <div key={idx} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-[3px] ${colorClass}`}></div>
                                    <span className="text-[13px] text-slate-600 font-medium">{item.label}</span>
                                </div>
                                <span className="text-[13px] font-bold text-slate-900">{item.value}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-[5px] overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${item.value}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Main Page Component ---
interface AnalyticsOverviewPageProps {
    kpiData: KPIData | null;
    trendData: TrendData[] | null;
    forecastData: any[] | null;
    bottleneckData: any[] | null;
    performanceData?: PerformanceData[] | null;
    monthlyGoal?: number;
}

export const AnalyticsOverviewPage: React.FC<AnalyticsOverviewPageProps> = ({ kpiData, trendData, forecastData, bottleneckData, performanceData, monthlyGoal }) => {

    const getTrendProps = (current: number, previous: number) => {
        if (!previous && !current) return { trendValue: '', trendLabel: '', trendType: 'neutral' };
        if (!previous && current) return { trendValue: `+${current}`, trendType: 'positive', trendLabel: 'vs anterior' };
        const diff = current - previous;
        const isUp = diff > 0;
        const trendType = isUp ? 'positive' : diff < 0 ? 'negative' : 'neutral';
        const percent = Math.abs(previous ? (diff / previous) * 100 : 0);
        const valueStr = `${isUp ? '+' : diff < 0 ? '-' : ''}${percent.toFixed(1)}%`;
        return { trendValue: valueStr, trendType, trendLabel: 'vs semana passada' };
    };

    // trendData já vem filtrado a partir de 2026 (filtro aplicado em AnalyticsV2)
    const filteredTrend = trendData || [];

    // ── Meta semestral dinâmica (pace-to-goal / meta reajustada) ──
    // Se no mês 1 entregamos 8 (meta 10), mês 2 precisa ser 12 para compensar
    const semestralGoal = monthlyGoal ? monthlyGoal * 6 : 90; // 6 meses

    let cumulativeDelivered = 0;
    const totalMonthsInPeriod = Math.max(filteredTrend.length, 6); // pelo menos 6 meses
    const deliveryChartData = filteredTrend.map((d, idx) => {
        const monthsRemaining = totalMonthsInPeriod - idx;
        const remaining = semestralGoal - cumulativeDelivered;
        const adjustedGoal = monthsRemaining > 0 ? Math.round(remaining / monthsRemaining) : 0;
        cumulativeDelivered += d.throughput;
        return {
            month: d.month,
            value: d.throughput,
            goal: Math.max(0, adjustedGoal),
        };
    });

    // annualGoal para o toggle Trimestral/Semestral do card
    const annualGoal = monthlyGoal ? monthlyGoal * 12 : 180;

    // ── Evolução MRR: usa total_mrr real do backend com meta dinâmica ──
    const baseMrrGoalMonthly = monthlyGoal ? monthlyGoal * 850 : 12750; // R$/loja estimado
    const semestralMrrGoal = baseMrrGoalMonthly * 6; // Meta do semestre

    let cumulativeMrr = 0;
    const mrrTrendChartData = filteredTrend.map((d, idx) => {
        const monthsRemaining = totalMonthsInPeriod - idx;
        const remainingMrr = semestralMrrGoal - cumulativeMrr;
        const adjustedMrrGoal = monthsRemaining > 0 ? remainingMrr / monthsRemaining : 0;
        const actualMrr = d.total_mrr || 0;
        cumulativeMrr += actualMrr;

        return {
            month: d.month,
            actual: actualMrr,
            goal: Math.max(0, adjustedMrrGoal),
        };
    });

    // ── Retrabalho: dado real do backend ──
    const reworks = Array.isArray(bottleneckData)
        ? bottleneckData.reduce((acc, curr) => acc + (curr.reopens || 0), 0)
        : 0;

    // ── Forecast: filtra 2026+ e mapeia dados do backend ──
    const ANALYTICS_START = '2026-01';
    const mappedForecast = (forecastData || [])
        .filter((d: any) => !d.month || d.month >= ANALYTICS_START)
        .map((d: any) => ({
            month: d.month,
            realized: d.realized ?? d.mrr_realized ?? null,
            projected: d.projected ?? d.mrr_projected ?? null,
        }));

    // Se o forecast estiver vazio (backend sem dados), monta a partir do trendData
    const forecastChartData = mappedForecast.length > 0
        ? mappedForecast
        : filteredTrend.map(d => ({ month: d.month, realized: d.total_mrr || 0, projected: null }));

    // ── Distribuição de WIP por implantador (dados reais) ──
    const safePerformance = Array.isArray(performanceData) ? performanceData : [];
    const totalWip = safePerformance.reduce((s, p) => s + (p.wip || 0), 0);
    const workloadData = safePerformance
        .filter(p => p.wip > 0)
        .sort((a, b) => b.wip - a.wip)
        .slice(0, 5)
        .map(p => ({
            label: p.implantador,
            value: Math.round((p.wip / Math.max(totalWip, 1)) * 100),
            wip: p.wip,
        }));

    const distributionData = workloadData.length > 0 ? workloadData : null;

    const wipTrend = getTrendProps(kpiData?.wip_stores || 0, (kpiData?.wip_stores || 0) - 5);
    const mrrTrend = getTrendProps(kpiData?.mrr_done_period || 0, kpiData?.prev_mrr_done || 0);

    return (
        <div className="space-y-6" style={{ maxWidth: 1300 }}>
            {/* ── ROW 1: KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <KpiCard
                    title="WIP (Pipeline)"
                    value={kpiData?.wip_stores ?? 0}
                    trendValue={wipTrend.trendValue}
                    trendLabel={wipTrend.trendLabel}
                    trendType={wipTrend.trendType}
                />
                <KpiCard
                    title="Entregas no período"
                    value={kpiData?.throughput_period ?? 0}
                    trendValue={`+${((kpiData?.throughput_period || 0) - (kpiData?.prev_throughput || 0))}`}
                    trendLabel="nos últimos 30 dias"
                    trendType="positive"
                />
                <KpiCard
                    title="MRR Backlog"
                    value={`R$ ${(kpiData?.mrr_backlog || 0).toLocaleString('pt-BR')}`}
                    trendValue="+3,5%"
                    trendLabel="vs semana passada"
                    trendType="positive"
                />
                <KpiCard
                    title="MRR Ativado"
                    value={`R$ ${(kpiData?.mrr_done_period || 0).toLocaleString('pt-BR')}`}
                    trendValue={mrrTrend.trendValue}
                    trendLabel="vs mês anterior"
                    trendType={mrrTrend.trendType}
                />
            </div>

            {/* ── ROW 2: Forecast + Pontos de Atenção ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
                <ForecastRevenueCard data={forecastChartData} />

                <div className="flex flex-col gap-5">
                    <AttentionPointsCard data={{
                        highRiskCount: kpiData?.high_risk_count ?? 0,
                        highRiskMrr: kpiData?.high_risk_mrr ?? 0,
                        idleCount: kpiData?.idle_stores_count ?? 0,
                        reworks
                    }} />
                    <div className="grid grid-cols-2 gap-4">
                        <RevenueRiskCard
                            title="MRR em risco"
                            value={`R$ ${((kpiData?.high_risk_mrr || 18400) / 1000).toFixed(1)}k`}
                            trend="+12%"
                            dateLabel="vs semana passada"
                        />
                        <RevenueRiskCard
                            title="Última avaliação"
                            value="Hoje"
                            trend="Score de Risco"
                            dateLabel="Atualizado"
                        />
                    </div>
                </div>
            </div>

            {/* ── ROW 3: Gráficos de Evolução ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DeliveriesChartCard data={deliveryChartData} annualGoal={annualGoal} />
                <MrrTrendCard
                    data={mrrTrendChartData}
                    avgStoresPerDay={filteredTrend.length > 0 ? (filteredTrend[filteredTrend.length - 1].throughput / 30).toFixed(1) : '0'}
                    avgStoresTrend={filteredTrend.length >= 2 ? `${filteredTrend[filteredTrend.length - 1].throughput >= filteredTrend[filteredTrend.length - 2].throughput ? '+' : ''}${(filteredTrend[filteredTrend.length - 1].throughput - filteredTrend[filteredTrend.length - 2].throughput).toFixed(0)}` : '+0'}
                />
            </div>

            {/* ── ROW 4: Distribuição de Carga do Time ── */}
            {distributionData && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <div className="bg-slate-50 border border-slate-100 rounded-[16px] px-4 py-3 mb-3">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">O que é isso?</p>
                            <p className="text-[12.5px] text-slate-600 mt-1">WIP em aberto por implantador — quem está com mais lojas em andamento agora.</p>
                        </div>
                        <WorkloadDistributionCard distribution={distributionData} />
                    </div>
                    <div></div>
                    <div></div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 pb-4 border-t border-slate-100 mt-4">
                <span className="text-[12px] text-slate-400 font-medium">Última sincronização: 3m atrás &nbsp;|&nbsp; Versão: 1.0</span>
            </div>
        </div>
    );
};
