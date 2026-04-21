import { useState, useEffect, useMemo } from 'react'
import { api } from '../../services/api'
import {
    LayoutList,
    RefreshCw,
    LayoutGrid,
    Table,
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

    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
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
            {/* Header - Matching implantation style */}
            <header className="flex-none bg-white/80/80 backdrop-blur-xl border-b border-zinc-200 z-30 sticky top-0 transition-all duration-300">
                <div className="px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                        {/* Left Side: Title & Stats */}
                        <div className="flex items-center gap-6">
                            {/* Title Block */}
                            <div className="flex items-center gap-3 min-w-fit">
                                <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-500/20">
                                    <LayoutList className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                                        Monitor de Integração
                                    </h1>
                                    <p className="text-xs font-medium text-zinc-500">
                                        Visão Operacional
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="hidden md:block w-px h-10 bg-zinc-200"></div>

                            {/* Inline Stats */}
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

                        {/* Right Side: Controls */}
                        <div className="flex items-center gap-3 self-start md:self-center w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">

                            {/* Search Bar */}
                            <div className="relative group w-48 transition-all focus-within:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={globalFilter}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm"
                                />
                            </div>

                            {/* Status Toggle */}
                            <div className="flex bg-zinc-100 p-1 rounded-xl gap-1 border border-zinc-200/50">
                                <button
                                    onClick={() => setFilterStatus('active')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'active'
                                        ? 'bg-white text-orange-600 shadow-sm ring-1 ring-zinc-200'
                                        : 'text-zinc-500 hover:text-zinc-700'
                                        }`}
                                >
                                    Ativas
                                </button>
                                <button
                                    onClick={() => setFilterStatus('concluded')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'concluded'
                                        ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-zinc-200'
                                        : 'text-zinc-500 hover:text-zinc-700'
                                        }`}
                                >
                                    Concluídas
                                </button>
                            </div>

                            {/* Integrador Filter */}
                            <select
                                value={assigneeFilter}
                                onChange={(e) => setAssigneeFilter(e.target.value)}
                                className="bg-white border border-zinc-200 text-zinc-900 px-3 py-2 rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-sm hover:border-zinc-300 transition-colors"
                            >
                                <option value="all">Todos</option>
                                {Array.from(new Set(data.map(d => d.assignee as string).filter(Boolean))).sort().map(assignee => (
                                    <option key={assignee} value={assignee}>{assignee}</option>
                                ))}
                            </select>

                            {/* Refresh */}
                            <button
                                onClick={() => fetchData()}
                                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                                title="Atualizar"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    {/* View Switcher Tabs */}
                    <div className="mt-4 flex gap-6 border-b border-transparent">
                        {[
                            { id: 'table', icon: Table, label: 'Tabela' },
                            { id: 'kanban', icon: LayoutGrid, label: 'Kanban' },
                        ].map((view) => (
                            <button
                                key={view.id}
                                onClick={() => setViewMode(view.id as any)}
                                className={`pb-3 text-sm font-medium transition-all relative flex items-center gap-2 ${viewMode === view.id
                                    ? 'text-orange-600'
                                    : 'text-zinc-500 hover:text-zinc-800'
                                    }`}
                            >
                                <view.icon size={16} />
                                {view.label}
                                {viewMode === view.id && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-t-full"></span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
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
