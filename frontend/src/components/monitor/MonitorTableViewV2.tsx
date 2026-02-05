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
import { Store } from './types';
import { formatCurrency, formatDate, getStatusColor, getDeepSyncColor } from './monitorUtils';
import { GripVertical, Check, EyeOff } from 'lucide-react';

interface MonitorTableViewProps {
    data: Store[];
    onEdit: (store: Store) => void;
    onAiAnalyze: (store: Store) => void;
    onRefetch: () => void;
}

export default function MonitorTableViewV2({
    data,
    onEdit,
    onAiAnalyze,
    onRefetch,
}: MonitorTableViewProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    // 1. Column Visibility & Pinning & Order Persistence
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

    // Drag & Drop State for Column Menu
    const [menuDraggedId, setMenuDraggedId] = useState<string | null>(null);

    // Row Selection State
    const [rowSelection, setRowSelection] = useState({});

    // Columns Definition
    const columnHelper = createColumnHelper<Store>();
    const columns = useMemo(() => [
        columnHelper.display({
            id: 'select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllRowsSelected()}
                    ref={input => input && (input.indeterminate = table.getIsSomeRowsSelected())}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                    className="rounded border-zinc-300 dark:border-zinc-600 dark:bg-zinc-700 cursor-pointer w-4 h-4 accent-orange-600 transition-all"
                />
            ),
            cell: ({ row }) => (
                <div className="px-1 text-center">
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="rounded border-zinc-300 dark:border-zinc-600 dark:bg-zinc-700 cursor-pointer w-4 h-4 accent-orange-600 transition-all"
                    />
                </div>
            ),
            size: 30,
            enablePinning: true,
        }),
        columnHelper.display({
            id: 'row_index',
            header: '#',
            cell: info => <span className="text-[10px] text-zinc-400 font-mono w-4 inline-block text-right">{info.row.index + 1}</span>,
            size: 30,
            enablePinning: true,
        }),
        columnHelper.accessor('risk_score', {
            header: 'Risco',
            cell: info => {
                const s = info.getValue() || 0;
                let color = "bg-zinc-100 text-zinc-500";
                if (s > 50) color = "bg-red-500 text-white font-bold animate-pulse";
                else if (s > 20) color = "bg-orange-500 text-white";
                else if (s > 10) color = "bg-amber-100 text-amber-700 border border-amber-300";

                return (
                    <div className="flex justify-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${color}`}>{s}</span>
                    </div>
                )
            },
            size: 60,
            enablePinning: true,
        }),
        columnHelper.accessor('name', {
            header: 'Loja',
            cell: info => (
                <div className="flex flex-col">
                    <span className="font-bold text-zinc-900 dark:text-white text-sm hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer transition-colors" onClick={() => onEdit(info.row.original)}>{info.getValue()}</span>
                    {info.row.original.rede && <span className="text-[10px] text-zinc-400 truncate max-w-[150px]">{info.row.original.rede}</span>}
                </div>
            ),
            enablePinning: true,
            size: 250,
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const val = info.getValue() || '';
                const styleClass = getStatusColor(val);
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-transparent ${styleClass}`}>{val}</span>;
            },
            enablePinning: true,
            size: 140,
        }),
        columnHelper.accessor('implantador', {
            header: 'Responsável',
            cell: info => <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">{info.getValue() || '--'}</span>,
            size: 150,
        }),
        columnHelper.accessor('deep_sync_status', {
            header: 'Sync',
            cell: info => {
                const val = info.getValue();
                const style = getDeepSyncColor(val);
                return <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${style}`}>{val || 'N/A'}</span>
            },
            size: 80,
        }),
        columnHelper.accessor('dias_em_transito', {
            header: 'Tempo',
            cell: info => {
                const days = info.getValue() || 0;
                const limit = info.row.original.tempo_contrato || 90;
                const isOver = days > limit;
                if (info.row.original.considerar_tempo === false) return <span className="text-[10px] text-zinc-400 decoration-zinc-400 line-through" title="Tempo ignorado">{days}d</span>
                return <span className={`font-mono text-xs ${isOver ? 'text-rose-600 font-bold' : 'text-zinc-600 dark:text-zinc-400'}`}>{days}d</span>
            },
            size: 80,
        }),
        columnHelper.accessor('data_inicio', {
            header: 'Início',
            cell: info => <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(info.getValue())}</span>,
            size: 100,
        }),
        columnHelper.accessor('data_previsao', {
            header: 'Previsão',
            cell: info => <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(info.getValue())}</span>,
            size: 100,
        }),
        columnHelper.accessor('data_previsao', {
            id: 'previsao_ia',
            header: 'Previsão IA',
            cell: info => {
                const ai = info.row.original.ai_prediction;
                if (ai && !ai.is_concluded) {
                    const isLate = ai.days_late_predicted > 0;
                    return (
                        <div className="flex flex-col leading-none">
                            <span className={`text-xs ${isLate ? 'text-violet-600 font-bold' : 'text-zinc-500'}`}>
                                {formatDate(ai.predicted_date)}
                            </span>
                            {isLate && <span className="text-[9px] text-rose-500 font-bold">+{Math.round(ai.days_late_predicted)}d</span>}
                        </div>
                    )
                }
                return <span className="text-xs text-zinc-400">-</span>
            },
            size: 100,
        }),
        columnHelper.accessor('data_fim', {
            header: 'Conclusão',
            cell: info => <span className="text-xs text-emerald-600 font-medium">{formatDate(info.getValue())}</span>,
            size: 100,
        }),
        columnHelper.accessor('valor_mensalidade', {
            header: 'Mensalidade',
            cell: info => <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">{formatCurrency(info.getValue() || 0)}</span>,
            size: 120,
        }),
        columnHelper.accessor('erp', {
            header: 'ERP',
            cell: info => <span className="text-xs text-zinc-500">{info.getValue() || '-'}</span>,
            size: 100,
        }),
        columnHelper.accessor('crm', {
            header: 'CRM',
            cell: info => <span className="text-xs text-zinc-500">{info.getValue() || '-'}</span>,
            size: 100,
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Ações',
            cell: props => (
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(props.row.original)}
                        className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                        title="Editar"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => onAiAnalyze(props.row.original)}
                        className="p-1.5 text-zinc-400 hover:text-violet-500 hover:bg-violet-50 rounded transition-colors"
                        title="IA"
                    >
                        🤖
                    </button>
                    <button
                        onClick={() => onRefetch()}
                        className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                        title="Atualizar"
                    >
                        🔄
                    </button>
                </div>
            ),
            size: 80,
            enablePinning: true,
        })
    ], [onEdit, onAiAnalyze, onRefetch]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            columnPinning,
            columnOrder,
            columnFilters,
            rowSelection,
        },
        initialState: {
            pagination: { pageSize: 20 }
        },
        onSortingChange: setSorting,
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

    // Menu DnD Handlers
    const handleMenuDragStart = (e: DragEvent<HTMLDivElement>, colId: string) => {
        setMenuDraggedId(colId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleMenuDragOver = (e: DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        if (!menuDraggedId || menuDraggedId === targetId) return;

        // Find indexes
        const allIds = table.getAllLeafColumns().map(c => c.id);
        const oldIndex = allIds.indexOf(menuDraggedId);
        const newIndex = allIds.indexOf(targetId);

        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistically update order
        const newOrder = [...allIds];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, menuDraggedId);

        setColumnOrder(newOrder);
    };

    const handleMenuDrop = () => {
        setMenuDraggedId(null);
    };

    const getPinningStyle = (column: Column<Store>): CSSProperties => {
        const isPinned = column.getIsPinned();
        return {
            left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
            right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
            position: isPinned ? 'sticky' : 'relative',
            zIndex: isPinned ? 20 : 0,
            backgroundColor: isPinned ? 'var(--bg-pin)' : undefined, // Handled by CSS vars in row
        };
    };

    return (
        <div className="flex flex-col gap-4">

            {/* Slim Toolbar for Table Actions */}
            <div className="flex justify-between items-end">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Mostrando <strong>{table.getRowModel().rows.length}</strong> registros
                </div>

                <div className="flex gap-2 relative">
                    {/* Bulk Action Trigger */}
                    {Object.keys(rowSelection).length > 0 && (
                        <button
                            className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse shadow-lg shadow-orange-500/20"
                            onClick={() => alert("Menu de ações em massa abriria aqui")}
                        >
                            {Object.keys(rowSelection).length} Selecionados
                        </button>
                    )}

                    {/* Column Menu Toggle */}
                    <div className="relative">
                        <button
                            onClick={() => setIsColumnsOpen(!isColumnsOpen)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${isColumnsOpen
                                    ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100'
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-orange-300'
                                }`}
                        >
                            <span>Colunas</span>
                            <span className="text-[10px]">▼</span>
                        </button>

                        {/* Enhanced Column Editor Dropdown */}
                        {isColumnsOpen && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Editar Colunas</h4>
                                    <button onClick={() => setIsColumnsOpen(false)} className="text-zinc-400 hover:text-zinc-900">✕</button>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto p-2 space-y-0.5">
                                    {table.getAllLeafColumns().map((column) => {
                                        if (column.id === 'select' || column.id === 'actions') return null;
                                        return (
                                            <div
                                                key={column.id}
                                                draggable
                                                onDragStart={(e) => handleMenuDragStart(e, column.id)}
                                                onDragOver={(e) => handleMenuDragOver(e, column.id)}
                                                onDrop={handleMenuDrop}
                                                className={`flex items-center gap-3 p-2 rounded-lg border border-transparent transition-all cursor-move select-none ${menuDraggedId === column.id
                                                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dashed opacity-50'
                                                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                                                    }`}
                                            >
                                                <GripVertical className="w-4 h-4 text-zinc-300" />
                                                <span className="flex-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                                                    {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                                                </span>
                                                <button
                                                    onClick={() => column.toggleVisibility()}
                                                    className={`p-1 rounded ${column.getIsVisible() ? 'text-orange-600 bg-orange-50' : 'text-zinc-300 hover:text-zinc-500'}`}
                                                >
                                                    {column.getIsVisible() ? <Check size={14} /> : <EyeOff size={14} />}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50">
                                    <button
                                        onClick={() => table.toggleAllColumnsVisible(true)}
                                        className="w-full py-1 text-xs text-orange-600 font-semibold hover:bg-orange-50 rounded"
                                    >
                                        Restaurar Padrão
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Clean Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            className={`px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 whitespace-nowrap bg-zinc-50 dark:bg-zinc-950`}
                                            style={{
                                                width: header.column.getSize(),
                                                ...getPinningStyle(header.column)
                                            }}
                                        >
                                            <div
                                                className={`flex items-center gap-1 cursor-pointer hover:text-orange-600 transition-colors ${header.column.getIsSorted() ? 'text-orange-600' : ''}`}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="py-12 text-center text-zinc-400">
                                        Nenhuma loja encontrada.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                className="px-4 py-3 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-transparent"
                                                style={getPinningStyle(cell.column)}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 flex justify-between items-center text-xs text-zinc-500">
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-1 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span>Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}</span>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-1 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 disabled:opacity-50"
                    >
                        Próxima
                    </button>
                </div>
            </div>
        </div>
    );
}
