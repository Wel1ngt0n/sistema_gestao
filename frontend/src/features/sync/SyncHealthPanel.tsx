import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, CheckCircle, Clock, Database, RefreshCw, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { api } from '../../services/api'

interface SyncHealth {
    last_run?: {
        id?: number | null
        status?: string
        started_at?: string | null
        finished_at?: string | null
        started_at_iso?: string | null
        finished_at_iso?: string | null
        duration_sec?: number
        items_processed?: number
        items_updated?: number
        error_summary?: string | null
    }
    is_stale?: boolean
    stale_hours?: number
    stale_threshold_hours?: number
    summary?: {
        window_hours?: number
        runs?: number
        success?: number
        failed?: number
        errors?: number
        items_processed?: number
        items_updated?: number
    }
    scheduler?: {
        status?: string
        timezone?: string
        vital_schedule?: string
        deep_schedule?: string
    }
    recent_errors?: Array<{ id: number; msg: string; store_id?: number | null; task_id?: string | null; at: string }>
}

const statusStyle = (status?: string) => {
    if (status === 'SUCCESS') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    if (status === 'RUNNING') return 'border-blue-200 bg-blue-50 text-blue-700'
    if (status === 'NEVER') return 'border-slate-200 bg-slate-50 text-slate-500'
    return 'border-rose-200 bg-rose-50 text-rose-700'
}

const parseDate = (iso?: string | null, fallback?: string | null) => {
    if (iso) {
        const date = new Date(iso)
        if (!Number.isNaN(date.getTime())) return date
    }
    if (fallback) {
        const [day, month, yearAndTime] = fallback.split('/')
        if (day && month && yearAndTime) {
            const [year, time] = yearAndTime.split(' ')
            const date = new Date(`${year}-${month}-${day}T${time || '00:00'}`)
            if (!Number.isNaN(date.getTime())) return date
        }
    }
    return null
}

const formatDuration = (seconds = 0) => {
    if (!seconds) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const rest = Math.round(seconds % 60)
    return `${minutes}m ${rest}s`
}

const metric = (label: string, value: string | number, icon: ReactNode) => (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
            {icon}
            {label}
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
)

export default function SyncHealthPanel() {
    const { data: health, isLoading, error, refetch } = useQuery<SyncHealth>({
        queryKey: ['sync-health'],
        queryFn: async () => {
            const res = await api.get('/api/sync/health')
            return res.data
        },
        refetchInterval: 30000,
    })

    if (isLoading) {
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                Carregando saude do Sync...
            </div>
        )
    }

    if (error || !health) {
        return (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-700">
                Erro ao carregar status do Sync.
            </div>
        )
    }

    const lastRun = health.last_run
    const finishedAt = parseDate(lastRun?.finished_at_iso, lastRun?.finished_at)
    const isStale = Boolean(health.is_stale)
    const summary = health.summary || {}
    const scheduler = health.scheduler || {}

    return (
        <section className="space-y-4">
            <div className={`rounded-lg border p-5 ${isStale ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${isStale ? 'border-amber-200 bg-amber-100 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                            {isStale ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Saude do motor</p>
                            <h2 className="mt-1 text-2xl font-bold text-slate-900">{isStale ? 'Atencao necessaria' : 'Operacional'}</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Ultima conclusao: {finishedAt ? `${finishedAt.toLocaleDateString()} ${finishedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'sem registro'}.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(lastRun?.status)}`}>
                            {lastRun?.status || 'N/A'}
                        </span>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-orange-300 hover:text-orange-700"
                        >
                            <RefreshCw size={14} />
                            Atualizar
                        </button>
                    </div>
                </div>

                {isStale && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-white/70 p-3 text-sm font-medium text-amber-800">
                        Dados sem sync ha {health.stale_hours || 0}h. Limite configurado: {health.stale_threshold_hours || 6}h.
                    </div>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metric('Execucoes 24h', summary.runs || 0, <Activity size={14} />)}
                {metric('Atualizados 24h', summary.items_updated || 0, <Database size={14} />)}
                {metric('Duracao ultima', formatDuration(lastRun?.duration_sec || 0), <Clock size={14} />)}
                {metric('Erros 24h', summary.errors || 0, (summary.errors || 0) > 0 ? <XCircle size={14} /> : <CheckCircle size={14} />)}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-slate-800">Agenda</h3>
                    <div className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Vital Sync</span>
                            <span className="font-mono text-slate-800">{scheduler.vital_schedule || '10:00,12:00,14:00,16:00,18:00'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Deep Sync</span>
                            <span className="font-mono text-slate-800">{scheduler.deep_schedule || '03:00'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Timezone</span>
                            <span className="font-mono text-slate-800">{scheduler.timezone || 'America/Sao_Paulo'}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-slate-800">Erros recentes</h3>
                    <div className="mt-4 space-y-3">
                        {(health.recent_errors || []).slice(0, 3).map((item) => (
                            <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                                <div className="mb-1 flex justify-between gap-3 font-semibold text-slate-700">
                                    <span>{item.store_id ? `Loja ${item.store_id}` : item.task_id || 'Sync'}</span>
                                    <span>{item.at}</span>
                                </div>
                                <p className="line-clamp-2">{item.msg}</p>
                            </div>
                        ))}
                        {(health.recent_errors || []).length === 0 && (
                            <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">Nenhum erro recente.</p>
                        )}
                    </div>
                </div>
            </div>

            {lastRun?.error_summary && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <strong>Falha critica:</strong> {lastRun.error_summary}
                </div>
            )}
        </section>
    )
}
