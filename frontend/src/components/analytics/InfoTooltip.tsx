import React from 'react';

interface InfoTooltipProps {
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, position = 'top' }) => {
    return (
        <span className="group relative z-40 ml-2 inline-flex align-middle">
            <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-zinc-300 bg-white text-[10px] font-semibold text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-700">
                i
            </span>

            <span className={`
                pointer-events-auto absolute z-[9999] w-72 rounded-lg border border-zinc-200 bg-white p-3
                text-xs font-medium leading-relaxed text-zinc-700 shadow-xl shadow-zinc-900/10
                invisible opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100
                ${position === 'top' ? 'bottom-full left-1/2 mb-1 -translate-x-1/2' : ''}
                ${position === 'bottom' ? 'left-1/2 top-full mt-1 -translate-x-1/2' : ''}
                ${position === 'left' ? 'right-full top-1/2 mr-1 -translate-y-1/2' : ''}
                ${position === 'right' ? 'left-full top-1/2 ml-1 -translate-y-1/2' : ''}
            `}>
                {text}

                <span className={`
                    absolute h-2 w-2 rotate-45 border-zinc-200 bg-white
                    ${position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r' : ''}
                    ${position === 'bottom' ? 'left-1/2 top-[-5px] -translate-x-1/2 border-l border-t' : ''}
                    ${position === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-r border-t' : ''}
                    ${position === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l' : ''}
                `} />
            </span>
        </span>
    );
};
