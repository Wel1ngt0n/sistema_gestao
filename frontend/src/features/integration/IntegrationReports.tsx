import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ChevronDown, ChevronUp, Download, FileText, Users, CheckCircle, Clock, Target, TrendingUp, TrendingDown, BarChart3, Building2, Layers, Bug } from 'lucide-react';

interface StoreReport {
    id: number;
    name: string;
    integrador: string;
    rede: string | null;
    finished_at: string;
    mrr: number;
    days: number;
    points: number;
    tipo: string;
    on_time: number;
    doc_status: string;
    bugs: number;
    churn_risk: boolean;
}

interface IntegradorStats {
    name: string;
    stores: number;
    store_names: string[];
    mrr: number;
    avg_days: number;
    on_time_pct: number;
    points: number;
    bugs: number;
}

interface MonthlyStats {
    total_stores: number;
    total_mrr: number;
    total_points: number;
    avg_days: number;
    median_days: number;
    ticket_medio: number;
    on_time_count: number;
    on_time_pct: number;
    total_bugs: number;
}

interface TypeBreakdown {
    matriz_count: number;
    filial_count: number;
    matriz_mrr: number;
    filial_mrr: number;
    matriz_avg_days: number;
    filial_avg_days: number;
}

interface RedeData {
    rede: string;
    mrr: number;
    count: number;
    store_names: string[];
}

interface Highlights {
    fastest: { name: string; days: number } | null;
    slowest: { name: string; days: number } | null;
    top_mrr: { name: string; mrr: number } | null;
    late_stores: { name: string; days: number }[];
}

interface Variation {
    mrr_pct: number;
    stores_pct: number;
    days_pct: number;
}

interface AnnualGoals {
    mrr_target: number;
    mrr_ytd: number;
    mrr_pct: number;
    projection_mrr: string;
    stores_target: number;
    stores_ytd: number;
    stores_pct: number;
    projection_stores: string;
    points_ytd: number;
}

interface WipOverview {
    wip_count: number;
    mrr_backlog: number;
    board_stages: { stage: string; count: number }[];
}

interface MonthlyData {
    month: string;
    stats: MonthlyStats;
    type_breakdown: TypeBreakdown;
    mrr_by_rede: RedeData[];
    highlights: Highlights;
    variation: Variation | null;
    integradores: IntegradorStats[];
    stores: StoreReport[];
}

interface ReportResponse {
    annual_goals: AnnualGoals;
    wip_overview: WipOverview;
    months: MonthlyData[];
}

export default function IntegrationReports() {
    const [reportData, setReportData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/integration/reports/monthly');
            setReportData(response.data);
            if (response.data.months?.length > 0) {
                setExpandedMonth(response.data.months[0].month);
            }
        } catch (error) {
            console.error("Erro ao carregar relatório mensal de integração", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMonth = (month: string) => {
        setExpandedMonth(expandedMonth === month ? null : month);
    };

    const handleExportGeneral = async () => {
        try {
            const response = await api.get('/api/integration/reports/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_integracao_geral_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert("Erro ao baixar o relatório geral.");
        }
    };

    const handleExportMonthCsv = (monthData: MonthlyData) => {
        const monthLabel = new Date(monthData.month + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const sep = ';';
        const lines: string[] = [];
        const addLine = (...cols: (string | number | null | undefined)[]) => {
            lines.push(cols.map(c => c === null || c === undefined ? '' : String(c)).join(sep));
        };
        const addEmpty = () => lines.push('');
        const fmtBrl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

        const goals = reportData?.annual_goals;
        const wip = reportData?.wip_overview;

        // 1. HEADER
        addLine('RELATÓRIO MENSAL DE INTEGRAÇÃO');
        addLine(`Período: ${monthLabel}`);
        addLine(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
        addEmpty();

        // 2. METAS ANUAIS
        if (goals) {
            addLine('═══ METAS ANUAIS (YTD) ═══');
            addEmpty();
            addLine('Métrica', 'Atual', 'Meta', 'Progresso', 'Projeção');
            addLine('MRR Total', fmtBrl(goals.mrr_ytd), fmtBrl(goals.mrr_target), `${goals.mrr_pct}%`, goals.projection_mrr);
            addLine('Lojas Entregues', goals.stores_ytd, goals.stores_target, `${goals.stores_pct}%`, goals.projection_stores);
            addLine('Pontos Acumulados', goals.points_ytd.toFixed(1).replace('.', ','));
            addEmpty();
        }

        // 3. RESUMO EXECUTIVO
        addLine('═══ RESUMO EXECUTIVO DO MÊS ═══');
        addEmpty();
        addLine('Métrica', 'Valor');
        addLine('Lojas Entregues', monthData.stats.total_stores);
        addLine('Bugs Pós-Live', monthData.stats.total_bugs);
        addLine('MRR Adicionado', fmtBrl(monthData.stats.total_mrr));
        addLine('Ticket Médio', fmtBrl(monthData.stats.ticket_medio));
        addLine('Tempo Médio (dias)', monthData.stats.avg_days.toFixed(1).replace('.', ','));
        addLine('Mediana (dias)', monthData.stats.median_days.toFixed(1).replace('.', ','));
        addLine('No Prazo', `${monthData.stats.on_time_count} de ${monthData.stats.total_stores} (${monthData.stats.on_time_pct}%)`);
        addEmpty();

        // 4. WIP
        if (wip) {
            addLine('═══ WIP — LOJAS EM INTEGRAÇÃO ═══');
            addEmpty();
            addLine('Total em Progresso', wip.wip_count);
            addLine('MRR em Backlog', fmtBrl(wip.mrr_backlog));
            addEmpty();
            if (wip.board_stages.length > 0) {
                addLine('Etapa do Board', 'Qtd Lojas');
                wip.board_stages.forEach(st => addLine(st.stage, st.count));
                addEmpty();
            }
        }

        // 5. VARIAÇÃO MENSAL
        if (monthData.variation) {
            const v = monthData.variation;
            addLine('═══ VARIAÇÃO VS MÊS ANTERIOR ═══');
            addEmpty();
            addLine('Métrica', 'Variação %');
            addLine('Lojas Entregues', `${v.stores_pct >= 0 ? '+' : ''}${v.stores_pct}%`);
            addLine('Tempo Médio', `${v.days_pct >= 0 ? '+' : ''}${v.days_pct}%`);
            addLine('MRR', `${v.mrr_pct >= 0 ? '+' : ''}${v.mrr_pct}%`);
            addEmpty();
        }

        // 6. INSIGHTS
        addLine('═══ INSIGHTS DO MÊS ═══');
        addEmpty();
        if (monthData.highlights.fastest) addLine('Mais rápida', `${monthData.highlights.fastest.name} (${monthData.highlights.fastest.days} dias)`);
        if (monthData.highlights.slowest) addLine('Mais longa', `${monthData.highlights.slowest.name} (${monthData.highlights.slowest.days} dias)`);
        addLine('Fora do prazo', monthData.highlights.late_stores.length > 0
            ? monthData.highlights.late_stores.map(s => `${s.name} (${s.days}d)`).join(' | ')
            : 'Nenhuma');
        addEmpty();

        // 7. BREAKDOWN POR TIPO
        const tb = monthData.type_breakdown;
        addLine('═══ BREAKDOWN POR TIPO ═══');
        addEmpty();
        addLine('Tipo', 'Qtd', 'MRR', 'Média Dias');
        addLine('Matriz', tb.matriz_count, fmtBrl(tb.matriz_mrr), tb.matriz_avg_days.toFixed(1).replace('.', ','));
        addLine('Filial', tb.filial_count, fmtBrl(tb.filial_mrr), tb.filial_avg_days.toFixed(1).replace('.', ','));
        addEmpty();

        // 8. MRR POR REDE
        if (monthData.mrr_by_rede.length > 0) {
            addLine('═══ MRR POR REDE ═══');
            addEmpty();
            addLine('Rede', 'Qtd Lojas', 'MRR', 'Lojas');
            monthData.mrr_by_rede.forEach(r => addLine(`"${r.rede}"`, r.count, fmtBrl(r.mrr), `"${r.store_names.join(', ')}"`));
            addEmpty();
        }

        // 9. RANKING POR INTEGRADOR
        if (monthData.integradores.length > 0) {
            addLine('═══ RANKING POR INTEGRADOR ═══');
            addEmpty();
            addLine('#', 'Integrador', 'Lojas', 'Bugs', 'Média Dias', 'Taxa % No Prazo', 'Pontos', 'Lojas Entregues');
            monthData.integradores.forEach((imp, idx) => {
                addLine(idx + 1, `"${imp.name}"`, imp.stores, imp.bugs, imp.avg_days.toFixed(1).replace('.', ','),
                    `${imp.on_time_pct}%`, imp.points.toFixed(1).replace('.', ','), `"${imp.store_names.join(', ')}"`);
            });
            addEmpty();
        }

        // 10. DETALHAMENTO POR LOJA
        addLine('═══ DETALHAMENTO POR LOJA ═══');
        addEmpty();
        addLine('#', 'Loja', 'Integrador', 'Rede', 'Tipo', 'Data Conclusão', 'Dias', 'Prazo', 'Bugs', 'Status Doc');
        monthData.stores.forEach((s, idx) => {
            addLine(idx + 1, `"${s.name}"`, `"${s.integrador}"`, `"${s.rede}"`, s.tipo, s.finished_at,
                s.days.toFixed(1).replace('.', ','), s.on_time ? '✅ Sim' : '⚠️ Não', s.bugs, `"${s.doc_status || '-'}"`);
        });
        addEmpty();
        addLine('FIM DO RELATÓRIO');

        const BOM = '\uFEFF';
        const csvContent = BOM + lines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `relatorio_integracao_${monthData.month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="p-8 text-center text-zinc-400">Carregando relatório de integrações...</div>;
    if (!reportData) return <div className="p-8 text-center text-zinc-400">Sem dados disponíveis.</div>;

    const { annual_goals: goals, wip_overview: wip, months: data } = reportData;

    const projLabel = (ym: string) => {
        try { return new Date(ym + '-02').toLocaleString('pt-BR', { month: 'short', year: 'numeric' }); }
        catch { return ym; }
    };

    return (
        <div className="p-0 space-y-8 bg-zinc-50#09090b] min-h-screen text-zinc-900 transition-colors duration-300">
            <header className="px-6 md:px-10 pt-6 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-600">
                        Relatório Mensal de Integração
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Histórico de entregas, qualidade técnica (Bugs) e eficiência.
                    </p>
                </div>

                <button
                    onClick={handleExportGeneral}
                    className="flex items-center gap-2 px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    <Download size={20} />
                    Exportar Base Excel
                </button>
            </header>

            {/* ═══ ANNUAL GOALS ═══ */}
            <div className="px-6 md:px-10">
                <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <Target className="text-orange-500" size={20} />
                        <h2 className="text-lg font-bold text-zinc-800">Metas Anuais 2026 (Integração)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Stores Goal */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-semibold text-zinc-600">Integrações Concluídas</span>
                                <span className="text-xs text-zinc-500">Meta: {goals.stores_target} lojas</span>
                            </div>
                            <div className="relative h-4 bg-zinc-200 rounded-full overflow-hidden">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-1000"
                                    style={{ width: `${Math.min(goals.stores_pct, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span className="font-semibold text-orange-600">
                                    {goals.stores_ytd} lojas ({goals.stores_pct}%)
                                </span>
                                <span>Projeção: {projLabel(goals.projection_stores)}</span>
                            </div>
                        </div>

                        {/* Pontos YTD */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-semibold text-zinc-600">Pontos Acumulados</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <BarChart3 size={24} className="text-orange-500" />
                                <span className="text-2xl font-bold text-zinc-800">{goals.points_ytd}</span>
                            </div>
                        </div>
                    </div>

                    {/* WIP */}
                    <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-wrap gap-6">
                        {wip && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Layers size={14} className="text-zinc-500" />
                                    <span className="text-sm text-zinc-500">Em Integração:</span>
                                    <span className="font-bold text-zinc-800">{wip.wip_count} lojas</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building2 size={14} className="text-zinc-500" />
                                    <span className="text-sm text-zinc-500">MRR Backlog:</span>
                                    <span className="font-bold text-zinc-800">
                                        R$ {wip.mrr_backlog.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {wip && wip.board_stages.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-100">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Estágios</p>
                            <div className="flex flex-wrap gap-2">
                                {wip.board_stages.map(st => (
                                    <span key={st.stage} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-lg text-xs font-medium text-zinc-700">
                                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                                        {st.stage}: <strong>{st.count}</strong>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ MONTHS ═══ */}
            <div className="space-y-6 px-6 md:px-10 pb-10">
                {data.map((monthData) => (
                    <div key={monthData.month} className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div
                            className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer group"
                            onClick={() => toggleMonth(monthData.month)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-orange-100 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold capitalize text-zinc-900">
                                        {new Date(monthData.month + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                                        <span>{monthData.stores.length} lojas integradas</span>
                                        {monthData.variation && (
                                            <span className={`flex items-center gap-0.5 text-xs font-semibold ${monthData.variation.stores_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {monthData.variation.stores_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {monthData.variation.stores_pct >= 0 ? '+' : ''}{monthData.variation.stores_pct}% Lojas
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0 flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Bugs</p>
                                    <p className={`text-lg font-bold ${monthData.stats.total_bugs > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {monthData.stats.total_bugs}
                                    </p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">No Prazo</p>
                                    <p className={`text-lg font-bold ${monthData.stats.on_time_pct >= 70 ? 'text-emerald-600' : monthData.stats.on_time_pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                        {monthData.stats.on_time_pct}%
                                    </p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Tempo Médio</p>
                                    <p className="text-lg font-bold text-orange-600">{monthData.stats.avg_days} dias</p>
                                </div>
                                <div className="ml-2">
                                    {expandedMonth === monthData.month ? <ChevronUp className="text-zinc-400" /> : <ChevronDown className="text-zinc-400" />}
                                </div>
                            </div>
                        </div>

                        {expandedMonth === monthData.month && (
                            <div className="border-t border-zinc-100 p-6 bg-zinc-50/50/10 animation-fade-in">
                                {/* Action Buttons */}
                                <div className="flex justify-end mb-6">
                                    <button onClick={(e) => { e.stopPropagation(); handleExportMonthCsv(monthData); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-zinc-200 text-zinc-800 rounded-xl hover:bg-zinc-300 transition-colors">
                                        <Download size={18} /> Exportar CSV
                                    </button>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                                    {[
                                        { label: 'Integrações', value: monthData.stats.total_stores, color: 'text-zinc-800' },
                                        { label: 'Bugs', value: monthData.stats.total_bugs, color: monthData.stats.total_bugs > 0 ? 'text-rose-600' : 'text-emerald-600' },
                                        { label: 'No Prazo', value: `${monthData.stats.on_time_count}/${monthData.stats.total_stores}`, color: monthData.stats.on_time_pct >= 70 ? 'text-emerald-600' : 'text-amber-600' },
                                        { label: 'Média Dias', value: monthData.stats.avg_days, color: 'text-zinc-800' },
                                        { label: 'MRR Entregue', value: `R$ ${(monthData.stats.total_mrr / 1000).toFixed(1)}k`, color: 'text-emerald-600' },
                                        { label: 'Matriz/Filial', value: `${monthData.type_breakdown.matriz_count}/${monthData.type_breakdown.filial_count}`, color: 'text-cyan-600' },
                                    ].map(item => (
                                        <div key={item.label} className="bg-white p-3 rounded-2xl text-center border border-zinc-100">
                                            <p className="text-[10px] text-zinc-500 uppercase font-semibold">{item.label}</p>
                                            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Ranking por Integrador */}
                                {monthData.integradores && monthData.integradores.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-semibold text-zinc-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Users size={16} /> Ranking por Integrador
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {monthData.integradores.map((imp, idx) => (
                                                <div key={imp.name} className="bg-white p-4 rounded-2xl border border-zinc-100 hover:border-orange-300 transition-colors">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-orange-600' : 'bg-zinc-600'}`}>
                                                                {idx + 1}
                                                            </span>
                                                            <span className="font-semibold text-zinc-800">{imp.name}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-zinc-800">
                                                            {imp.stores} {imp.stores === 1 ? 'loja' : 'lojas'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                        <span className={`flex items-center gap-1 ${imp.bugs > 0 ? 'text-rose-500' : 'text-emerald-500'}`}><Bug size={12} />{imp.bugs} Bugs</span>
                                                        <span className="flex items-center gap-1"><Clock size={12} />{imp.avg_days} dias</span>
                                                        <span className={`flex items-center gap-1 ${imp.on_time_pct >= 70 ? 'text-emerald-600' : imp.on_time_pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                                            <CheckCircle size={12} />{imp.on_time_pct}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Store Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-100/50 rounded-lg">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Loja</th>
                                                <th className="px-4 py-3">Integrador</th>
                                                <th className="px-4 py-3">Rede</th>
                                                <th className="px-4 py-3 text-right">Data Fim</th>
                                                <th className="px-4 py-3 text-right">Dias</th>
                                                <th className="px-4 py-3 text-center">Bugs</th>
                                                <th className="px-4 py-3 text-center">Prazo</th>
                                                <th className="px-4 py-3 text-center rounded-r-lg">Doc.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthData.stores.map((store) => (
                                                <tr key={store.id} className="border-b border-zinc-100 hover:bg-white/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-zinc-800">{store.name}</td>
                                                    <td className="px-4 py-3 text-zinc-600">{store.integrador}</td>
                                                    <td className="px-4 py-3 text-zinc-600">{store.rede}</td>
                                                    <td className="px-4 py-3 text-right text-zinc-600">
                                                        {new Date(store.finished_at).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-zinc-700">{store.days.toFixed(1)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {store.bugs > 0 ? (
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-rose-100 text-rose-700">{store.bugs}</span>
                                                        ) : (
                                                            <span className="text-zinc-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {store.on_time ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✅ Sim</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">⚠️ Não</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${store.doc_status === 'Ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {store.doc_status || '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
