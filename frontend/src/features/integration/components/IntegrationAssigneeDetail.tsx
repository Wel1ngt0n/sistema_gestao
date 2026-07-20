import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock3, Layers3, Search, ShieldAlert, Store, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fetchAllIntegrationStores } from '../api';
import { integrationQueryKeys } from '../queryKeys';
import { IntegrationAssigneeMetric, IntegrationFilterState, IntegrationStore } from '../types';
import { formatDate, formatDuration } from '../utils';
import IntegrationStoreDetail from './IntegrationStoreDetail';

interface IntegrationAssigneeDetailProps {
    assignee: IntegrationAssigneeMetric | null;
    filters: IntegrationFilterState;
    onClose: () => void;
}

type StoreView = 'all' | 'completed' | 'active';

function SummaryCard({ label, value, icon: Icon, tone = 'orange' }: {
    label: string;
    value: string;
    icon: typeof Store;
    tone?: 'orange' | 'green' | 'red' | 'slate';
}) {
    const tones = {
        orange: 'bg-orange-50 text-[#d96500]',
        green: 'bg-emerald-50 text-[#128131]',
        red: 'bg-rose-50 text-rose-600',
        slate: 'bg-slate-100 text-slate-600',
    };
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-md ${tones[tone]}`}><Icon size={16} /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
        </div>
    );
}

export default function IntegrationAssigneeDetail({ assignee, filters, onClose }: IntegrationAssigneeDetailProps) {
    const [view, setView] = useState<StoreView>('all');
    const [search, setSearch] = useState('');
    const [selectedStore, setSelectedStore] = useState<IntegrationStore | null>(null);
    const assigneeFilters = useMemo(() => ({ ...filters, search: '', assigneeId: assignee?.assigneeId || '' }), [assignee, filters]);
    const storesQuery = useQuery({
        queryKey: integrationQueryKeys.assigneeStores(assignee?.assigneeId, assigneeFilters),
        queryFn: () => fetchAllIntegrationStores(assigneeFilters),
        enabled: Boolean(assignee),
    });
    const stores = storesQuery.data?.items || [];
    const completed = stores.filter((store) => store.integrationCompleted);
    const active = stores.filter((store) => !store.integrationCompleted);
    const blocked = stores.filter((store) => store.isBlocked).length;
    const visibleStores = stores.filter((store) => {
        if (view === 'completed' && !store.integrationCompleted) return false;
        if (view === 'active' && store.integrationCompleted) return false;
        const term = search.trim().toLocaleLowerCase('pt-BR');
        return !term || `${store.name} ${store.businessId || ''}`.toLocaleLowerCase('pt-BR').includes(term);
    });

    const closePanel = () => {
        setView('all');
        setSearch('');
        setSelectedStore(null);
        onClose();
    };

    return (
        <>
            <Dialog open={Boolean(assignee)} onClose={closePanel} className="relative z-[60]">
                <DialogBackdrop className="fixed inset-0 bg-slate-950/30 backdrop-blur-[1px]" />
                <div className="fixed inset-0 flex justify-end">
                    <DialogPanel className="flex h-full w-full max-w-5xl flex-col border-l border-slate-200 bg-[#EEF0F8] shadow-2xl">
                        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#128131]">Performance individual</p>
                                    <DialogTitle className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{assignee?.username}</DialogTitle>
                                    <p className="mt-1 text-xs text-slate-500">Lojas e métricas correspondentes ao recorte atual do Analytics.</p>
                                </div>
                                <button type="button" onClick={closePanel} aria-label="Fechar detalhes do integrador" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                            </div>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                            {storesQuery.isLoading ? (
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />)}</div>
                            ) : storesQuery.isError ? (
                                <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-rose-200 bg-white text-center">
                                    <AlertCircle size={34} className="text-rose-500" />
                                    <h3 className="mt-3 font-bold text-slate-900">Não foi possível carregar as lojas</h3>
                                    <button type="button" onClick={() => storesQuery.refetch()} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Tentar novamente</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                                        <SummaryCard label="Total atribuído" value={String(stores.length)} icon={Store} tone="slate" />
                                        <SummaryCard label="Concluídas" value={String(completed.length)} icon={CheckCircle2} tone="green" />
                                        <SummaryCard label="Em andamento" value={String(active.length)} icon={Layers3} />
                                        <SummaryCard label="Bloqueadas" value={String(blocked)} icon={ShieldAlert} tone="red" />
                                        <SummaryCard label="Lead time líquido" value={formatDuration(assignee?.averageNetSeconds ?? null)} icon={Clock3} />
                                    </section>

                                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900">Lojas trabalhadas</h3>
                                                <p className="text-xs text-slate-500">Clique em uma loja para consultar timeline, tempos e bloqueios.</p>
                                            </div>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <div className="relative">
                                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar loja" aria-label="Buscar loja do integrador" className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-orange-400 sm:w-56" />
                                                </div>
                                                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                                                    {([['all', `Todas (${stores.length})`], ['completed', `Concluídas (${completed.length})`], ['active', `Em andamento (${active.length})`]] as const).map(([key, label]) => (
                                                        <button key={key} type="button" onClick={() => setView(key)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${view === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[760px] text-left text-sm">
                                                <thead><tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Loja</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3">Início</th><th className="px-4 py-3 text-right">Tempo líquido</th></tr></thead>
                                                <tbody>{visibleStores.map((store) => (
                                                    <tr key={store.id} onClick={() => setSelectedStore(store)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedStore(store); }} tabIndex={0} role="button" className="cursor-pointer border-b border-slate-100 outline-none transition-colors last:border-0 hover:bg-orange-50/50 focus:bg-orange-50">
                                                        <td className="px-4 py-3"><p className="font-semibold text-slate-900">{store.name}</p><p className="text-xs text-slate-400">{store.businessId || `Loja ${store.id}`}</p></td>
                                                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${store.integrationCompleted ? 'bg-emerald-50 text-[#128131]' : 'bg-orange-50 text-[#d96500]'}`}>{store.integrationCompleted ? 'Concluída' : 'Em andamento'}</span></td>
                                                        <td className="px-4 py-3 text-slate-600">{store.statusName || 'Sem etapa'}</td>
                                                        <td className="px-4 py-3 text-slate-600">{formatDate(store.startDate)}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatDuration(store.netTimeSeconds)}</td>
                                                    </tr>
                                                ))}</tbody>
                                            </table>
                                            {!visibleStores.length && <div className="flex min-h-40 items-center justify-center px-4 text-sm text-slate-400">Nenhuma loja encontrada nesta visualização.</div>}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
            <IntegrationStoreDetail store={selectedStore} onClose={() => setSelectedStore(null)} />
        </>
    );
}
