import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import {
  Sparkles,
  AlertCircle,
  Brain,
  ShieldAlert,
  Zap,
  Users,
  ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface JarvisAlert {
  type: 'danger' | 'warning' | 'info'
  msg: string
}

interface CockpitAnalyst {
  implantador: string
  ativas: number
  entregas_mes: number
  carga_ponderada: number
  pct_sla_concluidas: number
  idle_medio: number
  jarvis_status: 'HIGH_PERFORMANCE' | 'HEALTHY' | 'WARNING' | 'OVERLOADED' | 'CRITICAL_IDLE'
  recommendation: string
  action_priority: 'high' | 'medium' | 'low'
  is_top_performer: boolean
}

interface JarvisAIResponse {
  jarvis_briefing: string
  insumos_decisao: Array<{ titulo: string; descricao: string; impacto: string }>
  xadrez_operacional: string[]
  radar_de_risco: { tecnico: string; financeiro: string; pessoas: string }
  frase_do_copiloto: string
}

export default function JarvisCockpit() {
  const navigate = useNavigate()
  const [data, setData] = useState<{
    summary: any
    alerts: JarvisAlert[]
    analysts: CockpitAnalyst[]
  } | null>(null)
  
  const [aiAnalysis, setAiAnalysis] = useState<JarvisAIResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [chatResponse, setChatResponse] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (startDate?: string) => {
    try {
      setLoading(true)
      const url = startDate ? `/api/reports/implantadores/cockpit?start_date=${startDate}` : '/api/reports/implantadores/cockpit'
      const res = await api.get(url)
      setData(res.data)
    } catch (err) {
      console.error('Erro ao carregar cockpit:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (msg: string) => {
    if (!msg.trim()) return
    try {
      setChatResponse("Jarvis está processando sua solicitação...")
      const res = await api.post('/api/reports/implantadores/jarvis/chat', { message: msg })
      setChatResponse(res.data.response)
    } catch (err) {
      setChatResponse("Desculpe, senhor. Tive um problema ao processar seu comando.")
    }
  }

  const handleRunJarvis = async () => {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin"></div>
        <p className="text-zinc-500 animate-pulse font-medium">Iniciando sistemas de Jarvis...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER E AÇÃO PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full w-fit mb-3 border border-orange-500/20">
            <Sparkles size={14} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Inteligência Operacional v3.5</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Cockpit <span className="text-orange-500 font-black italic">JARVIS</span></h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-lg">
            Sua visão executiva para tomada de decisão em tempo real.
          </p>
        </div>

        <div className="flex gap-2">
          <select 
            onChange={(e) => {
              const val = e.target.value;
              let start = '';
              const now = new Date();
              if (val === 'month') {
                start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
              } else if (val === 'quarter') {
                start = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
              } else if (val === 'ytd') {
                start = new Date(now.getFullYear(), 0, 1).toISOString();
              }
              fetchData(start);
            }}
            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <option value="month">Mês Atual</option>
            <option value="quarter">Último Trimestre</option>
            <option value="ytd">Ano Atual (YTD)</option>
          </select>

          <button 
            onClick={handleRunJarvis}
          disabled={aiLoading}
          className="group relative px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold flex items-center gap-3 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20 disabled:opacity-50"
        >
          {aiLoading ? (
            <Brain className="w-5 h-5 animate-bounce" />
          ) : (
            <Zap className="w-5 h-5 fill-current" />
          )}
          {aiLoading ? 'Processando Dados...' : 'Consultar Jarvis Agora'}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
        </button>
      </div>

      {/* ALERTAS CRÍTICOS */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.alerts.map((alert, idx) => (
            <div 
              key={idx} 
              className={`flex items-start gap-4 p-5 rounded-2xl border backdrop-blur-md transition-all hover:scale-[1.02]
                ${alert.type === 'danger' 
                  ? 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400' 
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'}`}
            >
              <div className={`p-2 rounded-xl ${alert.type === 'danger' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Ação Requerida</h4>
                <p className="text-sm font-medium leading-relaxed opacity-90">{alert.msg}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ANALISE IA JARVIS (RESULTADO) */}
      {aiAnalysis && (
        <div className="bg-zinc-900 text-white rounded-[2rem] p-8 border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40">
                <Brain className="text-white w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Parecer do Jarvis</h2>
                <p className="text-zinc-400 text-sm italic">"{aiAnalysis.frase_do_copiloto}"</p>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 italic text-lg leading-relaxed">
              {aiAnalysis.jarvis_briefing}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-orange-400 font-bold uppercase text-xs tracking-widest">
                  <ArrowRight size={14} /> Xadrez Operacional (Sugestões)
                </h3>
                <ul className="space-y-3">
                  {aiAnalysis.xadrez_operacional.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-zinc-300 bg-white/5 p-3 rounded-xl border border-white/5">
                      <Zap className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-blue-400 font-bold uppercase text-xs tracking-widest">
                  <ShieldAlert size={14} /> Radar de Risco
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Técnico</span>
                    <p className="text-sm mt-1">{aiAnalysis.radar_de_risco.tecnico}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Pessoas</span>
                    <p className="text-sm mt-1">{aiAnalysis.radar_de_risco.pessoas}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRID DE ANALISTAS */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Users className="text-zinc-400" />
          Status da Tropa
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data?.analysts.map((analyst) => (
            <div 
              key={analyst.implantador}
              onClick={() => navigate(`/team-diagnostics/${encodeURIComponent(analyst.implantador)}`)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 cursor-pointer hover:border-orange-500/50 hover:shadow-xl transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg
                    ${analyst.is_top_performer ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                    {analyst.implantador.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl group-hover:text-orange-500 transition-colors">{analyst.implantador}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md
                        ${analyst.jarvis_status === 'HIGH_PERFORMANCE' ? 'bg-emerald-500/10 text-emerald-600' :
                          analyst.jarvis_status === 'OVERLOADED' ? 'bg-red-500/10 text-red-600' :
                          analyst.jarvis_status === 'WARNING' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-blue-500/10 text-blue-600'}`}>
                        {analyst.jarvis_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">{analyst.carga_ponderada.toFixed(1)}</span>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Pontos de Carga</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-y border-zinc-100 dark:border-zinc-800 py-4">
                <div className="text-center">
                  <p className="text-xs text-zinc-500 mb-1">Entregas</p>
                  <p className="font-bold text-lg">{analyst.entregas_mes}</p>
                </div>
                <div className="text-center border-x border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">SLA</p>
                  <p className={`font-bold text-lg ${analyst.pct_sla_concluidas >= 80 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {analyst.pct_sla_concluidas}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500 mb-1">Idle</p>
                  <p className="font-bold text-lg">{analyst.idle_medio}d</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl italic text-sm text-zinc-600 dark:text-zinc-400">
                <div className={`mt-1 shrink-0 ${analyst.action_priority === 'high' ? 'text-red-500' : 'text-zinc-400'}`}>
                  <AlertCircle size={14} />
                </div>
                <p>Jarvis: "{analyst.recommendation}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* CHAT DE COMANDO JARVIS */}
      <div className="sticky bottom-8 z-40 max-w-4xl mx-auto w-full">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-2 flex items-center gap-2 group focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
          <div className="p-3 text-orange-500">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <input 
            type="text" 
            placeholder="Jarvis, como está a carga da Débora? ou Jarvis, coloque a loja X em atenção..."
            className="flex-1 bg-transparent border-none outline-none py-3 text-sm font-medium placeholder:text-zinc-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                handleSendMessage(target.value);
                target.value = '';
              }
            }}
          />
          <button className="p-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl hover:bg-orange-500 dark:hover:bg-orange-500 transition-colors">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* HISTÓRICO RÁPIDO DO CHAT (OPCIONAL/SUSPENSO) */}
      {chatResponse && (
        <div className="max-w-4xl mx-auto w-full mt-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
              <Brain className="text-white w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Resposta do Jarvis</span>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{chatResponse}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ... rest of the file logic
