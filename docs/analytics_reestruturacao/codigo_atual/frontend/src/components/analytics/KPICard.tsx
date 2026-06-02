import React from 'react';
import { InfoTooltip } from './InfoTooltip';

interface KPICardProps {
    label: string;
    value: string | number;
    subValue?: string;
    subtext?: string;
    icon?: React.ElementType | string;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'orange' | 'green' | 'red' | 'yellow' | 'blue' | 'amber' | 'slate' | 'emerald';
    tooltip?: string;
    className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ label, value, subValue, subtext, icon, trend, color = 'blue', tooltip, className = '' }) => {
    const IconComponent = icon && typeof icon !== 'string' ? icon : null;

    const colorClasses: Record<string, string> = {
        orange: 'text-zinc-950',
        green: 'text-zinc-950',
        red: 'text-zinc-950',
        yellow: 'text-zinc-950',
        blue: 'text-zinc-950',
        amber: 'text-zinc-950',
        slate: 'text-slate-600',
        emerald: 'text-zinc-950',
    };

    const accentClasses: Record<string, string> = {
        orange: 'bg-orange-500',
        green: 'bg-emerald-500',
        red: 'bg-rose-500',
        yellow: 'bg-amber-500',
        blue: 'bg-sky-500',
        amber: 'bg-orange-500',
        slate: 'bg-slate-600',
        emerald: 'bg-emerald-500',
    };

    const iconClasses: Record<string, string> = {
        orange: 'text-orange-500',
        green: 'text-emerald-600',
        red: 'text-rose-600',
        yellow: 'text-amber-600',
        blue: 'text-sky-600',
        amber: 'text-orange-500',
        slate: 'text-slate-600',
        emerald: 'text-emerald-600',
    };

    return (
        <div aria-label="KPI Card" className={`group relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md ${className}`}>
            <div aria-label="KPI Card" className={`absolute inset-x-0 top-0 h-0.5 rounded-t-lg opacity-70 ${accentClasses[color] || accentClasses.blue}`} />

            <div aria-label="KPI Card" className="mb-5 flex items-start justify-between gap-4">
                <div aria-label="KPI Card">
                    <div aria-label="KPI Card" className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
                        {tooltip && <InfoTooltip text={tooltip} />}
                    </div>
                    <h3 className={`mt-2 text-3xl font-semibold tracking-tight text-zinc-950 ${colorClasses[color] || colorClasses.blue}`}>
                        {value}
                    </h3>
                </div>
                {icon && (
                    <div aria-label="KPI Card" className={`rounded-md border border-zinc-200 bg-zinc-50 p-2 transition-colors duration-200 group-hover:bg-white ${iconClasses[color] || iconClasses.blue}`}>
                        {IconComponent ? <IconComponent size={18} strokeWidth={2} /> : <span className="text-base leading-none">{typeof icon === 'string' ? icon : null}</span>}
                    </div>
                )}
            </div>

            <div aria-label="KPI Card" className="h-1 w-full rounded-full bg-zinc-100">
                <div aria-label="KPI Card" className={`h-1 w-2/5 rounded-full ${accentClasses[color] || accentClasses.blue}`} />
            </div>

            {(subValue || subtext || trend) && (
                <div aria-label="KPI Card" className="mt-3">
                    {subValue && <span className="text-sm font-semibold text-zinc-700">{subValue}</span>}
                    {subtext && <p className="text-sm text-zinc-500">{subtext}</p>}
                    {trend && (
                        <p className={`mt-2 text-xs font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {trend === 'up' ? 'Melhorou' : 'Piorou'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
