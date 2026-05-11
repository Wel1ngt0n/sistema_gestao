import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Database, 
  Brain, 
  Activity, 
  MessageSquare, 
  Terminal,
  ChevronRight,
  RefreshCw,
  Cpu,
  Plus,
  History,
  Trash2,
  MoreVertical,
  X,
  Menu,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
}

const Jarvis: React.FC = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Welcome message with rich formatting
  const welcomeMessage = `
Olá! Eu sou o **Jarvis 5.4 mini**, sua inteligência operacional. 🚀

Estou conectado diretamente ao banco de dados e pronto para extrair insights estratégicos para você. 

**Como posso ajudar hoje?**
*   📊 *Analisar o ranking de performance dos analistas*
*   ⚠️ *Identificar lojas com SLA de implantação crítico*
*   💡 *Gerar um resumo do NPS e suporte da semana*
*   📉 *Verificar o churn risk da rede*
  `;

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/api/jarvis/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSessions(res.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const loadSession = async (sessionId: number) => {
    setLoading(true);
    setActiveSessionId(sessionId);
    setShowHistory(false);
    try {
      const res = await axios.get(`/api/jarvis/history/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setShowHistory(false);
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta conversa permanentemente?')) return;
    try {
      await axios.delete(`/api/jarvis/session/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchSessions();
      if (activeSessionId === id) createNewChat();
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('/api/jarvis/chat', {
        messages: newMessages,
        session_id: activeSessionId
      }, { 
        headers: { 'Authorization': `Bearer ${token}` },
        withCredentials: true 
      });

      if (response.data && response.data.response) {
        setMessages([...newMessages, { role: 'assistant', content: response.data.response }]);
        if (!activeSessionId) {
          setActiveSessionId(response.data.session_id);
          fetchSessions();
        }
      }
    } catch (error) {
      console.error('Error talking to Jarvis:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Desculpe, tive um problema ao processar sua solicitação. Verifique sua conexão ou tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'Ranking de performance do mês', icon: Activity },
    { label: 'Lojas críticas em SLA', icon: Database },
    { label: 'Resumo de NPS do suporte', icon: MessageSquare },
    { label: 'Ociosidade por implantador', icon: Brain }
  ];

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm relative">
      
      {/* Sidebar History (Discreet Drawer) */}
      <div className={`
        absolute inset-y-0 left-0 z-40 w-64 bg-zinc-50 border-r border-zinc-200 transform transition-transform duration-300 ease-in-out
        ${showHistory ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 ${!showHistory && 'md:hidden'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Histórico</h3>
            <button onClick={() => setShowHistory(false)} className="md:hidden text-zinc-400"><X size={18} /></button>
          </div>
          
          <div className="p-3">
            <button 
              onClick={createNewChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-all shadow-sm"
            >
              <Plus size={16} className="text-orange-500" />
              Nova Conversa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
            {sessions.map((s) => (
              <div 
                key={s.id}
                onClick={() => loadSession(s.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                  activeSessionId === s.id ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-100' : 'hover:bg-zinc-100 text-zinc-600'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare size={14} className={activeSessionId === s.id ? 'text-orange-500' : 'text-zinc-400'} />
                  <span className="text-xs font-medium truncate">{s.title || 'Conversa sem título'}</span>
                </div>
                <button 
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Header */}
        <div className="bg-white border-b border-zinc-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-[#ff7900] to-orange-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-100">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 leading-none">Jarvis 5.4 <span className="text-[10px] text-orange-500 font-black">mini</span></h2>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">AI Operational Copilot</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-emerald-50 rounded-full flex items-center gap-1.5 border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Active</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth no-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6 animate-in fade-in duration-700">
              <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-500 mb-2 ring-4 ring-orange-50/50">
                <Bot size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">Como posso te ajudar, Comandante?</h3>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-md">
                  Estou pronto para analisar dados de implantação, performance do time e métricas de suporte em tempo real.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-4">
                {quickPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(q.label)}
                    className="flex flex-col items-start gap-2 p-3 bg-zinc-50 hover:bg-white border border-zinc-100 hover:border-orange-200 rounded-xl text-left transition-all hover:shadow-md group"
                  >
                    <q.icon size={16} className="text-zinc-400 group-hover:text-orange-500 transition-colors" />
                    <span className="text-[11px] font-bold text-zinc-600 group-hover:text-zinc-900">{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    msg.role === 'user' ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-orange-50 border-orange-100 text-orange-600'
                  }`}>
                    {msg.role === 'user' ? <Terminal size={14} /> : <Sparkles size={14} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' 
                      : 'bg-white border border-zinc-100 text-zinc-700 shadow-sm'
                  }`}>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap font-medium">
                      {msg.content}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="animate-spin duration-[3s]" />
                </div>
                <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-zinc-100">
          <div className="max-w-3xl mx-auto relative flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte ao Jarvis sobre a operação..."
                className="w-full pl-4 pr-12 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7900]/10 focus:border-[#ff7900] transition-all placeholder:text-zinc-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-[10px] font-bold text-zinc-300 bg-zinc-100 px-1.5 py-0.5 rounded">Enter</span>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-3.5 bg-[#ff7900] text-white rounded-2xl shadow-lg shadow-orange-100 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all shrink-0"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-center text-[10px] text-zinc-400 mt-4 font-bold uppercase tracking-widest opacity-50">
            Powered by GPT-4o-mini & Database Real-time Sync
          </p>
        </div>
      </div>
    </div>
  );
};

export default Jarvis;
