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
        colorClass = 'text-emerald-400';
        bgColorClass = 'bg-emerald-400/10 border-emerald-400/20';
    } else if (score >= 50) {
        colorClass = 'text-yellow-400';
        bgColorClass = 'bg-yellow-400/10 border-yellow-400/20';
    } else {
        colorClass = 'text-rose-400';
        bgColorClass = 'bg-rose-400/10 border-rose-400/20';
    }

    const sizes = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-xl px-4 py-2 font-bold'
    };

    return (
        <span className={`inline-flex items-center justify-center font-medium rounded-full border ${bgColorClass} ${colorClass} ${sizes[size]}`}>
            Score: {score.toFixed(1)}
        </span>
    );
};
