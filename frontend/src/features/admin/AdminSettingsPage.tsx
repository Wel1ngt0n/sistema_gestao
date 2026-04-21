// UX Audit: placeholder aria-label
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Save, RefreshCw, Settings, AlertTriangle } from 'lucide-react'

interface SystemConfig {
    id: number
    key: string
    value: string
    description: string
}

export default function AdminSettingsPage() {
    const [configs, setConfigs] = useState<SystemConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchConfigs()
    }, [])

    const fetchConfigs = async () => {
        try {
            setLoading(true)
            const response = await api.get('/admin/configs')
            setConfigs(response.data)
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Erro ao carregar configurações.' })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (key: string, value: string) => {
        try {
            setSaving(key)
            await api.post('/admin/configs', { key, value })
            setMessage({ type: 'success', text: 'Configuração salva com sucesso!' })

            // Update local state
            setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c))

            setTimeout(() => setMessage(null), 3000)
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Erro ao salvar configuração.' })
        } finally {
            setSaving(null)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-orange-500" />
                        Configurações do Sistema
                    </h1>
                    <p className="text-zinc-500 mt-1">
                        Ajuste parâmetros globais do CRM. Cuidado: alterações afetam todos os usuários.
                    </p>
                </div>
                <button
                    onClick={fetchConfigs}
                    className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    title="Recarregar"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2
                    ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'
                    }
                `}>
                    {message.type === 'error' && <AlertTriangle size={16} />}
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100">
                        {configs.length === 0 && (
                            <div className="p-8 text-center text-zinc-500">
                                Nenhuma configuração encontrada. O sistema usará os padrões.
                            </div>
                        )}

                        {configs.map((config) => (
                            <div key={config.key} className="p-6 flex flex-col md:flex-row md:items-center gap-4 hover:bg-zinc-50/50/20 transition-colors">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-zinc-900 font-mono text-sm">
                                        {config.key}
                                    </h3>
                                    <p className="text-sm text-zinc-500 mt-0.5">
                                        {config.description || "Sem descrição"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <input
                                        type="text"
                                        defaultValue={config.value}
                                        id={`input-${config.key}`}
                                        className="flex-1 md:w-64 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById(`input-${config.key}`) as HTMLInputElement
                                            handleSave(config.key, input.value)
                                        }}
                                        disabled={saving === config.key}
                                        className="p-2 bg-zinc-900 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {saving === config.key ? (
                                            <RefreshCw size={18} className="animate-spin" />
                                        ) : (
                                            <Save size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Adicionar Nova Config (Hidden feature for now, or explicit?) */}
                        {/* We can add a "Add Config" button later if needed */}
                    </div>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                    <strong>Dica:</strong> As chaves de configuração mais comuns são:
                    <ul className="list-disc list-inside mt-1 ml-1 space-y-0.5 opacity-80">
                        <li><code>weight_matriz</code> (Peso para cálculo de pontos de Matriz)</li>
                        <li><code>weight_filial</code> (Peso para cálculo de pontos de Filial)</li>
                        <li><code>sla_default</code> (Dias padrão para contrato)</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

