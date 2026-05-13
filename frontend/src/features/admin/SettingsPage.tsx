import { useEffect, useMemo, useState } from 'react'
import {
    AlertCircle,
    Bell,
    CheckCircle,
    Clock,
    Copy,
    Database,
    KeyRound,
    Loader2,
    Mail,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    Send,
    Settings,
    Shield,
    SlidersHorizontal,
    Target,
    Webhook,
    X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { api } from '../../services/api'

interface ConfigItem {
    key: string
    value: string
    description: string
    category?: string
    default_value?: string
}

interface SlackImplantador {
    name: string
    slack_id: string
}

type ConfigData = Record<string, ConfigItem[]>
type Toast = { text: string; type: 'success' | 'error' }
type CategoryMeta = { label: string; desc: string; icon: ReactNode; tone: string }

const CATEGORY_ORDER = [
    'general',
    'goals',
    'weights',
    'sla',
    'security',
    'csv',
    'sync',
    'support',
    'notifications',
    'webhooks',
]

const CATEGORY_META: Record<string, CategoryMeta> = {
    general: { label: 'Geral', desc: 'Identidade, ambiente e defaults operacionais.', icon: <Settings size={18} />, tone: 'text-slate-700 bg-slate-100 border-slate-200' },
    goals: { label: 'Metas', desc: 'Alvos anuais usados nos paineis executivos.', icon: <Target size={18} />, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    weights: { label: 'Pesos e performance', desc: 'Fatores para pontuacao e leitura de capacidade.', icon: <SlidersHorizontal size={18} />, tone: 'text-blue-700 bg-blue-50 border-blue-200' },
    sla: { label: 'SLA e prazos', desc: 'Prazos de implantacao, integracao e alertas.', icon: <Clock size={18} />, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
    security: { label: 'Seguranca', desc: 'Sessao, 2FA e limites de login.', icon: <Shield size={18} />, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
    csv: { label: 'Import CSV', desc: 'Limites para importacoes e atualizacoes em massa.', icon: <Database size={18} />, tone: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
    sync: { label: 'Sync', desc: 'Agenda, stale threshold e retentativas.', icon: <RefreshCw size={18} />, tone: 'text-orange-700 bg-orange-50 border-orange-200' },
    support: { label: 'Suporte', desc: 'Regras de atendimento e processamento automatico.', icon: <Mail size={18} />, tone: 'text-violet-700 bg-violet-50 border-violet-200' },
    notifications: { label: 'Notificacoes', desc: 'Slack, alertas de SLA e resumo semanal.', icon: <Bell size={18} />, tone: 'text-pink-700 bg-pink-50 border-pink-200' },
    webhooks: { label: 'Webhooks e integracoes', desc: 'Zenvia, tokens e deduplicacao de eventos.', icon: <Webhook size={18} />, tone: 'text-teal-700 bg-teal-50 border-teal-200' },
}

const BOOLEAN_KEYS = new Set([
    'auth_require_2fa',
    'csv_allow_update_existing',
    'sync_auto_retry',
    'support_webhook_auto_process',
    'notify_sla_exceeded',
    'notify_weekly_summary',
    'notify_goal_achieved',
    'webhook_zenvia_enabled',
])

const NUMBER_HINTS = ['target', 'weight', 'days', 'hours', 'limit', 'max', 'attempts', 'window']
const SECRET_HINTS = ['token', 'secret', 'password']

const getOrderedCategories = (configs: ConfigData) => {
    const existing = Object.keys(configs)
    return [
        ...CATEGORY_ORDER.filter((cat) => existing.includes(cat)),
        ...existing.filter((cat) => !CATEGORY_ORDER.includes(cat)).sort(),
    ]
}

const isBoolean = (key: string) => BOOLEAN_KEYS.has(key) || key.startsWith('notify_') || key.endsWith('_enabled')
const isSecret = (key: string) => SECRET_HINTS.some((hint) => key.includes(hint))
const isUrl = (key: string) => key.includes('url') || key.includes('endpoint')
const isEmail = (key: string) => key.includes('email')
const isNumber = (key: string) => NUMBER_HINTS.some((hint) => key.includes(hint)) && !isSecret(key)
const isLongText = (key: string) => key === 'slack_user_mentions'

const makeToken = () => {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    return `wh_${Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 32)}`
}

export default function SettingsPage() {
    const [configs, setConfigs] = useState<ConfigData>({})
    const [initialValues, setInitialValues] = useState<Record<string, string>>({})
    const [editValues, setEditValues] = useState<Record<string, string>>({})
    const [activeCategory, setActiveCategory] = useState('general')
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<Toast | null>(null)
    const [testingNotif, setTestingNotif] = useState<string | null>(null)
    const [slackImplantadores, setSlackImplantadores] = useState<SlackImplantador[]>([])

    const categories = useMemo(() => getOrderedCategories(configs), [configs])
    const pendingKeys = useMemo(
        () => Object.keys(editValues).filter((key) => editValues[key] !== initialValues[key]),
        [editValues, initialValues]
    )

    const activeItems = useMemo(() => {
        const needle = query.trim().toLowerCase()
        const items = configs[activeCategory] || []
        if (!needle) return items
        return items.filter((item) => `${item.key} ${item.description}`.toLowerCase().includes(needle))
    }, [activeCategory, configs, query])

    useEffect(() => { fetchConfig() }, [])

    useEffect(() => {
        if (activeCategory === 'notifications') {
            fetchSlackImplantadores()
        }
    }, [activeCategory])

    useEffect(() => {
        if (!categories.includes(activeCategory) && categories.length > 0) {
            setActiveCategory(categories[0])
        }
    }, [activeCategory, categories])

    const showToast = (text: string, type: Toast['type']) => {
        setToast({ text, type })
        window.setTimeout(() => setToast(null), 4000)
    }

    const fetchConfig = async () => {
        setLoading(true)
        try {
            const res = await api.get('/api/config')
            const data = res.data as ConfigData
            const flat: Record<string, string> = {}
            Object.values(data).forEach((items) => {
                items.forEach((item) => { flat[item.key] = item.value ?? '' })
            })
            setConfigs(data)
            setInitialValues(flat)
            setEditValues(flat)
        } catch {
            showToast('Erro ao carregar configuracoes.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const parseSlackMentions = (value: string) => {
        try {
            const parsed = JSON.parse(value || '{}')
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed as Record<string, string>
                : {}
        } catch {
            return {}
        }
    }

    const fetchSlackImplantadores = async () => {
        try {
            const res = await api.get('/api/config/slack-implantadores')
            setSlackImplantadores(res.data || [])
        } catch {
            setSlackImplantadores([])
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await api.post('/api/config', editValues)
            setInitialValues(editValues)
            showToast('Configuracoes salvas com sucesso.', 'success')
            await fetchConfig()
        } catch {
            showToast('Erro ao salvar configuracoes.', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDiscard = () => {
        setEditValues(initialValues)
        showToast('Alteracoes descartadas.', 'success')
    }

    const handleTestNotification = async (type: string) => {
        setTestingNotif(type)
        try {
            const endpoint = type === 'test' ? '/api/notifications/test'
                : type === 'sla' ? '/api/notifications/sla-alerts'
                    : type === 'summary' ? '/api/notifications/weekly-summary'
                        : type === 'docs' ? '/api/notifications/clickup-docs-reminder'
                            : '/api/notifications/goal-check'
            const res = await api.post(endpoint)
            if (res.data.ok && res.data.sent !== false) {
                showToast('Notificacao enviada com sucesso.', 'success')
            } else if (res.data.ok) {
                showToast(res.data.reason || 'Nenhum alerta para enviar agora.', 'success')
            } else {
                showToast(res.data.error || res.data.reason || 'Erro ao enviar notificacao.', 'error')
            }
        } catch {
            showToast('Erro ao enviar notificacao.', 'error')
        } finally {
            setTestingNotif(null)
        }
    }

    const updateValue = (key: string, value: string) => {
        setEditValues((prev) => ({ ...prev, [key]: value }))
    }

    const updateSlackMention = (name: string, slackId: string) => {
        const current = parseSlackMentions(editValues.slack_user_mentions)
        const next = { ...current }
        if (slackId.trim()) {
            next[name] = slackId.trim().replace(/^<@|>$/g, '')
        } else {
            delete next[name]
        }
        updateValue('slack_user_mentions', JSON.stringify(next, null, 2))
    }

    const copyWebhookUrl = async () => {
        const url = `${import.meta.env.VITE_API_URL || window.location.origin}/api/webhooks/zenvia`
        await navigator.clipboard.writeText(url)
        showToast('Endpoint do webhook copiado.', 'success')
    }

    const renderField = (item: ConfigItem) => {
        const value = editValues[item.key] ?? ''
        const dirty = value !== initialValues[item.key]

        if (isBoolean(item.key)) {
            return (
                <button
                    type="button"
                    aria-pressed={value === 'true'}
                    onClick={() => updateValue(item.key, value === 'true' ? 'false' : 'true')}
                    className={`relative h-7 w-12 rounded-full transition-colors ${value === 'true' ? 'bg-teal-600' : 'bg-slate-300'}`}
                >
                    <span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${value === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            )
        }

        const type = isSecret(item.key) ? 'password' : isUrl(item.key) ? 'url' : isEmail(item.key) ? 'email' : isNumber(item.key) ? 'number' : 'text'

        if (isLongText(item.key)) {
            const mapping = parseSlackMentions(value)
            return (
                <div className={`rounded-lg border ${dirty ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200 bg-white'}`}>
                    <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-3 border-b border-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-400">
                        <span>Implantador ativo</span>
                        <span>Slack ID</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                        {slackImplantadores.map((person) => (
                            <div key={person.name} className="grid grid-cols-[minmax(0,1fr)_180px] gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-700">{person.name}</p>
                                </div>
                                <input
                                    type="text"
                                    value={mapping[person.name] || person.slack_id || ''}
                                    placeholder="U012ABCDEF"
                                    onChange={(event) => updateSlackMention(person.name, event.target.value)}
                                    className="min-w-0 rounded-md border border-slate-200 px-2 py-1.5 font-mono text-xs text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                />
                            </div>
                        ))}
                        {slackImplantadores.length === 0 && (
                            <div className="px-3 py-4 text-sm text-slate-400">Nenhum implantador ativo encontrado.</div>
                        )}
                    </div>
                </div>
            )
        }

        return (
            <div className="flex gap-2">
                <input
                    type={type}
                    value={value}
                    onChange={(event) => updateValue(item.key, event.target.value)}
                    className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${dirty ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200 bg-white'}`}
                />
                {isSecret(item.key) && (
                    <button
                        type="button"
                        title="Gerar token"
                        onClick={() => updateValue(item.key, makeToken())}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-teal-300 hover:text-teal-700"
                    >
                        <KeyRound size={16} />
                    </button>
                )}
            </div>
        )
    }

    const activeMeta = CATEGORY_META[activeCategory] || CATEGORY_META.general

    return (
        <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
            <div className="mx-auto max-w-7xl space-y-5">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                            <Settings size={18} />
                            Configuracoes
                        </div>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight">Hub administrativo</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">
                            Parametros globais de operacao, seguranca, Sync, suporte e integracoes.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                            {pendingKeys.length} alteracao{pendingKeys.length === 1 ? '' : 'es'}
                        </span>
                        <button
                            type="button"
                            onClick={handleDiscard}
                            disabled={pendingKeys.length === 0 || saving}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RotateCcw size={16} />
                            Descartar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || pendingKeys.length === 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Salvar
                        </button>
                    </div>
                </div>

                {toast && (
                    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {toast.text}
                        <button type="button" onClick={() => setToast(null)} className="ml-auto"><X size={14} /></button>
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                    <aside className="space-y-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Buscar configuracao"
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                            />
                        </div>

                        <nav className="rounded-lg border border-slate-200 bg-white p-2">
                            {categories.map((category) => {
                                const meta = CATEGORY_META[category] || { label: category, desc: '', icon: <Settings size={18} />, tone: 'text-slate-700 bg-slate-100 border-slate-200' }
                                const count = configs[category]?.length || 0
                                return (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => setActiveCategory(category)}
                                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${activeCategory === category ? 'bg-slate-100 text-slate-950' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${meta.tone}`}>{meta.icon}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold">{meta.label}</span>
                                            <span className="block text-xs text-slate-400">{count} itens</span>
                                        </span>
                                    </button>
                                )
                            })}
                        </nav>
                    </aside>

                    <main className="space-y-5">
                        <section className="rounded-lg border border-slate-200 bg-white">
                            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-start md:justify-between">
                                <div className="flex gap-3">
                                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${activeMeta.tone}`}>{activeMeta.icon}</span>
                                    <div>
                                        <h2 className="text-lg font-bold">{activeMeta.label}</h2>
                                        <p className="text-sm text-slate-500">{activeMeta.desc}</p>
                                    </div>
                                </div>

                                {activeCategory === 'webhooks' && (
                                    <button
                                        type="button"
                                        onClick={copyWebhookUrl}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
                                    >
                                        <Copy size={16} />
                                        Copiar endpoint Zenvia
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div className="flex h-64 items-center justify-center text-slate-400">
                                    <Loader2 className="animate-spin" size={28} />
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {activeItems.map((item) => {
                                        const dirty = (editValues[item.key] ?? '') !== initialValues[item.key]
                                        return (
                                            <div key={item.key} className="grid gap-3 p-5 md:grid-cols-[minmax(220px,340px)_1fr] md:items-center">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-slate-800">{item.description || item.key}</p>
                                                        {dirty && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-700">editado</span>}
                                                    </div>
                                                    <p className="mt-1 break-all font-mono text-xs text-slate-400">{item.key}</p>
                                                </div>
                                                {renderField(item)}
                                            </div>
                                        )
                                    })}
                                    {activeItems.length === 0 && (
                                        <div className="p-10 text-center text-sm text-slate-400">Nenhuma configuracao encontrada.</div>
                                    )}
                                </div>
                            )}
                        </section>

                        {activeCategory === 'notifications' && (
                            <section className="rounded-lg border border-slate-200 bg-white p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <Send size={18} className="text-slate-400" />
                                    <h3 className="text-sm font-bold text-slate-800">Testes de notificacao</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { key: 'test', label: 'Teste' },
                                        { key: 'sla', label: 'Alertas SLA' },
                                        { key: 'summary', label: 'Resumo semanal' },
                                        { key: 'goals', label: 'Metas' },
                                        { key: 'docs', label: 'Docs ClickUp' },
                                    ].map((button) => (
                                        <button
                                            key={button.key}
                                            type="button"
                                            onClick={() => handleTestNotification(button.key)}
                                            disabled={testingNotif !== null}
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-50"
                                        >
                                            {testingNotif === button.key ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                            {button.label}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}
