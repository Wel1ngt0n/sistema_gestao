import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { RefreshCw, Download, Filter } from 'lucide-react';
import ForecastTable from './ForecastTable';
import ForecastCards from './ForecastCards';

const API_URL = 'http://localhost:5003/api/forecast';

export default function ForecastPage() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        month: '',
        year: '',
        implantador: '',
        rede: '',
        status: ''
    });

    // Fetch Summary
    const { data: summaryData, isLoading: loadingSummary } = useQuery({
        queryKey: ['forecast-summary'],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/summary`);
            return res.data;
        }
    });

    // Fetch Forecast Data
    const { data: forecastData, isLoading: loadingForecast, refetch } = useQuery({
        queryKey: ['forecast-data', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.month) params.append('month', filters.month);
            if (filters.year) params.append('year', filters.year);
            if (filters.implantador) params.append('implantador', filters.implantador);
            if (filters.rede) params.append('rede', filters.rede);
            if (filters.status) params.append('status', filters.status);

            const res = await axios.get(`${API_URL}/?${params.toString()}`);
            return res.data;
        }
    });

    // Export Handler
    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.month) params.append('month', filters.month);
            if (filters.year) params.append('year', filters.year);
            if (filters.implantador) params.append('implantador', filters.implantador);

            const response = await axios.get(`${API_URL}/export?${params.toString()}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'forecast_export.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error exporting", error);
            alert("Erro ao exportar Excel");
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900 dark:bg-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                        Forecast de Entregas & CS
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Visão consolidada de Go-Live, Projeção de Pedidos e Ativação Operacional.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <RefreshCw size={16} /> Atualizar
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Download size={16} /> Exportar Excel
                    </button>
                </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded text-amber-800 dark:text-amber-200 text-sm">
                ⚠️ <strong>Atenção:</strong> Valores estimados com base em projeções operacionais. Datas manuais têm prioridade sobre SLA contratual.
            </div>

            {/* Cards Summary */}
            <div className="overflow-x-auto pb-2">
                {loadingSummary ? (
                    <div className="flex gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="w-64 h-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />)}
                    </div>
                ) : (
                    <ForecastCards summary={summaryData || []} />
                )}
            </div>

            {/* Filters & Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Filter size={18} />
                        <span className="font-medium text-sm">Filtros:</span>
                    </div>

                    <input
                        type="number"
                        placeholder="Ano (Ex: 2025)"
                        className="px-3 py-1.5 text-sm border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none w-32"
                        onChange={e => setFilters({ ...filters, year: e.target.value })}
                        value={filters.year}
                    />

                    <select
                        className="px-3 py-1.5 text-sm border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                        onChange={e => setFilters({ ...filters, month: e.target.value })}
                        value={filters.month}
                    >
                        <option value="">Todos os Meses</option>
                        <option value="01">Janeiro</option>
                        <option value="02">Fevereiro</option>
                        <option value="03">Março</option>
                        <option value="04">Abril</option>
                        <option value="05">Maio</option>
                        <option value="06">Junho</option>
                        <option value="07">Julho</option>
                        <option value="08">Agosto</option>
                        <option value="09">Setembro</option>
                        <option value="10">Outubro</option>
                        <option value="11">Novembro</option>
                        <option value="12">Dezembro</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Filtrar por Rede..."
                        className="px-3 py-1.5 text-sm border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                        onChange={e => setFilters({ ...filters, rede: e.target.value })}
                        value={filters.rede}
                    />

                    <input
                        type="text"
                        placeholder="Filtrar por Implantador..."
                        className="px-3 py-1.5 text-sm border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                        onChange={e => setFilters({ ...filters, implantador: e.target.value })}
                        value={filters.implantador}
                    />
                </div>

                <div className="p-0">
                    {loadingForecast ? (
                        <div className="p-8 text-center text-slate-500">Carregando dados...</div>
                    ) : (
                        <ForecastTable data={forecastData || []} onUpdate={() => refetch()} />
                    )}
                </div>
            </div>
        </div>
    );
}
