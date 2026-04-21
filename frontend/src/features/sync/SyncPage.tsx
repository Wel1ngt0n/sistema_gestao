import { useState, useRef, useEffect } from 'react'
import { RefreshCw, Activity } from 'lucide-react'
import { api } from '../../services/api'
import SyncHealthPanel from './SyncHealthPanel'

export default function SyncPage() {
    const [loading, setLoading] = useState(false)
    const [forceFull, setForceFull] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const logsEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [logs])

    const handleSync = async () => {
        setLoading(true)
        setLogs(['Iniciando conexão com o servidor...'])

        // Use EventSource for real-time logs
        const token = localStorage.getItem('auth_token')
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003';
        const url = `${baseUrl}/api/sync/stream${forceFull ? '?full=true' : ''}${forceFull ? '&' : '?'}token=${token}`
        const eventSource = new EventSource(url)

        eventSource.onopen = () => {
            setLogs(prev => [...prev, 'Conexão estabelecida!'])
        }

        eventSource.onmessage = (event) => {
            // Stop if done
            if (event.data.includes('[DONE]')) {
                eventSource.close()
                setLoading(false)
                return
            }
            setLogs(prev => [...prev, event.data])
        }

        eventSource.onerror = () => {
            eventSource.close()
            setLoading(false)
            setLogs(prev => [...prev, 'Erro na conexão ou conexão encerrada.'])
        }
    }

    const handleIntegrationSync = async () => {
        setLoading(true)
        setLogs(['Iniciando Sync Rápido de Integração...'])

        try {
            const response = await api.post('/api/integration/sync')
            const data = response.data

            if (response.status === 200) {
                setLogs(prev => [
                    ...prev,
                    `✅ Sync Concluído!`,
                    `Steps Processados: ${data.processed}`,
                    `Lojas Atualizadas: ${data.stores_updated}`
                ])
            } else {
                setLogs(prev => [...prev, `❌ Erro: ${data.error}`])
            }
        } catch (error) {
            setLogs(prev => [...prev, `❌ Erro de conexão: ${error}`])
        } finally {
            setLoading(false)
        }
    }

    const handleImplantacaoSync = async () => {
        setLoading(true)
        setLogs(['Iniciando Sync Rápido de Implantação...'])

        try {
            const response = await api.post('/api/implantacao/sync')
            const data = response.data

            if (response.status === 200) {
                setLogs(prev => [
                    ...prev,
                    `✅ Sync Concluído!`,
                    `Steps Processados: ${data.processed}`,
                    `Lojas Atualizadas: ${data.stores_updated}`
                ])
            } else {
                setLogs(prev => [...prev, `❌ Erro: ${data.error}`])
            }
        } catch (error) {
            setLogs(prev => [...prev, `❌ Erro de conexão: ${error}`])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center gap-8 mt-10 w-full max-w-5xl mx-auto">
            {/* Sync Content */}
            {/* Health Panel V2.5 */}
            <div className="w-full">
                <SyncHealthPanel />
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Control Card: General Sync */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between gap-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent pointer-events-none group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="text-center relative z-10">
                        <h3 className="font-bold text-lg text-zinc-900">Sincronização Geral</h3>
                        <p className="text-sm text-zinc-500 mt-1">Atualize toda a base local com o ClickUp</p>
                    </div>

                    <div className="relative group/icon">
                        <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-xl opacity-0 group-hover/icon:opacity-100 transition-all duration-500"></div>
                        <div className="p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm relative z-10 group-hover/icon:scale-110 transition-transform duration-300 flex items-center justify-center">
                            <RefreshCw className={`w-10 h-10 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full relative z-10">
                        <div className="flex items-center justify-center gap-2 bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100/50 hover:border-orange-200 transition-colors">
                            <input
                                type="checkbox"
                                id="forceFull"
                                checked={forceFull}
                                onChange={(e) => setForceFull(e.target.checked)}
                                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-zinc-300 bg-white cursor-pointer"
                                disabled={loading}
                            />
                            <label htmlFor="forceFull" className="text-xs font-semibold text-zinc-600 cursor-pointer select-none">
                                Forçar Sync Completo
                            </label>
                        </div>

                        <button
                            onClick={handleSync}
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2
            ${loading
                                    ? 'bg-zinc-100 text-zinc-400 cursor-wait'
                                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? 'Sincronizando...' : 'Iniciar Sync Geral'}
                        </button>
                    </div>
                </div>

                {/* Control Card: Integration Sync */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between gap-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="text-center relative z-10">
                        <h3 className="font-bold text-lg text-zinc-900">Sync Integração</h3>
                        <p className="text-sm text-zinc-500 mt-1">Apenas tarefas da lista de Integração</p>
                    </div>

                    <div className="relative group/icon">
                        <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover/icon:opacity-100 transition-all duration-500"></div>
                        <div className="p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm relative z-10 group-hover/icon:scale-110 transition-transform duration-300 flex items-center justify-center">
                            <Activity className={`w-10 h-10 text-blue-500 ${loading ? 'animate-pulse' : ''}`} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full relative z-10">
                        <div className="p-2.5 rounded-xl border border-transparent h-10"></div> {/* Spacer to align buttons */}

                        <button
                            onClick={handleIntegrationSync}
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2
            ${loading
                                    ? 'bg-zinc-100 text-zinc-400 cursor-wait'
                                    : 'bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-400 hover:to-orange-400 text-white shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? 'Aguarde...' : 'Sync Rápido (Integração)'}
                        </button>
                    </div>
                </div>

                {/* Control Card: Implantação Sync */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between gap-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent pointer-events-none group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="text-center relative z-10">
                        <h3 className="font-bold text-lg text-zinc-900">Sync Implantação</h3>
                        <p className="text-sm text-zinc-500 mt-1">Apenas tarefas da lista de Implantação</p>
                    </div>

                    <div className="relative group/icon">
                        <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-xl opacity-0 group-hover/icon:opacity-100 transition-all duration-500"></div>
                        <div className="p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm relative z-10 group-hover/icon:scale-110 transition-transform duration-300 flex items-center justify-center">
                            <Activity className={`w-10 h-10 text-amber-500 ${loading ? 'animate-pulse' : ''}`} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full relative z-10">
                        <div className="p-2.5 rounded-xl border border-transparent h-10"></div> {/* Spacer to align buttons */}

                        <button
                            onClick={handleImplantacaoSync}
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2
            ${loading
                                    ? 'bg-zinc-100 text-zinc-400 cursor-wait'
                                    : 'bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-white shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? 'Aguarde...' : 'Sync Rápido (Implantação)'}
                        </button>
                    </div>
                </div>

                {/* Terminal Log Window */}
                <div className="lg:col-span-3 md:col-span-2 bg-zinc-950 rounded-3xl border border-zinc-800/80 overflow-hidden shadow-2xl flex flex-col h-[400px] relative">
                    <div className="bg-zinc-900/80 p-3 border-b border-zinc-800 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Activity size={12} className="text-zinc-600" />
                            <span className="text-[10px] uppercase text-zinc-500 font-mono tracking-widest">Live Logs</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent font-mono text-xs">
                        {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-3 opacity-50">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-800 animate-spin-slow"></div>
                                <span className="italic">Aguardando início do processo...</span>
                            </div>
                        )}

                        {logs.map((log, index) => (
                            <div key={index} className="break-words border-l-2 border-transparent pl-2 py-0.5 animate-in fade-in slide-in-from-left-2 duration-100 group hover:bg-zinc-900/30">
                                <span className="text-emerald-500/50 mr-2 select-none">➜</span>
                                <span className={`${log.includes('Erro') ? 'text-rose-400' : 'text-zinc-300 group-hover:text-white transition-colors'}`}>
                                    {log.replace('data: ', '')}
                                </span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    )
}
