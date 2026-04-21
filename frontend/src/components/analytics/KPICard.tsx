import React from 'react';
import { InfoTooltip } from './InfoTooltip';

interface KPICardProps {
    label: string;
    value: string | number;
    subValue?: string;
    subtext?: string;
    icon?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'orange' | 'green' | 'red' | 'yellow' | 'blue' | 'amber' | 'slate' | 'orange' | 'emerald';
    tooltip?: string;
    className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ label, value, subValue, subtext, icon, trend, color = 'orange', tooltip, className = '' }) => {

    const colorClasses = {
        orange: 'text-orange-600 dark:text-orange-400',
        green: 'text-emerald-500 dark:text-emerald-400',
        red: 'text-rose-500 dark:text-rose-400',
        yellow: 'text-amber-500 dark:text-amber-400',
        blue: 'text-blue-500 dark:text-blue-400',
        amber: 'text-orange-500 dark:text-orange-400',
        slate: 'text-slate-500 dark:text-zinc-400',
        orange: 'text-orange-500 dark:text-orange-400',
        emerald: 'text-emerald-500 dark:text-emerald-400',
    };

    const bgIconClasses = {
        orange: 'text-orange-500',
        green: 'text-emerald-500',
        red: 'text-rose-500',
        yellow: 'text-amber-500',
        blue: 'text-blue-500',
        amber: 'text-orange-500',
        slate: 'text-slate-500',
        orange: 'text-orange-500',
        emerald: 'text-emerald-500',
    };

    return (
        <div aria-label="KPI Card" className={`relative bg-white dark:bg-zinc-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-700/50 flex flex-col justify-between transition-all duration-300 hover:shadow-md dark:hover:shadow-lg group ${className}`}>

            {/* Background Decorator Layer (Clipped) */}
            <div aria-label="KPI Card" className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                {/* Ícone de Fundo (Efeito Bento) */}
                {icon && (
                    <div aria-label="KPI Card" className={`absolute -right-6 -top-6 text-[100px] opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 ${bgIconClasses[color]}`}>
                        {icon}
                    </div>
                )}

                {/* Barra de Progresso Decorativa (Opcional) */}
                <div aria-label="KPI Card" className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 dark:bg-black/20">
                    <div aria-label="KPI Card" className={`h-full opacity-50 ${colorClasses[color].split(' ')[0].replace('text-', 'bg-')}`} style={{ width: '40%' }}></div>
                </div>
            </div>

            <div aria-label="KPI Card" className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div aria-label="KPI Card" className="flex justify-between items-start mb-2">
                        <div aria-label="KPI Card" className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{label}</span>
                            {tooltip && <InfoTooltip text={tooltip} />}
                        </div>
                    </div>

                    <h3 className={`text-4xl lg:text-5xl font-black tracking-tighter ${colorClasses[color]} transition-colors`}>
                        {value}
                    </h3>
                </div>

                <div aria-label="KPI Card" className="mt-4">
                    {(subValue || subtext) && (
                        <div aria-label="KPI Card" className="flex flex-col">
                            {subValue && <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{subValue}</span>}
                            {subtext && <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">{subtext}</span>}
                        </div>
                    )}

                    {/* Trend Indicator */}
                    {trend && (
                        <div aria-label="KPI Card" className="mt-2 flex items-center text-xs">
                            {trend === 'up' ? (
                                <span className="text-emerald-500 font-bold flex items-center gap-1">
                                    <span className="bg-emerald-100 dark:bg-emerald-500/20 p-0.5 rounded-full">↑</span> Melhorou
                                </span>
                            ) : (
                                <span className="text-rose-500 font-bold flex items-center gap-1">
                                    <span className="bg-rose-100 dark:bg-rose-500/20 p-0.5 rounded-full">↓</span> Piorou
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
