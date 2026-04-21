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
            <div className="bg-white border border-emerald-100 rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="text-emerald-500" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Operação Normal</h3>
                    <p className="text-sm text-slate-500">Nenhuma ação crítica pendente para o time.</p>
                </div>
            </div>
        )
    }

    const getImpactStyle = (impact: string) => {
        switch (impact) {
            case 'alto': return 'bg-rose-50 border-rose-500 text-rose-700'
            case 'medio': return 'bg-amber-50 border-amber-500 text-amber-700'
            default: return 'bg-blue-50 border-blue-500 text-blue-700'
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'overload': return <ShieldAlert size={20} className="text-rose-500" />
            case 'idle': return <Clock size={20} className="text-rose-500" />
            case 'warning': return <AlertCircle size={20} className="text-amber-500" />
            case 'sla': return <Zap size={20} className="text-indigo-500" />
            default: return <AlertCircle size={20} />
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Zap className="text-indigo-500" size={20} />
                    O Que Fazer Agora
                </h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full">
                    {actions.length} Ações Prioritárias
                </span>
            </div>

            <div className={`grid gap-4 ${isVertical ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                {actions.map((action, idx) => (
                    <div 
                        key={idx} 
                        className={`relative border-l-4 rounded-xl p-5 shadow-sm transition-all hover:shadow-md ${getImpactStyle(action.impact)} bg-white border-y border-r border-slate-100`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2 rounded-lg ${
                                action.impact === 'alto' ? 'bg-rose-100' : 
                                action.impact === 'medio' ? 'bg-amber-100' : 'bg-blue-100'
                            }`}>
                                {getIcon(action.type)}
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                action.impact === 'alto' ? 'bg-rose-500 text-white' : 
                                action.impact === 'medio' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                            }`}>
                                {action.impact} Impacto
                            </span>
                        </div>

                        <h4 className="font-bold text-slate-900 mb-1">{action.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            {action.description}
                        </p>

                        {action.affected.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {action.affected.map((name, i) => (
                                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                        {name.split(' ')[0]}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:gap-2 transition-all">
                            Ver detalhes <ChevronRight size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Simple Clock component since it wasn't imported
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
