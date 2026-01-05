import { useState, useEffect, useRef } from 'react'
import Dashboard from './components/Dashboard'
import Monitor from './components/Monitor'
import StepsView from './components/StepsView'
import DashboardAnalytics from './components/analytics/DashboardAnalytics'
import logo from './assets/logo.png'

function App() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'monitor' | 'steps' | 'sync' | 'analytics'>('dashboard')
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')

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
        const eventSource = new EventSource('http://localhost:5000/api/sync/stream')

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
        <div className="flex flex-col min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white font-sans transition-colors duration-300">
            {/* Navbar */}
            <nav className="bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm dark:shadow-md transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <img src={logo} alt="Instabuy Logo" className="h-10 w-auto object-contain" />
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">Implantação <span className="text-orange-500">Instabuy</span></h1>
                        <span className="text-[10px] text-orange-600/80 dark:text-orange-400/80 font-mono tracking-widest uppercase">Sistema de Gestão V2.5</span>
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        title={theme === 'dark' ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>

                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-950/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow border border-slate-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            📊 Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow border border-slate-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            📈 Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('monitor')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'monitor' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow border border-slate-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            🖥️ Monitor
                        </button>
                        <button
                            onClick={() => setActiveTab('steps')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'steps' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow border border-slate-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                            📋 Etapas
                        </button>
                        <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button
                            onClick={() => setActiveTab('sync')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'sync' ? 'bg-orange-50 dark:bg-orange-600/20 text-orange-600 dark:text-orange-300 shadow border border-orange-200 dark:border-orange-500/30' : 'text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-white hover:bg-orange-100 dark:hover:bg-slate-800'}`}
                        >
                            🔄 Sync
                        </button>
                    </div>
                </div>
            </nav>

            {/* Content Area */}
            <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-x-hidden transition-colors duration-300">

                {activeTab === 'dashboard' && <Dashboard />}

                {activeTab === 'analytics' && <DashboardAnalytics />}

                {activeTab === 'monitor' && <Monitor />}

                {activeTab === 'steps' && <StepsView />}

                {activeTab === 'sync' && (
                    <div className="flex flex-col items-center gap-8 mt-10 w-full max-w-3xl p-4 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">Sincronização de Dados</h2>
                            <p className="text-slate-600 dark:text-slate-400 text-lg">Busque os dados mais recentes do ClickUp para atualizar o sistema.</p>
                        </div>

                        <div className="w-full bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden group transition-all duration-300">
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 opacity-50"></div>

                            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <span className={`text-5xl block ${loading ? 'animate-spin' : ''}`}>🔄</span>
                            </div>

                            <button
                                onClick={handleSync}
                                disabled={loading}
                                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all w-full max-w-sm flex items-center justify-center gap-3
                        ${loading
                                        ? 'bg-slate-200 dark:bg-slate-700 cursor-wait opacity-80 text-slate-500 dark:text-slate-400'
                                        : 'bg-orange-600 hover:bg-orange-500 text-white hover:scale-105 active:scale-95 shadow-xl shadow-orange-500/20'
                                    }`}
                            >
                                {loading ? 'Sincronizando...' : 'Iniciar Sync Agora'}
                            </button>
                        </div>

                        {/* Terminal Log Window */}
                        <div className="w-full bg-slate-900/90 dark:bg-black/90 rounded-xl border border-slate-300 dark:border-slate-700 p-0 font-mono text-sm h-[400px] overflow-hidden shadow-2xl backdrop-blur relative flex flex-col">
                            <div className="bg-slate-100/90 dark:bg-slate-900/50 p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                                </div>
                                <span className="text-[10px] uppercase text-slate-500 dark:text-slate-600 font-bold tracking-widest">System Logs</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-700 text-slate-800 dark:text-slate-300">
                                {logs.length === 0 && <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-700 italic">Aguardando comando...</div>}

                                {logs.map((log, index) => (
                                    <div key={index} className="break-words border-l-2 border-transparent hover:border-slate-300 dark:hover:border-slate-700 pl-2 transition-colors animate-in fade-in slide-in-from-left-2 duration-100 ease-out">
                                        <span className="text-emerald-600 dark:text-emerald-500 mr-2 opacity-50">$</span>
                                        <span className={log.includes('Erro') ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}>
                                            {log.replace('data: ', '')}
                                        </span>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    )
}

export default App
