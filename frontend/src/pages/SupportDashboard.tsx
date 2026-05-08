import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { api } from '../services/api';

interface OrphanContact {
  id: number;
  name: string;
  phone: string;
}

interface AgentPerf {
  agent_name: string;
  total_contacts: number;
  total_conversations: number;
  closed_conversations: number;
  total_messages_sent: number;
  avg_response_time_seconds: number;
  avg_close_time_seconds: number;
  avg_nps: number | null;
  nps_count: number;
  pending_tickets: number;
  open_tickets: number;
}

const formatTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};


export const SupportDashboard = () => {
  const [kpis, setKpis] = useState({
    open_conversations: 0,
    messages_in: 0,
    messages_out: 0,
    avg_response_time: '0m',
    last_sync: 'Nunca'
  });

  const [events, setEvents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [orphans, setOrphans] = useState<OrphanContact[]>([]);
  const [loading, setLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [agents, setAgents] = useState<AgentPerf[]>([]);
  const [npsFeedbacks, setNpsFeedbacks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance'>('overview');
  
  // Estados para Filtro de Período
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([currentMonth]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonth);
  const [importPeriod, setImportPeriod] = useState<string>(currentMonth);

  const fetchPeriods = async () => {
    try {
      const response = await api.get('/api/support/periods');
      if (response.data && response.data.length > 0) {
        setAvailablePeriods(response.data);
        // Se o período selecionado não estiver na lista, pega o mais recente
        if (!response.data.includes(selectedPeriod)) {
          setSelectedPeriod(response.data[0]);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar períodos:", error);
    }
  };

  const fetchData = async () => {
    try {
      const [kpiRes, orphanRes, eventRes, msgRes, agentRes, npsRes] = await Promise.all([
        api.get(`/api/support/kpis?period=${selectedPeriod}`).catch(() => ({ data: {} })),
        api.get('/api/support/orphans').catch(() => ({ data: [] })),
        api.get('/api/webhooks/events').catch(() => ({ data: [] })),
        api.get('/api/support/messages').catch(() => ({ data: [] })),
        api.get(`/api/support/agent-performance?period=${selectedPeriod}`).catch(() => ({ data: [] })),
        api.get('/api/support/nps-feedbacks').catch(() => ({ data: [] }))
      ]);

      const kpiData = kpiRes.data || {};
      const orphanData = Array.isArray(orphanRes.data) ? orphanRes.data : [];
      const eventData = Array.isArray(eventRes.data) ? eventRes.data : [];
      const msgData = Array.isArray(msgRes.data) ? msgRes.data : [];

      const agentData = Array.isArray(agentRes.data) ? agentRes.data : [];
      const npsData = Array.isArray(npsRes.data) ? npsRes.data : [];

      setKpis(prev => ({ ...prev, ...kpiData }));
      setOrphans(orphanData);
      setEvents(eventData);
      setMessages(msgData);
      setAgents(agentData);
      setNpsFeedbacks(npsData);
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

  const [selectedFiles, setSelectedFiles] = useState<{file: File, type: string}[]>([]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).map(f => {
      // Pré-detecção por nome para ajudar o usuário
      let type = 'ignore';
      if (f.name.includes('Conversas') || f.name.includes('clientes') || f.name.includes('qualidade')) type = 'conversas';
      else if (f.name.includes('activities') || f.name.includes('Intera')) type = 'activities';
      else if (f.name.includes('Performance')) type = 'performance';
      else if (f.name.includes('Agentes')) type = 'agents';
      
      return { file: f, type };
    });

    setSelectedFiles([...selectedFiles, ...newFiles]);
    if (event.target) event.target.value = '';
  };

  const updateFileType = (index: number, type: string) => {
    const updated = [...selectedFiles];
    updated[index].type = type;
    setSelectedFiles(updated);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleImportCSV = async () => {
    if (selectedFiles.length === 0) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('period', importPeriod);
      
      selectedFiles.forEach(sf => {
        if (sf.type !== 'ignore') {
          formData.append(sf.type, sf.file);
        }
      });

      console.log("Enviando FormData com as chaves:", Array.from(formData.keys()));
      
      const response = await api.post('/api/support/import-csv', formData, {
        headers: {
          'Content-Type': undefined // Força o axios a não usar o padrão application/json da instância
        }
      });

      if (response.status === 200) {
        alert("Importação concluída com sucesso!");
        console.log("Import Results:", response.data.results);
        setSelectedFiles([]);
        fetchData();
      } else {
        alert("Erro na importação: " + (response.data.message || "Erro desconhecido"));
      }
    } catch (error: any) {
      console.error("Erro na importação:", error);
      alert("Erro ao importar arquivos: " + (error.response?.data?.message || error.message));
    } finally {
      setImporting(false);
    }
  };

  const triggerFileInput = () => {
    document.getElementById('support-file-input')?.click();
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000); 
    return () => clearInterval(interval);
  }, [selectedPeriod]);

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 text-[#128131]">
        <div className="w-12 h-12 border-4 border-[#128131]/20 border-t-[#128131] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold tracking-widest animate-pulse uppercase">Conectando ao sistema de suporte Instabuy...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-zinc-50 min-h-screen text-zinc-900">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[#128131]">
            Zenvia Live Support
          </h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium italic">Powered by Instabuy Intelligence</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black shadow-sm transition-all ${
              syncing 
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
              : 'bg-[#128131] text-white hover:bg-[#0f6b29] shadow-lg shadow-green-100'
            }`}
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {syncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR AGORA'}
          </button>
          <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-xl shadow-sm border border-orange-100">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Importar para:</span>
            <input 
              type="month" 
              value={importPeriod}
              onChange={(e) => setImportPeriod(e.target.value)}
              className="bg-transparent border-none text-orange-600 font-bold focus:ring-0 cursor-pointer outline-none text-sm"
            />
          </div>

          <button 
            onClick={triggerFileInput}
            disabled={importing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black shadow-sm transition-all ${
              importing 
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
              : 'bg-[#ff7900] text-white hover:bg-[#e66d00] shadow-lg shadow-orange-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            SELECIONAR EXCEL
          </button>
          
          <input 
            type="file" 
            id="support-file-input" 
            multiple 
            accept=".csv" 
            onChange={handleFileSelection} 
            className="hidden" 
          />
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm">
            <span className="w-2 h-2 bg-[#128131] rounded-full"></span>
            <span className="text-[10px] text-zinc-600 font-bold tracking-wider uppercase">Último Sync: {kpis.last_sync}</span>
          </div>
        </div>
      </div>

      {/* Gerenciador de Arquivos Selecionados */}
      {selectedFiles.length > 0 && (
        <div className="mb-8 bg-zinc-50 border border-zinc-200 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
              📂 Arquivos para Processar ({selectedFiles.length})
            </h3>
            <button 
              onClick={handleImportCSV}
              disabled={importing}
              className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${
                importing 
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                : 'bg-[#128131] text-white hover:bg-[#0f6b29] shadow-lg shadow-green-100'
              }`}
            >
              {importing ? 'PROCESSANDO...' : 'INICIAR IMPORTAÇÃO'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedFiles.map((sf, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-800 truncate">{sf.file.name}</p>
                  <p className="text-[10px] text-zinc-400">{(sf.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={sf.type}
                    onChange={(e) => updateFileType(idx, e.target.value)}
                    className="text-[10px] font-bold bg-zinc-50 border-zinc-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="ignore">Ignorar</option>
                    <option value="conversas">Conversas (NPS/Cadastro)</option>
                    <option value="activities">Atividades (Histórico)</option>
                    <option value="performance">Performance (KPIs)</option>
                    <option value="agents">Agentes (Status)</option>
                  </select>
                  <button 
                    onClick={() => removeFile(idx)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-zinc-200 pb-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 text-sm font-black rounded-t-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-white border border-b-0 border-zinc-200 text-[#ff7900] -mb-px'
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          📊 Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-5 py-2.5 text-sm font-black rounded-t-xl transition-all ${
            activeTab === 'performance'
              ? 'bg-white border border-b-0 border-zinc-200 text-[#ff7900] -mb-px'
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          🏆 Performance da Equipe
        </button>
      </div>
      
      {/* Período / Filtro Global */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 backdrop-blur-sm p-4 rounded-3xl border border-zinc-200/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Mês de Referência</h3>
            <p className="text-xs text-zinc-500">Filtrando métricas e performance por período</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-zinc-200 shadow-inner">
          {availablePeriods.length > 0 ? (
            availablePeriods.map(p => {
              const [year, month] = p.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1);
              const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
              const isSelected = selectedPeriod === p;
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    isSelected 
                      ? 'bg-[#ff7900] text-white shadow-md scale-105' 
                      : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {label} {year.slice(2)}
                </button>
              );
            })
          ) : (
            <div className="px-6 py-2 text-xs text-zinc-400 italic">Carregando períodos...</div>
          )}
        </div>
      </div>

      {activeTab === 'overview' && (
      <>
      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Conversas Ativas', value: kpis.open_conversations, color: 'text-[#128131]', border: 'border-green-100', bg: 'bg-green-50/30' },
          { label: 'Mensagens Recebidas', value: kpis.messages_in, color: 'text-zinc-900', border: 'border-zinc-200', bg: 'bg-white' },
          { label: 'Respostas Enviadas', value: kpis.messages_out, color: 'text-zinc-500', border: 'border-zinc-200', bg: 'bg-white' },
          { label: 'Tempo de Resposta', value: kpis.avg_response_time, color: 'text-[#ff7900]', border: 'border-orange-100', bg: 'bg-orange-50/30' },
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
                    className="bg-[#ff7900] hover:bg-[#e66d00] text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-sm transition-transform group-hover:scale-105"
                  >
                    VINCULAR LOJA
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Recent Messages Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
            </svg>
            Últimas Mensagens (Zenvia)
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {messages.length > 0 ? (
              messages.map((m) => (
                <div key={m.id} className={`flex flex-col p-4 rounded-xl border ${m.direction === 'IN' ? 'bg-zinc-50 border-zinc-100' : 'bg-blue-50/30 border-blue-100 self-end'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-zinc-900">{m.contact_name}</span>
                    <span className="text-[10px] text-zinc-400">{new Date(m.timestamp).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-sm text-zinc-700 leading-relaxed">{m.text}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${m.direction === 'IN' ? 'text-[#128131]' : 'text-blue-600'}`}>
                      {m.direction === 'IN' ? '← Recebida' : '→ Enviada'}
                    </span>
                    <span className="text-[10px] text-zinc-400">•</span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">{m.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-zinc-400 italic bg-zinc-50 rounded-2xl">
                Nenhuma mensagem processada ainda.
              </div>
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
      </>
      )}

      {activeTab === 'performance' && (
      <>
        {/* Agent Ranking */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-2">
              🏆 Ranking de Atendentes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50">
                  <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Atendente</th>
                  <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">NPS</th>
                  <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Contatos</th>
                  <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Conversas</th>
                  <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Fechadas</th>
                  <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Msgs Enviadas</th>
                  <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">T. Resposta</th>
                  <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">T. Fechamento</th>
                  <th className="px-4 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Pendentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {agents.length > 0 ? (
                  agents.map((a, i) => (
                    <tr key={a.agent_name} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                            i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-50 text-zinc-400'
                          }`}>
                            {i + 1}º
                          </span>
                          <span className="font-bold text-sm text-zinc-800">{a.agent_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {a.avg_nps !== null ? (
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                            a.avg_nps >= 9 ? 'bg-emerald-50 text-emerald-700' :
                            a.avg_nps >= 7 ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {a.avg_nps.toFixed(1)} ({a.nps_count})
                          </span>
                        ) : (
                          <span className="text-zinc-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-zinc-700">{a.total_contacts}</td>
                      <td className="px-4 py-4 text-center text-sm text-zinc-500">{a.total_conversations}</td>
                      <td className="px-4 py-4 text-center text-sm text-zinc-500">{a.closed_conversations}</td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-blue-600">{a.total_messages_sent}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold text-teal-600">{formatTime(a.avg_response_time_seconds)}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold text-zinc-500">{formatTime(a.avg_close_time_seconds)}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          a.pending_tickets > 3 ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-500'
                        }`}>
                          {a.pending_tickets}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-zinc-400 italic">
                      Nenhum dado de performance ainda. Importe os CSVs primeiro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* NPS Feedbacks */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
            <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-2">
              💬 Feedbacks de NPS Recentes
            </h2>
          </div>
          <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
            {npsFeedbacks.length > 0 ? (
              npsFeedbacks.map((f: any) => (
                <div key={f.id} className="flex items-start gap-4 p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    f.nps_score >= 9 ? 'bg-emerald-100 text-emerald-700' :
                    f.nps_score >= 7 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {f.nps_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-zinc-800">{f.contact_name}</span>
                      <span className="text-[10px] text-zinc-400">→</span>
                      <span className="text-[10px] font-bold text-teal-600 uppercase">{f.agent_name || 'N/A'}</span>
                    </div>
                    {f.nps_comment && (
                      <p className="text-xs text-zinc-500 leading-relaxed truncate">{f.nps_comment}</p>
                    )}
                    <span className="text-[10px] text-zinc-300">{f.date ? new Date(f.date).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-zinc-400 italic">
                Nenhum feedback de NPS encontrado.
              </div>
            )}
          </div>
        </div>
      </>
      )}
    </div>
  );
};

export default SupportDashboard;
