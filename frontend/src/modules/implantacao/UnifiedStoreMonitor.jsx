import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RefreshCcw, Download } from 'lucide-react';
import StoreDetailsModal from './StoreDetailsModal';
import MonitorTable from './MonitorTable';

const UnifiedStoreMonitor = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [syncing, setSyncing] = useState(false);

    // Modal State
    const [selectedStore, setSelectedStore] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/implantacao/list');
            setStores(res.data);
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/implantacao/sync');
            await fetchData();
            alert("Sincronização com ClickUp concluída!");
        } catch (error) {
            alert("Erro na sincronização.");
        } finally {
            setSyncing(false);
        }
    };

    const handleOpenModal = (store) => {
        setSelectedStore(store);
        setIsModalOpen(true);
    };

    const handleSaveStore = async (updatedStore) => {
        try {
            await api.put(`/implantacao/projects/${updatedStore.id}`, updatedStore);
            alert('Loja atualizada com sucesso!');
            fetchData(); // Refresh list to show changes
        } catch (error) {
            console.error("Erro ao salvar:", error);
            throw error;
        }
    };

    // Filter Logic
    const filteredStores = stores.filter(store => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = store.name?.toLowerCase().includes(term) ||
            store.implantador?.toLowerCase().includes(term) ||
            store.rede?.toLowerCase().includes(term);

        const matchesStatus = statusFilter ? store.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col h-full space-y-4">
            <StoreDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                store={selectedStore}
                onSave={handleSaveStore}
            />

            {/* Toolbar Principal */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex gap-2 w-full md:w-auto relative group">
                    <div className="relative flex-1 md:w-80">
                        <input
                            type="text"
                            placeholder="Buscar loja (Nome, Rede, Implantador)..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-3 top-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors">🔍</span>
                    </div>

                    <select
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer hover:bg-white transition-colors"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Status: Todos</option>
                        <option value="IN_PROGRESS">Em Andamento</option>
                        <option value="DONE">Concluído</option>
                        <option value="BLOCKED">Bloqueado</option>
                    </select>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                        title="Atualizar Lista"
                    >
                        <RefreshCcw size={18} />
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm hover:shadow active:scale-95 transition-all text-sm font-medium ${syncing ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        <Download size={16} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar ClickUp'}
                    </button>
                </div>
            </div>

            {/* Tabela Dinâmica Moderna */}
            <div className="flex-1 min-h-0">
                <MonitorTable
                    data={filteredStores}
                    loading={loading}
                    onEdit={handleOpenModal}
                />
            </div>
        </div>
    );
};

export default UnifiedStoreMonitor;
