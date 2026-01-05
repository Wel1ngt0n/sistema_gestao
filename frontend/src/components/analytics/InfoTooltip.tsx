import React from 'react';

interface InfoTooltipProps {
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, position = 'top' }) => {
    return (
        <div className="relative inline-block group ml-2 align-middle">
            {/* Ícone de Informação (i) */}
            <div className="flex items-center justify-center w-4 h-4 rounded-full border border-slate-300 dark:border-slate-500 text-[10px] font-bold text-slate-400 dark:text-slate-400 cursor-help hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                i
            </div>

            {/* Tooltip Popup */}
            <div className={`
                absolute z-50 w-64 p-3 
                bg-slate-800 text-white text-xs font-medium leading-relaxed rounded-lg shadow-xl 
                opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                transition-all duration-200 transform scale-95 group-hover:scale-100
                ${position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : ''}
                ${position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : ''}
                ${position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : ''}
                ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''}
            `}>
                {text}

                {/* Seta do Tooltip */}
                <div className={`
                    absolute w-2 h-2 bg-slate-800 transform rotate-45
                    ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
                    ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
                    ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
                    ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
                `}></div>
            </div>
        </div>
    );
};
