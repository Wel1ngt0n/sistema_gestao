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
  Cpu
} from 'lucide-react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const Jarvis: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Eu sou o **Jarvis 5.4 mini**. Estou conectado ao banco de dados e pronto para te ajudar com análises, consultas e gestão do time. O que deseja saber hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('/api/jarvis/chat', {
        messages: newMessages
      }, { withCredentials: true });

      if (response.data && response.data.response) {
        setMessages([...newMessages, { role: 'assistant', content: response.data.response }]);
      }
    } catch (error) {
      console.error('Error talking to Jarvis:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Desculpe, tive um problema ao processar sua solicitação. Verifique se o servidor está online.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'Quem é o melhor analista este mês?', icon: Activity },
    { label: 'Quais lojas estão com SLA crítico?', icon: Database },
    { label: 'Resumo financeiro de implantação', icon: Brain },
    { label: 'Como está o NPS do suporte?', icon: MessageSquare }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-zinc-50/50 rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ff7900] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Cpu size={22} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Jarvis 5.4 <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded ml-1">mini</span></h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Online • Database Synced</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-zinc-200 text-zinc-600' : 'bg-orange-100 text-orange-600'
              }`}>
                {msg.role === 'user' ? <Terminal size={14} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-[#ff7900] text-white shadow-md shadow-orange-100' 
                  : 'bg-white border border-zinc-100 text-zinc-700 shadow-sm'
              }`}>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Bot size={16} />
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

      {/* Quick Actions & Input Area */}
      <div className="p-4 bg-white border-t border-zinc-100">
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setInput(q.label)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-[11px] font-semibold text-zinc-600 whitespace-nowrap transition-all hover:border-orange-200 hover:text-orange-600"
            >
              <q.icon size={12} />
              {q.label}
              <ChevronRight size={12} />
            </button>
          ))}
        </div>

        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte qualquer coisa ao Jarvis..."
            className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7900]/20 focus:border-[#ff7900] transition-all"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 bg-[#ff7900] text-white rounded-xl shadow-lg shadow-orange-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-[10px] text-zinc-400 mt-3 font-medium">
          Jarvis 5.4 mini pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  );
};

export default Jarvis;
