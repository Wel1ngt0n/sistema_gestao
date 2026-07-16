import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Ban, CalendarDays, Clock3, ExternalLink, History, Link2, TimerReset, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { fetchIntegrationV2StoreDetail } from '../api';
import { IntegrationV2Store } from '../types';
import { formatDate, formatDuration, reconciliationLabel, reconciliationTone, safeStatusColor } from '../utils';

interface IntegrationStoreDetailProps {
    store: IntegrationV2Store | null;
    onClose: () => void;
}

type DetailTab = 'overview' | 'timeline' | 'blocks';

function EmptyDetail({ message }: { message: string }) {
    return <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-400">{message}</div>;
}

export default function IntegrationStoreDetail({ store, onClose }: IntegrationStoreDetailProps) {
    const [tab, setTab] = useState<DetailTab>('overview');
    const detailQuery = useQuery({
        queryKey: ['integration-v2', 'store', store?.id],
        queryFn: () => fetchIntegrationV2StoreDetail(store!.id),
        enabled: Boolean(store),
    });
    const detail = detailQuery.data;

    return (
        <Dialog open={Boolean(store)} onClose={onClose} className="relative z-[70]">
            <DialogBackdrop className="fixed inset-0 bg-slate-950/30 backdrop-blur-[1px]" />
            <div className="fixed inset-0 flex justify-end">
                <DialogPanel className="flex h-full w-full max-w-4xl flex-col border-l border-slate-200 bg-white shadow-2xl">
                    <header className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-7">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <DialogTitle className="truncate text-xl font-bold text-slate-900">{store?.name}</DialogTitle>
                                    {store && <span className={`rounded border px-2 py-1 text-[10px] font-bold ${reconciliationTone(store.reconciliationStatus)}`}>{reconciliationLabel(store.reconciliationStatus)}</span>}
                                </div>
                                <p className="mt-1 truncate text-xs text-slate-500">{store?.businessId || store?.implantationTaskId || `Loja ${store?.id}`}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {store?.clickupUrl && (
                                    <a href={store.clickupUrl} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" title="Abrir no ClickUp">
                                        <ExternalLink size={17} />
                                    </a>
                                )}
                                <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" title="Fechar">
                                    <X size={19} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-1 border-b border-slate-100" role="tablist">
                            {([
                                ['overview', 'Resumo', Clock3],
                                ['timeline', 'Linha do tempo', History],
                                ['blocks', 'Bloqueios', Ban],
                            ] as const).map(([value, label, Icon]) => (
                                <button key={value} type="button" onClick={() => setTab(value)} className={`flex h-10 items-center gap-2 border-b-2 px-3 text-xs font-semibold ${tab === value ? 'border-orange-500 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                                    <Icon size={14} /> {label}
                                </button>
                            ))}
                        </div>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                        {detailQuery.isLoading && (
                            <div className="space-y-3">
                                <div className="h-24 animate-pulse rounded-md bg-slate-100" />
                                <div className="h-64 animate-pulse rounded-md bg-slate-100" />
                            </div>
                        )}
                        {detailQuery.isError && (
                            <div className="flex h-60 flex-col items-center justify-center text-center">
                                <AlertCircle size={28} className="text-rose-500" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">Não foi possível carregar o histórico da loja.</p>
                                <button type="button" onClick={() => detailQuery.refetch()} className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Tentar novamente</button>
                            </div>
                        )}

                        {detail && tab === 'overview' && (
                            <div className="space-y-8">
                                <section>
                                    <h2 className="text-xs font-bold uppercase text-slate-400">Visão operacional</h2>
                                    <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                                        {[
                                            { label: 'Tempo bruto', value: formatDuration(detail.grossTimeSeconds), icon: Clock3 },
                                            { label: 'Tempo bloqueado', value: formatDuration(detail.blockedTimeSeconds), icon: Ban },
                                            { label: 'Tempo líquido', value: formatDuration(detail.netTimeSeconds), icon: TimerReset },
                                            { label: 'Etapa atual', value: formatDuration(detail.currentStageSeconds), icon: History },
                                        ].map((item) => (
                                            <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400"><item.icon size={13} /> {item.label}</div>
                                                <p className="mt-2 truncate text-base font-bold text-slate-800">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="grid grid-cols-1 gap-x-8 gap-y-4 border-y border-slate-100 py-5 sm:grid-cols-2">
                                    <div className="flex items-start gap-3"><CalendarDays size={17} className="mt-0.5 text-slate-400" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Início / fim</p><p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(detail.startDate)} — {formatDate(detail.endDate)}</p></div></div>
                                    <div className="flex items-start gap-3"><UserRound size={17} className="mt-0.5 text-slate-400" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Integradores</p><p className="mt-1 text-sm font-semibold text-slate-700">{detail.assignees.map((assignee) => assignee.name).join(', ') || 'Não informado'}</p></div></div>
                                    <div className="flex items-start gap-3"><Link2 size={17} className="mt-0.5 text-slate-400" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Tarefa de Integração</p><p className="mt-1 text-sm font-semibold text-slate-700">{detail.integrationTaskId || 'Ainda não criada'}</p></div></div>
                                    <div className="flex items-start gap-3"><Clock3 size={17} className="mt-0.5 text-slate-400" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Prazo</p><p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(detail.dueDate)}</p></div></div>
                                </section>

                                <section>
                                    <div className="flex items-center justify-between gap-3">
                                        <h2 className="text-xs font-bold uppercase text-slate-400">Tempo acumulado por etapa</h2>
                                        <span className="text-[10px] text-slate-400">Reentradas são somadas e preservadas na linha do tempo</span>
                                    </div>
                                    <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
                                        {detail.stageTimes.map((stage) => (
                                            <div key={stage.statusId} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-3">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: safeStatusColor(stage.statusColor) }} />
                                                    <span className="truncate text-sm font-semibold text-slate-700">{stage.statusName}</span>
                                                    {stage.current && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">ATUAL</span>}
                                                </div>
                                                <span className="text-xs text-slate-500">{stage.passages} {stage.passages === 1 ? 'passagem' : 'passagens'}</span>
                                                <span className="min-w-24 text-right text-sm font-bold text-slate-800">{formatDuration(stage.totalSeconds)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {!detail.stageTimes.length && <EmptyDetail message="Ainda não há tempo de etapas registrado." />}
                                </section>

                                {!!detail.customFields.length && (
                                    <section>
                                        <h2 className="text-xs font-bold uppercase text-slate-400">Dados do ClickUp</h2>
                                        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {detail.customFields.map((field) => (
                                                <div key={field.label} className="border-b border-slate-100 pb-2"><dt className="text-[10px] font-bold uppercase text-slate-400">{field.label}</dt><dd className="mt-1 text-sm font-medium text-slate-700">{field.value}</dd></div>
                                            ))}
                                        </dl>
                                    </section>
                                )}
                            </div>
                        )}

                        {detail && tab === 'timeline' && (
                            <section>
                                <div className="mb-5">
                                    <h2 className="text-sm font-bold text-slate-800">Jornada completa na Integração</h2>
                                    <p className="mt-1 text-xs text-slate-500">Cada passagem é exibida separadamente, inclusive reentradas na mesma etapa.</p>
                                </div>
                                <div className="relative ml-2 border-l border-slate-200 pl-6">
                                    {detail.timeline.map((item) => (
                                        <article key={String(item.id)} className="relative mb-5 rounded-md border border-slate-200 bg-white p-4 last:mb-0">
                                            <span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: safeStatusColor(item.statusColor) }} />
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div><h3 className="text-sm font-bold text-slate-800">{item.statusName}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(item.enteredAt, true)} — {item.current ? 'Em andamento' : formatDate(item.exitedAt, true)}</p></div>
                                                <span className="text-sm font-bold text-slate-700">{formatDuration(item.durationSeconds)}</span>
                                            </div>
                                            {item.timestampQuality && item.timestampQuality !== 'EXACT' && <p className="mt-3 text-[10px] font-semibold text-amber-700">Qualidade do horário: {item.timestampQuality}</p>}
                                        </article>
                                    ))}
                                </div>
                                {!detail.timeline.length && <EmptyDetail message="Ainda não há transições registradas para esta loja." />}
                            </section>
                        )}

                        {detail && tab === 'blocks' && (
                            <section>
                                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                                    <div><h2 className="text-sm font-bold text-slate-800">Períodos de bloqueio</h2><p className="mt-1 text-xs text-slate-500">Todos os intervalos usados no cálculo do tempo líquido.</p></div>
                                    <span className="rounded bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">{formatDuration(detail.blockedTimeSeconds)} acumulado</span>
                                </div>
                                <div className="space-y-3">
                                    {detail.blockPeriods.map((period, index) => (
                                        <article key={String(period.id)} className="border-l-4 border-rose-400 bg-rose-50/50 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div><h3 className="text-sm font-bold text-slate-800">{period.reason || 'Motivo não informado'}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(period.startedAt, true)} — {period.current ? 'Bloqueio atual' : formatDate(period.endedAt, true)}</p></div>
                                                <div className="text-right"><p className="text-sm font-bold text-rose-700">{formatDuration(period.durationSeconds)}</p><p className="mt-1 text-[10px] text-slate-400">Bloqueio #{index + 1}</p></div>
                                            </div>
                                            {(period.source || period.inferenceQuality) && <p className="mt-3 text-[10px] font-semibold text-slate-500">Origem: {period.source || 'não informada'} · Qualidade: {period.inferenceQuality || 'não informada'}</p>}
                                        </article>
                                    ))}
                                </div>
                                {!detail.blockPeriods.length && <EmptyDetail message="Nenhum bloqueio foi registrado para esta loja." />}
                            </section>
                        )}
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
