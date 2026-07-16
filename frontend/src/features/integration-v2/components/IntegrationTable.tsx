import { Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { IntegrationV2Store } from '../types';
import { formatDate, formatDuration, reconciliationLabel, reconciliationTone, safeStatusColor } from '../utils';

interface IntegrationTableProps {
    stores: IntegrationV2Store[];
    loading: boolean;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onOpenStore: (store: IntegrationV2Store) => void;
}

export default function IntegrationTable({ stores, loading, page, pageSize, total, onPageChange, onOpenStore }: IntegrationTableProps) {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    return (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[1100px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Loja</th>
                            <th className="px-4 py-3">Implantação</th>
                            <th className="px-4 py-3">Vínculo</th>
                            <th className="px-4 py-3">Etapa atual</th>
                            <th className="px-4 py-3">Integradores</th>
                            <th className="px-4 py-3">Início</th>
                            <th className="px-4 py-3">Fim</th>
                            <th className="px-4 py-3">Tempo na etapa</th>
                            <th className="px-4 py-3">Tempo líquido</th>
                            <th className="px-4 py-3">Prazo</th>
                            <th className="w-14 px-4 py-3" aria-label="Ações" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && Array.from({ length: 8 }).map((_, index) => (
                            <tr key={index}>
                                <td colSpan={11} className="px-4 py-2"><div className="h-9 animate-pulse rounded bg-slate-100" /></td>
                            </tr>
                        ))}
                        {!loading && stores.map((store) => (
                            <tr key={String(store.id)} className="group hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <button type="button" onClick={() => onOpenStore(store)} className="max-w-64 text-left">
                                        <span className="block truncate text-sm font-bold text-slate-800 group-hover:text-orange-700">{store.name}</span>
                                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">{store.businessId || store.implantationTaskId || `ID ${store.id}`}</span>
                                    </button>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${store.implantationState === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-cyan-200 bg-cyan-50 text-cyan-700'}`}>
                                        {store.implantationState === 'COMPLETED' ? 'Finalizada' : 'Ativa'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${reconciliationTone(store.reconciliationStatus)}`}>
                                        {reconciliationLabel(store.reconciliationStatus)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {store.statusName ? (
                                        <span className="inline-flex max-w-48 items-center gap-1.5 rounded bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                                            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: safeStatusColor(store.statusColor) }} />
                                            <span className="truncate">{store.statusName}</span>
                                        </span>
                                    ) : <span className="text-xs text-slate-400">Não iniciada</span>}
                                </td>
                                <td className="max-w-52 px-4 py-3 text-xs text-slate-600">
                                    <span className="block truncate">{store.assignees.map((assignee) => assignee.name).join(', ') || 'Sem integrador'}</span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDate(store.startDate)}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDate(store.endDate)}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-700">{formatDuration(store.currentStageSeconds)}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-700">{formatDuration(store.netTimeSeconds)}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                                    <span className="inline-flex items-center gap-1.5">
                                        {store.isBlocked && <Ban size={13} className="text-rose-600" />}
                                        {formatDate(store.dueDate)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <button type="button" onClick={() => onOpenStore(store)} className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-orange-50 hover:text-orange-700" title="Abrir detalhes">
                                        <ChevronRight size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && !stores.length && (
                            <tr><td colSpan={11} className="h-40 text-center text-sm text-slate-400">Nenhuma loja encontrada com os filtros atuais.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <footer className="flex h-14 shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-4 text-xs text-slate-500">
                <span>{total.toLocaleString('pt-BR')} lojas</span>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40" title="Página anterior">
                        <ChevronLeft size={15} />
                    </button>
                    <span>Página <strong className="text-slate-700">{page}</strong> de {pageCount}</span>
                    <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount || loading} className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40" title="Próxima página">
                        <ChevronRight size={15} />
                    </button>
                </div>
            </footer>
        </section>
    );
}
