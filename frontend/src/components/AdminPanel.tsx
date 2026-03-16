import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Settings, Target, Scale, Clock, Bell, Send, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ConfigItem {
    key: string;
    value: string;
    description: string;
}

type ConfigData = Record<string, ConfigItem[]>;

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    goals: { label: 'Metas Anuais', icon: <Target size={16} />, color: 'text-teal-500' },
    weights: { label: 'Pesos de Pontuação', icon: <Scale size={16} />, color: 'text-blue-500' },
    sla: { label: 'Prazos (SLA)', icon: <Clock size={16} />, color: 'text-amber-500' },
    notifications: { label: 'Notificações', icon: <Bell size={16} />, color: 'text-rose-500' },
};

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
    const [configs, setConfigs] = useState<ConfigData>({});
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [testingNotif, setTestingNotif] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) fetchConfig();
    }, [isOpen]);

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
            showMsg('Configurações salvas!', 'success');
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
            if (res.data.ok || res.data.sent !== false) {
                showMsg(`✅ ${type === 'test' ? 'Teste enviado' : 'Notificação enviada'}!`, 'success');
            } else {
                showMsg(`⚠️ ${res.data.error || res.data.reason || 'Sem alertas para enviar'}`, 'error');
            }
        } catch { showMsg('Erro ao enviar notificação', 'error'); }
        finally { setTestingNotif(null); }
    };

    const updateValue = (key: string, value: string) => {
        setEditValues(prev => ({ ...prev, [key]: value }));
    };

    const isToggle = (key: string) => key.startsWith('notify_');
    const isUrl = (key: string) => key.includes('url');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Settings className="text-teal-500" size={22} />
                        Configurações do Sistema
                    </h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-teal-500" size={28} />
                        </div>
                    ) : (
                        Object.entries(CATEGORY_META).map(([cat, meta]) => {
                            const items = configs[cat] || [];
                            if (items.length === 0) return null;
                            return (
                                <div key={cat} className="space-y-3">
                                    <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${meta.color}`}>
                                        {meta.icon} {meta.label}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {items.map(item => (
                                            <div key={item.key} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800">
                                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                                                    {item.description || item.key}
                                                </label>
                                                {isToggle(item.key) ? (
                                                    <button
                                                        onClick={() => updateValue(item.key, editValues[item.key] === 'true' ? 'false' : 'true')}
                                                        className={`relative w-12 h-6 rounded-full transition-colors ${editValues[item.key] === 'true' ? 'bg-teal-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                                    >
                                                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editValues[item.key] === 'true' ? 'left-6' : 'left-0.5'}`} />
                                                    </button>
                                                ) : isUrl(item.key) ? (
                                                    <input
                                                        type="url"
                                                        placeholder="https://hooks.slack.com/..."
                                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 font-mono text-zinc-800 dark:text-zinc-200"
                                                        value={editValues[item.key] || ''}
                                                        onChange={e => updateValue(item.key, e.target.value)}
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 font-mono text-zinc-800 dark:text-zinc-200"
                                                        value={editValues[item.key] || ''}
                                                        onChange={e => updateValue(item.key, e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Notification Test Buttons */}
                                    {cat === 'notifications' && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {[
                                                { key: 'test', label: 'Teste', icon: <Send size={12} /> },
                                                { key: 'sla', label: 'SLA Alerts', icon: <AlertCircle size={12} /> },
                                                { key: 'summary', label: 'Resumo Semanal', icon: <Bell size={12} /> },
                                                { key: 'goals', label: 'Check Metas', icon: <Target size={12} /> },
                                            ].map(btn => (
                                                <button
                                                    key={btn.key}
                                                    onClick={() => handleTestNotification(btn.key)}
                                                    disabled={testingNotif !== null}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-teal-400 dark:hover:border-teal-600 transition-colors disabled:opacity-50"
                                                >
                                                    {testingNotif === btn.key ? <Loader2 size={12} className="animate-spin" /> : btn.icon}
                                                    {btn.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    {msg && (
                        <div className={`flex items-center gap-2 text-sm font-medium ${msg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {msg.text}
                        </div>
                    )}
                    <div className="ml-auto">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
