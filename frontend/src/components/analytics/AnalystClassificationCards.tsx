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
                    color: 'text-sky-700 bg-sky-50 border-sky-100',
                    dot: 'bg-sky-500',
                    icon: <TrendingUp size={12} className="text-sky-600" />
                }
            case 'WARNING': 
                return { 
                    label: 'Atenção', 
                    color: 'text-orange-700 bg-orange-50 border-orange-100',
                    dot: 'bg-orange-500',
                    icon: <AlertTriangle size={12} className="text-orange-500" />
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
                    color: 'text-zinc-700 bg-zinc-50 border-zinc-100',
                    dot: 'bg-slate-400',
                    icon: <User size={12} className="text-zinc-400" />
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
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <BarChart3 className="text-[#128131]" size={16} />
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
                            className="group cursor-pointer rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-600 transition-colors group-hover:border-orange-200">
                                        {analyst.implantador.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-zinc-950 transition-colors group-hover:text-[#ff7900]">
                                            {analyst.implantador.split(' ')[0]}
                                        </h4>
                                        <div className={`mt-1 flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${config.color}`}>
                                            {config.icon}
                                            {config.label}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-semibold uppercase text-zinc-400">Score</div>
                                    <div className={`text-lg font-semibold ${
                                        analyst.score.score_final > 80 ? 'text-emerald-700' :
                                        analyst.score.score_final > 60 ? 'text-sky-700' :
                                        analyst.score.score_final > 40 ? 'text-orange-700' : 'text-rose-700'
                                    }`}>
                                        {analyst.score.score_final}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4">
                                <div>
                                    <div className="mb-0.5 text-[10px] font-semibold uppercase text-zinc-400">Carga</div>
                                    <div className="text-xs font-semibold text-zinc-700">{analyst.carga_ponderada.toFixed(1)} pts</div>
                                </div>
                                <div>
                                    <div className="mb-0.5 text-[10px] font-semibold uppercase text-zinc-400">SLA</div>
                                    <div className={`text-xs font-semibold ${analyst.pct_sla_concluidas < 75 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                        {analyst.pct_sla_concluidas}%
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <span className="truncate pr-4 text-xs text-zinc-500">
                                    {analyst.recommendation}
                                </span>
                                <ChevronRight size={14} className="text-zinc-300 transition-all group-hover:translate-x-1 group-hover:text-[#ff7900]" />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
