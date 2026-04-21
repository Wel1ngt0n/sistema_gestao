import React, { useState, useEffect, useRef } from 'react'
import { 
    Sparkles, Brain, ArrowRight, Zap, Loader2, 
    ChevronDown, ChevronUp
} from 'lucide-react'
import { api } from '../../services/api'

interface JarvisCopilotProps {
    teamData?: any
    diagnosticsData?: any
}

export const JarvisCopilot: React.FC<JarvisCopilotProps> = () => {
    const [isExpanded, setIsExpanded] = useState(true)
    const [message, setMessage] = useState('')
    const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'jarvis', content: string }>>([])
    const [loading, setLoading] = useState(false)
    const [aiAnalysis, setAiAnalysis] = useState<any>(null)
    const [aiLoading, setAiLoading] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [chatHistory, loading])

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!message.trim() || loading) return

        const userMsg = message.trim()
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
        setMessage('')
        setLoading(true)

        try {
            const res = await api.post('/api/reports/implantadores/jarvis/chat', { message: userMsg })
            setChatHistory(prev => [...prev, { role: 'jarvis', content: res.data.response }])
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'jarvis', content: "Desculpe, senhor. Tive um problema ao processar seu comando." }])
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateAnalysis = async () => {
        try {
            setAiLoading(true)
            const res = await api.post('/api/reports/implantadores/analyze/team')
            setAiAnalysis(res.data)
        } catch (err) {
            console.error('Erro na análise Jarvis:', err)
        } finally {
            setAiLoading(false)
        }
    }
    return (
        <div className="flex flex-col h-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 group/copilot">
            {/* Header */}
            <div className="p-6 bg-zinc-900/50 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg shadow-orange-500/20 text-white animate-pulse">
                        <Brain size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-sm tracking-tight uppercase">Jarvis <span className="text-orange-500 italic">Copilot</span></h3>
                        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-0.5">Sistemas de Defesa Ativos</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 text-zinc-600 hover:text-white transition-colors rounded-xl hover:bg-zinc-800"
                >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
            </div>

            {isExpanded && (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Chat Area / Analysis Display */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        {chatHistory.length === 0 && !aiAnalysis && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
                                    <Sparkles size={56} className="text-zinc-800 relative animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-zinc-400 text-sm font-black uppercase tracking-widest">Sistemas Online, Senhor.</p>
                                    <p className="text-zinc-600 text-xs max-w-[220px] leading-relaxed font-medium">
                                        Monitorando métricas operacionais em tempo real. Como posso auxiliar na estratégia do time?
                                    </p>
                                </div>
                                <button 
                                    onClick={handleGenerateAnalysis}
                                    disabled={aiLoading}
                                    className="relative group/btn mt-4 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-zinc-700/50 transition-all active:scale-95"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="fill-current" />}
                                        {aiLoading ? "Escaneando..." : "Gerar Diagnóstico"}
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* AI Team Analysis (If generated) */}
                        {aiAnalysis && (
                            <div className="bg-gradient-to-br from-white/5 to-transparent rounded-[2rem] border border-white/10 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Brain size={60} />
                                </div>
                                <div className="flex items-center gap-2 text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mb-1">
                                    <Zap size={14} className="animate-bounce" />
                                    Relatório de Situação
                                </div>
                                <p className="text-zinc-300 text-sm leading-relaxed italic border-l-2 border-orange-500/50 pl-4 font-medium">
                                    "{aiAnalysis.jarvis_briefing}"
                                </p>
                                <div className="space-y-3 pt-2">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Diretrizes Operacionais:</p>
                                    {aiAnalysis.xadrez_operacional?.slice(0, 3).map((s: string, i: number) => (
                                        <div key={i} className="flex gap-3 text-xs text-zinc-400 group/item bg-white/5 p-3 rounded-xl border border-white/5 hover:border-orange-500/30 transition-all">
                                            <span className="text-orange-500 font-black shrink-0">0{i+1}</span>
                                            <span className="group-hover/item:text-zinc-200 transition-colors">{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Chat Messages */}
                        {chatHistory.map((chat, i) => (
                            <div 
                                key={i} 
                                className={`flex flex-col ${chat.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                <div className={`max-w-[90%] p-5 rounded-3xl text-sm leading-relaxed shadow-xl ${
                                    chat.role === 'user' 
                                        ? 'bg-orange-500 text-white rounded-br-none shadow-orange-500/20' 
                                        : 'bg-zinc-800/80 backdrop-blur-md text-zinc-300 rounded-bl-none border border-zinc-700/50'
                                }`}>
                                    {chat.content}
                                </div>
                                <span className="text-[9px] uppercase font-black text-zinc-600 mt-2 px-2 tracking-[0.2em]">
                                    {chat.role === 'user' ? 'AUTORIZADO' : 'JARVIS CORE'}
                                </span>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-black uppercase tracking-widest animate-pulse px-2">
                                <div className="w-8 h-8 rounded-xl bg-zinc-800/50 flex items-center justify-center border border-zinc-700/50">
                                    <Loader2 size={14} className="animate-spin text-orange-500" />
                                </div>
                                Processando Resposta...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-zinc-900/50 border-t border-zinc-800/50">
                        <form onSubmit={handleSendMessage} className="relative group/input">
                            <label htmlFor="jarvis-command" className="sr-only">Comando Jarvis</label>
                            <input 
                                id="jarvis-command"
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Emitir comando..."
                                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-4 pl-5 pr-14 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40 transition-all font-medium"
                            />
                            <button 
                                type="submit"
                                disabled={!message.trim() || loading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                            >
                                <ArrowRight size={20} />
                            </button>
                        </form>
                        <p className="text-[8px] text-zinc-700 mt-4 text-center uppercase tracking-[0.3em] font-black">
                            Criptografia Ativa • v3.5 Evolution
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
