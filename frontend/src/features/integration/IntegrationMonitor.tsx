import { useState, useEffect, useMemo } from 'react'
import { api } from '../../services/api'
import {
    LayoutList,
    RefreshCw,
    Search,
} from 'lucide-react'
import { IntegrationData } from '../../components/monitor/types'
import IntegrationStoreModal from '../../components/monitor/IntegrationStoreModal'
import IntegrationTableView from './components/IntegrationTableView'
import IntegrationKanbanView from './components/IntegrationKanbanView'

interface KPIs {
    volume_points: number
    volume_goal: number
    sla_pct: number
    quality_pct: number
    doc_pct: number
}

export default function IntegrationMonitor() {
    const [data, setData] = useState<IntegrationData[]>([])
    const [, setKpis] = useState<KPIs | null>(null)
    const [loading, setLoading] = useState(true)

    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban')
    const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
    const [filterStatus, setFilterStatus] = useState<'active' | 'concluded'>('active')
    const [globalFilter, setGlobalFilter] = useState('')
    const [editingItem, setEditingItem] = useState<IntegrationData | null>(null)
    const [deepSyncing, setDeepSyncing] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true)
            const response = await api.get('/api/integration/dashboard')
            setData(response.data.integrations)
            setKpis(response.data.kpis)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeepSync = async (storeId: number) => {
        setDeepSyncing(true)
        try {
            await api.post(`/api/deep-sync/store/${storeId}`)
            alert("Deep Sync finalizado com sucesso! Histórico atualizado.")
            await fetchData(true)
        } catch (error) {
            alert("Erro ao rodar Deep Sync.")
        } finally {
            setDeepSyncing(false)
        }
    }

    // Filtered data
    const filteredData = useMemo(() => {
        let result = data

        // Status filter
        if (filterStatus === 'active') {
            result = result.filter(d => d.status !== 'CONCLUÍDO')
        } else {
            result = result.filter(d => d.status === 'CONCLUÍDO')
        }

        // Assignee filter
        if (assigneeFilter !== 'all') {
            result = result.filter(d => d.assignee === assigneeFilter)
        }

        // Global search
        if (globalFilter.trim()) {
            const search = globalFilter.toLowerCase()
            result = result.filter(d =>
                d.name?.toLowerCase().includes(search) ||
                d.assignee?.toLowerCase().includes(search) ||
                d.rede?.toLowerCase().includes(search) ||
                d.current_status?.toLowerCase().includes(search)
            )
        }

        return result
    }, [data, filterStatus, assigneeFilter, globalFilter])

    // Stats
    const stats = useMemo(() => {
        const active = data.filter(d => d.status !== 'CONCLUÍDO')
        const concluded = data.filter(d => d.status === 'CONCLUÍDO')
        const overSla = active.filter(d => d.sla_days > 60)
        return {
            total: active.length,
            concluded: concluded.length,
            overSla: overSla.length,
        }
    }, [data])

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            <header className="flex-none bg-white border border-zinc-200 rounded-lg shadow-sm z-30 transition-all duration-300">
                <div className="p-5 space-y-5">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 min-w-fit">
                                <div className="p-2.5 bg-orange-50 rounded-lg border border-orange-100 text-[#ff7900]">
                                    <LayoutList className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
                                        Monitor de Integração
                                    </h1>
                                    <p className="text-xs font-medium text-zinc-500">
                                        Visão Operacional
                                    </p>
                                </div>
                            </div>

                            <div className="hidden md:block w-px h-10 bg-zinc-200"></div>

                            <div className="hidden md:flex items-center gap-3">
                                <div className="flex flex-col px-3 py-1 rounded-lg hover:bg-zinc-50/50 transition-colors">
                                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Ativas</span>
                                    <span className="text-lg font-bold text-zinc-700 leading-none">{stats.total}</span>
                                </div>
                                <div className="flex flex-col px-3 py-1 rounded-lg hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100">
                                    <span className="text-[10px] uppercase font-bold text-emerald-500/80 tracking-wider">Concluídas</span>
                                    <span className="text-lg font-bold text-emerald-600 leading-none">{stats.concluded}</span>
                                </div>
                                <div className="flex flex-col px-3 py-1 rounded-lg hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100">
                                    <span className="text-[10px] uppercase font-bold text-rose-500/80 tracking-wider">&gt;60 Dias</span>
                                    <span className="text-lg font-bold text-rose-600 leading-none">{stats.overSla}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start xl:self-center">
                            <button
                                onClick={() => fetchData()}
                                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                                title="Atualizar"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                        <div className="relative lg:col-span-4">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Buscar loja, responsável, rede ou status"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/10"
                            />
                        </div>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-2">
                            <option value="active">Ativas</option>
                            <option value="concluded">Concluídas</option>
                        </select>
                        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-3">
                            <option value="all">Todos responsáveis</option>
                            {Array.from(new Set(data.map(d => d.assignee as string).filter(Boolean))).sort().map(assignee => (
                                <option key={assignee} value={assignee}>{assignee}</option>
                            ))}
                        </select>
                        <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 lg:col-span-3">
                            <option value="kanban">Visualização: Kanban</option>
                            <option value="table">Visualização: Lista</option>
                        </select>
                    </div>
                </div>
            </header>

            <div className="flex-1 pt-5 overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col gap-4">
                        <div className="h-64 bg-zinc-100 rounded-2xl animate-pulse"></div>
                    </div>
                ) : (
                    <>
                        {viewMode === 'table' && (
                            <IntegrationTableView
                                data={filteredData}
                                onEdit={(item) => setEditingItem(item)}
                                onRefetch={() => fetchData()}
                            />
                        )}
                        {viewMode === 'kanban' && (
                            <div className="overflow-x-auto pb-4 custom-scrollbar">
                                <IntegrationKanbanView
                                    data={filteredData}
                                    onEdit={(item) => setEditingItem(item)}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            <IntegrationStoreModal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                data={editingItem}
                onSave={async () => { await fetchData(true) }}
                onDeepSync={handleDeepSync}
                isDeepSyncing={deepSyncing}
            />
        </div>
    )
}
