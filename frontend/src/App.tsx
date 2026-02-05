import { useState, useEffect, useRef } from 'react'

import Dashboard from './components/Dashboard'
import Monitor from './components/Monitor'
import DashboardAnalytics from './components/analytics/DashboardAnalytics'
import ForecastPage from './features/forecast/ForecastPage'
import SyncHealthPanel from './features/sync/SyncHealthPanel'
import MetricsDictionaryModal from './components/MetricsDictionaryModal'

import { HelpCircle, LayoutDashboard, LayoutList, RefreshCw, BarChart, FileText, Activity } from 'lucide-react'
import MonthlyReport from './components/reports/MonthlyReport';
import logo from './assets/logo.png'

function App() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'dashboard-v2' | 'monitor' | 'sync' | 'analytics' | 'forecast' | 'reports'>('dashboard')
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')
    const [showDictionary, setShowDictionary] = useState(false)


    // Theme Toggle Logic
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    // Sync State
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
        const url = `http://localhost:5003/api/sync/stream${forceFull ? '?full=true' : ''}`
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

    return (

        <div className="flex flex-col min-h-screen bg-zinc-100/50 dark:bg-black text-zinc-900 dark:text-zinc-50 font-sans transition-colors duration-300">
            {/* Floating Glass Navbar */}
            <nav className="sticky top-4 z-50 mx-4 mb-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between shadow-lg shadow-zinc-200/50 dark:shadow-black/50 transition-all duration-300">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                        <img src={logo} alt="Instabuy Logo" className="relative h-9 w-auto object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
                            Implantação <span className="text-orange-500">Instabuy</span>
                        </h1>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium tracking-wider uppercase mt-0.5">
                            Gestão de Operações v2.5
                        </span>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    {/* Pill Navigation */}
                    <div className="hidden md:flex gap-1 bg-zinc-100 dark:bg-zinc-950/50 p-1.5 rounded-full border border-zinc-200 dark:border-zinc-800/50">
                        <nav className="flex space-x-1">
                            {[
                                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                                { id: 'analytics', label: 'Analytics', icon: BarChart },
                                { id: 'monitor', label: 'Monitor', icon: LayoutList },
                                { id: 'reports', label: 'Relatórios', icon: FileText },
                                { id: 'sync', label: 'Sync', icon: RefreshCw },

                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`${activeTab === tab.id
                                        ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                                        } whitespace-nowrap px-4 py-2 rounded-full font-semibold text-sm flex items-center transition-all duration-200`}
                                >
                                    <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block"></div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                            title={theme === 'dark' ? "Modo Claro" : "Modo Escuro"}
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>

                        <button
                            onClick={() => setShowDictionary(true)}
                            className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/50"
                            title="Dicionário"
                        >
                            <HelpCircle size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Content Area */}
            <main className="flex-1 flex flex-col mx-4 mb-6 rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm min-h-[calc(100vh-6rem)] relative">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900/50 pointer-events-none opacity-50"></div>

                <div className="relative z-10 flex-1 flex flex-col p-1"> {/* Padding 1 to show rounded border */}
                    {activeTab === 'dashboard' && <Dashboard />}

                    {activeTab === 'analytics' && <DashboardAnalytics />}

                    {activeTab === 'forecast' && <ForecastPage />}

                    {activeTab === 'monitor' && <Monitor />}

                    {activeTab === 'reports' && <MonthlyReport />}

                    {activeTab === 'sync' && (
                        <div className="flex flex-col items-center gap-8 mt-10 w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Sync Content */}
                            {/* Health Panel V2.5 */}
                            <div className="w-full">
                                <SyncHealthPanel />
                            </div>

                            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Control Card */}
                                <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between gap-6 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-900/10 pointer-events-none group-hover:opacity-100 transition-opacity duration-500"></div>

                                    <div className="text-center relative z-10">
                                        <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Sincronizar Dados</h3>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Atualize a base local com o ClickUp</p>
                                    </div>

                                    <div className="relative group/icon">
                                        <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-xl opacity-0 group-hover/icon:opacity-100 transition-all duration-500"></div>
                                        <div className="p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm relative z-10 group-hover/icon:scale-110 transition-transform duration-300 flex items-center justify-center">
                                            <RefreshCw className={`w-10 h-10 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 w-full relative z-10">
                                        <div className="flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50 hover:border-orange-200 dark:hover:border-orange-900/30 transition-colors">
                                            <input
                                                type="checkbox"
                                                id="forceFull"
                                                checked={forceFull}
                                                onChange={(e) => setForceFull(e.target.checked)}
                                                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 cursor-pointer"
                                                disabled={loading}
                                            />
                                            <label htmlFor="forceFull" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer select-none">
                                                Forçar Sync Completo
                                            </label>
                                        </div>

                                        <button
                                            onClick={handleSync}
                                            disabled={loading}
                                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2
                                            ${loading
                                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-wait'
                                                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5'
                                                }`}
                                        >
                                            {loading ? 'Sincronizando...' : 'Iniciar Sync'}
                                        </button>
                                    </div>
                                </div>

                                {/* Terminal Log Window */}
                                <div className="lg:col-span-2 bg-zinc-950 rounded-3xl border border-zinc-800/80 overflow-hidden shadow-2xl flex flex-col h-[400px] relative">
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
                    )}

                </div>
            </main>

            <MetricsDictionaryModal
                isOpen={showDictionary}
                onClose={() => setShowDictionary(false)}
            />
        </div>
    )
}

export default App
