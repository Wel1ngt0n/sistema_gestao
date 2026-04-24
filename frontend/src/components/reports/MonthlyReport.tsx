import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ChevronDown, ChevronUp, Download, Bot, FileText, Loader2, Users, CheckCircle, Clock, Target, TrendingUp, TrendingDown, BarChart3, Building2, Layers, Printer } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import MonitorStoreModal from '../monitor/MonitorStoreModal';
import MonitorStoreModalV2 from '../monitor/MonitorStoreModalV2';
import { Store } from '../monitor/types';

interface StoreReport {
    id: number;
    name: string;
    implantador: string;
    rede: string;
    finished_at: string;
    mrr: number;
    days: number;
    points: number;
    tipo: string;
    on_time: number;
}

interface ImplantadorStats {
    name: string;
    stores: number;
    store_names: string[];
    mrr: number;
    avg_days: number;
    on_time: number;
    on_time_pct: number;
    points: number;
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
    mrr_change: number;
    mrr_change_pct: number;
    stores_change: number;
    stores_change_pct: number;
}

interface AnnualGoals {
    mrr_target: number;
    mrr_ytd: number;
    mrr_pct: number;
    mrr_avg_monthly: number;
    mrr_projection_month: string;
    stores_target: number;
    stores_ytd: number;
    stores_pct: number;
    stores_avg_monthly: number;
    stores_projection_month: string;
    points_ytd: number;
}

interface WipOverview {
    total_wip: number;
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
    implantadores: ImplantadorStats[];
    stores: StoreReport[];
}

interface ReportResponse {
    annual_goals: AnnualGoals;
    wip_overview: WipOverview;
    months: MonthlyData[];
}

const MonthlyReport: React.FC = () => {
    const [reportData, setReportData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [selectedMonthForAi, setSelectedMonthForAi] = useState<string | null>(null);

    // Edit Modal State
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [isStoreModalV2Open, setIsStoreModalV2Open] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [matrices, setMatrices] = useState<{ id: number, name: string }[]>([]);
    const [deepSyncLoading, setDeepSyncLoading] = useState(false);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/reports/monthly-implantation');
            setReportData(response.data);
            if (response.data.months?.length > 0) {
                setExpandedMonth(response.data.months[0].month);
            }
        } catch (error) {
            console.error("Erro ao buscar relatório", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMonth = (month: string) => {
        setExpandedMonth(expandedMonth === month ? null : month);
    };

    const handleEditClick = async (storeId: number, isV2: boolean = false) => {
        try {
            const response = await api.get(`/api/store/${storeId}`);
            setEditingStore(response.data.store);
            setMatrices(response.data.matrices);
            if (isV2) setIsStoreModalV2Open(true);
            else setIsStoreModalOpen(true);
        } catch (error) {
            console.error("Erro ao buscar detalhes da loja", error);
            alert("Erro ao abrir loja.");
        }
    };

    const handleSaveStore = async (storeToSave: Store) => {
        if (!storeToSave.id) return;
        try {
            await api.put(`/api/store/${storeToSave.id}`, storeToSave);
            setIsStoreModalOpen(false);
            setIsStoreModalV2Open(false);
            fetchReport(); // recarrega o relatorio para atualizar
        } catch (error: any) {
            console.error("Erro ao salvar", error);
            alert(`Erro ao salvar alterações: ${error.message}`);
        }
    };

    const handleRunDeepSync = async (storeId: number) => {
        setDeepSyncLoading(true);
        try {
            await api.post(`/api/deep-sync/store/${storeId}`);
            alert("Deep Sync finalizado com sucesso! Histórico atualizado.");
            // Recarrega os dados da loja na modal
            const response = await api.get(`/api/store/${storeId}`);
            setEditingStore(response.data.store);
        } catch (e) {
            alert("Erro ao rodar Deep Sync.");
        } finally {
            setDeepSyncLoading(false);
        }
    };

    const handleGenerateSummary = async (monthData: MonthlyData, formatType: 'simple' | 'email' = 'simple') => {
        setSelectedMonthForAi(monthData.month);
        setAiSummary('');
        setAiLoading(true);
        setIsAiModalOpen(true);
        try {
            const payload = {
                month: monthData.month,
                stats: monthData.stats,
                stores: monthData.stores,
                implantadores: monthData.implantadores,
                on_time_pct: monthData.stats.on_time_pct,
                on_time_count: monthData.stats.on_time_count,
                format: formatType
            };
            const response = await api.post('/api/reports/generate-summary', payload);
            setAiSummary(response.data.summary);
        } catch {
            setAiSummary("Erro ao gerar resumo. Verifique a conexão.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleExportExcel = async (monthData: MonthlyData) => {
        try {
            const payload = {
                ...monthData,
                annual_goals: reportData?.annual_goals,
                wip_overview: reportData?.wip_overview
            };
            const response = await api.post('/api/reports/monthly-implantation/export-excel', payload, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_implantacao_${monthData.month}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Erro ao exportar Excel", error);
            alert("Erro ao gerar o relatório Excel. Tente novamente.");
        }
    };

    const handleExportAnnualExcel = async () => {
        if (!reportData) return;
        try {
            const response = await api.post('/api/reports/annual-implantation/export-excel', reportData, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `visao_anual_implantacao_${new Date().getFullYear()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Erro ao exportar Excel Anual", error);
            alert("Erro ao gerar a Visão Anual Excel. Tente novamente.");
        }
    };

    const handlePrintPDF = async (monthData: MonthlyData) => {
        try {
            const payload = {
                ...monthData,
                annual_goals: reportData?.annual_goals,
                wip_overview: reportData?.wip_overview
            };
            const response = await api.post('/api/reports/monthly-implantation/export-pdf', payload, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_implantacao_${monthData.month}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Erro ao exportar PDF", error);
            alert("Erro ao gerar o relatório PDF. Tente novamente.");
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-400">Carregando relatório...</div>;
    if (!reportData) return <div className="p-8 text-center text-zinc-400">Sem dados disponíveis.</div>;

    const { annual_goals: goals, wip_overview: wip, months: data } = reportData;

    const projLabel = (ym: string) => {
        try { return new Date(ym + '-02').toLocaleString('pt-BR', { month: 'short', year: 'numeric' }); }
        catch { return ym; }
    };

    return (
        <div className="p-0 space-y-8 bg-zinc-50#09090b] min-h-screen text-zinc-900 transition-colors duration-300">
            <header className="px-6 md:px-10 pt-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-600">
                    Relatório Mensal de Implantação
                </h1>
                <p className="text-zinc-500 mt-2">
                    Resultados, metas anuais, eficiência do time e previsibilidade.
                </p>
            </header>

            {/* ═══ ANNUAL GOALS ═══ */}
            <div className="px-6 md:px-10">
                <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Target className="text-teal-500" size={20} />
                            <h2 className="text-lg font-bold text-zinc-800">Metas Anuais 2026</h2>
                        </div>
                        <button onClick={handleExportAnnualExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold shadow-sm text-sm">
                            <Download size={16} /> Exportar Visão Anual YTD
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* MRR Goal */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-semibold text-zinc-600">MRR Recorrente</span>
                                <span className="text-xs text-zinc-500">Meta: R$ {goals.mrr_target.toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="relative h-4 bg-zinc-200 rounded-full overflow-hidden">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-1000"
                                    style={{ width: `${Math.min(goals.mrr_pct, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span className="font-semibold text-emerald-600">
                                    R$ {goals.mrr_ytd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({goals.mrr_pct}%)
                                </span>
                                <span>~R$ {goals.mrr_avg_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês • Projeção: {projLabel(goals.mrr_projection_month)}</span>
                            </div>
                        </div>

                        {/* Stores Goal */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-semibold text-zinc-600">Lojas Entregues</span>
                                <span className="text-xs text-zinc-500">Meta: {goals.stores_target} lojas</span>
                            </div>
                            <div className="relative h-4 bg-zinc-200 rounded-full overflow-hidden">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-1000"
                                    style={{ width: `${Math.min(goals.stores_pct, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span className="font-semibold text-cyan-600">
                                    {goals.stores_ytd} lojas ({goals.stores_pct}%)
                                </span>
                                <span>~{goals.stores_avg_monthly}/mês • Projeção: {projLabel(goals.stores_projection_month)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pontos YTD */}
                    <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap gap-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={14} className="text-teal-500" />
                            <span className="text-sm text-zinc-500">Pontos YTD:</span>
                            <span className="font-bold text-zinc-800">{goals.points_ytd}</span>
                        </div>
                        {wip && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Layers size={14} className="text-amber-500" />
                                    <span className="text-sm text-zinc-500">WIP:</span>
                                    <span className="font-bold text-amber-600">{wip.total_wip} lojas</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building2 size={14} className="text-cyan-500" />
                                    <span className="text-sm text-zinc-500">MRR Backlog:</span>
                                    <span className="font-bold text-cyan-600">
                                        R$ {wip.mrr_backlog.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Board Stages */}
                    {wip && wip.board_stages.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-100">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Distribuição no Board</p>
                            <div className="flex flex-wrap gap-2">
                                {wip.board_stages.map(st => (
                                    <span key={st.stage} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-lg text-xs font-medium text-zinc-700">
                                        <span className="w-2 h-2 rounded-full bg-teal-500" />
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
                                <div className="p-2 bg-teal-100 rounded-xl text-teal-600 group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold capitalize text-zinc-900">
                                        {new Date(monthData.month + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                                        <span>{monthData.stores.length} lojas</span>
                                        {monthData.variation && (
                                            <span className={`flex items-center gap-0.5 text-xs font-semibold ${monthData.variation.mrr_change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {monthData.variation.mrr_change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {monthData.variation.mrr_change_pct >= 0 ? '+' : ''}{monthData.variation.mrr_change_pct}% MRR
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0 flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">MRR</p>
                                    <p className="text-lg font-bold text-emerald-600">
                                        R$ {monthData.stats.total_mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">No Prazo</p>
                                    <p className={`text-lg font-bold ${monthData.stats.on_time_pct >= 70 ? 'text-emerald-600' : monthData.stats.on_time_pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {monthData.stats.on_time_pct}%
                                    </p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Tempo Médio</p>
                                    <p className="text-lg font-bold text-teal-600">{monthData.stats.avg_days} dias</p>
                                </div>
                                <div className="ml-2">
                                    {expandedMonth === monthData.month ? <ChevronUp className="text-zinc-400" /> : <ChevronDown className="text-zinc-400" />}
                                </div>
                            </div>
                        </div>

                        {expandedMonth === monthData.month && (
                            <div className="border-t border-zinc-100 p-6 bg-zinc-50/50/10 animation-fade-in">
                                {/* Action Buttons - Hiding them on Print */}
                                <div className="flex flex-wrap gap-4 mb-6 justify-end items-center print:hidden">
                                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200">
                                        <button onClick={(e) => { e.stopPropagation(); handleGenerateSummary(monthData, 'simple'); }}
                                            className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors font-medium">
                                            <Bot size={16} /> Resumo Slack
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleGenerateSummary(monthData, 'email'); }}
                                            className="flex items-center gap-2 px-3 py-2 text-zinc-600 hover:bg-zinc-100 text-sm rounded-lg transition-colors font-medium">
                                            <Bot size={16} /> Resumo Email
                                        </button>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handlePrintPDF(monthData); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors">
                                        <Printer size={18} /> Exportar PDF
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleExportExcel(monthData); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-zinc-200 text-zinc-800 rounded-xl hover:bg-zinc-300 transition-colors">
                                        <Download size={18} /> Exportar Excel
                                    </button>
                                </div>

                                {/* Stats Grid — Row 1 */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
                                    {[
                                        { label: 'Lojas', value: monthData.stats.total_stores, color: 'text-zinc-800' },
                                        { label: 'MRR', value: `R$ ${(monthData.stats.total_mrr / 1000).toFixed(1)}k`, color: 'text-emerald-600' },
                                        { label: 'Ticket Médio', value: `R$ ${monthData.stats.ticket_medio.toFixed(0)}`, color: 'text-emerald-600' },
                                        { label: 'Pontos', value: monthData.stats.total_points.toFixed(1), color: 'text-teal-600' },
                                        { label: 'Média Dias', value: monthData.stats.avg_days, color: 'text-zinc-800' },
                                        { label: 'Mediana', value: monthData.stats.median_days, color: 'text-zinc-800' },
                                        { label: 'No Prazo', value: `${monthData.stats.on_time_count}/${monthData.stats.total_stores}`, color: monthData.stats.on_time_pct >= 70 ? 'text-emerald-600' : 'text-amber-600' },
                                        { label: 'Matriz/Filial', value: `${monthData.type_breakdown.matriz_count}/${monthData.type_breakdown.filial_count}`, color: 'text-cyan-600' },
                                    ].map(item => (
                                        <div key={item.label} className="bg-white p-3 rounded-2xl text-center border border-zinc-100">
                                            <p className="text-[10px] text-zinc-500 uppercase font-semibold">{item.label}</p>
                                            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Variation Badge */}
                                {monthData.variation && (
                                    <div className="flex flex-wrap gap-3 mb-4">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${monthData.variation.mrr_change >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {monthData.variation.mrr_change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            MRR: {monthData.variation.mrr_change >= 0 ? '+' : ''}R$ {monthData.variation.mrr_change.toFixed(0)} ({monthData.variation.mrr_change_pct >= 0 ? '+' : ''}{monthData.variation.mrr_change_pct}%)
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${monthData.variation.stores_change >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {monthData.variation.stores_change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            Lojas: {monthData.variation.stores_change >= 0 ? '+' : ''}{monthData.variation.stores_change} ({monthData.variation.stores_change_pct >= 0 ? '+' : ''}{monthData.variation.stores_change_pct}%)
                                        </span>
                                    </div>
                                )}

                                {/* MRR por Rede */}
                                {monthData.mrr_by_rede && monthData.mrr_by_rede.length > 1 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">MRR por Rede</p>
                                        <div className="flex flex-wrap gap-2">
                                            {monthData.mrr_by_rede.slice(0, 8).map(r => (
                                                <span key={r.rede} className="px-3 py-1.5 bg-white rounded-lg text-xs border border-zinc-100 font-medium text-zinc-700" title={r.store_names.join(', ')}>
                                                    {r.rede}: <strong className="text-emerald-600">R$ {r.mrr.toLocaleString('pt-BR')}</strong> ({r.count})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Ranking por Implantador */}
                                {monthData.implantadores && monthData.implantadores.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-semibold text-zinc-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Users size={16} /> Ranking por Implantador
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {monthData.implantadores.map((imp, idx) => (
                                                <div key={imp.name} className="bg-white p-4 rounded-2xl border border-zinc-100 hover:border-teal-300 transition-colors">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-orange-600' : 'bg-zinc-600'}`}>
                                                                {idx + 1}
                                                            </span>
                                                            <span className="font-semibold text-zinc-800">{imp.name}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-emerald-600">
                                                            R$ {imp.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                        <span className="flex items-center gap-1"><FileText size={12} />{imp.stores} {imp.stores === 1 ? 'loja' : 'lojas'}</span>
                                                        <span className="flex items-center gap-1"><Clock size={12} />{imp.avg_days} dias</span>
                                                        <span className={`flex items-center gap-1 ${imp.on_time_pct >= 70 ? 'text-emerald-600' : imp.on_time_pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                                            <CheckCircle size={12} />{imp.on_time_pct}%
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-xs text-zinc-4000 truncate" title={imp.store_names.join(', ')}>
                                                        {imp.store_names.join(', ')}
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
                                                <th className="px-4 py-3">Implantador</th>
                                                <th className="px-4 py-3">Tipo</th>
                                                <th className="px-4 py-3 text-right">Data Fim</th>
                                                <th className="px-4 py-3 text-right">Dias</th>
                                                <th className="px-4 py-3 text-center">Prazo</th>
                                                <th className="px-4 py-3 text-right">MRR</th>
                                                <th className="px-4 py-3 text-center rounded-r-lg">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthData.stores.map((store) => (
                                                <tr key={store.id} className="border-b border-zinc-100 hover:bg-white/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-zinc-800">{store.name}</td>
                                                    <td className="px-4 py-3 text-zinc-600">{store.implantador}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${store.tipo === 'Matriz' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {store.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-zinc-600">
                                                        {new Date(store.finished_at).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-zinc-700">{store.days.toFixed(1)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {store.on_time ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✅</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">⚠️</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                                        R$ {store.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center space-x-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditClick(store.id); }}
                                                            className="p-1.5 text-zinc-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                                            title="Editar (V1)"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditClick(store.id, true); }}
                                                            className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Cockpit (V2)"
                                                        >
                                                            🚀
                                                        </button>
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

            {/* AI Modal */}
            <Dialog open={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
                        <div className="p-6 border-b border-zinc-200 flex justify-between items-center">
                            <Dialog.Title className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                                <Bot className="text-teal-500" /> Resumo Executivo - {selectedMonthForAi}
                            </Dialog.Title>
                            <button onClick={() => setIsAiModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">X</button>
                        </div>
                        <div className="p-6">
                            {aiLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="animate-spin text-teal-500" size={32} />
                                    <p className="text-zinc-500">A Inteligência Artificial está escrevendo o relatório...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-zinc-500">Copie o texto abaixo para enviar:</p>
                                    <textarea
                                        className="w-full h-64 p-4 bg-zinc-50 text-zinc-900 rounded-xl border border-zinc-200 font-mono text-sm resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={aiSummary}
                                        readOnly
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => navigator.clipboard.writeText(aiSummary)}
                                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium"
                                        >
                                            Copiar Texto
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>

            {/* Edit Store Modal */}
            <MonitorStoreModal
                isOpen={isStoreModalOpen}
                onClose={() => setIsStoreModalOpen(false)}
                store={editingStore}
                matrices={matrices}
                onSave={handleSaveStore}
                onDeepSync={handleRunDeepSync}
                isDeepSyncing={deepSyncLoading}
            />

            {/* Edit Store Modal V2 */}
            <MonitorStoreModalV2
                isOpen={isStoreModalV2Open}
                onClose={() => setIsStoreModalV2Open(false)}
                store={editingStore}
                matrices={matrices}
                onSave={handleSaveStore}
                onDeepSync={handleRunDeepSync}
                isDeepSyncing={deepSyncLoading}
            />
        </div>
    );
}

export default MonthlyReport;
