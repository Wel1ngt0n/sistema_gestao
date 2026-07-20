import { AlertCircle, Ban, CalendarClock, Clock3, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { IntegrationStatus, IntegrationStore, LOCAL_NOT_ENTERED_STATUS } from '../types';
import { formatDate, formatDuration, reconciliationLabel, safeStatusColor } from '../utils';

interface IntegrationKanbanProps {
    stores: IntegrationStore[];
    schema: IntegrationStatus[];
    loading: boolean;
    onOpenStore: (store: IntegrationStore) => void;
}

interface ColumnData {
    status: IntegrationStatus;
    stores: IntegrationStore[];
}

function StoreCard({ store, onOpen }: { store: IntegrationStore; onOpen: () => void }) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="w-full rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-orange-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{store.name}</p>
                    <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                        {store.businessId || store.integrationTaskId || `Loja ${store.id}`}
                    </p>
                </div>
                {store.isBlocked && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-rose-50 text-rose-600" title="Loja bloqueada">
                        <Ban size={14} />
                    </span>
                )}
            </div>

            {store.reconciliationStatus !== 'MATCHED' && (
                <div className="mt-2 flex items-center gap-1.5 rounded bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
                    <AlertCircle size={12} />
                    <span className="truncate">{reconciliationLabel(store.reconciliationStatus)}</span>
                </div>
            )}

            <span className={`mt-2 inline-flex rounded border px-2 py-1 text-[9px] font-bold uppercase ${store.implantationState === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-cyan-200 bg-cyan-50 text-cyan-700'}`}>
                Implantação {store.implantationState === 'COMPLETED' ? 'finalizada' : 'ativa'}
            </span>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
                <div className="rounded bg-slate-50 px-2 py-1.5">
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400"><Clock3 size={11} /> Na etapa</div>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">{formatDuration(store.currentStageSeconds)}</p>
                </div>
                <div className="rounded bg-slate-50 px-2 py-1.5">
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400"><CalendarClock size={11} /> Prazo</div>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">{formatDate(store.dueDate)}</p>
                </div>
            </div>

            <div className="mt-3 flex min-w-0 items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                <UserRound size={12} className="shrink-0" />
                <span className="truncate">
                    {store.assignees.length ? store.assignees.map((assignee) => assignee.name).join(', ') : 'Sem integrador'}
                </span>
            </div>
        </button>
    );
}

export default function IntegrationKanban({ stores, schema, loading, onOpenStore }: IntegrationKanbanProps) {
    const columns = useMemo<ColumnData[]>(() => {
        const knownIds = new Set(schema.map((status) => status.id));
        const missingStatuses = stores.reduce<IntegrationStatus[]>((result, store) => {
            if (!store.statusId || knownIds.has(store.statusId) || result.some((status) => status.id === store.statusId)) return result;
            result.push({
                id: store.statusId,
                name: store.statusName || 'Etapa não catalogada',
                color: store.statusColor,
                order: schema.length + result.length,
                active: true,
            });
            return result;
        }, []);
        const statuses = [LOCAL_NOT_ENTERED_STATUS, ...schema, ...missingStatuses];

        return statuses.map((status) => ({
            status,
            stores: stores.filter((store) => status.isLocal
                ? store.reconciliationStatus === 'NOT_IN_INTEGRATION'
                : store.statusId === status.id),
        }));
    }, [schema, stores]);

    if (loading) {
        return (
            <div className="flex h-full min-w-max gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-full w-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex h-full min-w-max items-start gap-3 pb-2">
            {columns.map(({ status, stores: columnStores }) => {
                const color = safeStatusColor(status.color);
                return (
                    <section key={status.id} className="flex h-full w-80 flex-none flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-100/70">
                        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3">
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                                <h2 className="truncate text-xs font-bold uppercase text-slate-700" title={status.name}>{status.name}</h2>
                            </div>
                            <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{columnStores.length}</span>
                        </header>
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                            {columnStores.map((store) => <StoreCard key={String(store.id)} store={store} onOpen={() => onOpenStore(store)} />)}
                            {!columnStores.length && (
                                <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white/40 px-4 text-center text-xs text-slate-400">Nenhuma loja nesta etapa</div>
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
