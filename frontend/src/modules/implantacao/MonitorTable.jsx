import React, { useState, useMemo, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    getPaginationRowModel,
} from '@tanstack/react-table';
import {
    ChevronDown,
    Layout,
    Settings,
    MoreHorizontal,
    ArrowUpDown,
    Search,
    EyeOff
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';

// --- Formatters ---
const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('pt-BR');
};
const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// --- Status Badge ---
const StatusBadge = ({ status }) => {
    const styles = {
        'DONE': 'bg-green-100 text-green-700 border-green-200',
        'IN_PROGRESS': 'bg-blue-50 text-blue-700 border-blue-200',
        'BLOCKED': 'bg-red-50 text-red-700 border-red-200',
        'NOT_STARTED': 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${styles[status] || styles['NOT_STARTED']}`}>
            {status}
        </span>
    );
};

export default function MonitorTable({ data, loading, onEdit }) {
    // --- Local Storage for Visibility ---
    const [columnVisibility, setColumnVisibility] = useState(() => {
        const saved = localStorage.getItem('monitor_col_visibility');
        return saved ? JSON.parse(saved) : {
            erp: false, crm: false, cnpj: false, valor_implantacao: false
        };
    });

    // Save visibility change
    useEffect(() => {
        localStorage.setItem('monitor_col_visibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    // --- Column Definitions ---
    const columns = useMemo(() => [
        {
            accessorKey: 'risk_score',
            header: 'Risco',
            cell: info => {
                const val = info.getValue();
                const idle = info.row.original.idle_days || 0;
                return (
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${idle > 5 ? 'bg-red-500' : 'bg-transparent'}`} />
                        <span className={`font-bold ${idle > 5 ? 'text-red-600' : 'text-gray-600'}`}>{val}</span>
                    </div>
                )
            },
            size: 60,
        },
        {
            accessorKey: 'custom_id',
            header: 'ID',
            cell: info => <span className="font-mono text-gray-500 text-xs">#{info.getValue()}</span>,
            size: 80,
        },
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <button className="flex items-center gap-1" onClick={column.getToggleSortingHandler()}>
                    Loja / Rede <ArrowUpDown size={12} className="text-gray-400" />
                </button>
            ),
            cell: info => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {info.getValue()}
                    </span>
                    <span className="text-xs text-gray-400">{info.row.original.rede}</span>
                </div>
            ),
        },
        {
            accessorKey: 'uf',
            header: 'UF',
            cell: info => info.getValue() ? (
                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-gray-200">
                    {info.getValue()}
                </span>
            ) : '-',
            size: 50,
        },
        {
            accessorKey: 'deployment_type',
            header: 'Tipo',
            cell: info => <span className="text-xs text-gray-500 font-medium">{info.getValue()}</span>,
            size: 100,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: info => <StatusBadge status={info.getValue()} />,
            size: 110,
        },
        {
            accessorKey: 'implantador',
            header: 'Responsável',
            cell: info => {
                const val = info.getValue() || 'N/A';
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                            {val.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{val.split(' ')[0]}</span>
                    </div>
                );
            },
            size: 140,
        },
        {
            id: 'dates',
            header: 'Datas (Go-Live)',
            cell: info => {
                const row = info.row.original;
                const isManual = !!row.manual_go_live_date;
                return (
                    <div className="flex flex-col text-xs">
                        {isManual ? (
                            <span className="font-bold text-purple-600" title="Go-Live Confirmado">🚀 {formatDate(row.manual_go_live_date)}</span>
                        ) : (
                            <span className="text-gray-600" title="Previsão Automática">📅 {formatDate(row.data_previsao)}</span>
                        )}
                        <span className="text-[10px] text-gray-400">Início: {formatDate(row.data_inicio)}</span>
                    </div>
                )
            },
            size: 140,
        },
        {
            id: 'kpis',
            header: 'KPIs (Idle/Trans)',
            cell: info => {
                const row = info.row.original;
                return (
                    <div className="flex flex-col text-xs">
                        <span className="font-mono text-gray-600">{Math.round(row.dias_em_transito)}d total</span>
                        {row.idle_days > 2 && (
                            <span className={`${row.idle_days > 5 ? 'text-red-600 font-bold' : 'text-orange-500'}`}>
                                {row.idle_days}d parado
                            </span>
                        )}
                    </div>
                )
            },
            size: 120,
        },
        {
            accessorKey: 'valor_mensalidade',
            header: 'MRR',
            cell: info => <span className="font-bold text-emerald-600 text-xs">{formatCurrency(info.getValue())}</span>,
            size: 100,
        },
        // --- Hidden by Default Usually ---
        { accessorKey: 'erp', header: 'ERP', cell: info => <span className="text-gray-500 text-xs">{info.getValue() || '-'}</span> },
        { accessorKey: 'crm', header: 'CRM', cell: info => <span className="text-gray-500 text-xs">{info.getValue() || '-'}</span> },
        { accessorKey: 'cnpj', header: 'CNPJ', cell: info => <span className="font-mono text-gray-400 text-[10px]">{info.getValue() || '-'}</span> },
        {
            accessorKey: 'valor_implantacao',
            header: 'Setup Fee',
            cell: info => <span className="text-gray-500 text-xs">{formatCurrency(info.getValue())}</span>
        },

        // Actions
        {
            id: 'actions',
            header: '',
            cell: info => (
                <button
                    onClick={() => onEdit(info.row.original)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                    title="Editar"
                >
                    <MoreHorizontal size={16} />
                </button>
            ),
            size: 40,
            enableHiding: false
        }

    ], [onEdit]);

    // --- Table Instance ---
    const table = useReactTable({
        data: data || [],
        columns,
        state: {
            columnVisibility,
        },
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Carregando monitor...</div>;

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Layout size={16} /> Monitor de Lojas
                </h3>

                {/* View Controls */}
                <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all icon-button">
                        <Settings size={14} /> Colunas
                        <ChevronDown size={14} />
                    </Menu.Button>
                    <Transition
                        enter="transition duration-100 ease-out"
                        enterFrom="transform scale-95 opacity-0"
                        enterTo="transform scale-100 opacity-100"
                        leave="transition duration-75 ease-out"
                        leaveFrom="transform scale-100 opacity-100"
                        leaveTo="transform scale-95 opacity-0"
                    >
                        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white divide-y divide-gray-100 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <div className="p-2 space-y-1">
                                <h4 className="px-2 py-1 text-[10px] uppercase font-bold text-gray-400">Mostrar/Esconder</h4>
                                {table.getAllLeafColumns().map(column => {
                                    if (!column.id || column.id === 'actions') return null;
                                    return (
                                        <div key={column.id} className="flex items-center px-2 py-1 hover:bg-gray-50 rounded">
                                            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer w-full select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={column.getIsVisible()}
                                                    onChange={column.getToggleVisibilityHandler()}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                />
                                                {typeof column.columnDef.header === 'function' ? column.id : column.columnDef.header}
                                            </label>
                                        </div>
                                    )
                                })}
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 select-none group hover:bg-gray-100 transition-colors"
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {table.getRowModel().rows.map(row => (
                            <tr
                                key={row.id}
                                className="hover:bg-indigo-50/30 transition-colors group cursor-default"
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-3 py-3 whitespace-nowrap">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {table.getRowModel().rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-400 text-sm">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Search size={24} className="opacity-20" />
                                        Nenhum projeto encontrado.
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer info */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-right">
                {table.getRowModel().rows.length} registros visíveis
            </div>
        </div>
    );
}
