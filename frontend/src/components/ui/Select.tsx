import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string | null;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    label?: string;
    className?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options, placeholder = "Selecione...", label, className }) => {
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={clsx("relative w-full", className)}>
            {label && (
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    {label}
                </label>
            )}
            <Listbox value={value || ''} onChange={onChange}>
                <div className="relative mt-1">
                    <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm border border-slate-200">
                        <span className={clsx("block truncate", !selectedOption && "text-slate-400")}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </span>
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg border border-slate-200 focus:outline-none sm:text-sm z-50">
                            {options.map((option, personIdx) => (
                                <Listbox.Option
                                    key={personIdx}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-900'}`
                                    }
                                    value={option.value}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                                {option.label}
                                            </span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                                    <Check className="h-4 w-4" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </div>
    );
};
