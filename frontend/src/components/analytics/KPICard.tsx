import React from 'react';
import { InfoTooltip } from './InfoTooltip';

interface KPICardProps {
    label: string;
    value: string | number;
    subValue?: string;
    subtext?: string;
    icon?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'indigo' | 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'slate' | 'orange' | 'emerald';
    tooltip?: string;
    className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ label, value, subValue, subtext, icon, trend, color = 'indigo', tooltip, className = '' }) => {

    const colorClasses = {
        indigo: 'text-indigo-600 dark:text-indigo-400',
        green: 'text-emerald-600 dark:text-emerald-400',
        red: 'text-rose-600 dark:text-rose-400',
        yellow: 'text-amber-600 dark:text-amber-400',
        blue: 'text-blue-600 dark:text-blue-400',
        purple: 'text-purple-600 dark:text-purple-400',
        slate: 'text-slate-600 dark:text-slate-400',
        orange: 'text-orange-600 dark:text-orange-400',
        emerald: 'text-emerald-600 dark:text-emerald-400',
    };

    const borderClasses = {
        indigo: 'hover:border-indigo-300 dark:hover:border-indigo-700',
        green: 'hover:border-emerald-300 dark:hover:border-emerald-700',
        red: 'hover:border-rose-300 dark:hover:border-rose-700',
        yellow: 'hover:border-amber-300 dark:hover:border-amber-700',
        blue: 'hover:border-blue-300 dark:hover:border-blue-700',
        purple: 'hover:border-purple-300 dark:hover:border-purple-700',
        slate: 'hover:border-slate-300 dark:hover:border-slate-700',
        orange: 'hover:border-orange-300 dark:hover:border-orange-700',
        emerald: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    };

    return (
        <div className={`relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-all duration-300 group ${borderClasses[color]} ${className}`}>
            {/* Ícone de Fundo (Efeito Visual) */}
            {icon && (
                <div className="absolute top-4 right-4 text-4xl opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all filter grayscale group-hover:grayscale-0">
                    {icon}
                </div>
            )}

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                        {tooltip && <InfoTooltip text={tooltip} />}
                    </div>
                </div>

                <div className="flex flex-col">
                    <h3 className={`text-3xl font-extrabold tracking-tight ${colorClasses[color]}`}>
                        {value}
                    </h3>

                    {(subValue || subtext) && (
                        <div className="mt-1 flex items-center gap-2">
                            {subValue && <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{subValue}</span>}

                            {subtext && <span className="text-xs text-slate-400 font-medium">{subtext}</span>}
                        </div>
                    )}
                </div>

                {/* Trend Indicator */}
                {trend && (
                    <div className="mt-3 flex items-center text-xs">
                        {trend === 'up' ? (
                            <span className="text-emerald-500 font-bold flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                ↑ Melhorou
                            </span>
                        ) : (
                            <span className="text-rose-500 font-bold flex items-center bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
                                ↓ Piorou
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
