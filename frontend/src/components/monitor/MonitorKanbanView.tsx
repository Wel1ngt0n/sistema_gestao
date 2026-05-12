// UX Audit: placeholder aria-label
import { useMemo, useState, DragEvent } from 'react';
import { Store } from './types';
import { getStatusColor, formatDate } from './monitorUtils';

export type KanbanFieldKey =
    | 'status'
    | 'financialStatus'
    | 'assignee'
    | 'time'
    | 'startDate'
    | 'forecastDate'
    | 'finishDate'
    | 'monthlyValue'
    | 'erp'
    | 'crm';

export const KANBAN_FIELD_OPTIONS: { key: KanbanFieldKey; label: string }[] = [
    { key: 'status', label: 'Status' },
    { key: 'financialStatus', label: 'Financeiro' },
    { key: 'assignee', label: 'Responsável' },
    { key: 'time', label: 'Tempo' },
    { key: 'startDate', label: 'Início' },
    { key: 'forecastDate', label: 'Previsão' },
    { key: 'finishDate', label: 'Conclusão' },
    { key: 'monthlyValue', label: 'Mensalidade' },
    { key: 'erp', label: 'ERP' },
    { key: 'crm', label: 'CRM' },
];

export const DEFAULT_KANBAN_FIELDS: KanbanFieldKey[] = [
    'status',
    'financialStatus',
    'assignee',
    'time',
    'startDate',
    'forecastDate',
    'monthlyValue',
    'erp',
];

interface MonitorKanbanViewProps {
    data: Store[];
    onEdit: (store: Store) => void;
    visibleFields?: KanbanFieldKey[];
    // Callback para quando o card for movido para outra coluna
    // Status pode ser uma string que representa o novo status principal daquela coluna
    onStatusChange?: (storeId: number, newStatus: string) => void;
}

// Definição das Colunas do Kanban
const KANBAN_COLUMNS = [
    { id: 'backlog', title: 'Backlog / Fila', match: ['fila', 'backlog', 'novo', 'not_started'] },
    { id: 'omie', title: 'Cadastro Omie', match: ['omie', 'cadastro omie'] },
    { id: 'onboarding', title: 'Onboarding', match: ['onboarding', 'reunião inicial'] },
    { id: 'creation', title: 'Criação de Loja', match: ['criação de loja', 'criacao', 'store creation'] },
    { id: 'erp', title: 'Integração ERP', match: ['integração', 'erp', 'integra'] },
    { id: 'products', title: 'Cadastro de Produtos', match: ['produtos', 'cardápio', 'catalogo'] },
    { id: 'apps', title: 'Subir Apps', match: ['subir apps', 'app', 'ios', 'android', 'publicar'] },
    { id: 'qa', title: 'Controle de Qualidade', match: ['qa', 'qualidade', 'teste', 'revisão'] },
    { id: 'training', title: 'Treinamento', match: ['treinamento', 'treina'] },
    { id: 'done', title: 'Loja Entregue', match: ['entregue', 'finaliz', 'conclu', 'done'] },
];

const formatCurrency = (value: number | null) => {
    if (!value) return '--';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
};

const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div className="min-w-0 rounded-md bg-slate-50 px-2 py-1.5">
        <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">{value || '--'}</div>
    </div>
);

export default function MonitorKanbanView({ data, onEdit, visibleFields = DEFAULT_KANBAN_FIELDS, onStatusChange }: MonitorKanbanViewProps) {
    const [draggedStoreId, setDraggedStoreId] = useState<number | null>(null);
    const visibleFieldSet = useMemo(() => new Set(visibleFields), [visibleFields]);

    // Agrupar Lojas por Coluna
    const columns = useMemo(() => {
        // Inicializa colunas vazias
        const cols: Record<string, Store[]> = {};
        KANBAN_COLUMNS.forEach(c => cols[c.id] = []);
        cols['others'] = []; // Coluna para o que não der match

        data.forEach(store => {
            const status = (store.status || '').toLowerCase();
            let matched = false;

            for (const col of KANBAN_COLUMNS) {
                if (col.match.some(m => status.includes(m))) {
                    cols[col.id].push(store);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                cols['others'].push(store);
            }
        });

        return cols;
    }, [data]);

    // Handlers de Drag & Drop
    const handleDragStart = (e: DragEvent<HTMLDivElement>, storeId: number) => {
        setDraggedStoreId(storeId);
        e.dataTransfer.effectAllowed = 'move';
        // Hack para transparência no drag ghost se necessário
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessário para permitir o drop
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, targetColumnId: string) => {
        e.preventDefault();

        if (draggedStoreId === null) return;
        if (!onStatusChange) return;

        // Encontrar o mapping do status de destino
        // Por simplicidade, vamos pegar o primeiro match da coluna como "Novo Status"
        // Em um cenário real, você provavelmente enviaria o ID da coluna e o backend decidiria o status exato
        const targetColDef = KANBAN_COLUMNS.find(c => c.id === targetColumnId);

        // Se for a coluna "Outros", talvez não devêssemos permitir drop, ou definir um status padrão "Unknown"
        if (!targetColDef && targetColumnId !== 'others') return;

        // Simulação de novo status (usando o primeiro termo match como status key)
        const newStatusKey = targetColDef ? targetColDef.match[0] : 'fila';

        onStatusChange(draggedStoreId, newStatusKey);
        setDraggedStoreId(null);
    };

    return (
        <div className="flex h-full min-w-max items-start gap-4 pb-4">
            {KANBAN_COLUMNS.map(col => (
                <div
                    key={col.id}
                    className="flex h-full w-80 flex-none flex-col rounded-xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur-sm"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    {/* Column Header */}
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white/95 rounded-t-xl sticky top-0 backdrop-blur-md z-20">
                        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${columns[col.id]?.length > 0 ? 'bg-orange-500' : 'bg-slate-300'}`}></div>
                            {col.title}
                        </h4>
                        <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full text-slate-500 border border-slate-200 shadow-sm">
                            {columns[col.id]?.length || 0}
                        </span>
                    </div>

                    {/* Cards Container */}
                    <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto rounded-b-xl bg-slate-50/40 p-2.5">
                        {columns[col.id]?.map(store => (
                            <div
                                key={store.id}
                                draggable={!!onStatusChange}
                                onDragStart={(e) => handleDragStart(e, store.id)}
                                onClick={() => onEdit(store)}
                                className={`
                                    bg-white p-3.5 rounded-xl border border-slate-200 
                                    cursor-grab active:cursor-grabbing hover:shadow-md hover:border-orange-300 transition-all group relative
                                    ${draggedStoreId === store.id ? 'opacity-40 ring-2 ring-orange-500 rotate-2 scale-95 shadow-xl bg-orange-50' : 'shadow-sm'}
                                `}
                            >
                                {/* Risk Indicator Line */}
                                {store.risk_score > 20 && (
                                    <div className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-rose-500/50 shadow-sm" title="Alto Risco"></div>
                                )}

                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-mono text-slate-400">#{store.id}</span>
                                </div>

                                <h5 className="font-bold text-slate-800 text-sm leading-snug mb-3 group-hover:text-orange-600 transition-colors">
                                    {store.name}
                                </h5>

                                {(visibleFieldSet.has('status') || visibleFieldSet.has('financialStatus')) && (
                                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                        {visibleFieldSet.has('status') && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[170px] border ${getStatusColor(store.status).includes('emerald')
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : 'bg-slate-50 text-slate-600 border-slate-100/50'
                                                }`}>
                                                {store.status}
                                            </span>
                                        )}
                                        {visibleFieldSet.has('financialStatus') && store.financeiro_status && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${store.financeiro_status === 'Devendo'
                                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                }`}>
                                                {store.financeiro_status}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {visibleFields.length > 0 && (
                                    <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-3">
                                        {visibleFieldSet.has('assignee') && <Field label="Responsável" value={store.implantador || 'Sem responsável'} />}
                                        {visibleFieldSet.has('time') && <Field label="Tempo" value={`${store.dias_em_transito || 0}d`} />}
                                        {visibleFieldSet.has('startDate') && <Field label="Início" value={formatDate(store.data_inicio)} />}
                                        {visibleFieldSet.has('forecastDate') && <Field label="Previsão" value={formatDate(store.data_previsao)} />}
                                        {visibleFieldSet.has('finishDate') && <Field label="Conclusão" value={formatDate(store.data_fim || store.manual_finished_at)} />}
                                        {visibleFieldSet.has('monthlyValue') && <Field label="Mensalidade" value={formatCurrency(store.valor_mensalidade)} />}
                                        {visibleFieldSet.has('erp') && <Field label="ERP" value={store.erp} />}
                                        {visibleFieldSet.has('crm') && <Field label="CRM" value={store.crm} />}
                                    </div>
                                )}
                            </div>
                        ))}
                        {columns[col.id]?.length === 0 && (
                            <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-xs font-medium text-slate-400">
                                Sem lojas nesta etapa
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Unmapped Column (Ghost) */}
            {columns['others']?.length > 0 && (
                <div className="flex h-full w-80 flex-none flex-col rounded-xl border border-dashed border-slate-300 bg-white/70 opacity-80 shadow-sm transition-opacity hover:opacity-100">
                    <div className="p-3 border-b border-dashed border-slate-200 flex justify-between items-center bg-white/80 rounded-t-xl">
                        <h4 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Outros / Não Mapeado</h4>
                        <span className="text-xs font-mono bg-white px-2 py-0.5 rounded text-slate-500 border border-slate-200">{columns['others'].length}</span>
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-b-xl bg-slate-50/40 p-2.5">
                        {columns['others'].map(store => (
                            <div key={store.id} onClick={() => onEdit(store)} className="cursor-pointer bg-white p-3 rounded-lg border border-slate-200 hover:border-orange-200 hover:shadow-sm transition-all">
                                <h5 className="font-medium text-sm text-slate-600">{store.name}</h5>
                                <span className="text-[10px] text-slate-400">{store.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

