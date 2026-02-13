import { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Sparkles, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import ReactMarkdown from 'react-markdown';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: string[];
}

interface AIChatWindowProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AIChatWindow({ isOpen, onClose }: AIChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Olá! Sou seu assistente de operações. Posso analisar o status de todas as lojas, identificar gargalos e responder dúvidas sobre a implantação. Como posso ajudar hoje?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

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
            // Call API
            // Note: Assuming api.js wraps fetch correctly. If not, use fetch directly or axios.
            // Based on existing code, api.post returns { data: ... }
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
                content: 'Desculpe, tive um problema ao processar sua solicitação. Verifique se a API Key está configurada corretamente.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed z-[200] transition-all duration-300 shadow-2xl flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 ${isExpanded
                ? 'inset-4 md:inset-10 rounded-2xl'
                : 'bottom-4 right-4 md:bottom-8 md:right-8 w-[90vw] md:w-[450px] h-[600px] max-h-[80vh] rounded-2xl'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            Assistente de Operações
                            <Sparkles className="w-3 h-3 text-amber-500" />
                        </h3>
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online • Contexto Total
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg text-zinc-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-zinc-50/30 dark:bg-zinc-900/30 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${msg.role === 'assistant'
                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                            }`}>
                            {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                        </div>

                        {/* Bubble */}
                        <div className={`group relative max-w-[85%] space-y-2`}>
                            <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-tr-none'
                                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-tl-none'
                                }`}>
                                {msg.role === 'assistant' ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    msg.content
                                )}
                            </div>

                            {/* Sources */}
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2 ml-1">
                                    <span className="text-[10px] uppercase font-bold text-zinc-400">Fontes:</span>
                                    {msg.sources.map((source, idx) => (
                                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-500 truncate max-w-[150px]">
                                            {source}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 right-1">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center animate-pulse">
                            <Bot size={16} className="text-white" />
                        </div>
                        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-indigo-500" />
                            <span className="text-xs text-zinc-500">Analisando dados da operação...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-b-2xl">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="relative flex items-center gap-2"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pergunte sobre atrasos, riscos ou lojas específicas..."
                        className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Send size={16} />
                    </button>
                </form>
                <div className="mt-2 text-center">
                    <p className="text-[10px] text-zinc-400">
                        A I.A. pode cometer erros. Verifique as informações críticas no Monitor principal.
                    </p>
                </div>
            </div>
        </div>
    );
}
