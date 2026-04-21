import React from 'react';
import { InfoTooltip } from './InfoTooltip';

interface KPICardProps {
    label: string;
    value: string | number;
    subValue?: string;
    subtext?: string;
    icon?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'orange' | 'green' | 'red' | 'yellow' | 'blue' | 'amber' | 'slate' | 'emerald';
    tooltip?: string;
    className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ label, value, subValue, subtext, icon, trend, color = 'blue', tooltip, className = '' }) => {

    const colorClasses: Record<string, string> = {
        orange: 'text-orange-500',
        green: 'text-emerald-600',
        red: 'text-rose-600',
        yellow: 'text-amber-500',
        blue: 'text-blue-600',
        amber: 'text-orange-500',
        slate: 'text-slate-600',
        emerald: 'text-emerald-600',
    };

    const bgIconClasses: Record<string, string> = {
        orange: 'text-orange-400',
        green: 'text-emerald-400',
        red: 'text-rose-400',
        yellow: 'text-amber-400',
        blue: 'text-blue-400',
        amber: 'text-orange-400',
        slate: 'text-slate-400',
        emerald: 'text-emerald-400',
    };

    return (
        <div aria-label="KPI Card" className={`relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between transition-all duration-300 hover:shadow-md group ${className}`}>

            {/* Background Decorator */}
            <div aria-label="KPI Card" className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                {icon && (
                    <div aria-label="KPI Card" className={`absolute -right-6 -top-6 text-[100px] opacity-[0.04] group-hover:opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 ${bgIconClasses[color] || bgIconClasses.blue}`}>
                        {icon}
                    </div>
                )}
                {/* Bottom accent bar */}
                <div aria-label="KPI Card" className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                    <div aria-label="KPI Card" className={`h-full opacity-40 ${(colorClasses[color] || colorClasses.blue).replace('text-', 'bg-')}`} style={{ width: '40%' }}></div>
                </div>
            </div>

            <div aria-label="KPI Card" className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div aria-label="KPI Card" className="flex justify-between items-start mb-2">
                        <div aria-label="KPI Card" className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                            {tooltip && <InfoTooltip text={tooltip} />}
                        </div>
                    </div>

                    <h3 className={`text-4xl lg:text-5xl font-black tracking-tighter ${colorClasses[color] || colorClasses.blue} transition-colors`}>
                        {value}
                    </h3>
                </div>

                <div aria-label="KPI Card" className="mt-4">
                    {(subValue || subtext) && (
                        <div aria-label="KPI Card" className="flex flex-col">
                            {subValue && <span className="text-sm font-bold text-slate-700">{subValue}</span>}
                            {subtext && <span className="text-xs text-slate-400 font-medium">{subtext}</span>}
                        </div>
                    )}

                    {trend && (
                        <div aria-label="KPI Card" className="mt-2 flex items-center text-xs">
                            {trend === 'up' ? (
                                <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <span className="bg-emerald-100 p-0.5 rounded-full">↑</span> Melhorou
                                </span>
                            ) : (
                                <span className="text-rose-600 font-bold flex items-center gap-1">
                                    <span className="bg-rose-100 p-0.5 rounded-full">↓</span> Piorou
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
