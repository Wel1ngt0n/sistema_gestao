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
        <div className="min-h-screen bg-zinc-950/50 p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-orange-500 font-mono text-sm tracking-widest uppercase">
                            <Shield size={16} />
                            <span>Control Center // v3.0</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Sync Engine</h1>
                        <p className="text-zinc-400 max-w-2xl">
                            Gerencie a integridade dos dados entre o ClickUp e a base local.
                            Priorize o <span className="text-white font-semibold">Vital Sync</span> para atualizações rápidas ou o <span className="text-white font-semibold">Deep Sync</span> para varredura completa.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Operador Atual</span>
                            <span className="text-sm font-semibold text-zinc-200">{user?.name || 'Administrador'}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/5">
                            <Command size={18} />
                        </div>
                    </div>
                </div>

                {/* Health Monitoring Panel */}
                <SyncHealthPanel />

                {/* Main Controls Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Primary Actions (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Vital Sync Card */}
                            <button
                                onClick={() => handleSync('vital')}
                                disabled={loading}
                                className="group relative flex flex-col items-start p-8 bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] text-left hover:border-orange-500/50 transition-all duration-500 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-6 text-zinc-800 group-hover:text-orange-500/10 transition-colors duration-500">
                                    <Zap size={120} strokeWidth={1} />
                                </div>

                                <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500 mb-6 group-hover:scale-110 transition-transform">
                                    <Zap size={24} fill="currentColor" />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">Vital Sync</h3>
                                <p className="text-sm text-zinc-500 mb-8 max-w-[200px]">
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
                                className="group relative flex flex-col items-start p-8 bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] text-left hover:border-blue-500/50 transition-all duration-500 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-6 text-zinc-800 group-hover:text-blue-500/10 transition-colors duration-500">
                                    <Database size={120} strokeWidth={1} />
                                </div>

                                <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                                    <RefreshCw size={24} />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">Deep Sync</h3>
                                <p className="text-sm text-zinc-500 mb-8 max-w-[200px]">
                                    Sincronismo completo incluindo Raio-X e histórico. Consumo intensivo.
                                </p>

                                <div className="mt-auto flex items-center gap-2 text-xs font-bold text-blue-500 uppercase tracking-widest">
                                    <span>Executar Varredura</span>
                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        </div>

                        {/* Terminal Log */}
                        <div className="bg-zinc-950 rounded-[2rem] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
                            <div className="bg-zinc-900/50 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                                        <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                                        <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                                    </div>
                                    <div className="h-4 w-px bg-zinc-800 mx-2"></div>
                                    <div className="flex items-center gap-2">
                                        <Terminal size={14} className="text-orange-500" />
                                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Execution Logs // Stream</span>
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
                                            <span className="text-zinc-700 select-none w-8 text-right">{i + 1}</span>
                                            <span className={`
                                                ${log.includes('❌') ? 'text-rose-400' :
                                                    log.includes('✅') ? 'text-emerald-400' :
                                                        log.includes('🚀') ? 'text-orange-400 font-bold' :
                                                            'text-zinc-300'}
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

                    {/* Secondary Actions (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2rem] p-6 space-y-6">
                            <h4 className="flex items-center gap-2 text-white font-bold text-sm">
                                <Zap size={16} className="text-orange-500" />
                                <span>Syncs de Escopo Rápido</span>
                            </h4>

                            <div className="space-y-4">
                                <button
                                    onClick={() => handleFastSync('integration')}
                                    disabled={loading}
                                    className="w-full flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <Activity size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-zinc-200">Integração</p>
                                            <p className="text-[10px] text-zinc-500 uppercase font-mono">List: INTEGRACAO</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-zinc-600 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button
                                    onClick={() => handleFastSync('implantacao')}
                                    disabled={loading}
                                    className="w-full flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                            <Activity size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-zinc-200">Implantação</p>
                                            <p className="text-[10px] text-zinc-500 uppercase font-mono">List: IMPLANTACAO</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-zinc-600 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                                <div className="flex gap-3">
                                    <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-orange-200/60 leading-relaxed">
                                        Syncs rápidos atualizam apenas tarefas de listas específicas, economizando requisições.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Automation Schedule Overview */}
                        <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-[2rem] p-8 space-y-6 relative overflow-hidden">
                            <div className="absolute -bottom-10 -right-10 opacity-5">
                                <Clock size={200} />
                            </div>

                            <h4 className="text-white font-bold text-lg flex items-center gap-2">
                                <Clock size={18} className="text-zinc-400" />
                                <span>Cron Jobs</span>
                            </h4>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-200">Vital Automation</p>
                                        <p className="text-xs text-zinc-500">Agendado: 10h, 12h, 14h, 16h, 18h</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-200">Deep Maintenance</p>
                                        <p className="text-xs text-zinc-500">Agendado: 03:00 AM Daily</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-800">
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
