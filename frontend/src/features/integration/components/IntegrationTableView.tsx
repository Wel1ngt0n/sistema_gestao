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
import { IntegrationData } from '../../../components/monitor/types';
import { GripVertical, Check, EyeOff } from 'lucide-react';

const formatDate = (val: string | null) => {
    if (!val) return '--';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString('pt-BR');
};

const getStatusColor = (val: string) => {
    val = val?.toUpperCase() || '';
    if (val === 'CONCLUÍDO') return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (val.includes('ANDAMENTO') || val.includes('PROGRESS')) return 'text-orange-500 bg-orange-50 border-orange-200';
    if (val.includes('PAUSADO') || val.includes('BLOQUEADO')) return 'text-rose-500 bg-rose-50 border-rose-200';
    return 'text-zinc-500 bg-zinc-50 border-zinc-200';
};

interface IntegrationTableViewProps {
    data: IntegrationData[];
    onEdit: (item: IntegrationData) => void;
    onRefetch: () => void;
}

export default function IntegrationTableView({
    data,
    onEdit,
    onRefetch,
}: IntegrationTableViewProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    // Force reset localStorage on layout version change
    const LAYOUT_VERSION = 'v3';
    const storedVersion = localStorage.getItem('int_monitor_layout_version');
    if (storedVersion !== LAYOUT_VERSION) {
        localStorage.removeItem('int_monitor_columnVisibility');
        localStorage.removeItem('int_monitor_columnPinning');
        localStorage.removeItem('int_monitor_columnOrder');
        localStorage.setItem('int_monitor_layout_version', LAYOUT_VERSION);
    }

    const savedVisibility = localStorage.getItem('int_monitor_columnVisibility');
    const savedPinning = localStorage.getItem('int_monitor_columnPinning');
    const savedOrder = localStorage.getItem('int_monitor_columnOrder');

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        savedVisibility ? JSON.parse(savedVisibility) : {
            task_id: false,
            status: false,
            churn_risk: false,
            doc_status: false,
            end_date: false,
        }
    );

    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
        savedPinning ? JSON.parse(savedPinning) : { left: ['select', 'row_index', 'name'] }
    );

    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
        savedOrder ? JSON.parse(savedOrder) : []
    );

    useEffect(() => {
        localStorage.setItem('int_monitor_columnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    useEffect(() => {
        localStorage.setItem('int_monitor_columnPinning', JSON.stringify(columnPinning));
    }, [columnPinning]);

    useEffect(() => {
        if (columnOrder.length > 0) {
            localStorage.setItem('int_monitor_columnOrder', JSON.stringify(columnOrder));
        }
    }, [columnOrder]);

    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const [menuDraggedId, setMenuDraggedId] = useState<string | null>(null);
    const [rowSelection, setRowSelection] = useState({});

    const getStepStatusColor = (status: string | null) => {
        if (!status) return 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800';
        const s = status.toLowerCase();
        if (s.includes('implantado')) return 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
        if (s.includes('revisão') || s.includes('revisao')) return 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
        if (s.includes('bloqueado')) return 'text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400';
        if (s.includes('aguardando')) return 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
        if (s.includes('progresso') || s.includes('contato')) return 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
        if (s.includes('backlog') || s.includes('não vão')) return 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400';
        if (s.includes('produtos integrados') || s.includes('dados coletados')) return 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400';
        return 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400';
    };

    // Columns Definition
    const columnHelper = createColumnHelper<IntegrationData>();
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
        columnHelper.accessor('name', {
            header: 'Loja / Cliente',
            cell: info => (
                <div className="flex flex-col">
                    <span className="font-bold text-zinc-900 dark:text-white text-sm hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer transition-colors" onClick={() => onEdit(info.row.original)}>{info.getValue()}</span>
                </div>
            ),
            enablePinning: true,
            size: 250,
        }),
        columnHelper.accessor('current_status', {
            header: 'Etapa Atual',
            cell: info => {
                const val = info.getValue();
                if (!val) return <span className="text-zinc-300">--</span>;
                const color = getStepStatusColor(val);
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${color}`}>{val}</span>;
            },
            size: 160,
        }),
        columnHelper.accessor('assignee', {
            header: 'Integrador',
            cell: info => <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">{info.getValue() || '--'}</span>,
            size: 150,
        }),
        columnHelper.accessor('start_date', {
            header: 'Início',
            cell: info => <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{formatDate(info.getValue())}</span>,
            size: 100,
        }),
        columnHelper.accessor('end_date', {
            header: 'Conclusão',
            cell: info => {
                const val = info.getValue();
                return val
                    ? <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-medium">{formatDate(val)}</span>
                    : <span className="text-xs text-zinc-300">--</span>;
            },
            size: 100,
        }),
        columnHelper.accessor('sla_days', {
            header: 'Dias',
            cell: info => {
                const days = info.getValue() || 0;
                const isDone = info.row.original.status === 'CONCLUÍDO';
                const color = days > 60
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : days > 45
                        ? 'text-amber-600 dark:text-amber-400 font-medium'
                        : 'text-zinc-600 dark:text-zinc-300';
                return (
                    <span className={`text-xs font-mono ${color}`}>
                        {days}d {!isDone && <span className="text-[9px] text-zinc-400">(ativo)</span>}
                    </span>
                );
            },
            size: 90,
        }),
        columnHelper.accessor('on_time', {
            header: 'Prazo',
            cell: info => {
                const val = info.getValue();
                if (val === null || val === undefined) return <span className="text-zinc-300 text-xs">--</span>;
                return val
                    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">✅ No prazo</span>
                    : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">⚠️ Atrasada</span>;
            },
            size: 100,
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const val = info.getValue() || '';
                const styleClass = getStatusColor(val);
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-transparent ${styleClass}`}>{val}</span>;
            },
            enablePinning: true,
            size: 120,
        }),
        columnHelper.accessor('post_go_live_bugs', {
            header: 'Bugs',
            cell: info => {
                const bugs = info.getValue() || 0;
                const isBad = bugs > 0;
                return <span className={`font-mono text-xs ${isBad ? 'text-rose-600 font-bold' : 'text-zinc-400'}`}>{bugs}</span>
            },
            size: 70,
        }),
        columnHelper.accessor('churn_risk', {
            header: 'Churn',
            cell: info => {
                const isRisk = info.getValue() === true;
                return isRisk
                    ? <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full animate-pulse">Risco</span>
                    : <span className="text-zinc-300">-</span>
            },
            size: 80,
        }),
        columnHelper.accessor('doc_status', {
            header: 'Doc',
            cell: info => {
                const doc = info.getValue() || 'Pendente';
                const color = doc === 'Concluída' || doc === 'DONE' ? 'text-emerald-500' : 'text-amber-500';
                return <span className={`text-xs font-medium ${color}`}>{String(doc)}</span>
            },
            size: 90,
        }),
        columnHelper.accessor('task_id', {
            header: 'Task ClickUp',
            cell: info => <span className="text-xs text-zinc-500 font-mono truncate max-w-[100px]">{info.getValue() || '-'}</span>,
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
    ], [onEdit, onRefetch]);

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

    const handleMenuDragStart = (e: DragEvent<HTMLDivElement>, colId: string) => {
        setMenuDraggedId(colId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleMenuDragOver = (e: DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        if (!menuDraggedId || menuDraggedId === targetId) return;

        const allIds = table.getAllLeafColumns().map(c => c.id);
        const oldIndex = allIds.indexOf(menuDraggedId);
        const newIndex = allIds.indexOf(targetId);

        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = [...allIds];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, menuDraggedId);

        setColumnOrder(newOrder);
    };

    const handleMenuDrop = () => {
        setMenuDraggedId(null);
    };

    const getPinningStyle = (column: Column<IntegrationData>): CSSProperties => {
        const isPinned = column.getIsPinned();
        return {
            left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
            right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
            position: isPinned ? 'sticky' : 'relative',
            zIndex: isPinned ? 20 : 0,
            backgroundColor: isPinned ? 'var(--bg-pin)' : undefined,
        };
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Mostrando <strong>{table.getRowModel().rows.length}</strong> registros
                </div>

                <div className="flex gap-2 relative">
                    {Object.keys(rowSelection).length > 0 && (
                        <button
                            className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse shadow-lg shadow-orange-500/20"
                            onClick={() => alert("Menu de ações em massa abriria aqui")}
                        >
                            {Object.keys(rowSelection).length} Selecionados
                        </button>
                    )}

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

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm w-full max-w-full overflow-hidden">
                <div className="overflow-x-auto w-full max-w-full scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                    <table className="w-full text-left border-collapse min-w-full">
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
                                        Nenhuma integração encontrada.
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
