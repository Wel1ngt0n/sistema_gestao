import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { RefreshCw, CheckCircle, Clock } from 'lucide-react';

export default function IntegrationDashboard() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.integracao.list();
            setItems(data);
        } catch (e) {
            console.error("Failed to load", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.integracao.sync();
            await loadData();
        } catch (e) {
            alert("Erro ao sincronizar");
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const StatusBadge = ({ status }) => {
        const colors = {
            'OPEN': 'bg-gray-100 text-gray-800',
            'IN PROGRESS': 'bg-blue-100 text-blue-800',
            'DONE': 'bg-green-100 text-green-800',
            'CLOSED': 'bg-green-100 text-green-800',
            'CONTATO/COMUNICACAO': 'bg-yellow-100 text-yellow-800'
        };
        const color = colors[status] || 'bg-gray-100 text-gray-800';
        return <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>{status}</span>;
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">🧩 Módulo Integração</h1>
                    <p className="text-slate-500">Gestão de Sincronização e Status de Integração</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                    <RefreshCw className={syncing ? "animate-spin" : ""} size={18} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar ClickUp'}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 font-semibold text-slate-600">ID</th>
                            <th className="p-4 font-semibold text-slate-600">Projeto / Loja</th>
                            <th className="p-4 font-semibold text-slate-600">Responsável</th>
                            <th className="p-4 font-semibold text-slate-600">Status</th>
                            <th className="p-4 font-semibold text-slate-600">Link</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-500">Carregando...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-500">Nenhuma integração encontrada. Clique em Sincronizar.</td></tr>
                        ) : (
                            items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-slate-400 text-sm">#{item.id}</td>
                                    <td className="p-4 font-medium text-slate-900">{item.project_name}</td>
                                    <td className="p-4 text-slate-600 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {item.assignee ? item.assignee[0].toUpperCase() : '?'}
                                        </div>
                                        {item.assignee || 'N/A'}
                                    </td>
                                    <td className="p-4"><StatusBadge status={item.status} /></td>
                                    <td className="p-4">
                                        <a href={item.clickup_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">
                                            Abrir ClickUp
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
