import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ChevronDown, ChevronUp, Download, FileText, FileSpreadsheet, FileDown } from 'lucide-react';

interface IntegrationStoreReport {
    id: number;
    name: string;
    integrador: string;
    rede: string | null;
    finished_at: string;
    doc_status: string;
    bugs: number;
    days: number;
    churn_risk: boolean;
}

interface MonthlyStats {
    total_stores: number;
    total_bugs: number;
    avg_days: number;
    median_days: number;
}

interface MonthlyData {
    month: string;
    stats: MonthlyStats;
    stores: IntegrationStoreReport[];
}

export default function IntegrationReports() {
    const [data, setData] = useState<MonthlyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/integration/reports/monthly');
            setData(response.data);
            if (response.data.length > 0) {
                setExpandedMonth(response.data[0].month);
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
            link.setAttribute('download', `relatorio_integracao_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Erro ao exportar relatório", error);
            alert("Erro ao baixar o relatório geral.");
        }
    };

    const handleExportMonthCsv = (monthData: MonthlyData) => {
        const headers = ["ID", "Nome da Loja", "Integrador", "Rede", "Data Conclusão", "Status Doc", "Qtd Bugs", "Dias Totais", "Risco Churn"];
        const rows = monthData.stores.map(s => [
            s.id,
            `"${s.name}"`,
            `"${s.integrador}"`,
            `"${s.rede || '-'}"`,
            s.finished_at,
            `"${s.doc_status || '-'}"`,
            s.bugs,
            s.days,
            s.churn_risk ? 'SIM' : 'NAO'
        ]);

        const footer = [
            [],
            ["TOTAIS", "", "", "", "", "", monthData.stats.total_bugs, "", ""],
            ["MÉDIAS", "", "", "", "", "", "", `"${monthData.stats.avg_days.toFixed(1).replace('.', ',')}"`, ""],
            ["MEDIANA", "", "", "", "", "", "", `"${monthData.stats.median_days.toFixed(1).replace('.', ',')}"`, ""]
        ];

        const csvContent = [headers.join(","), ...rows.map(r => r.join(",")), ...footer.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_integracoes_${monthData.month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="p-8 text-center text-zinc-400">Carregando relatórios de integração...</div>;

    return (
        <div className="p-0 space-y-8 bg-zinc-50 dark:bg-[#09090b] min-h-screen text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
            <header className="px-6 md:px-10 pt-6 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-600">
                        Relatórios Mensais de Integração
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                        Histórico de entregas, qualidade técnica (Bugs) e documentação.
                    </p>
                </div>

                <button
                    onClick={handleExportGeneral}
                    className="flex items-center gap-2 px-5 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    <FileSpreadsheet size={20} />
                    Exportar Base Completa (Excel)
                </button>
            </header>

            <div className="space-y-6 px-6 md:px-10 pb-10">
                {data.map((monthData) => (
                    <div key={monthData.month} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div
                            className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer group"
                            onClick={() => toggleMonth(monthData.month)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold capitalize text-zinc-900 dark:text-white">
                                        {new Date(monthData.month + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full inline-block mt-1">
                                        {monthData.stores.length} integrações
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0 flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Total Bugs Pós-Live</p>
                                    <p className={`text-xl font-black ${monthData.stats.total_bugs > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                                        {monthData.stats.total_bugs}
                                    </p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Tempo Médio</p>
                                    <p className="text-xl font-black text-indigo-500">
                                        {monthData.stats.avg_days} dias
                                    </p>
                                </div>
                                <div className="ml-2 w-8 flex justify-center">
                                    {expandedMonth === monthData.month ? <ChevronUp className="text-zinc-400" /> : <ChevronDown className="text-zinc-400" />}
                                </div>
                            </div>
                        </div>

                        {expandedMonth === monthData.month && (
                            <div className="border-t border-zinc-100 dark:border-zinc-800 p-6 bg-zinc-50/50 dark:bg-zinc-800/10 animate-fade-in">
                                <div className="flex justify-end mb-6">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleExportMonthCsv(monthData); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors font-semibold text-sm"
                                    >
                                        <Download size={16} />
                                        Exportar Mês (CSV)
                                    </button>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-900/50 font-bold tracking-wider">
                                            <tr>
                                                <th className="px-5 py-4">Loja / Cliente</th>
                                                <th className="px-5 py-4">Integrador</th>
                                                <th className="px-5 py-4 text-center">Data Fim</th>
                                                <th className="px-5 py-4 text-center">Status Doc</th>
                                                <th className="px-5 py-4 text-center">Atraso / Dias</th>
                                                <th className="px-5 py-4 text-center">Bugs</th>
                                                <th className="px-5 py-4 text-center">Risco Churn</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                            {monthData.stores.map((store) => (
                                                <tr key={store.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{store.name}</div>
                                                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5 uppercase">{store.rede || 'S/ REDE'}</div>
                                                    </td>
                                                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 font-medium">
                                                        {store.integrador}
                                                    </td>
                                                    <td className="px-5 py-3 text-center text-zinc-500 font-mono text-xs">
                                                        {new Date(store.finished_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${store.doc_status?.includes('Concluída') || store.doc_status?.includes('DONE')
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                            }`}>
                                                            {store.doc_status || 'PENDENTE'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-center font-mono font-medium text-zinc-600 dark:text-zinc-300">
                                                        {store.days} d
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        {store.bugs > 0 ? (
                                                            <span className="text-rose-600 dark:text-rose-400 font-bold px-2 py-1 bg-rose-50 dark:bg-rose-900/20 rounded-md">
                                                                {store.bugs}
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-500 font-medium">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        {store.churn_risk ? (
                                                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" title="Risco Alto"></span>
                                                        ) : (
                                                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                                                        )}
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
