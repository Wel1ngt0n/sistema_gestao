// UX Audit: placeholder aria-label
import React, { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export type DateRange = {
    start: Date | null;
    end: Date | null;
    label: string;
};

interface PeriodFilterProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Preset calculations
    const today = new Date();
    
    const getCurrentMonth = () => {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        return { start, end, label: 'Mês Vigente' };
    };
    
    const getSemestre = () => {
        // Considerando Semestre 1 (Jan-Jun) e Semestre 2 (Jul-Dez)
        const currentMonth = today.getMonth();
        const startMonth = currentMonth < 6 ? 0 : 6;
        const endMonth = currentMonth < 6 ? 5 : 11;
        
        const start = new Date(today.getFullYear(), startMonth, 1);
        const end = new Date(today.getFullYear(), endMonth + 1, 0, 23, 59, 59);
        return { start, end, label: 'Semestre Atual' };
    };

    const getYTD = () => {
        const start = new Date(today.getFullYear(), 0, 1);
        const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
        return { start, end, label: 'YTD (Ano atual)' };
    };

    const presets = [
        getCurrentMonth(),
        getSemestre(),
        getYTD(),
        { start: null, end: null, label: 'Todo o Período' }
    ];

    return (
        <div className="relative inline-block text-left z-10">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 bg-[var(--card-bg)] border border-[var(--border-color)] px-4 py-2 rounded-lg text-sm text-[var(--text-color)] hover:border-[var(--brand-primary)]/50 transition-colors"
            >
                <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>{value.label}</span>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-[var(--card-bg)] border border-[var(--border-color)] ring-1 ring-black ring-opacity-5 z-20">
                        <div className="py-1">
                            {presets.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        onChange(preset);
                                        setIsOpen(false);
                                    }}
                                    className={`group flex items-center w-full px-4 py-2 text-sm
                                        ${value.label === preset.label 
                                            ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' 
                                            : 'text-[var(--text-color)] hover:bg-[var(--bg-color)]'
                                        }`}
                                >
                                    {value.label === preset.label && <Check className="w-4 h-4 mr-2" />}
                                    <span className={value.label === preset.label ? '' : 'ml-6'}>
                                        {preset.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

