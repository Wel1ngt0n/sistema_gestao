import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    Ban,
    Building2,
    CalendarCheck2,
    Check,
    CheckCircle2,
    CircleDollarSign,
    ClipboardCheck,
    Clock3,
    Database,
    FileClock,
    GitBranch,
    History,
    Info,
    Loader2,
    LucideIcon,
    MapPin,
    Network,
    RotateCcw,
    Save,
    ShieldCheck,
    TimerReset,
    UserRound,
    XCircle,
} from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
    fetchIntegrationFilters,
    fetchIntegrationStoreDetail,
    reviewIntegrationBlock,
    updateIntegrationStoreOperational,
} from '../api';
import { integrationQueryKeys } from '../queryKeys';
import { IntegrationBlockReviewUpdate, IntegrationOperationalUpdate, IntegrationStore } from '../types';
import { formatDate, formatDuration, reconciliationLabel, reconciliationTone, safeStatusColor } from '../utils';
import OperationalDetailModalShell, { OperationalDetailTab } from './OperationalDetailModalShell';

interface IntegrationStoreDetailProps {
    store: IntegrationStore | null;
    onClose: () => void;
}

type DetailTab = 'overview' | 'stages' | 'history' | 'blocks' | 'quality';
type BlockDraft = { discountApproved: boolean | null; reviewReason: string };

const EMPTY_FORM: IntegrationOperationalUpdate = {
    manualIntegratorId: null,
    qualityReviewer: null,
    hadPostIntegrationIssues: null,
    followedIntegrationProcess: null,
    qualityNotes: null,
};

const FIELD_LABELS: Record<string, string> = {
    manual_integrator_id: 'Integrador responsável',
    quality_reviewer: 'Responsável pela qualidade',
    had_post_integration_issues: 'Problemas pós-integração',
    followed_integration_process: 'Conformidade do processo',
    quality_notes: 'Observações de qualidade',
};

const TABS: OperationalDetailTab<DetailTab>[] = [
    { id: 'overview', label: 'Visão geral', icon: Building2 },
    { id: 'stages', label: 'Etapas', icon: GitBranch },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'blocks', label: 'Bloqueios', icon: Ban },
    { id: 'quality', label: 'Qualidade', icon: ShieldCheck },
];

const selectClass = 'mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100';
const textareaClass = 'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

function SectionCard({ title, description, icon: Icon, children, className = '' }: {
    title: string;
    description?: string;
    icon: LucideIcon;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
            <div className="mb-4 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#e76c00]"><Icon size={17} /></span>
                <div><h2 className="text-sm font-extrabold text-slate-900">{title}</h2>{description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}</div>
            </div>
            {children}
        </section>
    );
}

function ReadonlyField({ label, value, icon: Icon }: { label: string; value?: ReactNode; icon?: LucideIcon }) {
    return (
        <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{Icon && <Icon size={12} />}{label}</p>
            <div className="mt-1 break-words text-sm font-semibold text-slate-700">{value || 'Não informado'}</div>
        </div>
    );
}

function DateMilestone({ label, value, source, tone }: { label: string; value: string | null; source: string; tone: 'orange' | 'green' }) {
    const active = tone === 'orange';
    return (
        <div className={`relative overflow-hidden rounded-xl border bg-white p-3.5 ${active ? 'border-orange-200' : 'border-emerald-200'}`}>
            <span className={`absolute inset-y-0 left-0 w-1 ${active ? 'bg-[#ff7900]' : 'bg-[#128131]'}`} />
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1.5 text-base font-extrabold text-slate-900">{formatDate(value)}</p>
            <p className="mt-1 text-[10px] font-medium text-slate-400">{source}</p>
        </div>
    );
}

function ChoiceField({ label, value, onChange, positiveLabel, negativeLabel }: {
    label: string;
    value: boolean | null;
    onChange: (value: boolean | null) => void;
    positiveLabel: string;
    negativeLabel: string;
}) {
    return (
        <fieldset>
            <legend className="text-xs font-bold text-slate-700">{label}</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                    [true, positiveLabel, CheckCircle2],
                    [false, negativeLabel, XCircle],
                    [null, 'Não avaliado', Info],
                ] as const).map(([option, text, Icon]) => (
                    <button key={text} type="button" onClick={() => onChange(option)} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold transition ${value === option ? option === true ? 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : option === false ? 'border-rose-300 bg-rose-50 text-rose-700 ring-1 ring-rose-100' : 'border-slate-300 bg-slate-100 text-slate-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                        <Icon size={14} /> {text}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}

function EmptyDetail({ message }: { message: string }) {
    return <div className="flex min-h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white/60 px-6 text-center text-sm font-medium text-slate-400">{message}</div>;
}

const formatCurrency = (value: number | null) => value === null
    ? 'Não informado'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function IntegrationStoreDetail({ store, onClose }: IntegrationStoreDetailProps) {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<DetailTab>('overview');
    const [form, setForm] = useState<IntegrationOperationalUpdate>(EMPTY_FORM);
    const [initialForm, setInitialForm] = useState<IntegrationOperationalUpdate>(EMPTY_FORM);
    const [blockDrafts, setBlockDrafts] = useState<Record<string, BlockDraft>>({});
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const detailQuery = useQuery({
        queryKey: integrationQueryKeys.store(store?.id),
        queryFn: () => fetchIntegrationStoreDetail(store!.id),
        enabled: Boolean(store),
    });
    const filtersQuery = useQuery({
        queryKey: integrationQueryKeys.filters(),
        queryFn: fetchIntegrationFilters,
        enabled: Boolean(store),
        staleTime: 5 * 60 * 1000,
    });
    const detail = detailQuery.data;

    useEffect(() => {
        if (!detail) return;
        const nextForm: IntegrationOperationalUpdate = {
            manualIntegratorId: detail.operationalProfile.manualIntegrator?.id ?? null,
            qualityReviewer: detail.operationalProfile.qualityReviewer,
            hadPostIntegrationIssues: detail.operationalProfile.hadPostIntegrationIssues,
            followedIntegrationProcess: detail.operationalProfile.followedIntegrationProcess,
            qualityNotes: detail.operationalProfile.qualityNotes,
        };
        setForm(nextForm);
        setInitialForm(nextForm);
        setBlockDrafts(Object.fromEntries(detail.blockPeriods.map((period) => [String(period.id), {
            discountApproved: period.discountApproved,
            reviewReason: period.reviewReason || '',
        }])));
    }, [detail]);

    useEffect(() => {
        setTab('overview');
        setSavedMessage(null);
    }, [store?.id]);

    const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
    const hasDirtyBlockDrafts = useMemo(() => detail?.blockPeriods.some((period) => {
        const draft = blockDrafts[String(period.id)];
        return Boolean(draft && (
            draft.discountApproved !== period.discountApproved
            || draft.reviewReason.trim() !== (period.reviewReason || '')
        ));
    }) || false, [blockDrafts, detail?.blockPeriods]);
    const hasUnsavedChanges = isDirty || hasDirtyBlockDrafts;
    const tabs = useMemo(() => TABS.map((item) => item.id === 'blocks' ? { ...item, badge: detail?.blockPeriods.length } : item), [detail?.blockPeriods.length]);

    const refreshDetail = async () => {
        await queryClient.invalidateQueries({ queryKey: integrationQueryKeys.store(store?.id) });
        await queryClient.invalidateQueries({ queryKey: integrationQueryKeys.monitorRoot() });
        await queryClient.invalidateQueries({ queryKey: integrationQueryKeys.metricsRoot() });
    };

    const operationalMutation = useMutation({
        mutationFn: () => updateIntegrationStoreOperational(store!.id, form),
        onSuccess: async () => {
            setSavedMessage('Alterações salvas e registradas no histórico.');
            await refreshDetail();
        },
    });

    const blockMutation = useMutation({
        mutationFn: ({ blockId, values }: { blockId: string | number; values: IntegrationBlockReviewUpdate }) => reviewIntegrationBlock(store!.id, blockId, values),
        onSuccess: async () => {
            setSavedMessage('Decisão do bloqueio salva no histórico.');
            await refreshDetail();
        },
    });

    const requestClose = () => {
        if (hasUnsavedChanges && !window.confirm('Existem alterações não salvas. Deseja descartá-las?')) return;
        onClose();
    };

    const discardChanges = () => {
        setForm(initialForm);
        setBlockDrafts(Object.fromEntries((detail?.blockPeriods || []).map((period) => [String(period.id), {
            discountApproved: period.discountApproved,
            reviewReason: period.reviewReason || '',
        }])));
        setSavedMessage(null);
    };

    const headerDates = detail ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <DateMilestone label="Início da Implantação" value={detail.implantationReference?.startedAt || detail.firstSeenAt} source="Projeto de Implantação" tone="orange" />
            <DateMilestone label="Fim da Implantação" value={detail.implantationReference?.finishedAt || detail.implantationFinishedAt} source="Projeto de Implantação" tone="orange" />
            <DateMilestone label="Início da Integração" value={detail.integrationStartedAt} source="Primeira entrada em Contato/Comunicação" tone="green" />
            <DateMilestone label="Fim da Integração" value={detail.integrationFinishedAt} source="Conclusão da tarefa de Integração" tone="green" />
        </div>
    ) : null;

    return (
        <OperationalDetailModalShell
            open={Boolean(store)}
            title={store?.name || 'Detalhes da loja'}
            subtitle={store?.businessId || store?.implantationTaskId || (store ? `Loja ${store.id}` : null)}
            status={store && <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${reconciliationTone(store.reconciliationStatus)}`}>{reconciliationLabel(store.reconciliationStatus)}</span>}
            externalUrl={store?.clickupUrl}
            tabs={tabs}
            activeTab={tab}
            onTabChange={setTab}
            onClose={requestClose}
            headerContent={headerDates}
            footer={detail ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-h-5 text-xs">
                        {operationalMutation.isError && <span className="font-semibold text-rose-600">Não foi possível salvar. Revise os dados e tente novamente.</span>}
                        {!operationalMutation.isError && savedMessage && <span className="flex items-center gap-1.5 font-semibold text-emerald-700"><Check size={14} />{savedMessage}</span>}
                        {!savedMessage && hasUnsavedChanges && <span className="font-semibold text-amber-700">Você possui alterações não salvas.</span>}
                        {!savedMessage && !hasUnsavedChanges && detail.operationalProfile.updatedAt && <span className="text-slate-400">Última edição por {detail.operationalProfile.updatedBy || 'usuário'} em {formatDate(detail.operationalProfile.updatedAt, true)}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={discardChanges} disabled={!hasUnsavedChanges || operationalMutation.isPending || blockMutation.isPending} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={15} /> Cancelar</button>
                        <button type="button" onClick={() => operationalMutation.mutate()} disabled={!isDirty || operationalMutation.isPending} className="flex h-10 items-center gap-2 rounded-lg bg-[#ff7900] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#e76c00] disabled:cursor-not-allowed disabled:bg-slate-300">
                            {operationalMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar alterações
                        </button>
                    </div>
                </div>
            ) : undefined}
        >
            {detailQuery.isLoading && <div className="space-y-4"><div className="h-32 animate-pulse rounded-xl bg-slate-200" /><div className="h-64 animate-pulse rounded-xl bg-slate-200" /></div>}
            {detailQuery.isError && (
                <div className="flex min-h-96 flex-col items-center justify-center rounded-xl border border-rose-100 bg-white text-center">
                    <AlertCircle size={32} className="text-rose-500" /><p className="mt-3 text-sm font-bold text-slate-800">Não foi possível carregar os detalhes da loja.</p>
                    <button type="button" onClick={() => detailQuery.refetch()} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Tentar novamente</button>
                </div>
            )}

            {detail && tab === 'overview' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <SectionCard title="Operação da Integração" description="Responsabilidade e tempos líquidos do processo" icon={TimerReset}>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {([
                                    { label: 'Tempo bruto', value: formatDuration(detail.grossTimeSeconds), icon: Clock3 },
                                    { label: 'Bloqueios aceitos', value: formatDuration(detail.blockedTimeSeconds), icon: Ban },
                                    { label: 'Tempo líquido', value: formatDuration(detail.netTimeSeconds), icon: TimerReset },
                                    { label: 'Etapa atual', value: formatDuration(detail.currentStageSeconds), icon: FileClock },
                                ] as Array<{ label: string; value: string; icon: LucideIcon }>).map(({ label, value, icon: Icon }) => (
                                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><p className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400"><Icon size={12} />{label}</p><p className="mt-1.5 text-base font-extrabold text-slate-900">{value}</p></div>
                                ))}
                            </div>
                            <label className="mt-5 block"><span className="text-xs font-bold text-slate-700">Integrador responsável</span><p className="mt-0.5 text-[11px] text-slate-400">A escolha manual tem prioridade sobre o responsável sincronizado do ClickUp.</p>
                                <select className={selectClass} value={form.manualIntegratorId === null ? '' : String(form.manualIntegratorId)} onChange={(event) => { setSavedMessage(null); setForm((current) => ({ ...current, manualIntegratorId: event.target.value || null })); }}>
                                    <option value="">Usar responsável sincronizado</option>
                                    {filtersQuery.data?.assignees.map((assignee) => <option key={String(assignee.id)} value={String(assignee.id)}>{assignee.name}</option>)}
                                </select>
                            </label>
                        </SectionCard>

                        <SectionCard title="Dados técnicos e da loja" description="Referências somente leitura vindas da Implantação" icon={Database}>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                                <ReadonlyField label="ERP" value={detail.implantationReference?.erp} />
                                <ReadonlyField label="CNPJ" value={detail.implantationReference?.cnpj} />
                                <ReadonlyField label="CRM" value={detail.implantationReference?.crm} />
                                <ReadonlyField label="Tipo de implantação" value={detail.implantationReference?.deploymentType} />
                                <ReadonlyField label="Plataforma anterior" value={detail.implantationReference?.previousPlatform} />
                                <ReadonlyField label="Já possuía e-commerce" value={detail.implantationReference?.hadEcommerce === null || detail.implantationReference?.hadEcommerce === undefined ? null : detail.implantationReference.hadEcommerce ? 'Sim' : 'Não'} />
                                <ReadonlyField label="Pedidos projetados" value={detail.implantationReference?.projectedOrders?.toLocaleString('pt-BR')} />
                                <ReadonlyField label="Implantador" value={detail.implantationReference?.implantador} icon={UserRound} />
                                <ReadonlyField label="UF" value={detail.implantationReference?.state} icon={MapPin} />
                            </div>
                            {detail.customFields.length > 0 && <div className="mt-5 border-t border-slate-100 pt-5"><p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Campos da tarefa de Integração</p><div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">{detail.customFields.map((field) => <ReadonlyField key={field.label} label={field.label} value={field.value} />)}</div></div>}
                        </SectionCard>
                    </div>

                    <div className="space-y-4">
                        <SectionCard title="Rede e estrutura" icon={Network}>
                            <div className="space-y-4">
                                <ReadonlyField label="Rede" value={detail.implantationReference?.network} />
                                <ReadonlyField label="Tipo de loja" value={detail.implantationReference?.storeType} />
                                <ReadonlyField label="Matriz" value={detail.implantationReference?.parentStore} />
                                <ReadonlyField label="Filiais" value={detail.implantationReference?.branches.join(', ')} />
                                <ReadonlyField label="Endereço" value={detail.implantationReference?.address} icon={MapPin} />
                            </div>
                        </SectionCard>
                        <SectionCard title="Financeiro" description="Valores registrados na Implantação" icon={CircleDollarSign}>
                            <div className="space-y-4">
                                <ReadonlyField label="Mensalidade" value={formatCurrency(detail.implantationReference?.monthlyFee ?? null)} />
                                <ReadonlyField label="Implantação" value={formatCurrency(detail.implantationReference?.implantationFee ?? null)} />
                                <ReadonlyField label="Status financeiro" value={detail.implantationReference?.financialStatus} />
                            </div>
                        </SectionCard>
                    </div>
                </div>
            )}

            {detail && tab === 'stages' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                    <SectionCard title="Tempo acumulado por etapa" description="Reentradas são somadas sem perder cada passagem" icon={TimerReset}>
                        <div className="space-y-2">
                            {detail.stageTimes.map((stage) => (
                                <div key={stage.statusId} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: safeStatusColor(stage.statusColor) }} /><span className="truncate text-xs font-bold text-slate-700">{stage.statusName}</span>{stage.current && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">ATUAL</span>}</div><span className="text-sm font-extrabold text-slate-900">{formatDuration(stage.totalSeconds)}</span></div>
                                    <p className="mt-1 pl-4 text-[10px] text-slate-400">{stage.passages} {stage.passages === 1 ? 'passagem' : 'passagens'}</p>
                                </div>
                            ))}
                            {!detail.stageTimes.length && <EmptyDetail message="Ainda não há tempo de etapas registrado." />}
                        </div>
                    </SectionCard>
                    <SectionCard title="Jornada completa" description="Cada passagem e reentrada preservada na linha do tempo" icon={GitBranch}>
                        <div className="relative ml-2 border-l-2 border-slate-200 pl-6">
                            {detail.timeline.map((item) => (
                                <article key={String(item.id)} className="relative mb-3 rounded-lg border border-slate-200 bg-white p-3 last:mb-0">
                                    <span className="absolute -left-[31px] top-4 h-3 w-3 rounded-full border-2 border-white ring-2 ring-slate-100" style={{ backgroundColor: safeStatusColor(item.statusColor) }} />
                                    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xs font-extrabold text-slate-800">{item.statusName}</h3><p className="mt-1 text-[11px] text-slate-500">{formatDate(item.enteredAt, true)} — {item.current ? 'Em andamento' : formatDate(item.exitedAt, true)}</p></div><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{formatDuration(item.durationSeconds)}</span></div>
                                    {item.timestampQuality && item.timestampQuality !== 'EXACT' && <p className="mt-2 text-[10px] font-semibold text-amber-700">Qualidade do horário: {item.timestampQuality}</p>}
                                </article>
                            ))}
                            {!detail.timeline.length && <EmptyDetail message="Ainda não há transições registradas para esta loja." />}
                        </div>
                    </SectionCard>
                </div>
            )}

            {detail && tab === 'history' && (
                <SectionCard title="Histórico unificado" description="Alterações manuais da Integração e registros da Implantação em ordem cronológica" icon={History}>
                    <div className="relative ml-2 border-l-2 border-slate-200 pl-7">
                        {detail.auditLogs.map((log) => {
                            const integrationLog = log.source === 'INTEGRATION' || log.source === 'INTEGRATION_V2';
                            return (
                                <article key={log.id} className="relative mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm last:mb-0">
                                    <span className={`absolute -left-[36px] top-4 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ring-2 ${integrationLog ? 'bg-[#128131] ring-emerald-100' : 'bg-[#ff7900] ring-orange-100'}`} />
                                    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-extrabold text-slate-800">{FIELD_LABELS[log.fieldName || ''] || log.fieldName || log.action}</h3><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${integrationLog ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{integrationLog ? 'INTEGRAÇÃO' : 'IMPLANTAÇÃO'}</span></div><p className="mt-1 text-[11px] text-slate-400">{formatDate(log.changedAt, true)} · {log.changedBy || 'Sistema'}</p></div>{log.reason && <span className="max-w-xs text-right text-[10px] font-medium text-slate-500">{log.reason}</span>}</div>
                                    {(log.oldValue !== null || log.newValue !== null) && <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700"><span className="block text-[9px] font-bold uppercase text-rose-400">Antes</span>{log.oldValue || 'Vazio'}</div><span className="text-slate-300">→</span><div className="rounded-lg bg-emerald-50 p-2 text-[11px] font-semibold text-emerald-700"><span className="block text-[9px] font-bold uppercase text-emerald-400">Depois</span>{log.newValue || 'Vazio'}</div></div>}
                                </article>
                            );
                        })}
                        {!detail.auditLogs.length && <EmptyDetail message="Nenhuma alteração foi registrada para esta loja." />}
                    </div>
                </SectionCard>
            )}

            {detail && tab === 'blocks' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><h2 className="text-sm font-extrabold text-slate-900">Revisão de bloqueios</h2><p className="mt-1 text-xs text-slate-500">Aceite o bloqueio para descontar sua duração do tempo total ou recuse para mantê-la na contagem.</p></div><div className="rounded-lg bg-rose-50 px-3 py-2 text-right"><p className="text-[9px] font-bold uppercase text-rose-400">Descontado atualmente</p><p className="text-base font-extrabold text-rose-700">{formatDuration(detail.blockedTimeSeconds)}</p></div></div>
                    {detail.blockPeriods.map((period, index) => {
                        const draft = blockDrafts[String(period.id)] || { discountApproved: period.discountApproved, reviewReason: period.reviewReason || '' };
                        const dirty = draft.discountApproved !== period.discountApproved || draft.reviewReason.trim() !== (period.reviewReason || '');
                        const saving = blockMutation.isPending && blockMutation.variables?.blockId === period.id;
                        return (
                            <article key={String(period.id)} className={`rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${period.current ? 'border-rose-300 ring-2 ring-rose-50' : 'border-slate-200'}`}>
                                <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><Ban size={15} /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold text-slate-900">Bloqueio #{index + 1}{period.current ? ' · atual' : ''}</h3>{period.discountApproved === null && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">Pendente de revisão</span>}</div><p className="text-[11px] text-slate-500">{formatDate(period.startedAt, true)} — {period.current ? 'Em aberto' : formatDate(period.endedAt, true)}</p></div></div><p className="mt-3 text-xs font-semibold text-slate-600">Motivo do card: {period.reason || 'Não informado'}</p></div><div className="text-right"><p className="text-lg font-extrabold text-rose-700">{formatDuration(period.durationSeconds)}</p><p className="text-[10px] text-slate-400">{period.source || 'Origem não informada'}</p></div></div>
                                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[0.8fr_1.2fr_auto] lg:items-end">
                                    <fieldset><legend className="text-xs font-bold text-slate-700">Descontar este período?</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setBlockDrafts((current) => ({ ...current, [String(period.id)]: { ...draft, discountApproved: true } }))} className={`h-10 rounded-lg border text-xs font-bold ${draft.discountApproved === true ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>Sim, descontar</button><button type="button" onClick={() => setBlockDrafts((current) => ({ ...current, [String(period.id)]: { ...draft, discountApproved: false } }))} className={`h-10 rounded-lg border text-xs font-bold ${draft.discountApproved === false ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'}`}>Não descontar</button></div></fieldset>
                                    <label><span className="text-xs font-bold text-slate-700">Motivo da decisão <span className="text-rose-500">*</span></span><textarea rows={2} value={draft.reviewReason} onChange={(event) => setBlockDrafts((current) => ({ ...current, [String(period.id)]: { ...draft, reviewReason: event.target.value } }))} placeholder="Explique por que o período deve ou não ser descontado" className={textareaClass} /></label>
                                    <button type="button" onClick={() => draft.discountApproved !== null && blockMutation.mutate({ blockId: period.id, values: { discountApproved: draft.discountApproved, reviewReason: draft.reviewReason.trim() } })} disabled={!dirty || draft.discountApproved === null || !draft.reviewReason.trim() || saving} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#128131] px-4 text-xs font-bold text-white transition hover:bg-[#0f6f2a] disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}Salvar decisão</button>
                                </div>
                                {period.reviewedAt && <p className="mt-3 text-[10px] font-medium text-slate-400">Última revisão por {period.reviewedBy || 'usuário'} em {formatDate(period.reviewedAt, true)}</p>}
                            </article>
                        );
                    })}
                    {!detail.blockPeriods.length && <EmptyDetail message="Nenhum bloqueio foi registrado nos cards desta loja." />}
                    {blockMutation.isError && <p className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">Não foi possível salvar a decisão. Informe o motivo e tente novamente.</p>}
                </div>
            )}

            {detail && tab === 'quality' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <SectionCard title="Revisão de qualidade" description="Registre o responsável e a avaliação feita após a entrega" icon={ShieldCheck}>
                        <label className="block"><span className="text-xs font-bold text-slate-700">Responsável pela qualidade</span><input type="text" value={form.qualityReviewer || ''} onChange={(event) => { setSavedMessage(null); setForm((current) => ({ ...current, qualityReviewer: event.target.value || null })); }} placeholder="Nome de quem validou a loja" className={selectClass} /></label>
                        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <ChoiceField label="Teve problemas pós-integração?" value={form.hadPostIntegrationIssues} onChange={(value) => { setSavedMessage(null); setForm((current) => ({ ...current, hadPostIntegrationIssues: value })); }} positiveLabel="Sim, teve" negativeLabel="Não teve" />
                            <ChoiceField label="Seguiu o processo correto?" value={form.followedIntegrationProcess} onChange={(value) => { setSavedMessage(null); setForm((current) => ({ ...current, followedIntegrationProcess: value })); }} positiveLabel="Sim, seguiu" negativeLabel="Não seguiu" />
                        </div>
                        <label className="mt-5 block"><span className="text-xs font-bold text-slate-700">Observações da qualidade</span><textarea rows={6} value={form.qualityNotes || ''} onChange={(event) => { setSavedMessage(null); setForm((current) => ({ ...current, qualityNotes: event.target.value || null })); }} placeholder="Registre problemas encontrados, validações realizadas e recomendações para esta loja" className={textareaClass} /></label>
                    </SectionCard>
                    <div className="space-y-4">
                        <SectionCard title="Resumo da avaliação" icon={ClipboardCheck}>
                            <div className="space-y-3">
                                <div className={`rounded-lg border p-3 ${form.hadPostIntegrationIssues === false ? 'border-emerald-200 bg-emerald-50' : form.hadPostIntegrationIssues === true ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}><p className="text-[10px] font-bold uppercase text-slate-400">Pós-integração</p><p className="mt-1 text-sm font-extrabold text-slate-800">{form.hadPostIntegrationIssues === null ? 'Aguardando avaliação' : form.hadPostIntegrationIssues ? 'Problemas identificados' : 'Sem problemas registrados'}</p></div>
                                <div className={`rounded-lg border p-3 ${form.followedIntegrationProcess === true ? 'border-emerald-200 bg-emerald-50' : form.followedIntegrationProcess === false ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}><p className="text-[10px] font-bold uppercase text-slate-400">Processo</p><p className="mt-1 text-sm font-extrabold text-slate-800">{form.followedIntegrationProcess === null ? 'Aguardando avaliação' : form.followedIntegrationProcess ? 'Processo seguido' : 'Desvio de processo'}</p></div>
                            </div>
                        </SectionCard>
                        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><div className="flex gap-3"><CalendarCheck2 size={18} className="mt-0.5 shrink-0 text-[#e76c00]" /><div><h3 className="text-xs font-extrabold text-orange-900">Registro auditável</h3><p className="mt-1 text-[11px] leading-relaxed text-orange-800/80">Ao salvar, cada mudança fica registrada com valor anterior, novo valor, autor e data na aba Histórico.</p></div></div></div>
                    </div>
                </div>
            )}
        </OperationalDetailModalShell>
    );
}
