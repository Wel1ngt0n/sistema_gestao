import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, BrainCircuit, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import ReactMarkdown from 'react-markdown';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: string[];
}

import { Link } from 'react-router-dom';

// Custom Renderers for ReactMarkdown
const LinkRenderer = (props: any) => {
    const { href, children } = props;
    if (href?.startsWith('/')) {
        return (
            <Link to={href} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1">
                {children}
            </Link>
        );
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{children}</a>;
};

const AlertRenderer = (props: any) => {
    return (
        <div className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 p-4 my-4 rounded-r-lg">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-zinc-700 dark:text-zinc-200 italic">
                    {props.children}
                </div>
            </div>
        </div>
    );
};

export default function AIChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '# Central de Comando Operacional 🤖\n\nOlá! Sou sua inteligência artificial dedicada. Estou monitorando **toda a operação** em tempo real.\n\nPosso ajudar com:\n- 🚀 **Análise de Gargalos** (Quem está travando a fila?)\n- 📊 **Riscos de Prazo** (Quem vai estourar o SLA?)\n- 🔍 **Diagnóstico de Loja** (O que está acontecendo com a Loja X?)\n\nComo posso ajudar hoje?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.post('/api/ai/chat', { message: userMsg.content });

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.response,
                sources: response.data.sources,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Failed to chat", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: '⚠️ **Erro de Comunicação**: Não consegui processar sua solicitação. Verifique a conexão com o servidor.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = (text: string) => {
        setInput(text);
        // Optional: Auto-send or just fill input
        // handleSend(); 
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">

            {/* Topbar / Status */}
            <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                        <BrainCircuit className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            AI Command Center
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                                Beta v2.0
                            </span>
                        </h1>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Monitorando 25 Lojas em Tempo Real
                        </p>
                    </div>
                </div>

                <div className="hidden md:flex gap-3">
                    <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">3 Riscos Altos</span>
                    </div>
                    <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Eficiência +15%</span>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-4 md:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${msg.role === 'assistant'
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}>
                            {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                        </div>

                        {/* Message Bubble */}
                        <div className={`flex flex-col max-w-[85%] md:max-w-3xl ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-5 md:p-6 rounded-3xl shadow-sm text-base leading-relaxed ${msg.role === 'user'
                                ? 'bg-zinc-900 dark:bg-white text-zinc-100 dark:text-zinc-900 rounded-tr-sm'
                                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-tl-sm'
                                }`}>
                                {msg.role === 'assistant' ? (
                                    <div className="prose prose-zinc dark:prose-invert max-w-none">
                                        <ReactMarkdown
                                            components={{
                                                a: LinkRenderer,
                                                blockquote: AlertRenderer
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                            </div>

                            {/* Metadata / Sources */}
                            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Fontes:</span>
                                    {msg.sources.map((source, idx) => (
                                        <span key={idx} className="flex items-center gap-1 text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-md text-zinc-500 dark:text-zinc-400">
                                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                                            {source}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <span className="text-[10px] text-zinc-400 mt-2 px-1">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-4 md:gap-6 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Bot size={20} className="text-white" />
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl rounded-tl-sm border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                            <Loader2 size={18} className="animate-spin text-indigo-500" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">Analisando dados da rede...</p>
                                <p className="text-xs text-zinc-400">Cruzando tempos de etapa e SLAs</p>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
                <div className="max-w-4xl mx-auto space-y-4">
                    {/* Quick Suggestions */}
                    {messages.length < 3 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            <button onClick={() => handleQuickAction("Quais lojas estão críticas?")} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors whitespace-nowrap">
                                🚨 Quais lojas estão críticas?
                            </button>
                            <button onClick={() => handleQuickAction("Resumo da Matriz hoje")} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors whitespace-nowrap">
                                📊 Resumo da Matriz
                            </button>
                            <button onClick={() => handleQuickAction("Gargalos de Integração")} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors whitespace-nowrap">
                                🔗 Gargalos de Integração
                            </button>
                        </div>
                    )}

                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="relative flex items-center gap-4 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border-2 border-transparent focus-within:border-indigo-500/20 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all shadow-inner"
                    >
                        <button type="button" className="p-3 text-zinc-400 hover:text-indigo-500 transition-colors">
                            <Sparkles className="w-5 h-5" />
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Descreva o problema ou pergunte sobre a operação..."
                            className="flex-1 bg-transparent text-zinc-900 dark:text-zinc-100 text-base placeholder:text-zinc-400 focus:outline-none"
                            disabled={isLoading}
                        />

                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className={`p-3 rounded-xl transition-all duration-300 ${input.trim()
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 scale-100'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 scale-95'
                                }`}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-zinc-400">
                        O AI Command Center analisa dados em tempo real. Sempre verifique as informações críticas no Dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
}
