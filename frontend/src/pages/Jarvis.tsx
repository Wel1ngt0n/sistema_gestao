import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Database, 
  Brain, 
  Activity,
  MessageSquare, 
  Terminal,
  Plus,
  Trash2,
  X,
  Menu,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

import ReactMarkdown from 'react-markdown';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
    // Tenta recuperar a última sessão ativa do localStorage
    const savedSessionId = localStorage.getItem('jarvis_active_session_id');
    if (savedSessionId && savedSessionId !== 'null') {
      loadSession(parseInt(savedSessionId));
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/jarvis/sessions');
      if (Array.isArray(res.data)) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const loadSession = async (sessionId: number) => {
    setLoading(true);
    setActiveSessionId(sessionId);
    localStorage.setItem('jarvis_active_session_id', sessionId.toString());
    setShowHistory(false);
    try {
      const res = await api.get(`/api/jarvis/history/${sessionId}`);
      if (Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Error loading history:', err);
      // Se der erro 404, a sessão pode ter sido excluída
      localStorage.removeItem('jarvis_active_session_id');
      setActiveSessionId(null);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    localStorage.removeItem('jarvis_active_session_id');
    setShowHistory(false);
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta conversa permanentemente?')) return;
    try {
      await api.delete(`/api/jarvis/session/${id}`);
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
      const response = await api.post('/api/jarvis/chat', {
        messages: newMessages,
        session_id: activeSessionId
      }, { 
        withCredentials: true 
      });

      if (response.data && response.data.response) {
        setMessages([...newMessages, { role: 'assistant', content: response.data.response }]);
        if (!activeSessionId) {
          const newId = response.data.session_id;
          setActiveSessionId(newId);
          localStorage.setItem('jarvis_active_session_id', newId.toString());
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
    { label: 'Ranking de performance do mês', Icon: Activity },
    { label: 'Lojas críticas em SLA', Icon: Database },
    { label: 'Resumo de NPS do suporte', Icon: MessageSquare },
    { label: 'Ociosidade por implantador', Icon: Brain }
  ];

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm relative">
      
      {/* Painel lateral do histórico */}
      <div className={`
        absolute inset-y-0 left-0 z-40 w-64 bg-zinc-50 border-r border-zinc-200 transform transition-transform duration-300 ease-in-out
        ${showHistory ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 ${!showHistory ? 'md:hidden' : ''}
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

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {(sessions || []).map((s) => (
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

      {/* Área principal da conversa */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Cabeçalho */}
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
                <Sparkles size={18} />
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

        {/* Mensagens */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
        >
          {(!messages || messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-500 mb-2 ring-4 ring-orange-50/50">
                <Bot size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">Como posso te ajudar, Comandante?</h3>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-md">
                  Estou pronto para analisar dados de implantação, performance do time e métricas de suporte.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-4">
                {quickPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(q.label)}
                    className="flex flex-col items-start gap-2 p-3 bg-zinc-50 hover:bg-white border border-zinc-100 hover:border-orange-200 rounded-xl text-left transition-all hover:shadow-md group"
                  >
                    <q.Icon size={16} className="text-zinc-400 group-hover:text-orange-500 transition-colors" />
                    <span className="text-[11px] font-bold text-zinc-600 group-hover:text-zinc-900">{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    msg.role === 'user' ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-orange-50 border-orange-100 text-orange-600'
                  }`}>
                    {msg.role === 'user' ? <Terminal size={14} /> : <Sparkles size={14} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-zinc-900 text-white shadow-lg' 
                      : 'bg-white border border-zinc-100 text-zinc-700 shadow-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap font-medium">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="markdown-content text-zinc-700 leading-relaxed space-y-2">
                        <ReactMarkdown 
                          components={{
                            p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="text-sm">{children}</li>,
                            strong: ({children}) => <strong className="font-bold text-zinc-900">{children}</strong>,
                            code: ({children}) => <code className="bg-zinc-100 px-1 rounded text-xs font-mono">{children}</code>,
                            h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                            h2: ({children}) => <h2 className="text-base font-bold mb-1">{children}</h2>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="animate-spin" />
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

        {/* Área de entrada */}
        <div className="p-6 bg-white border-t border-zinc-100">
          <div className="max-w-3xl mx-auto relative flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte ao Jarvis..."
                className="w-full pl-4 pr-12 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-3.5 bg-orange-500 text-white rounded-2xl shadow-lg hover:bg-orange-600 disabled:opacity-30 transition-all shrink-0"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-center text-[10px] text-zinc-400 mt-4 font-bold uppercase tracking-widest opacity-50">
            Jarvis Operational Intelligence
          </p>
        </div>
      </div>
    </div>
  );
};

export default Jarvis;
