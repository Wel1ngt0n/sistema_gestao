import { useEffect, useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
} from '@tanstack/react-table';
import axios from 'axios';

// Interfaces
interface TaskStep {
    id: number;
    step_name: string;
    list_name: string;
    store_name: string;
    status: string;
    assignee: string | null;
    start_date: string | null;
    end_date: string | null;
    duration: number;
    idle: number;
}

export default function StepsView() {
    const [data, setData] = useState<TaskStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([{ id: 'store_name', desc: false }]);

    useEffect(() => {
        axios.get('http://localhost:5000/api/steps')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const columnHelper = createColumnHelper<TaskStep>();

    const columns = useMemo(() => [
        columnHelper.accessor('store_name', {
            header: 'Loja',
            cell: info => <span className="font-bold text-slate-800 dark:text-white text-xs">{info.getValue()}</span>,
        }),
        columnHelper.accessor('list_name', {
            header: 'Fase',
            cell: info => <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{info.getValue()}</span>,
        }),
        columnHelper.accessor('step_name', {
            header: 'Etapa / Tarefa',
            cell: info => <span className="text-xs text-slate-600 dark:text-slate-300">{info.getValue()}</span>,
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const s = info.getValue()?.toLowerCase() || '';
                let color = 'text-slate-500 dark:text-slate-400';
                if (s.includes('complete') || s.includes('concl')) color = 'text-emerald-600 dark:text-emerald-400';
                else if (s.includes('progresso') || s.includes('andamento')) color = 'text-blue-600 dark:text-blue-400';
                return <span className={`text-[10px] uppercase font-bold ${color}`}>{info.getValue()}</span>
            }
        }),
        columnHelper.accessor('assignee', {
            header: 'Resp.',
            cell: info => <span className="text-xs text-slate-500">{info.getValue() || '-'}</span>,
        }),
        columnHelper.accessor('duration', {
            header: 'Duração (d)',
            cell: info => <span className="text-xs font-mono text-indigo-600 dark:text-indigo-300">{info.getValue() > 0 ? info.getValue() : '-'}</span>,
        }),
        columnHelper.accessor('idle', {
            header: 'Idle (d)',
            cell: info => {
                const val = info.getValue();
                return <span className={`text-xs font-mono ${val > 5 ? 'text-red-600 dark:text-red-500 font-bold' : 'text-slate-500'}`}>{val}</span>
            },
        }),
    ], []);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-900 dark:text-white">Carregando Etapas...</div>

    return (
        <div className="p-6 w-full max-w-[1920px] animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Detalhamento de Etapas</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Visualização de tarefas individuais sincronizadas.</p>
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Filtrar etapas..."
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-colors"
                        value={globalFilter}
                        onChange={e => setGlobalFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-4 py-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" onClick={header.column.getToggleSortingHandler()}>
                                            <div className="flex items-center gap-1">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {{ asc: ' 🔼', desc: ' 🔽' }[header.column.getIsSorted() as string] ?? null}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-4 py-2 border-r border-slate-200 dark:border-slate-700/30 last:border-0">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {table.getRowModel().rows.length === 0 && (
                                <tr><td colSpan={columns.length} className="p-8 text-center text-slate-500">Nenhuma etapa encontrada. Rode o Sync.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="text-center mt-4 text-xs text-slate-500">
                Mostrando {table.getRowModel().rows.length} registros. (Max 500)
            </div>
        </div>
    )
}
