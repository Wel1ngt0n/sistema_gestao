import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Settings, Target, Scale, Clock, Bell, Send, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

interface ConfigItem {
    key: string;
    value: string;
    description: string;
}

type ConfigData = Record<string, ConfigItem[]>;

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
    goals: { label: 'Metas Anuais', icon: <Target size={18} />, color: 'text-teal-500', desc: 'Defina as metas de MRR e lojas para o ano' },
    weights: { label: 'Pesos de Pontuação', icon: <Scale size={18} />, color: 'text-blue-500', desc: 'Configuração de pesos para cálculo de pontos' },
    sla: { label: 'Prazos (SLA)', icon: <Clock size={18} />, color: 'text-amber-500', desc: 'Prazos máximos para implantação e integração' },
    notifications: { label: 'Notificações', icon: <Bell size={18} />, color: 'text-rose-500', desc: 'Configuração de alertas automáticos via Slack' },
};

export default function SettingsPage() {
    const [configs, setConfigs] = useState<ConfigData>({});
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [testingNotif, setTestingNotif] = useState<string | null>(null);

    useEffect(() => { fetchConfig(); }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/config');
            setConfigs(res.data);
            const flat: Record<string, string> = {};
            Object.values(res.data).forEach((items: any) => {
                items.forEach((item: ConfigItem) => { flat[item.key] = item.value; });
            });
            setEditValues(flat);
        } catch { showMsg('Erro ao carregar configurações', 'error'); }
        finally { setLoading(false); }
    };

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 4000);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/api/config', editValues);
            showMsg('Configurações salvas com sucesso!', 'success');
            fetchConfig();
        } catch { showMsg('Erro ao salvar', 'error'); }
        finally { setSaving(false); }
    };

    const handleTestNotification = async (type: string) => {
        setTestingNotif(type);
        try {
            const endpoint = type === 'test' ? '/api/notifications/test'
                : type === 'sla' ? '/api/notifications/sla-alerts'
                    : type === 'summary' ? '/api/notifications/weekly-summary'
                        : '/api/notifications/goal-check';
            const res = await api.post(endpoint);
            if (res.data.ok) {
                showMsg('Notificação enviada com sucesso!', 'success');
            } else {
                showMsg(`${res.data.error || res.data.reason || 'Sem alertas para enviar'}`, 'error');
            }
        } catch { showMsg('Erro ao enviar notificação', 'error'); }
        finally { setTestingNotif(null); }
    };

    const updateValue = (key: string, value: string) => {
        setEditValues(prev => ({ ...prev, [key]: value }));
    };

    const isToggle = (key: string) => key.startsWith('notify_');
    const isUrl = (key: string) => key.includes('url');

    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center gap-3">
                        <Settings className="text-teal-500" size={28} />
                        Configurações do Sistema
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                        Gerencie metas, pesos, prazos e notificações do sistema.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-50 self-start"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
            </div>

            {/* Toast */}
            {msg && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                    }`}>
                    {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {msg.text}
                    <button onClick={() => setMsg(null)} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-teal-500" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                        const items = configs[cat] || [];
                        if (items.length === 0) return null;
                        return (
                            <div key={cat} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                {/* Category Header */}
                                <div className="px-6 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                    <h3 className={`text-base font-bold flex items-center gap-2 ${meta.color}`}>
                                        {meta.icon} {meta.label}
                                    </h3>
                                    <p className="text-xs text-zinc-500 mt-1">{meta.desc}</p>
                                </div>

                                {/* Config Items */}
                                <div className="p-6 space-y-4">
                                    {items.map(item => (
                                        <div key={item.key}>
                                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                                                {item.description || item.key}
                                            </label>
                                            {isToggle(item.key) ? (
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => updateValue(item.key, editValues[item.key] === 'true' ? 'false' : 'true')}
                                                        className={`relative w-12 h-6 rounded-full transition-colors ${editValues[item.key] === 'true' ? 'bg-teal-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                                    >
                                                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${editValues[item.key] === 'true' ? 'left-[26px]' : 'left-0.5'}`} />
                                                    </button>
                                                    <span className="text-xs text-zinc-500">
                                                        {editValues[item.key] === 'true' ? 'Ativo' : 'Desativado'}
                                                    </span>
                                                </div>
                                            ) : isUrl(item.key) ? (
                                                <input
                                                    type="url"
                                                    placeholder="https://hooks.slack.com/services/..."
                                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 font-mono text-zinc-800 dark:text-zinc-200 transition-all"
                                                    value={editValues[item.key] || ''}
                                                    onChange={e => updateValue(item.key, e.target.value)}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 font-mono text-zinc-800 dark:text-zinc-200 transition-all"
                                                    value={editValues[item.key] || ''}
                                                    onChange={e => updateValue(item.key, e.target.value)}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    {/* Notification Test Buttons */}
                                    {cat === 'notifications' && (
                                        <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800">
                                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Testar Notificações</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { key: 'test', label: 'Enviar Teste', icon: <Send size={13} /> },
                                                    { key: 'sla', label: 'Alertas SLA', icon: <AlertCircle size={13} /> },
                                                    { key: 'summary', label: 'Resumo Semanal', icon: <Bell size={13} /> },
                                                    { key: 'goals', label: 'Check Metas', icon: <Target size={13} /> },
                                                ].map(btn => (
                                                    <button
                                                        key={btn.key}
                                                        onClick={() => handleTestNotification(btn.key)}
                                                        disabled={testingNotif !== null}
                                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-teal-400 dark:hover:border-teal-600 hover:text-teal-600 dark:hover:text-teal-400 transition-all disabled:opacity-50"
                                                    >
                                                        {testingNotif === btn.key ? <Loader2 size={13} className="animate-spin" /> : btn.icon}
                                                        {btn.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
