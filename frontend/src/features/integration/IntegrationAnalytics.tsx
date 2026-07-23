import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle, AlertTriangle, ArrowUpRight, CheckCircle2, Clock3,
    Database, Layers3, RefreshCw, ShieldAlert, Store, Users, X,
} from 'lucide-react';
import { useState } from 'react';
import { Chart } from 'react-chartjs-2';
import {
    ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale,
    Tooltip,
} from 'chart.js';
import { fetchIntegrationFilters, fetchIntegrationMetrics, fetchIntegrationSyncStatus } from './api';
import IntegrationAssigneeDetail from './components/IntegrationAssigneeDetail';
import { integrationQueryKeys } from './queryKeys';
import { EMPTY_FILTERS, IntegrationAssigneeMetric, IntegrationFilterState, IntegrationMetrics } from './types';
import { formatDate, formatDuration, safeStatusColor } from './utils';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 10 } } },
    },
} as const;

function MetricCard({ label, value, detail, icon: Icon, tone = 'orange' }: {
    label: string; value: string; detail: string; icon: typeof Store; tone?: 'orange' | 'green' | 'red' | 'slate';
}) {
    const tones = {
        orange: 'border-t-[#ff7900] bg-orange-50 text-[#d96500]',
        green: 'border-t-[#128131] bg-emerald-50 text-[#128131]',
        red: 'border-t-rose-500 bg-rose-50 text-rose-600',
        slate: 'border-t-slate-500 bg-slate-100 text-slate-600',
    };
    return (
        <article className="rounded-xl border border-t-2 border-slate-200 border-t-transparent bg-white p-4 shadow-sm" style={{ borderTopColor: tone === 'orange' ? '#ff7900' : tone === 'green' ? '#128131' : tone === 'red' ? '#f43f5e' : '#64748b' }}>
            <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{value}</p></div>
                <span className={`rounded-lg p-2 ${tones[tone]}`}><Icon size={18} /></span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </article>
    );
}

function LoadingState() {
    return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>;
}

function MetasSection({ metrics }: { metrics: IntegrationMetrics }) {
    if (!metrics.collectiveMetas) return null;
    const { pointsDelivered, qualitySuccessCount, qualityTotalEvaluated, slaSuccessCount, targets } = metrics.collectiveMetas;
    const qualityRate = qualityTotalEvaluated > 0 ? (qualitySuccessCount / qualityTotalEvaluated) * 100 : 0;
    const slaRate = qualityTotalEvaluated > 0 ? (slaSuccessCount / qualityTotalEvaluated) * 100 : 0;
    
    return (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-slate-900">Volume de Entregas</h2>
                        <p className="text-xs text-slate-500">Meta: {targets.points} pts no semestre (Matriz: 1, Filial: 0.7)</p>
                    </div>
                    <span className="text-2xl font-black text-slate-900">{pointsDelivered.toFixed(1)} <span className="text-sm font-normal text-slate-500">/ {targets.points}</span></span>
                </div>
                <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#ff7900]" style={{ width: `${Math.min(100, (pointsDelivered / targets.points) * 100)}%` }} />
                </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-slate-900">Qualidade Pós-Go-Live</h2>
                        <p className="text-xs text-slate-500">Meta: {targets.qualityPercent}% sem falhas críticas</p>
                    </div>
                    <span className="text-2xl font-black text-slate-900">{Math.round(qualityRate)}%</span>
                </div>
                <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#128131]" style={{ width: `${qualityRate}%` }} />
                </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-slate-900">SLA de Tempo Líquido</h2>
                        <p className="text-xs text-slate-500">Meta: {targets.slaPercent}% das entregas em até {targets.slaDays} dias</p>
                    </div>
                    <span className="text-2xl font-black text-slate-900">{Math.round(slaRate)}%</span>
                </div>
                <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${slaRate}%` }} />
                </div>
            </article>
        </section>
    );
}

function AnalyticsContent({ metrics, filters }: { metrics: IntegrationMetrics; filters: IntegrationFilterState }) {
    const [selectedAssignee, setSelectedAssignee] = useState<IntegrationAssigneeMetric | null>(null);
    const stageLabels = metrics.byStatus.map((stage) => stage.statusName);
    const stageColors = metrics.byStatus.map((stage) => safeStatusColor(stage.color));
    const bottlenecks = [...metrics.byStatus].filter((stage) => stage.p90Seconds !== null).sort((a, b) => (b.p90Seconds || 0) - (a.p90Seconds || 0)).slice(0, 5);
    const universe = [metrics.totalStores - metrics.notEntered - metrics.ambiguous - metrics.dataErrors, metrics.notEntered, metrics.ambiguous, metrics.dataErrors].map((value) => Math.max(0, value));

    return <>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="Total de lojas" value={String(metrics.totalStores)} detail="Histórico vindo da Implantação" icon={Store} tone="slate" />
            <MetricCard label="Cobertura" value={`${metrics.coveragePercent.toLocaleString('pt-BR')}%`} detail="Lojas reconciliadas na Integração" icon={CheckCircle2} tone="green" />
            <MetricCard label="Em andamento" value={String(metrics.workInProgress)} detail="Fluxo operacional atual" icon={Layers3} />
            <MetricCard label="Concluídas" value={String(metrics.completedTotal)} detail="Finalizadas na Integração" icon={ArrowUpRight} tone="green" />
            <MetricCard label="Bloqueadas agora" value={String(metrics.blockedNow)} detail={`${metrics.totalBlockPeriods} bloqueio(s) no histórico`} icon={ShieldAlert} tone="red" />
            <MetricCard label="Lead time líquido" value={formatDuration(metrics.averageLeadTimeSeconds)} detail="Média sem períodos bloqueados" icon={Clock3} />
        </section>

        <MetasSection metrics={metrics} />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div><h2 className="font-bold text-slate-900">Lojas por etapa</h2><p className="text-xs text-slate-500">Distribuição atual nas etapas dinâmicas do ClickUp</p></div>
                <div className="mt-5 h-72">{metrics.byStatus.length ? <Chart type="bar" options={chartOptions} data={{ labels: stageLabels, datasets: [{ data: metrics.byStatus.map((stage) => stage.count), backgroundColor: stageColors, borderRadius: 6 }] }} /> : <Empty label="Nenhuma etapa disponível" />}</div>
                <ul className="sr-only">{metrics.byStatus.map((stage) => <li key={stage.statusId}>{stage.statusName}: {stage.count} loja(s)</li>)}</ul>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div><h2 className="font-bold text-slate-900">Tempo por etapa</h2><p className="text-xs text-slate-500">Mediana e P90; lacunas representam etapas sem amostra</p></div>
                <div className="mt-5 h-72">{metrics.byStatus.length ? <Chart type="bar" options={{ ...chartOptions, plugins: { legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 10 } } } }} data={{ labels: stageLabels, datasets: [{ label: 'Mediana (dias)', data: metrics.byStatus.map((stage) => stage.medianSeconds === null ? null : Number((stage.medianSeconds / 86400).toFixed(1))), backgroundColor: '#128131', borderRadius: 5 }, { label: 'P90 (dias)', data: metrics.byStatus.map((stage) => stage.p90Seconds === null ? null : Number((stage.p90Seconds / 86400).toFixed(1))), backgroundColor: '#ff7900', borderRadius: 5 }] }} /> : <Empty label="Nenhuma amostra de tempo" />}</div>
                <ul className="sr-only">{metrics.byStatus.map((stage) => <li key={stage.statusId}>{stage.statusName}: mediana {formatDuration(stage.medianSeconds)} e P90 {formatDuration(stage.p90Seconds)}</li>)}</ul>
            </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-slate-900">Cobertura e qualidade</h2><p className="text-xs text-slate-500">Composição do universo monitorado</p>
                <div className="mx-auto mt-4 h-48 max-w-xs"><Chart type="doughnut" options={{ responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }} data={{ labels: ['Reconciliadas', 'Ainda não entraram', 'Ambíguas', 'Erro de dados'], datasets: [{ data: universe, backgroundColor: ['#128131', '#94a3b8', '#ffb020', '#e11d48'], borderWidth: 0 }] }} /></div>
                <p className="sr-only">Reconciliadas: {universe[0]}. Ainda não entraram: {universe[1]}. Ambíguas: {universe[2]}. Erros de dados: {universe[3]}.</p>
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>{metrics.orphanTasks} tarefa(s) órfã(s)</strong><br />Indicador global: não muda com os filtros de lojas.</div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-slate-900">Principais gargalos</h2><p className="text-xs text-slate-500">Etapas ordenadas pelo maior P90</p>
                <div className="mt-4 space-y-3">{bottlenecks.length ? bottlenecks.map((stage, index) => <div key={stage.statusId} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-[#d96500]">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{stage.statusName}</p><p className="text-xs text-slate-500">{stage.count} loja(s) atualmente</p></div><span className="text-sm font-black text-slate-800">{formatDuration(stage.p90Seconds)}</span></div>) : <Empty label="Sem amostras para identificar gargalos" />}</div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-slate-900">Eficiência do processo</h2><p className="text-xs text-slate-500">Comparativo dos tempos consolidados</p>
                <div className="mt-5 space-y-4">
                    {[['Lead time bruto médio', metrics.averageGrossTimeSeconds], ['Lead time bruto mediano', metrics.medianGrossTimeSeconds], ['Lead time líquido médio', metrics.averageLeadTimeSeconds]].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between border-b border-slate-100 pb-3"><span className="text-sm text-slate-600">{label}</span><strong className="text-sm text-slate-900">{formatDuration(value as number | null)}</strong></div>)}
                    <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">O tempo líquido desconsidera os períodos bloqueados registrados.</div>
                </div>
            </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Users size={18} className="text-[#128131]" /><div><h2 className="font-bold text-slate-900">Performance por integrador</h2><p className="text-xs text-slate-500">Métricas operacionais e metas individuais</p></div></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-3 py-3">Integrador</th><th className="px-3 py-3 text-right">Atribuído</th><th className="px-3 py-3 text-right">Concluídas</th><th className="px-3 py-3 text-right">Lead time</th><th className="px-3 py-3 text-right">Pontos</th><th className="px-3 py-3 text-right" title={`Meta: ${metrics.collectiveMetas?.targets.slaPercent ?? 80}% em até ${metrics.collectiveMetas?.targets.slaDays ?? 60} dias`}>SLA (≤{metrics.collectiveMetas?.targets.slaDays ?? 60}d)</th><th className="px-3 py-3 text-right" title={`Meta: ${metrics.collectiveMetas?.targets.qualityPercent ?? 90}% sem falhas`}>Qualidade</th><th className="px-3 py-3 text-right" title={`Meta: ${metrics.collectiveMetas?.targets.docsPercent ?? 20}% do bloco`}>Docs</th></tr></thead><tbody>{metrics.byAssignee.map((item) => <tr key={item.assigneeId} onClick={() => setSelectedAssignee(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedAssignee(item); }} tabIndex={0} role="button" aria-label={`Ver lojas e métricas de ${item.username}`} className="cursor-pointer border-b border-slate-100 outline-none transition-colors last:border-0 hover:bg-orange-50/50 focus:bg-orange-50"><td className="px-3 py-3 font-semibold text-slate-800"><span className="border-b border-dashed border-slate-300">{item.username}</span></td><td className="px-3 py-3 text-right">{item.count}</td><td className="px-3 py-3 text-right">{item.completedCount} <span className="text-xs text-slate-400">({item.count ? Math.round((item.completedCount / item.count) * 100) : 0}%)</span></td><td className="px-3 py-3 text-right">{formatDuration(item.averageNetSeconds)}</td><td className="px-3 py-3 text-right font-semibold text-slate-700">{item.pointsDelivered.toFixed(1)}</td><td className="px-3 py-3 text-right font-semibold text-[#ff7900]">{item.completedCount ? `${Math.round((item.slaSuccessCount / item.completedCount) * 100)}%` : '—'}</td><td className="px-3 py-3 text-right font-semibold text-[#128131]">{item.completedCount ? `${Math.round((item.qualitySuccessCount / item.completedCount) * 100)}%` : '—'}</td><td className="px-3 py-3 text-right font-semibold text-slate-600">{item.completedCount ? `${Math.round((item.docsSuccessCount / item.completedCount) * 100)}%` : '—'}</td></tr>)}</tbody></table>{!metrics.byAssignee.length && <Empty label="Nenhum integrador no período selecionado" />}</div>
            <p className="mt-3 text-xs text-slate-400">Clique em um integrador para ver suas lojas e métricas individuais.</p>
        </section>
        <IntegrationAssigneeDetail assignee={selectedAssignee} filters={filters} onClose={() => setSelectedAssignee(null)} />
    </>;
}

function Empty({ label }: { label: string }) { return <div className="flex h-full min-h-24 items-center justify-center text-center text-sm text-slate-400">{label}</div>; }

export default function IntegrationAnalytics() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<IntegrationFilterState>(EMPTY_FILTERS);
    const invalidPeriod = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate);
    const metricsQuery = useQuery({ queryKey: integrationQueryKeys.metrics(filters), queryFn: () => fetchIntegrationMetrics(filters), enabled: !invalidPeriod });
    const optionsQuery = useQuery({ queryKey: integrationQueryKeys.filters(), queryFn: fetchIntegrationFilters });
    const syncQuery = useQuery({ queryKey: integrationQueryKeys.syncStatus(), queryFn: fetchIntegrationSyncStatus });
    const setFilter = (key: keyof IntegrationFilterState, value: string) => setFilters((current) => ({ ...current, [key]: value }));
    const hasFilters = Object.values(filters).some(Boolean);

    return <div className="min-h-full bg-[#EEF0F8] text-slate-900">
        <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
            <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="h-1 bg-gradient-to-r from-[#ff7900] via-orange-400 to-[#128131]" /><div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d96500]">Integração</span><h1 className="mt-1 text-2xl font-black text-slate-900">Analytics do setor de Integrações</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Visão gerencial do histórico vindo da Implantação e do fluxo operacional de Integração.</p><p className="mt-2 text-xs text-slate-400">Última sincronização: {formatDate(syncQuery.data?.lastSuccessfulSync || null, true)}</p></div><button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: integrationQueryKeys.all })} disabled={metricsQuery.isFetching} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#ff7900] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#e66d00] disabled:opacity-50"><RefreshCw size={16} className={metricsQuery.isFetching ? 'animate-spin' : ''} />Atualizar dados</button></div></header>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6"><select aria-label="Filtrar por etapa" value={filters.statusId} onChange={(e) => setFilter('statusId', e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Todas as etapas</option>{optionsQuery.data?.statuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filtrar por integrador" value={filters.assigneeId} onChange={(e) => setFilter('assigneeId', e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Todos os integradores</option>{optionsQuery.data?.assignees.map((item) => <option key={String(item.id)} value={String(item.id)}>{item.name}</option>)}</select><select aria-label="Filtrar por situação do vínculo" value={filters.reconciliationStatus} onChange={(e) => setFilter('reconciliationStatus', e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Todos os vínculos</option><option value="MATCHED">Reconciliadas</option><option value="NOT_IN_INTEGRATION">Ainda não entraram</option><option value="AMBIGUOUS">Ambíguas</option><option value="DATA_ERROR">Erro de dados</option></select><select aria-label="Filtrar por bloqueio" value={filters.blocked} onChange={(e) => setFilter('blocked', e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Todos os bloqueios</option><option value="true">Bloqueadas agora</option><option value="false">Sem bloqueio atual</option></select><input aria-label="Data inicial" type="date" value={filters.startDate} onChange={(e) => setFilter('startDate', e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /><div className="flex gap-2"><input aria-label="Data final" type="date" value={filters.endDate} onChange={(e) => setFilter('endDate', e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm" /><button type="button" title="Limpar filtros" aria-label="Limpar filtros" disabled={!hasFilters} onClick={() => setFilters(EMPTY_FILTERS)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"><X size={16} /></button></div></div>{invalidPeriod && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">A data inicial não pode ser posterior à data final.</p>}{(optionsQuery.isError || syncQuery.isError) && <p className="mt-3 text-xs text-amber-700">Algumas informações auxiliares não puderam ser atualizadas. As métricas disponíveis continuam visíveis.</p>}</section>

            {invalidPeriod ? null : metricsQuery.isLoading ? <LoadingState /> : metricsQuery.isError ? <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-rose-200 bg-white text-center"><AlertCircle className="text-rose-500" size={36} /><h2 className="mt-3 font-bold">Não foi possível carregar o Analytics</h2><p className="mt-1 text-sm text-slate-500">A API de métricas não respondeu. Tente atualizar os dados.</p><button type="button" onClick={() => metricsQuery.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={15} />Tentar novamente</button></div> : metricsQuery.data && metricsQuery.data.totalStores > 0 ? <AnalyticsContent metrics={metricsQuery.data} filters={filters} /> : <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center"><Database className="text-slate-300" size={38} /><h2 className="mt-3 font-bold">Nenhum dado encontrado</h2><p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou sincronize o módulo para formar a base analítica.</p></div>}

            {!invalidPeriod && metricsQuery.data && (metricsQuery.data.ambiguous > 0 || metricsQuery.data.dataErrors > 0) && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><div><strong>Atenção à qualidade da base</strong><p className="mt-0.5 text-xs">{metricsQuery.data.ambiguous} vínculo(s) ambíguo(s) e {metricsQuery.data.dataErrors} registro(s) com erro de dados.</p></div></div>}
        </div>
    </div>;
}
