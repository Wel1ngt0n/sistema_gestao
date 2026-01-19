import { useState } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable, getSortedRowModel, getFilteredRowModel } from '@tanstack/react-table';
import { Edit2, Check, X } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = 'http://localhost:5003/api/forecast';

interface ForecastData {
    id: number;
    store_name: string;
    rede?: string;
    implantador?: string;
    state_uf?: string;
    status: string;
    deployment_type: string;
    projected_orders: number;
    order_rate: number;
    manual_go_live_date?: string;
    go_live_date?: string;
    previous_platform?: string;
    forecast_obs?: string;
    include_in_forecast?: boolean;
    had_ecommerce?: boolean;
}

interface ForecastTableProps {
    data: ForecastData[];
    onUpdate: () => void;
}

export default function ForecastTable({ data, onUpdate }: ForecastTableProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<Partial<ForecastData>>({});
    const [saving, setSaving] = useState(false);

    // Helper para iniciar edição
    const startEdit = (row: ForecastData) => {
        setEditingId(row.id);
        setEditValues({
            ...row
        });
    };

    // Helper para cancelar
    const cancelEdit = () => {
        setEditingId(null);
        setEditValues({});
    };

    // Helper para salvar
    const saveEdit = async () => {
        setSaving(true);
        try {
            await axios.put(`${API_URL}/store/${editingId}`, {
                manual_go_live_date: editValues.manual_go_live_date === '' ? null : editValues.manual_go_live_date, // Empty string -> Null
                projected_orders: editValues.projected_orders,
                order_rate: editValues.order_rate,
                deployment_type: editValues.deployment_type,
                had_ecommerce: editValues.had_ecommerce,
                previous_platform: editValues.previous_platform,
                forecast_obs: editValues.forecast_obs,
                include_in_forecast: editValues.include_in_forecast
            });
            onUpdate(); // Refresh parent
            setEditingId(null);
        } catch (error) {
            alert("Erro ao salvar alterações");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    // Define column helper with the interface
    const columnHelper = createColumnHelper<ForecastData>();

    const columns = [
        columnHelper.accessor('store_name', {
            header: 'Cliente / Rede',
            cell: info => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 dark:text-gray-100">{info.getValue()}</span>
                    {(info.row.original.rede && info.row.original.rede !== info.getValue()) && (
                        <span className="text-xs text-slate-400">Rede: {info.row.original.rede}</span>
                    )}
                </div>
            )
        }),
        columnHelper.accessor('implantador', {
            header: 'Implantador',
            cell: info => <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{info.getValue() || 'N/A'}</span>
        }),
        columnHelper.accessor('state_uf', {
            header: 'UF',
            cell: info => <span className="font-mono text-xs">{info.getValue() || '-'}</span>,
            size: 50
        }),
        columnHelper.accessor('status', {
            header: 'Status Forecast',
            cell: info => {
                const val = info.getValue();
                let color = 'bg-slate-100 text-slate-600';
                if (val === 'GO_LIVE') color = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
                if (val === 'ATRASADA') color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                if (val === 'DENTRO_PRAZO') color = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';

                return (
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${color}`}>
                        {val.replace('_', ' ')}
                    </span>
                );
            }
        }),
        columnHelper.accessor('deployment_type', {
            header: 'Tipo Impl.',
            cell: info => {
                const isEditing = editingId === info.row.original.id;
                if (isEditing) {
                    return (
                        <select
                            value={editValues.deployment_type || 'MIGRAÇÃO'}
                            onChange={e => setEditValues({ ...editValues, deployment_type: e.target.value })}
                            className="text-xs border rounded p-1 dark:bg-slate-800 dark:border-slate-600"
                        >
                            <option value="NOVA">Nova</option>
                            <option value="MIGRAÇÃO">Migração</option>
                        </select>
                    )
                }
                return <span className="text-xs">{info.getValue()}</span>
            }
        }),
        columnHelper.accessor('projected_orders', {
            header: 'Pedidos Proj.',
            cell: info => {
                const isEditing = editingId === info.row.original.id;
                if (isEditing) {
                    return (
                        <div className="flex flex-col gap-1 w-20">
                            <input
                                type="number"
                                className="text-xs border rounded p-1 w-full dark:bg-slate-800 dark:border-slate-600"
                                value={editValues.projected_orders}
                                onChange={e => setEditValues({ ...editValues, projected_orders: Number(e.target.value) })}
                                placeholder="Qtd"
                            />
                        </div>
                    )
                }
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{info.getValue()}</span>
                        <span className="text-[10px] text-slate-400">Rate: {(info.row.original.order_rate * 100).toFixed(0)}%</span>
                    </div>
                )
            }
        }),
        columnHelper.accessor('go_live_date', {
            header: 'Data Go Live',
            cell: info => {
                const isEditing = editingId === info.row.original.id;
                if (isEditing) {
                    return (
                        <input
                            type="date"
                            className="text-xs border rounded p-1 w-28 dark:bg-slate-800 dark:border-slate-600"
                            value={editValues.manual_go_live_date ? format(new Date(editValues.manual_go_live_date), 'yyyy-MM-dd') : ''}
                            onChange={e => setEditValues({ ...editValues, manual_go_live_date: e.target.value })}
                        />
                    )
                }

                // Highlight if manual override
                const isManual = !!info.row.original.manual_go_live_date;

                // Safe date formatting
                let formattedDate = '-';
                if (info.getValue()) {
                    try {
                        formattedDate = format(new Date(info.getValue()!), 'dd/MM/yyyy');
                    } catch (e) {
                        formattedDate = 'Inválida';
                    }
                }

                return (
                    <div className="flex items-center gap-1">
                        <span className={`text-sm ${isManual ? 'text-amber-600 font-medium' : ''}`}>
                            {formattedDate}
                        </span>
                        {isManual && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded" title="Data Manual">MANUAL</span>}
                    </div>
                )
            }
        }),
        columnHelper.accessor('previous_platform', {
            header: 'Plat. Anterior',
            cell: info => {
                const isEditing = editingId === info.row.original.id;
                if (isEditing) {
                    return (
                        <input
                            type="text"
                            className="text-xs border rounded p-1 w-24 dark:bg-slate-800 dark:border-slate-600"
                            value={editValues.previous_platform || ''}
                            onChange={e => setEditValues({ ...editValues, previous_platform: e.target.value })}
                            placeholder="Ex: Vtex"
                        />
                    )
                }
                return <span className="text-xs text-slate-500">{info.getValue() || '-'}</span>
            }
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Ações',
            cell: info => {
                const isEditing = editingId === info.row.original.id;

                if (isEditing) {
                    return (
                        <div className="flex gap-1">
                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                title="Salvar"
                            >
                                <Check size={14} />
                            </button>
                            <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="Cancelar"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )
                }

                return (
                    <button
                        onClick={() => startEdit(info.row.original)}
                        className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Editar Previsão"
                    >
                        <Edit2 size={14} />
                    </button>
                )
            }
        })
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-300 font-semibold">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} className="p-3 border-b border-slate-200 dark:border-slate-600 whitespace-nowrap">
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="p-3 text-sm text-slate-700 dark:text-slate-200 align-middle">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="p-8 text-center text-slate-500">
                                Nenhuma loja encontrada para os filtros selecionados.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
