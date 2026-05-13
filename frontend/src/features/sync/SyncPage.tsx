import { useEffect, useRef, useState } from 'react'
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Clock,
    Database,
    Info,
    Loader2,
    RefreshCw,
    Shield,
    Terminal,
    XCircle,
    Zap,
} from 'lucide-react'
import { api, getAccessToken } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import SyncHealthPanel from './SyncHealthPanel'

type SyncMode = 'vital' | 'deep'
type FastSyncType = 'integration' | 'implantacao'
type LogLevel = 'info' | 'success' | 'error' | 'event'

interface LogEntry {
    id: number
    level: LogLevel
    message: string
    at: string
}

const levelStyle: Record<LogLevel, string> = {
    info: 'text-slate-600',
    success: 'text-emerald-600 font-semibold',
    error: 'text-rose-600 font-semibold',
    event: 'text-orange-700 font-semibold',
}

export default function SyncPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [activeJob, setActiveJob] = useState<string | null>(null)
    const [logs, setLogs] = useState<LogEntry[]>([])
    const logsEndRef = useRef<HTMLDivElement>(null)
    const eventSourceRef = useRef<EventSource | null>(null)
    const logIdRef = useRef(0)

    const addLog = (level: LogLevel, message: string) => {
        logIdRef.current += 1
        setLogs((prev) => [
            ...prev,
            {
                id: logIdRef.current,
                level,
                message: message.replace(/^data:\s*/, ''),
                at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
        ])
    }

    const closeStream = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
        }
    }

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [logs])

    useEffect(() => {
        return () => closeStream()
    }, [])

    const handleSync = (mode: SyncMode) => {
        closeStream()
        setLoading(true)
        setActiveJob(mode === 'deep' ? 'Deep Sync' : 'Vital Sync')
        setLogs([])
        addLog('event', `Iniciando ${mode === 'deep' ? 'Deep Sync' : 'Vital Sync'}.`)

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003'
        const isDeep = mode === 'deep'
        const params = new URLSearchParams({
            full: String(isDeep),
            vital_only: String(!isDeep),
        })

        const accessToken = getAccessToken()
        if (accessToken) {
            params.set('token', accessToken)
        }

        const eventSource = new EventSource(`${baseUrl}/api/sync/stream?${params.toString()}`, { withCredentials: true })
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
            addLog('info', 'Conexao SSE estabelecida com o Sync Engine.')
        }

        eventSource.onmessage = (event) => {
            if (event.data.includes('[DONE]')) {
                addLog('success', `${mode === 'deep' ? 'Deep Sync' : 'Vital Sync'} finalizado com sucesso.`)
                closeStream()
                setLoading(false)
                setActiveJob(null)
                return
            }
            addLog('info', event.data)
        }

        eventSource.onerror = () => {
            addLog('error', 'Conexao encerrada ou falha durante o processamento.')
            closeStream()
            setLoading(false)
            setActiveJob(null)
        }
    }

    const handleFastSync = async (type: FastSyncType) => {
        closeStream()
        const label = type === 'integration' ? 'Integracao' : 'Implantacao'
        setLoading(true)
        setActiveJob(`Sync rapido: ${label}`)
        setLogs([])
        addLog('event', `Iniciando sync rapido de ${label}.`)

        try {
            const endpoint = type === 'integration' ? '/api/integration/sync' : '/api/implantacao/sync'
            const response = await api.post(endpoint)
            const data = response.data
            addLog('success', `Sync rapido de ${label} concluido.`)
            addLog('info', `Lojas atualizadas: ${data.stores_updated || 0}`)
            addLog('info', `Itens processados: ${data.processed || 0}`)
        } catch (error) {
            addLog('error', `Falha no sync rapido de ${label}: ${error instanceof Error ? error.message : 'erro inesperado'}`)
        } finally {
            setLoading(false)
            setActiveJob(null)
        }
    }

    const actionCards = [
        {
            key: 'vital',
            title: 'Vital Sync',
            desc: 'Atualiza status, datas e progresso com menor custo operacional.',
            icon: <Zap size={22} />,
            tone: 'text-orange-700 bg-orange-50 border-orange-200 hover:border-orange-300',
            action: () => handleSync('vital'),
        },
        {
            key: 'deep',
            title: 'Deep Sync',
            desc: 'Executa varredura completa, historico e campos de Raio-X.',
            icon: <Database size={22} />,
            tone: 'text-blue-700 bg-blue-50 border-blue-200 hover:border-blue-300',
            action: () => handleSync('deep'),
        },
    ]

    return (
        <div aria-label="Sync Page" className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                            <Shield size={18} />
                            Sync Engine
                        </div>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight">Centro de sincronizacao</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">
                            Monitore a saude do ClickUp Sync, execute rotinas manuais e acompanhe logs de stream.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Shield size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-slate-400">Operador</p>
                            <p className="text-sm font-bold text-slate-700">{user?.name || 'Administrador'}</p>
                        </div>
                    </div>
                </div>

                <SyncHealthPanel />

                <section className="grid gap-4 lg:grid-cols-3">
                    {actionCards.map((card) => (
                        <button
                            key={card.key}
                            type="button"
                            onClick={card.action}
                            disabled={loading}
                            className={`rounded-lg border bg-white p-5 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${card.tone}`}
                        >
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <span className={`flex h-11 w-11 items-center justify-center rounded-lg border ${card.tone}`}>{card.icon}</span>
                                <ChevronRight size={18} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                            <p className="mt-2 min-h-10 text-sm text-slate-500">{card.desc}</p>
                        </button>
                    ))}

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                                <RefreshCw size={20} />
                            </span>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Escopo rapido</h3>
                                <p className="text-sm text-slate-500">Rotinas direcionadas por area.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => handleFastSync('integration')}
                                disabled={loading}
                                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700 disabled:opacity-60"
                            >
                                Integracao
                                <ChevronRight size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFastSync('implantacao')}
                                disabled={loading}
                                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
                            >
                                Implantacao
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <div className="flex h-[460px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                                <Terminal size={15} />
                                Logs de execucao
                            </div>
                            {loading && (
                                <div className="flex items-center gap-2 text-xs font-bold text-orange-700">
                                    <Loader2 size={14} className="animate-spin" />
                                    {activeJob || 'Processando'}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 font-mono text-xs">
                            {logs.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
                                    <Terminal size={42} />
                                    <p className="text-sm font-medium">Aguardando comando.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {logs.map((log, index) => (
                                        <div key={log.id} className="grid grid-cols-[34px_72px_1fr] gap-3">
                                            <span className="text-right text-slate-300">{index + 1}</span>
                                            <span className="text-slate-400">{log.at}</span>
                                            <span className={levelStyle[log.level]}>{log.message}</span>
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-5">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                <Clock size={16} className="text-slate-400" />
                                Operacao
                            </h3>
                            <div className="mt-4 space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                    SSE com cookie e fallback token
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Activity size={16} className="text-orange-600" />
                                    Health atualiza a cada 30s
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    {loading ? <AlertCircle size={16} className="text-amber-600" /> : <XCircle size={16} className="text-slate-400" />}
                                    {loading ? activeJob : 'Nenhuma rotina ativa'}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-white p-5">
                            <div className="flex gap-3">
                                <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
                                <p className="text-sm leading-relaxed text-slate-500">
                                    Vital Sync deve ser usado para atualizacoes do dia. Deep Sync e indicado para reconciliacao completa.
                                </p>
                            </div>
                        </div>
                    </aside>
                </section>
            </div>
        </div>
    )
}
