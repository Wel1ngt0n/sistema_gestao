import React from 'react'
import { useNavigate } from 'react-router-dom'
import { User, TrendingUp, AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight, BarChart3 } from 'lucide-react'

interface Analyst {
    implantador: string
    jarvis_status?: string
    recommendation?: string
    score: {
        score_final: number
    }
    carga_ponderada: number
    entregas_mes: number
    idle_medio: number
    pct_sla_concluidas: number
}

interface AnalystClassificationCardsProps {
    analysts: Analyst[]
    isVertical?: boolean
}

export const AnalystClassificationCards: React.FC<AnalystClassificationCardsProps> = ({ analysts, isVertical = false }) => {
    const navigate = useNavigate()

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'HIGH_PERFORMANCE': 
                return { 
                    label: 'Alta Performance', 
                    color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
                    dot: 'bg-emerald-500',
                    icon: <CheckCircle2 size={12} className="text-emerald-500" />
                }
            case 'HEALTHY': 
                return { 
                    label: 'Saudável', 
                    color: 'text-blue-700 bg-blue-50 border-blue-100',
                    dot: 'bg-blue-500',
                    icon: <TrendingUp size={12} className="text-blue-500" />
                }
            case 'WARNING': 
                return { 
                    label: 'Atenção', 
                    color: 'text-amber-700 bg-amber-50 border-amber-100',
                    dot: 'bg-amber-500',
                    icon: <AlertTriangle size={12} className="text-amber-500" />
                }
            case 'OVERLOADED': 
            case 'CRITICAL_IDLE':
                return { 
                    label: 'Crítico', 
                    color: 'text-rose-700 bg-rose-50 border-rose-100',
                    dot: 'bg-rose-500',
                    icon: <ShieldAlert size={12} className="text-rose-500" />
                }
            default: 
                return { 
                    label: 'Em Análise', 
                    color: 'text-slate-700 bg-slate-50 border-slate-100',
                    dot: 'bg-slate-400',
                    icon: <User size={12} className="text-slate-400" />
                }
        }
    }

    // Sort: Problematic first
    const sortedAnalysts = [...analysts].sort((a, b) => {
        const priority: Record<string, number> = { 'CRITICAL_IDLE': 0, 'OVERLOADED': 0, 'WARNING': 1, 'HEALTHY': 2, 'HIGH_PERFORMANCE': 3 }
        return (priority[a.jarvis_status || ''] ?? 4) - (priority[b.jarvis_status || ''] ?? 4)
    })

    return (
        <div className={`space-y-4 ${isVertical ? 'h-full flex flex-col' : ''}`} aria-label="Classificação de Performance do Time">
            {!isVertical && (
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="text-indigo-500" size={20} />
                    Classificação do Time
                </h2>
            )}
            
            <div className={`grid gap-4 ${isVertical ? 'grid-cols-1 flex-1 overflow-y-auto pr-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                {sortedAnalysts.map((analyst, idx) => {
                    const config = getStatusConfig(analyst.jarvis_status || '')
                    return (
                        <div 
                            key={idx}
                            onClick={() => navigate(`/team-diagnostics/${encodeURIComponent(analyst.implantador)}`)}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 group-hover:border-indigo-400 transition-colors">
                                        {analyst.implantador.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {analyst.implantador.split(' ')[0]}
                                        </h4>
                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase mt-1 ${config.color}`}>
                                            {config.icon}
                                            {config.label}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Score</div>
                                    <div className={`text-lg font-black ${
                                        analyst.score.score_final > 80 ? 'text-emerald-500' :
                                        analyst.score.score_final > 60 ? 'text-blue-500' :
                                        analyst.score.score_final > 40 ? 'text-amber-500' : 'text-rose-500'
                                    }`}>
                                        {analyst.score.score_final}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                <div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Carga</div>
                                    <div className="text-xs font-bold text-slate-700">{analyst.carga_ponderada.toFixed(1)} pts</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">SLA</div>
                                    <div className={`text-xs font-bold ${analyst.pct_sla_concluidas < 75 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                        {analyst.pct_sla_concluidas}%
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 italic truncate pr-4">
                                    {analyst.recommendation}
                                </span>
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
