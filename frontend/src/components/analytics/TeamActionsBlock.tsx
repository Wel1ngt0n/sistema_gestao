import React from 'react'
import { AlertCircle, Zap, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react'

interface TeamAction {
    priority: number
    type: 'overload' | 'idle' | 'warning' | 'sla'
    title: string
    description: string
    affected: string[]
    impact: 'alto' | 'medio' | 'baixo'
}

interface TeamActionsBlockProps {
    actions: TeamAction[]
    isVertical?: boolean
}

export const TeamActionsBlock: React.FC<TeamActionsBlockProps> = ({ actions, isVertical = false }) => {
    if (!actions || actions.length === 0) {
        return (
            <div className="flex items-center gap-4 rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50">
                    <CheckCircle2 className="text-emerald-600" size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-zinc-950">Operação Normal</h3>
                    <p className="text-sm text-zinc-500">Nenhuma ação crítica pendente para o time.</p>
                </div>
            </div>
        )
    }

    const getImpactStyle = (impact: string) => {
        switch (impact) {
            case 'alto': return 'border-rose-100 text-rose-700'
            case 'medio': return 'border-orange-100 text-orange-700'
            default: return 'border-zinc-200 text-zinc-700'
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'overload': return <ShieldAlert size={18} className="text-rose-600" />
            case 'idle': return <Clock size={18} className="text-rose-600" />
            case 'warning': return <AlertCircle size={18} className="text-orange-500" />
            case 'sla': return <Zap size={18} className="text-[#128131]" />
            default: return <AlertCircle size={20} />
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <Zap className="text-[#128131]" size={16} />
                    O Que Fazer Agora
                </h2>
                <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-500">
                    {actions.length} Ações Prioritárias
                </span>
            </div>

            <div className={`grid gap-4 ${isVertical ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                {actions.map((action, idx) => (
                    <div
                        key={idx}
                        className={`rounded-lg border bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md ${getImpactStyle(action.impact)}`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className={`rounded-md border p-2 ${
                                action.impact === 'alto' ? 'border-rose-100 bg-rose-50' :
                                action.impact === 'medio' ? 'border-orange-100 bg-orange-50' : 'border-zinc-200 bg-zinc-50'
                            }`}>
                                {getIcon(action.type)}
                            </div>
                            <span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${
                                action.impact === 'alto' ? 'bg-rose-50 text-rose-700' :
                                action.impact === 'medio' ? 'bg-orange-50 text-orange-700' : 'bg-zinc-100 text-zinc-600'
                            }`}>
                                {action.impact} Impacto
                            </span>
                        </div>

                        <h4 className="mb-1 text-sm font-semibold text-zinc-950">{action.title}</h4>
                        <p className="mb-4 text-sm leading-relaxed text-zinc-500">
                            {action.description}
                        </p>

                        {action.affected.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {action.affected.map((name, i) => (
                                    <span key={i} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                                        {name.split(' ')[0]}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button className="flex items-center gap-1 text-xs font-semibold text-[#128131] transition-all hover:gap-2">
                            Ver detalhes <ChevronRight size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Ícone simples de relógio definido localmente para evitar outra importação.
const Clock = ({ size, className }: { size: number, className: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
)
