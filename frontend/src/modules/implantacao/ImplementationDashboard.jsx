import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

const KPICard = ({ title, value, subtitle, color = "text-slate-900", loading }) => (
    <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md">
        <dt className="text-sm font-medium leading-6 text-gray-500">{title}</dt>
        <dd className={`mt-2 text-3xl font-bold leading-10 tracking-tight ${color}`}>
            {loading ? '...' : value}
        </dd>
        {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
);

const ImplementationDashboard = () => {
    const [kpis, setKpis] = useState({
        wip_count: 0,
        done_count: 0,
        mrr_backlog: 0,
        mrr_done: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchKpis = async () => {
            try {
                const response = await api.get('/implantacao/kpi-cards');
                setKpis(response.data);
            } catch (error) {
                console.error("Erro ao buscar KPIs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchKpis();
    }, []);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="md:flex md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        Dashboard de Implantação
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Visão geral do pipeline de implantação e métricas financeiras.
                    </p>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Lojas em Andamento"
                    value={kpis.wip_count}
                    subtitle="WIP Ativo"
                    color="text-indigo-600"
                    loading={loading}
                />
                <KPICard
                    title="Lojas Concluídas"
                    value={kpis.done_count}
                    subtitle="Total Acumulado"
                    color="text-emerald-600"
                    loading={loading}
                />
                <KPICard
                    title="MRR em Backlog"
                    value={formatCurrency(kpis.mrr_backlog)}
                    subtitle="Potencial Receita"
                    color="text-amber-600"
                    loading={loading}
                />
                <KPICard
                    title="MRR Implantado"
                    value={formatCurrency(kpis.mrr_done)}
                    subtitle="Receita Confirmada"
                    color="text-slate-900"
                    loading={loading}
                />
            </div>

            {/* Configuração Section (Call to Action) */}
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400">
                    <div className="flex-shrink-0">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <Link to="/implantacao/analytics" className="focus:outline-none">
                            <span className="absolute inset-0" aria-hidden="true" />
                            <p className="text-sm font-medium text-gray-900">Ver Analytics Detalhado (Novo)</p>
                            <p className="truncate text-sm text-gray-500">Visualize gráficos de risco, forecast e performance.</p>
                        </Link>
                    </div>
                </div>

                <div className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400">
                    <div className="flex-shrink-0">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-700">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <Link to="/implantacao/relatorios" className="focus:outline-none">
                            <span className="absolute inset-0" aria-hidden="true" />
                            <p className="text-sm font-medium text-gray-900">Relatórios Gerenciais</p>
                            <p className="truncate text-sm text-gray-500">Acesse relatórios de fechamento mensal.</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImplementationDashboard;
