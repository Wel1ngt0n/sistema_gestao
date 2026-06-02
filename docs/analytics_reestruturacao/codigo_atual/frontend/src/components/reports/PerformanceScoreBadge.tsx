import React from 'react';

interface PerformanceScoreBadgeProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
}

export const PerformanceScoreBadge: React.FC<PerformanceScoreBadgeProps> = ({ score, size = 'md' }) => {
    // Definimos os limites do semáforo: >= 75 verde, >= 50 amarelo, < 50 vermelho
    let colorClass = '';
    let bgColorClass = '';
    
    if (score >= 75) {
        colorClass = 'text-emerald-700';
        bgColorClass = 'bg-emerald-50 border-emerald-100';
    } else if (score >= 50) {
        colorClass = 'text-amber-700';
        bgColorClass = 'bg-amber-50 border-amber-100';
    } else {
        colorClass = 'text-rose-700';
        bgColorClass = 'bg-rose-50 border-rose-100';
    }

    const sizes = {
        sm: 'text-xs px-2.5 py-1',
        md: 'text-sm px-3 py-1',
        lg: 'text-lg px-4 py-2 font-semibold'
    };

    return (
        <span className={`inline-flex items-center justify-center rounded-md border font-semibold ${bgColorClass} ${colorClass} ${sizes[size]}`}>
            Score: {(score || 0).toFixed(1)}
        </span>
    );
};
