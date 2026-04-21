import { useState, useRef, useEffect } from 'react'
import {
    RefreshCw,
    Activity,
    Zap,
    Database,
    Shield,
    Terminal,
    Info,
    Clock,
    CheckCircle2,
    ChevronRight,
    Settings2,
    Command
} from 'lucide-react'
import { api } from '../../services/api'
import SyncHealthPanel from './SyncHealthPanel'
import { useAuth } from '../../contexts/AuthContext'

export default function SyncPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const logsEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [logs])

    const handleSync = async (mode: 'vital' | 'deep') => {
        setLoading(true)
        setLogs([`🚀 Iniciando SYNC ${mode.toUpperCase()}...`])
        const token = localStorage.getItem('auth_token')
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003';

        // Parâmetros: full=true para deep, vital_only=true para vital
        const isDeep = mode === 'deep'
        const url = `${baseUrl}/api/sync/stream?full=${isDeep}&vital_only=${!isDeep}&token=${token}`

        const eventSource = new EventSource(url)

        eventSource.onopen = () => {
            setLogs(prev => [...prev, '📡 Conexão estabelecida com o Sync Engine.'])
        }

        eventSource.onmessage = (event) => {
            if (event.data.includes('[DONE]')) {
                eventSource.close()
                setLoading(false)
                setLogs(prev => [...prev, `✅ Sincronismo ${mode.toUpperCase()} finalizado com sucesso.`])
                return
            }
            setLogs(prev => [...prev, event.data])
        }

        eventSource.onerror = () => {
            eventSource.close()
            setLoading(false)
            setLogs(prev => [...prev, '❌ Conexão encerrada ou erro no processamento.'])
        }
    }

    const handleFastSync = async (type: 'integration' | 'implantacao') => {
        setLoading(true)
        const label = type === 'integration' ? 'Integração' : 'Implantação'
        setLogs([`⚡ Iniciando Sync Rápido: ${label}...`])

        try {
            const endpoint = type === 'integration' ? '/api/integration/sync' : '/api/implantacao/sync'
            const response = await api.post(endpoint)
            const data = response.data

            setLogs(prev => [
                ...prev,
                `✅ Sync concluído para ${label}.`,
                `📊 Lojas atualizadas: ${data.stores_updated || 0}`,
                `🔍 Itens processados: ${data.processed || 0}`
            ])
        } catch (error) {
            setLogs(prev => [...prev, `❌ Falha no sync rápido: ${error}`])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950/50 p-6 lg:p-10 transition-colors duration-500">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-orange-500 font-mono text-sm tracking-widest uppercase">
                            <Shield size={16} />
                            <span>Control Center // v3.0</span>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Sync Engine</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl">
                            Gerencie a integridade dos dados entre o ClickUp e a base local.
                            Priorize o <span className="text-zinc-900 dark:text-white font-semibold">Vital Sync</span> para atualizações rápidas ou o <span className="text-zinc-900 dark:text-white font-semibold">Deep Sync</span> para varredura completa.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Operador Atual</span>
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{user?.name || 'Administrador'}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/5">
                            <Command size={18} />
                        </div>
                    </div>
                </div>

                {/* Health Monitoring Panel */}
                <SyncHealthPanel />

                {/* Main Controls Grid (3 Types of Sync) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Vital Sync Card */}
                    <button
                        onClick={() => handleSync('vital')}
                        disabled={loading}
                        className="group relative flex flex-col items-start p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] text-left hover:border-orange-500/50 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/5"
                    >
                        <div className="absolute top-0 right-0 p-6 text-zinc-100 dark:text-zinc-800 group-hover:text-orange-500/10 transition-colors duration-500">
                            <Zap size={120} strokeWidth={1} />
                        </div>

                        <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500 mb-6 group-hover:scale-110 transition-transform">
                            <Zap size={24} fill="currentColor" />
                        </div>

                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Vital Sync</h3>
                        <p className="text-sm text-zinc-500 mb-8">
                            Atualiza status, datas e progresso. Otimizado para performance.
                        </p>

                        <div className="mt-auto flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-widest">
                            <span>Iniciar Agora</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    {/* Deep Sync Card */}
                    <button
                        onClick={() => handleSync('deep')}
                        disabled={loading}
                        className="group relative flex flex-col items-start p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] text-left hover:border-blue-500/50 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-blue-500/5"
                    >
                        <div className="absolute top-0 right-0 p-6 text-zinc-100 dark:text-zinc-800 group-hover:text-blue-500/10 transition-colors duration-500">
                            <Database size={120} strokeWidth={1} />
                        </div>

                        <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                            <RefreshCw size={24} />
                        </div>

                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Deep Sync</h3>
                        <p className="text-sm text-zinc-500 mb-8">
                            Sincronismo completo incluindo Raio-X e histórico. Consumo intensivo.
                        </p>

                        <div className="mt-auto flex items-center gap-2 text-xs font-bold text-blue-500 uppercase tracking-widest">
                            <span>Executar Varredura</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    {/* Fast Syncs Card (Unified) */}
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 flex flex-col shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500">
                                <Zap size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Escopo Rápido</h3>
                        </div>
                        
                        <div className="space-y-3 flex-1">
                            <button
                                onClick={() => handleFastSync('integration')}
                                disabled={loading}
                                className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 hover:border-orange-500/30 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Activity size={18} className="text-orange-500" />
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Integração</span>
                                </div>
                                <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button
                                onClick={() => handleFastSync('implantacao')}
                                disabled={loading}
                                className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 hover:border-amber-500/30 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Activity size={18} className="text-amber-500" />
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Implantação</span>
                                </div>
                                <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="flex gap-3">
                                <Info size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                                    Atualizações direcionadas para listas específicas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Terminal Log (Full Width or 8 cols?) - Let's make it more prominent */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Terminal Log */}
                        <div className="bg-zinc-950 rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
                            <div className="bg-zinc-100 dark:bg-zinc-900/50 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-800"></div>
                                        <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-800"></div>
                                        <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-800"></div>
                                    </div>
                                    <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-800 mx-2"></div>
                                    <div className="flex items-center gap-2">
                                        <Terminal size={14} className="text-orange-500" />
                                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Execution Logs // Stream</span>
                                    </div>
                                </div>
                                {loading && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-orange-500 animate-pulse">
                                        <Activity size={12} />
                                        <span>PROCESSING</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-zinc-800">
                                {logs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-800 gap-4">
                                        <Settings2 size={48} className="opacity-10" />
                                        <p className="italic text-sm">Aguardando comando de inicialização...</p>
                                    </div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="flex gap-4 group">
                                            <span className="text-zinc-400 dark:text-zinc-700 select-none w-8 text-right font-mono">{i + 1}</span>
                                            <span className={`
                                                ${log.includes('❌') ? 'text-rose-500 dark:text-rose-400' :
                                                    log.includes('✅') ? 'text-emerald-500 dark:text-emerald-400' :
                                                        log.includes('🚀') ? 'text-orange-500 dark:text-orange-400 font-bold' :
                                                            'text-zinc-700 dark:text-zinc-300'}
                                            `}>
                                                {log.replace('data: ', '')}
                                            </span>
                                        </div>
                                    ))
                                )}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </div>

                    {/* Automation Schedule Overview (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Automation Schedule Overview */}
                        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden shadow-sm">
                            <div className="absolute -bottom-10 -right-10 opacity-5 text-zinc-900 dark:text-white">
                                <Clock size={200} />
                            </div>

                            <h4 className="text-zinc-900 dark:text-white font-bold text-lg flex items-center gap-2">
                                <Clock size={18} className="text-zinc-400" />
                                <span>Cron Jobs</span>
                            </h4>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Vital Automation</p>
                                        <p className="text-xs text-zinc-500">Agendado: 10h, 12h, 14h, 16h, 18h</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Deep Maintenance</p>
                                        <p className="text-xs text-zinc-500">Agendado: 03:00 AM Daily</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status Agendador</span>
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                                        <CheckCircle2 size={12} />
                                        ACTIVE
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
