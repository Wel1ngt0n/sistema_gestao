import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import {
    LayoutList,
    Target,
    Calendar,
    Bug,
    FileText,
    RefreshCw,
    LayoutGrid,
    Table,
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
    const [kpis, setKpis] = useState<KPIs | null>(null)
    const [loading, setLoading] = useState(true)

    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
    const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
    const [editingItem, setEditingItem] = useState<IntegrationData | null>(null)
    const [deepSyncing, setDeepSyncing] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true)
            const response = await api.get('/api/integration/dashboard')
            // Add 'id' mapping dynamically if the backend uses store_id differently, 
            // but the api already maps id -> store.id. 
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
            await fetchData(true) // Soft refresh
        } catch (error) {
            alert("Erro ao rodar Deep Sync.")
        } finally {
            setDeepSyncing(false)
        }
    }

    const KPICard = ({ title, value, goal, suffix = '', icon: Icon, color }: any) => {
        const isGood = value >= goal;
        return (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-start justify-between relative overflow-hidden group">
                <div className={`absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                    <Icon size={64} />
                </div>
                <div>
                    <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-zinc-900 dark:text-white">{value}{suffix}</span>
                        <span className="text-xs text-zinc-400">/ {goal}{suffix}</span>
                    </div>
                </div>
                <div className={`mt-auto px-2 py-1 rounded-lg text-xs font-bold z-10 ${isGood ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {isGood ? 'META BATIDA' : 'ATENÇÃO'}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-[1600px] w-full mx-auto space-y-6 animate-in fade-in duration-700">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-4 md:p-0">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <LayoutList className="w-6 h-6 text-orange-500" />
                        Trilha de Integração
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Monitor de Progresso, Qualidade e SLA dos Integradores
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* View Toggle */}
                    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                        >
                            <Table size={16} /> <span className="hidden sm:inline">Tabela</span>
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                        >
                            <LayoutGrid size={16} /> <span className="hidden sm:inline">Kanban</span>
                        </button>
                    </div>

                    {/* Filter Integrador */}
                    <select
                        value={assigneeFilter}
                        onChange={(e) => setAssigneeFilter(e.target.value)}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                        <option value="all">Todos os Integradores</option>
                        {Array.from(new Set(data.map(d => d.assignee as string).filter(Boolean))).sort().map(assignee => (
                            <option key={assignee} value={assignee}>{assignee}</option>
                        ))}
                    </select>

                    {/* Sync Actions */}
                    <button onClick={() => fetchData()} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors tooltip" title="Atualizar Dados">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            {kpis && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        title="Volume (Pontos)"
                        value={kpis.volume_points}
                        goal={kpis.volume_goal}
                        icon={Target}
                        color="text-blue-500"
                    />
                    <KPICard
                        title="SLA (No Prazo)"
                        value={kpis.sla_pct}
                        goal={90}
                        suffix="%"
                        icon={Calendar}
                        color="text-purple-500"
                    />
                    <KPICard
                        title="Qualidade (Sem Bugs)"
                        value={kpis.quality_pct}
                        goal={90}
                        suffix="%"
                        icon={Bug}
                        color="text-emerald-500"
                    />
                    <KPICard
                        title="Documentação"
                        value={kpis.doc_pct}
                        goal={100}
                        suffix="%"
                        icon={FileText}
                        color="text-amber-500"
                    />
                </div>
            )}

            {/* Active View Container */}
            <div className="w-full">
                {loading ? (
                    <div className="flex flex-col gap-4">
                        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse"></div>
                    </div>
                ) : (
                    <>
                        {viewMode === 'table' && (
                            <IntegrationTableView
                                data={assigneeFilter === 'all' ? data : data.filter(d => d.assignee === assigneeFilter)}
                                onEdit={(item) => setEditingItem(item)}
                                onRefetch={() => fetchData()}
                            />
                        )}
                        {viewMode === 'kanban' && (
                            <div className="overflow-x-auto pb-4 custom-scrollbar">
                                <IntegrationKanbanView
                                    data={assigneeFilter === 'all' ? data : data.filter(d => d.assignee === assigneeFilter)}
                                    onEdit={(item) => setEditingItem(item)}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Integration Edit Modal */}
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
