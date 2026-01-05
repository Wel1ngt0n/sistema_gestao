import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { DayPicker } from 'react-day-picker';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import 'react-day-picker/dist/style.css'; // Import default styles

// Custom CSS to override default react-day-picker styles for Tailwind compatibility nicely
// In a real project we would add this to global.css, but here we keep it scoped or rely on default + wrappers.
// We will use inline style overrides via classNames prop of DayPicker.

interface DatePickerProps {
    date: Date | null;
    onChange: (date: Date | undefined) => void;
    label?: string;
    placeholder?: string;
    className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ date, onChange, label, placeholder = "Selecione uma data", className }) => {
    return (
        <div className={clsx("relative w-full", className)}>
            {label && (
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    {label}
                </label>
            )}
            <Popover className="relative">
                {({ }) => (
                    <>
                        <Popover.Button
                            className={clsx(
                                "flex items-center justify-between w-full rounded-lg bg-white dark:bg-slate-800 py-2 pl-3 pr-3 text-left shadow-md border border-slate-200 dark:border-slate-700 sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500",
                                !date && "text-slate-400"
                            )}
                        >
                            <span className="flex items-center gap-2 truncate">
                                <CalendarIcon className="h-4 w-4 text-slate-500" />
                                {date ? format(date, "dd 'de' MMMM, yyyy", { locale: ptBR }) : placeholder}
                            </span>
                            {date && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent opening popover
                                        onChange(undefined);
                                    }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                >
                                    <X className="h-3 w-3 text-slate-400" />
                                </div>
                            )}
                        </Popover.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="opacity-0 translate-y-1"
                            enterTo="opacity-100 translate-y-0"
                            leave="transition ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0"
                            leaveTo="opacity-0 translate-y-1"
                        >
                            <Popover.Panel className="absolute left-0 z-50 mt-2 transform px-4 sm:px-0 lg:max-w-3xl">
                                <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black/5 bg-white dark:bg-slate-800 p-2">
                                    <DayPicker
                                        mode="single"
                                        selected={date || undefined}
                                        onSelect={(d) => {
                                            onChange(d);
                                            // Close popover logic would need ref to button, but headless ui usually handles outside click.
                                            // To auto-close on select, we might need manual control, but standard behavior is fine.
                                        }}
                                        locale={ptBR}
                                        showOutsideDays
                                        className="border-0"
                                        modifiersClassNames={{
                                            selected: 'bg-indigo-600 text-white rounded-full hover:bg-indigo-700',
                                            today: 'text-indigo-600 font-bold'
                                        }}
                                        styles={{
                                            head_cell: { width: '40px' },
                                            cell: { width: '40px' },
                                            day: { margin: '0 auto' }
                                        }}
                                    />
                                </div>
                            </Popover.Panel>
                        </Transition>
                    </>
                )}
            </Popover>
        </div>
    );
};
