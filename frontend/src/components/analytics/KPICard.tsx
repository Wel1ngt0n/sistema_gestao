import React from 'react';
import { InfoTooltip } from './InfoTooltip';

interface KPICardProps {
    label: string;
    value: string | number;
    subValue?: string;
    subtext?: string;
    icon?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string | React.ReactNode;
    trendLabel?: string;
    trendColor?: 'green' | 'red' | 'slate';
    yearTotal?: string | number | React.ReactNode;
    color?: 'indigo' | 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'slate' | 'orange' | 'emerald';
    tooltip?: string;
    className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
    label, value, subValue, subtext, trend, trendValue, trendLabel, trendColor, yearTotal, tooltip, className = ''
}) => {
    return (
        <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all duration-300 hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)] ${className}`}>
            <div className="flex flex-col h-full justify-between">
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-slate-500 tracking-wide">{label}</span>
                            {tooltip && <InfoTooltip text={tooltip} />}
                        </div>
                    </div>

                    <div className="flex items-baseline gap-3">
                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                            {value}
                        </h3>
                        {trendValue && React.isValidElement(trendValue) ? (
                            <span className="mb-1">{trendValue}</span> // Render as node
                        ) : null}
                    </div>
                </div>

                <div className="mt-4">
                    {(subValue || subtext) && (
                        <div className="flex flex-col mb-1.5">
                            {subValue && <span className="text-sm font-medium text-slate-700">{subValue}</span>}
                            {subtext && <span className="text-xs text-slate-400">{subtext}</span>}
                        </div>
                    )}

                    {/* Trend Indicator Below */}
                    {trend && typeof trendValue === 'string' && (
                        <div className="flex items-center text-xs gap-1.5 font-medium whitespace-nowrap">
                            {(() => {
                                const isUp = trend === 'up';
                                const dColor = trendColor === 'green' ? 'text-emerald-500' : trendColor === 'red' ? 'text-rose-500' :
                                    !trendColor ? (isUp ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-500';

                                return (
                                    <>
                                        <span className={`font-semibold ${dColor}`}>
                                            {trendValue}
                                        </span>
                                        {trendLabel && <span className="text-slate-400 font-normal">{trendLabel}</span>}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Year Total Line */}
                    {yearTotal && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                            <span>Total Ano</span>
                            <span className="text-slate-600 tracking-normal font-bold">{yearTotal}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
