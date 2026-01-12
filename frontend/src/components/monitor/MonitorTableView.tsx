import { useState, useMemo, useEffect, DragEvent, CSSProperties } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    VisibilityState,
    ColumnPinningState,
    ColumnOrderState,
    ColumnFiltersState,
    Column,
} from '@tanstack/react-table';
import axios from 'axios';
import { Store } from './types';
import { formatCurrency, formatDate, getStatusColor, getDeepSyncColor } from './monitorUtils';
import { Filter, RiskTooltip } from './MonitorComponents';

interface MonitorTableViewProps {
    data: Store[];
    matrices: { id: number, name: string }[];
    onEdit: (store: Store) => void;
    onAiAnalyze: (store: Store) => void;
    onRefetch: () => void;
    setAdminOpen: (open: boolean) => void;
}

export default function MonitorTableView({
    data,
    matrices,
    onEdit,
    onAiAnalyze,
    onRefetch,
    setAdminOpen
}: MonitorTableViewProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    // Load saved settings
    const savedVisibility = localStorage.getItem('monitor_columnVisibility');
    const savedPinning = localStorage.getItem('monitor_columnPinning');
    const savedOrder = localStorage.getItem('monitor_columnOrder');

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        savedVisibility ? JSON.parse(savedVisibility) : {
            erp: false,
            cnpj: false,
            crm: false,
            valor_implantacao: false,
            clickup_id: false,
            deep_sync_status: false
        }
    );

    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
        savedPinning ? JSON.parse(savedPinning) : { left: ['select', 'row_index', 'name'] }
    );

    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
        savedOrder ? JSON.parse(savedOrder) : []
    );

    // Persist Settings
    useEffect(() => {
        localStorage.setItem('monitor_columnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    useEffect(() => {
        localStorage.setItem('monitor_columnPinning', JSON.stringify(columnPinning));
    }, [columnPinning]);

    useEffect(() => {
        if (columnOrder.length > 0) {
            localStorage.setItem('monitor_columnOrder', JSON.stringify(columnOrder));
        }
    }, [columnOrder]);

    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
    const [hoveredTooltip, setHoveredTooltip] = useState<{ store: Store, x: number, y: number } | null>(null);

    // Bulk Action State
    const [rowSelection, setRowSelection] = useState({});
    const [bulkMatrizId, setBulkMatrizId] = useState<string>("");
    const [bulkTipoLoja, setBulkTipoLoja] = useState<string>("");

    const handleBulkUpdate = async () => {
        if (!bulkMatrizId && !bulkTipoLoja) return alert("Selecione uma alteração para aplicar!");
        const selectedRows = table.getSelectedRowModel().flatRows;
        const ids = selectedRows.map(r => r.original.id);

        if (ids.length === 0) return;

        const actionMsg = bulkMatrizId && bulkTipoLoja
            ? `vincular à matriz e definir como ${bulkTipoLoja}`
            : bulkMatrizId ? "vincular à matriz" : `definir como ${bulkTipoLoja}`;

        if (!confirm(`Deseja aplicar em ${ids.length} lojas: ${actionMsg}?`)) return;

        try {
            await axios.post('http://localhost:5003/api/stores/bulk-update', {
                store_ids: ids,
                parent_id: bulkMatrizId ? parseInt(bulkMatrizId) : null,
                tipo_loja: bulkTipoLoja || null
            });
            alert("Atualização em massa realizada com sucesso!");
            setRowSelection({});
            setBulkMatrizId("");
            setBulkTipoLoja("");
            onRefetch();
        } catch (e) {
            alert("Erro ao aplicar atualização em massa.");
        }
    };

    const handleExportCSV = () => {
        if (!data || data.length === 0) return;

        const headers = [
            "Score Risco", "ID Custom", "ClickUp ID", "Loja", "Rede", "Tipo de Loja", "Matriz Vinculada",
            "Status", "Implantador", "Data Início", "Data Previsão", "Data Fim Real", "Data Fim Manual",
            "IA: Previsão", "IA: Atraso Previsto", "Tempo Contrato", "Dias Transito", "Dias Idle",
            "Status Financeiro", "Mensalidade", "Valor Impl.", "ERP", "CNPJ", "CRM",
            "Retrabalho", "Qualidade", "Considerar Tempo", "Justificativa", "Obs"
        ];

        const csvRows = data.map(item => {
            return [
                item.risk_score,
                item.custom_id,
                item.clickup_id,
                `"${item.name}"`,
                `"${item.rede || ''}"`,
                item.tipo_loja,
                `"${item.parent_name || ''}"`,
                item.status,
                item.implantador,
                formatDate(item.data_inicio),
                formatDate(item.data_previsao),
                formatDate(item.data_fim),
                formatDate(item.manual_finished_at),
                formatDate(item.previsao_ia),
                Math.round(item.days_late_predicted || 0),
                item.tempo_contrato,
                item.dias_em_transito,
                item.idle_days,
                item.financeiro_status,
                item.valor_mensalidade,
                item.valor_implantacao,
                item.erp,
                item.cnpj,
                item.crm,
                item.teve_retrabalho ? "Sim" : "Não",
                item.delivered_with_quality ? "Sim" : "Não",
                item.considerar_tempo ? "Sim" : "Não",
                `"${item.justificativa_tempo || ''}"`,
                `"${item.observacoes ? item.observacoes.replace(/"/g, '""') : ''}"`
            ].join(',');
        });

        const csvString = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `monitor_implantacao_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columnHelper = createColumnHelper<Store>();

    const columns = useMemo(() => [
        columnHelper.display({
            id: 'select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllRowsSelected()}
                    // @ts-ignore
                    ref={input => input && (input.indeterminate = table.getIsSomeRowsSelected())}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                    className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer w-4 h-4 accent-violet-600"
                />
            ),
            cell: ({ row }) => (
                <div className="px-1">
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                        className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer w-4 h-4 accent-violet-600"
                    />
                </div>
            ),
            size: 30,
            enablePinning: true,
        }),
        columnHelper.display({
            id: 'row_index',
            header: '#',
            cell: info => <span className="text-[10px] sm:text-xs text-slate-500 font-mono w-4 inline-block text-right">{info.row.index + 1}</span>,
            size: 30,
            enablePinning: true,
        }),
        columnHelper.accessor('risk_score', {
            header: 'Risco',
            cell: info => {
                const s = info.getValue() || 0;
                const ai = info.row.original.ai_prediction;

                let color = "bg-slate-200 text-slate-500";
                if (s > 50) color = "bg-red-500 text-white animate-pulse font-bold";
                else if (s > 20) color = "bg-orange-500 text-white";
                else if (s > 10) color = "bg-yellow-100 text-yellow-700 border border-yellow-300";

                let ring = "";
                if (ai && ai.risk_level === 'CRITICAL' && !ai.is_concluded) {
                    ring = "ring-2 ring-violet-500 ring-offset-1";
                }

                return (
                    <div
                        className="relative group flex items-center justify-center gap-1"
                        onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const isRightSide = rect.left > window.innerWidth / 2;
                            const x = isRightSide ? rect.left - 300 : rect.right + 10;
                            const y = rect.top - 10;
                            setHoveredTooltip({ store: info.row.original, x, y });
                        }}
                        onMouseLeave={() => setHoveredTooltip(null)}
                    >
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-help ${color} ${ring}`}>{s}</span>
                        {ai && !ai.is_concluded && (
                            <span className="text-[8px]">🤖</span>
                        )}
                    </div>
                )
            },
            enablePinning: true,
        }),
        columnHelper.accessor('custom_id', {
            header: 'ID',
            cell: info => <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{info.getValue() || '--'}</span>,
            enablePinning: true,
        }),
        columnHelper.accessor('name', {
            header: 'Loja',
            cell: info => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap cursor-pointer hover:underline" onClick={() => onEdit(info.row.original)}>{info.getValue()}</span>
                    {info.row.original.rede && <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{info.row.original.rede}</span>}
                </div>
            ),
            enablePinning: true,
        }),
        columnHelper.accessor('tipo_loja', {
            header: 'Tipo de Loja',
            size: 80,
            cell: info => <span className="text-xs text-slate-500 dark:text-slate-400">{info.getValue() || '-'}</span>,
        }),
        columnHelper.accessor('status', {
            header: 'Status Atual',
            cell: info => {
                const val = info.getValue() || '';
                const styleClass = getStatusColor(val);
                return <span className={`px-2 py-1 rounded text-[10px] uppercase whitespace-nowrap tracking-wider ${styleClass}`}>{val}</span>;
            },
            enablePinning: true,
            size: 160,
        }),
        columnHelper.accessor('deep_sync_status', {
            header: 'Sincronização',
            cell: info => {
                const val = info.getValue();
                const style = getDeepSyncColor(val);
                return <span className={`px-1 rounded text-[9px] border ${style}`}>{val}</span>
            },
            enablePinning: true,
        }),
        columnHelper.accessor('implantador', {
            header: 'Responsável',
            cell: info => <span className="text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{info.getValue() || '--'}</span>,
            enablePinning: true,
            size: 200,
        }),
        columnHelper.accessor('dias_em_transito', {
            header: 'Tempo Decorrido',
            cell: info => {
                const days = info.getValue() || 0;
                const limit = info.row.original.tempo_contrato || 90;
                const isOver = days > limit;

                if (info.row.original.considerar_tempo === false) {
                    return (
                        <div className="flex flex-col">
                            <span className="font-mono text-xs text-slate-400 line-through decoration-slate-400">{days}d</span>
                            <span className="text-[10px] text-yellow-600 dark:text-yellow-500 flex items-center gap-1" title={info.row.original.justificativa_tempo || 'Sem justificativa'}>
                                ⚠️ Ignorado
                            </span>
                        </div>
                    )
                }
                return <span className={`font-mono text-xs ${isOver ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{days}d</span>
            },
            enablePinning: true,
        }),
        columnHelper.accessor('idle_days', {
            header: 'Dias Parado',
            cell: info => {
                const val = info.getValue();
                if (!val) return '-';
                const style = val > 5 ? 'text-red-600 dark:text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400';
                return <span className={`text-xs ${style}`}>{val}d</span>
            },
            enablePinning: true,
        }),
        columnHelper.accessor('financeiro_status', {
            header: 'Status Financeiro',
            cell: info => {
                const val = info.getValue();
                const isOk = val === 'Em dia' || val === 'Pago';
                return <span className={`text-xs whitespace-nowrap ${isOk ? 'text-emerald-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{val || '-'}</span>
            },
            enablePinning: true,
        }),
        columnHelper.accessor('valor_mensalidade', {
            header: 'Mensalidade',
            cell: info => <span className="text-xs text-indigo-600 dark:text-indigo-300">{formatCurrency(info.getValue() || 0)}</span>,
            enablePinning: true,
        }),
        columnHelper.accessor('data_inicio', {
            header: 'Data de Início',
            cell: info => <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(info.getValue())}</span>,
            enablePinning: true,
        }),
        columnHelper.accessor('data_previsao', {
            header: 'Prazo Contratual',
            cell: info => <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(info.getValue())}</span>,
            enablePinning: true,
        }),
        columnHelper.accessor('data_previsao', {
            id: 'previsao_ia',
            header: 'Previsão (IA)',
            cell: info => {
                const val = info.getValue();
                const ai = info.row.original.ai_prediction;

                if (ai && !ai.is_concluded) {
                    const isLate = ai.days_late_predicted > 0;
                    return (
                        <div className="flex flex-col leading-none">
                            <span className={`text-xs whitespace-nowrap ${isLate ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                {formatDate(ai.predicted_date)}
                            </span>
                            {isLate && <span className="text-[9px] text-red-500">+{Math.round(ai.days_late_predicted)}d (AI)</span>}
                        </div>
                    )
                }

                return <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(val)}</span>
            },
            enablePinning: true,
        }),
        columnHelper.accessor('data_fim', {
            header: 'Data de Conclusão',
            cell: info => <span className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatDate(info.getValue())}</span>,
            enablePinning: true,
        }),
        columnHelper.accessor('tempo_contrato', {
            header: 'Prazo Contrato (Dias)',
            cell: info => <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{info.getValue() || '-'}d</span>,
            enablePinning: true,
        }),
        columnHelper.accessor('erp', {
            header: 'ERP',
            cell: info => <span className="text-xs text-slate-600 dark:text-slate-400">{info.getValue() || '-'}</span>,
            enablePinning: true,
            size: 140,
        }),
        columnHelper.accessor('crm', {
            header: 'CRM',
            cell: info => <span className="text-xs text-slate-600 dark:text-slate-400">{info.getValue() || '-'}</span>,
            enablePinning: true,
            size: 140,
        }),

        columnHelper.display({
            id: 'actions',
            header: 'Ações',
            cell: props => (
                <div className="flex gap-2">
                    <button
                        onClick={() => onAiAnalyze(props.row.original)}
                        className="bg-violet-600 hover:bg-violet-500 text-white px-2 py-1 rounded text-xs transition-colors shadow-sm flex items-center gap-1"
                        title="Gerar Análise com IA"
                    >
                        🤖 <span className="hidden sm:inline">Análise</span>
                    </button>
                    <button
                        onClick={() => onEdit(props.row.original)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-xs transition-colors shadow-sm"
                    >
                        Detalhes
                    </button>
                </div>
            ),
            enablePinning: true,
        })
    ], [onEdit, onAiAnalyze]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            globalFilter,
            columnVisibility,
            columnPinning,
            columnOrder,
            columnFilters,
            rowSelection,
        },
        initialState: {
            pagination: {
                pageSize: 20
            }
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnPinningChange: setColumnPinning,
        onColumnOrderChange: setColumnOrder,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const getPinningStyle = (column: Column<Store>): CSSProperties => {
        const isPinned = column.getIsPinned();
        const isLastLeft = isPinned === 'left' && column.getIsLastColumn('left');
        const isFirstRight = isPinned === 'right' && column.getIsFirstColumn('right');

        return {
            left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
            right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
            position: isPinned ? 'sticky' : 'relative',
            zIndex: isPinned ? 10 : 0,
            boxShadow: isLastLeft
                ? '4px 0 4px -2px rgba(0, 0, 0, 0.5)'
                : isFirstRight
                    ? '-4px 0 4px -2px rgba(0, 0, 0, 0.5)'
                    : undefined,
        };
    };

    const handleDragStart = (e: DragEvent<HTMLElement>, columnId: string) => {
        setDraggedColumnId(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: DragEvent<HTMLElement>, targetColumnId: string) => {
        e.preventDefault();
        if (!draggedColumnId || draggedColumnId === targetColumnId) {
            setDraggedColumnId(null);
            return;
        }

        const draggedColumn = table.getColumn(draggedColumnId);
        const targetColumn = table.getColumn(targetColumnId);
        if (!draggedColumn || !targetColumn) return;

        const targetPin = targetColumn.getIsPinned() || false;
        const currentPin = draggedColumn.getIsPinned() || false;

        if (currentPin !== targetPin) {
            setDraggedColumnId(null);
            return;
        }

        const currentOrder = table.getState().columnOrder.length > 0
            ? [...table.getState().columnOrder]
            : table.getAllLeafColumns().map(c => c.id);

        const draggedIndex = currentOrder.indexOf(draggedColumnId);
        const targetIndex = currentOrder.indexOf(targetColumnId);
        if (draggedIndex > -1) currentOrder.splice(draggedIndex, 1);
        const newTargetIndex = currentOrder.indexOf(targetColumnId);
        if (newTargetIndex > -1) {
            const isMovingRight = draggedIndex < targetIndex;
            if (isMovingRight) currentOrder.splice(newTargetIndex + 1, 0, draggedColumnId);
            else currentOrder.splice(newTargetIndex, 0, draggedColumnId);
        } else currentOrder.push(draggedColumnId);

        setColumnOrder(currentOrder);
        setDraggedColumnId(null);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col min-h-[600px]">

            {/* Action Bar (Bulk Link) */}
            {Object.keys(rowSelection).length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-50 bg-violet-600 text-white rounded-xl p-3 font-bold shadow-2xl animate-in slide-in-from-bottom-4 flex items-center justify-between border border-violet-500/50 backdrop-blur-sm ring-1 ring-black/20">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-bold text-sm">{Object.keys(rowSelection).length} selecionadas:</span>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase opacity-80">Vínculo:</span>
                            <select
                                className="bg-violet-700 border-violet-500 rounded text-xs px-2 py-1 outline-none focus:ring-2 focus:ring-white min-w-[150px]"
                                value={bulkMatrizId}
                                onChange={e => setBulkMatrizId(e.target.value)}
                            >
                                <option value="">Sem alteração de Matriz</option>
                                {matrices.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase opacity-80">Tipo:</span>
                            <select
                                className="bg-violet-700 border-violet-500 rounded text-xs px-2 py-1 outline-none focus:ring-2 focus:ring-white"
                                value={bulkTipoLoja}
                                onChange={e => setBulkTipoLoja(e.target.value)}
                            >
                                <option value="">Sem alteração de Tipo</option>
                                <option value="Filial">Filial</option>
                                <option value="Matriz">Matriz</option>
                            </select>
                        </div>

                        <button
                            onClick={handleBulkUpdate}
                            className="bg-white text-violet-700 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-violet-50 transition-all shadow-lg active:scale-95 ml-2"
                        >
                            Aplicar em Massa
                        </button>
                    </div>
                    <button onClick={() => setRowSelection({})} className="text-white hover:bg-violet-500 p-1 rounded">Cancelar</button>
                </div>
            )}

            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="relative w-full md:w-96">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    <input
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        placeholder="Buscar loja, ID, status..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                <div className="flex gap-2 items-center">
                    <div className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-400 font-mono">
                        {table.getFilteredRowModel().rows.length} lojas filtradas
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setIsColumnsOpen(!isColumnsOpen)}
                            className={`bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs transition-colors flex items-center gap-2 ${isColumnsOpen ? 'ring-2 ring-indigo-500/50' : ''}`}
                        >
                            <span>Colunas</span>
                            <span className="text-[10px]">▼</span>
                        </button>

                        {/* Dropdown Menu */}
                        {isColumnsOpen && (
                            <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl p-4 w-64 max-h-[60vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Visibilidade</h4>
                                    <button onClick={() => setIsColumnsOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
                                </div>
                                <div className="space-y-1">
                                    {table.getAllLeafColumns().map(column => {
                                        if (column.id === 'actions' || column.id === 'row_index') return null;
                                        return (
                                            <label key={column.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer transition-colors">
                                                <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1 capitalize">{column.id.replace(/_/g, ' ')}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={column.getIsVisible()}
                                                    onChange={column.getToggleVisibilityHandler()}
                                                    className="accent-indigo-500 cursor-pointer w-4 h-4 rounded border-slate-300"
                                                />
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setAdminOpen(true)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs transition-colors" title="Super Admin">
                        ⚙️ Config
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                        Exportar CSV
                    </button>
                </div>
            </div>



            {/* Table Area */}
            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 border-collapse relative">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase text-[10px] md:text-xs font-semibold whitespace-nowrap shadow-sm">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => {
                                    const style = getPinningStyle(header.column);
                                    return (
                                        <th
                                            key={header.id}
                                            className={`px-3 py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 group hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors
                                            sticky top-0 
                                            ${header.column.getIsPinned() ? 'z-30 shadow-lg' : 'z-20'} 
                                            ${draggedColumnId === header.column.id ? 'opacity-50 border-2 border-dashed border-indigo-500' : ''}
                                        `}
                                            style={{
                                                ...style,
                                                position: 'sticky',
                                                minWidth: header.column.columnDef.size, // Apply size as min-width
                                                width: header.column.getSize() // Consistent sizing
                                            }}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, header.column.id)}
                                        >
                                            <div className="flex flex-col gap-1 h-full justify-end">
                                                {/* Top Row: Controls */}
                                                <div className="flex items-center justify-between gap-2">
                                                    {/* Drag Handle */}
                                                    <div
                                                        className="cursor-move text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors p-1"
                                                        draggable={true}
                                                        onDragStart={(e) => handleDragStart(e, header.column.id)}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                            <path d="M7 2a1 1 0 112 0 1 1 0 01-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0zM11 2a1 1 0 112 0 1 1 0 01-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0z" />
                                                        </svg>
                                                    </div>

                                                    {/* Sort & Title */}
                                                    <div
                                                        className="flex items-center gap-1 cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors flex-1"
                                                        onClick={header.column.getToggleSortingHandler()}
                                                        title="Clique para ordenar"
                                                    >
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                        <span className="text-[10px] w-4">
                                                            {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                                                        </span>
                                                    </div>

                                                    {/* Pin Action */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const isPinned = header.column.getIsPinned();
                                                            header.column.pin(isPinned ? false : 'left');
                                                        }}
                                                        className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${header.column.getIsPinned() ? 'text-indigo-500 dark:text-indigo-400 opacity-100' : 'text-slate-400 dark:text-slate-600 opacity-0 group-hover:opacity-100'}`}
                                                    >
                                                        📌
                                                    </button>
                                                </div>

                                                {/* Bottom Row: Filter (Always Visible) */}
                                                {header.column.getCanFilter() && ['status', 'implantador', 'erp', 'crm'].includes(header.column.id) ? (
                                                    <div className="w-full">
                                                        <Filter column={header.column} table={table} />
                                                    </div>
                                                ) : null}
                                            </div>

                                        </th>
                                    )
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={table.getAllLeafColumns().length} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-50">
                                        <div className="text-6xl mb-4">🎉</div>
                                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhum resultado encontrado</h3>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-2 text-sm">
                                            Não encontramos nenhuma loja com os filtros atuais.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                    {row.getVisibleCells().map(cell => {
                                        const style = getPinningStyle(cell.column);
                                        return (
                                            <td
                                                key={cell.id}
                                                className={`px-3 py-3 whitespace-nowrap border-r border-slate-200 dark:border-slate-700/50 last:border-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 transition-colors hover:z-[100]`}
                                                style={style}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION TOOLBAR */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center text-xs md:text-sm text-slate-600 dark:text-slate-300">
                <div className="flex gap-2 items-center">
                    <span>Página</span>
                    <strong>{table.getState().pagination.pageIndex + 1} de {table.getPageCount()}</strong>
                </div>

                <div className="flex gap-2">
                    <button
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        {'<<'}
                    </button>
                    <button
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        {'<'}
                    </button>
                    <button
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        {'>'}
                    </button>
                    <button
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        {'>>'}
                    </button>
                </div>

                <div className="flex gap-2 items-center">
                    <span>Lojas por pág:</span>
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={e => {
                            table.setPageSize(Number(e.target.value))
                        }}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 outline-none"
                    >
                        {[10, 20, 30, 50, 100].map(pageSize => (
                            <option key={pageSize} value={pageSize}>
                                {pageSize}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Global Tooltip within Table View */}
            {hoveredTooltip && (
                <RiskTooltip
                    store={hoveredTooltip.store}
                    style={{ left: hoveredTooltip.x, top: hoveredTooltip.y }}
                />
            )}
        </div>
    );
}
