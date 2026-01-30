import { useState, useEffect, useRef } from 'react'

import DashboardV2 from './components/DashboardV2'
import Monitor from './components/Monitor'
import DashboardAnalytics from './components/analytics/DashboardAnalytics'
import ForecastPage from './features/forecast/ForecastPage'
import SyncHealthPanel from './features/sync/SyncHealthPanel'
import MetricsDictionaryModal from './components/MetricsDictionaryModal'

import { HelpCircle, LayoutDashboard, LayoutList, RefreshCw, TrendingUp, BarChart, FileText } from 'lucide-react'
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

                    {/* Help Button */}
                    <button
                        onClick={() => setShowDictionary(true)}
                        className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        title="Dicionário de Métricas"
                    >
                        <HelpCircle size={20} />
                    </button>

                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-950/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`${activeTab === 'dashboard'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Dashboard
                            </button>

                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`${activeTab === 'analytics'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                            >
                                <BarChart className="w-4 h-4 mr-2" />
                                Analytics
                            </button>

                            <button
                                onClick={() => setActiveTab('monitor')}
                                className={`${activeTab === 'monitor'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                            >
                                <LayoutList className="w-4 h-4 mr-2" />
                                Monitoramento
                            </button>

                            <button
                                onClick={() => setActiveTab('reports')}
                                className={`${activeTab === 'reports'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Relatórios
                            </button>

                            <button
                                onClick={() => setActiveTab('sync')}
                                className={`${activeTab === 'sync'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Sincronização
                            </button>



                            <button
                                onClick={() => setActiveTab('forecast')}
                                className={`${activeTab === 'forecast'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                            >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Forecast
                            </button>
                        </nav>
                    </div>
                </div>
            </nav>

            {/* Content Area */}
            <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-x-hidden transition-colors duration-300">

                {activeTab === 'dashboard' && <DashboardV2 />}

                {/* {activeTab === 'dashboard-v2' && <DashboardV2 />} */}

                {activeTab === 'analytics' && <DashboardAnalytics />}

                {activeTab === 'forecast' && <ForecastPage />}

                {activeTab === 'monitor' && <Monitor />}

                {activeTab === 'reports' && <MonthlyReport />}



                {activeTab === 'sync' && (
                    <div className="flex flex-col items-center gap-8 mt-10 w-full max-w-3xl p-4 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Health Panel V2.5 */}
                        <div className="w-full">
                            <SyncHealthPanel />
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">Sincronização de Dados</h2>
                            <p className="text-slate-600 dark:text-slate-400 text-lg">Busque os dados mais recentes do ClickUp para atualizar o sistema.</p>
                        </div>

                        <div className="w-full bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden group transition-all duration-300">
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 opacity-50"></div>

                            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <span className={`text-5xl block ${loading ? 'animate-spin' : ''}`}>🔄</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="forceFull"
                                    checked={forceFull}
                                    onChange={(e) => setForceFull(e.target.checked)}
                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                                    disabled={loading}
                                />
                                <label htmlFor="forceFull" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                    Forçar Sincronização Completa
                                </label>
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

            <MetricsDictionaryModal
                isOpen={showDictionary}
                onClose={() => setShowDictionary(false)}
            />
        </div>
    )
}

export default App
