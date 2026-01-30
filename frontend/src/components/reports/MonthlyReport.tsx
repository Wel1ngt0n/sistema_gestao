import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Download, Bot, FileText, Loader2 } from 'lucide-react';
import { Dialog } from '@headlessui/react';

interface StoreReport {
    id: number;
    name: string;
    implantador: string;
    finished_at: string;
    mrr: number;
    days: number;
    points: number;
    tipo: string;
}

interface MonthlyStats {
    total_stores: number;
    total_mrr: number;
    total_points: number;
    avg_days: number;
    median_days: number;
}

interface MonthlyData {
    month: string;
    stats: MonthlyStats;
    stores: StoreReport[];
}

const MonthlyReport: React.FC = () => {
    const [data, setData] = useState<MonthlyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    // AI Modal State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [selectedMonthForAi, setSelectedMonthForAi] = useState<string | null>(null);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5003/api/reports/monthly-implantation');
            setData(response.data);
            if (response.data.length > 0) {
                setExpandedMonth(response.data[0].month);
            }
        } catch (error) {
            console.error("Erro ao buscar relatório", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMonth = (month: string) => {
        if (expandedMonth === month) {
            setExpandedMonth(null);
        } else {
            setExpandedMonth(month);
        }
    };

    const handleGenerateSummary = async (monthData: MonthlyData, formatType: 'simple' | 'email' = 'simple') => {
        setSelectedMonthForAi(monthData.month);
        setAiSummary('');
        setAiLoading(true);
        setIsAiModalOpen(true);

        try {
            // Preparar destaques (Top 3 MRR)
            const sortedByMrr = [...monthData.stores].sort((a, b) => b.mrr - a.mrr).slice(0, 3);
            const highlights = sortedByMrr.map(s => `- ${s.name}: R$ ${s.mrr.toFixed(2)} (${s.implantador})`).join('\n');

            const payload = {
                month: monthData.month,
                stats: monthData.stats,
                highlights: highlights,
                stores: monthData.stores,
                format: formatType
            };

            const response = await axios.post('http://localhost:5003/api/reports/generate-summary', payload);
            setAiSummary(response.data.summary);
        } catch (error) {
            setAiSummary("Erro ao gerar resumo. Verifique a conexão.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleExportCsv = (monthData: MonthlyData) => {
        // Cabeçalho
        const headers = ["ID", "Nome da Loja", "Implantador", "Tipo", "Data Conclusão", "MRR (R$)", "Dias Totais", "Pontos"];

        // Linhas de Lojas
        const rows = monthData.stores.map(s => [
            s.id,
            `"${s.name}"`, // Quote names with commas
            s.implantador,
            s.tipo,
            s.finished_at,
            s.mrr.toFixed(2),
            s.days.toFixed(1),
            s.points
        ]);

        // Rodapé Estatístico
        const footer = [
            [],
            ["TOTAIS", "", "", "", "", monthData.stats.total_mrr.toFixed(2), "", monthData.stats.total_points],
            ["MÉDIAS", "", "", "", "", "", monthData.stats.avg_days.toFixed(1), ""],
            ["MEDIANA", "", "", "", "", "", monthData.stats.median_days.toFixed(1), ""]
        ];

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(",")),
            ...footer.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_implantacao_${monthData.month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="p-8 text-center text-zinc-400">Carregando relatório...</div>;

    return (
        <div className="p-6 md:p-10 space-y-8 bg-slate-50 dark:bg-zinc-900 min-h-screen text-slate-900 dark:text-zinc-100 transition-colors duration-300">
            {/* ... header ... */}
            <header>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                    Relatório Mensal de Implantação
                </h1>
                <p className="text-slate-500 dark:text-zinc-400 mt-2">
                    Histórico de entregas, faturamento recorrente e eficiência do time.
                </p>
            </header>

            <div className="space-y-6">
                {data.map((monthData) => (
                    <div key={monthData.month} className="bg-white dark:bg-zinc-800/50 rounded-3xl border border-slate-200 dark:border-zinc-700/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* ... header do mes ... */}
                        <div
                            className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer group"
                            onClick={() => toggleMonth(monthData.month)}
                        >
                            {/* ... (keep existing header content) ... */}
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold capitalize">
                                        {new Date(monthData.month + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <span className="text-sm text-slate-500 dark:text-zinc-400">
                                        {monthData.stores.length} lojas entregues
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0 flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">MRR Adicionado</p>
                                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        R$ {monthData.stats.total_mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tempo Médio</p>
                                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                        {monthData.stats.avg_days} dias
                                    </p>
                                </div>
                                <div className="ml-2">
                                    {expandedMonth === monthData.month ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                                </div>
                            </div>
                        </div>

                        {/* Detalhes Expandidos */}
                        {expandedMonth === monthData.month && (
                            <div className="border-t border-slate-100 dark:border-zinc-700 p-6 bg-slate-50/50 dark:bg-zinc-900/30 animation-fade-in">
                                {/* Botões de Ação */}
                                <div className="flex flex-wrap gap-4 mb-6 justify-end items-center">
                                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleGenerateSummary(monthData, 'simple'); }}
                                            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors font-medium"
                                            title="Gerar resumo curto para Slack/WhatsApp"
                                        >
                                            <Bot size={16} />
                                            Resumo Slack
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleGenerateSummary(monthData, 'email'); }}
                                            className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 text-sm rounded-lg transition-colors font-medium"
                                            title="Gerar relatório completo para Email"
                                        >
                                            <Bot size={16} />
                                            Resumo Email
                                        </button>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleExportCsv(monthData); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                                    >
                                        <Download size={18} />
                                        Exportar CSV
                                    </button>
                                </div>

                                {/* Lista de Lojas (MANTIDA IGUAL) */}
                                <div className="overflow-x-auto">
                                    {/* ... table content remains implicitly the same via context ... */}
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 dark:text-zinc-400 uppercase bg-slate-100 dark:bg-zinc-800/50 rounded-lg">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Loja</th>
                                                <th className="px-4 py-3">Implantador</th>
                                                <th className="px-4 py-3">Tipo</th>
                                                <th className="px-4 py-3 text-right">Data Fim</th>
                                                <th className="px-4 py-3 text-right">Dias Totais</th>
                                                <th className="px-4 py-3 text-right rounded-r-lg">MRR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthData.stores.map((store) => (
                                                <tr key={store.id} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-zinc-200">
                                                        {store.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-zinc-400">{store.implantador}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${store.tipo === 'Matriz' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                            {store.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-zinc-400">
                                                        {new Date(store.finished_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {store.days.toFixed(1)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                                        R$ {store.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Stats Grid (MANTIDO IGUAL) */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-zinc-700">
                                        <p className="text-xs text-slate-500 uppercase">Média Dias</p>
                                        <p className="text-xl font-bold text-slate-800 dark:text-zinc-200">{monthData.stats.avg_days}</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-zinc-700">
                                        <p className="text-xs text-slate-500 uppercase">Mediana Dias</p>
                                        <p className="text-xl font-bold text-slate-800 dark:text-zinc-200">{monthData.stats.median_days}</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-zinc-700">
                                        <p className="text-xs text-slate-500 uppercase">Pontos Totais</p>
                                        <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{monthData.stats.total_points.toFixed(1)}</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-zinc-700">
                                        <p className="text-xs text-slate-500 uppercase">Total Lojas</p>
                                        <p className="text-xl font-bold text-slate-800 dark:text-zinc-200">{monthData.stats.total_stores}</p>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal de AI */}
            <Dialog open={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                            <Dialog.Title className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <Bot className="text-indigo-500" />
                                Resumo Executivo - {selectedMonthForAi}
                            </Dialog.Title>
                            <button onClick={() => setIsAiModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">X</button>
                        </div>

                        <div className="p-6">
                            {aiLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                                    <p className="text-zinc-500">A Inteligência Artificial está escrevendo o relatório...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-zinc-500">Copie o texto abaixo para enviar:</p>
                                    <textarea
                                        className="w-full h-64 p-4 bg-zinc-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={aiSummary}
                                        readOnly
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => navigator.clipboard.writeText(aiSummary)}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
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
        </div>
    );
}

export default MonthlyReport;
