import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface OrphanContact {
  id: number;
  name: string;
  phone: string;
}


export const SupportDashboard = () => {
  const [kpis, setKpis] = useState({
    open_conversations: 0,
    messages_in: 0,
    messages_out: 0,
    avg_response_time: '0m',
    last_sync: 'Nunca'
  });

  const [events, setEvents] = useState<any[]>([]);
  const [orphans, setOrphans] = useState<OrphanContact[]>([]);
  const [loading, setLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    try {
      const [kpiRes, orphanRes, eventRes] = await Promise.all([
        api.get('/api/support/kpis').catch(() => ({ data: {} })),
        api.get('/api/support/orphans').catch(() => ({ data: [] })),
        api.get('/api/webhooks/events').catch(() => ({ data: [] }))
      ]);

      const kpiData = kpiRes.data || {};
      const orphanData = Array.isArray(orphanRes.data) ? orphanRes.data : [];
      const eventData = Array.isArray(eventRes.data) ? eventRes.data : [];

      setKpis(prev => ({ ...prev, ...kpiData }));
      setOrphans(orphanData);
      setEvents(eventData);
    } catch (error) {
      console.error("Erro ao carregar dados do suporte:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/api/support/sync');
      if (response.status === 200) {
        await fetchData();
      } else {
        alert("Erro ao sincronizar dados.");
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000); // Atualiza a cada 10 minutos
    return () => clearInterval(interval);
  }, []);

  const handleLinkStore = async (contactId: number, currentName: string) => {
    const storeName = window.prompt(`Vincular o contato "${currentName}" a qual loja?`);
    
    if (storeName && storeName.trim()) {
      try {
        const response = await api.post('/api/support/link-store', {
          contact_id: contactId,
          store_name: storeName.trim()
        });

        if (response.status === 200) {
          // Remove o contato da lista localmente para feedback instantâneo
          setOrphans(prev => prev.filter(c => c.id !== contactId));
          // Atualiza KPIs para refletir a mudança se necessário
          fetchData();
        } else {
          alert("Erro ao vincular loja. Tente novamente.");
        }
      } catch (error) {
        console.error("Erro na vinculação:", error);
      }
    }
  };

  if (loading && orphans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 text-teal-600">
        <div className="w-12 h-12 border-4 border-teal-600/20 border-t-teal-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold tracking-widest animate-pulse uppercase">Conectando ao sistema de suporte...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-zinc-50 min-h-screen text-zinc-900">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
            Zenvia Live Support
          </h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Monitoramento de conversas e vinculação de contatos</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${
              syncing 
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
            }`}
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {syncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR AGORA'}
          </button>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm">
            <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
            <span className="text-[10px] text-zinc-600 font-bold tracking-wider uppercase">Último Sync: {kpis.last_sync}</span>
          </div>
        </div>
      </div>
      
      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Conversas Ativas', value: kpis.open_conversations, color: 'text-teal-600', border: 'border-teal-200', bg: 'bg-teal-50/50' },
          { label: 'Mensagens Recebidas', value: kpis.messages_in, color: 'text-zinc-900', border: 'border-zinc-200', bg: 'bg-white' },
          { label: 'Respostas Enviadas', value: kpis.messages_out, color: 'text-zinc-500', border: 'border-zinc-200', bg: 'bg-white' },
          { label: 'Tempo de Resposta', value: kpis.avg_response_time, color: 'text-orange-600', border: 'border-orange-200', bg: 'bg-orange-50/50' },
        ].map((kpi, i) => (
          <div key={i} className={`p-5 rounded-2xl shadow-sm border ${kpi.border} ${kpi.bg}`}>
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{kpi.label}</h3>
            <p className={`text-4xl font-black mt-2 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-800">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          Contatos Pendentes (Aguardando Vinculação de Loja)
        </h2>
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-zinc-100">
            {orphans.length === 0 ? (
              <div className="col-span-full p-12 text-center text-zinc-400 text-sm italic">Nenhum contato órfão no momento. Tudo organizado! ✨</div>
            ) : (
              orphans.map(contact => (
                <div key={contact.id} className="p-6 hover:bg-zinc-50 transition-colors group flex justify-between items-center">
                  <div>
                    <p className="font-bold text-base text-zinc-800">{contact.name}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">{contact.phone}</p>
                  </div>
                  <button 
                    onClick={() => handleLinkStore(contact.id, contact.name)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-bold px-4 py-2 rounded-xl shadow-sm transition-transform group-hover:scale-105"
                  >
                    VINCULAR LOJA
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Recent Webhook Events */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Monitor de Webhooks em Tempo Real
          </h2>
          <span className="text-[10px] text-zinc-400 font-medium italic">Últimos 20 eventos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">ID</th>
                <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipo do Evento</th>
                <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Recebido em</th>
                <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {events.length > 0 ? (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-zinc-400">#{e.id}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-bold uppercase tracking-tight">
                        {e.payload_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500 font-medium">{e.received_at}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-400 italic">
                    Nenhum webhook recebido ainda. Aguardando eventos da Zenvia...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupportDashboard;
// Final de arquivo limpo
