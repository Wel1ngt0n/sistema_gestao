import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExternalLink, LucideIcon, Store, X } from 'lucide-react';
import { ReactNode } from 'react';

export interface OperationalDetailTab<T extends string> {
    id: T;
    label: string;
    icon: LucideIcon;
    badge?: number;
}

interface OperationalDetailModalShellProps<T extends string> {
    open: boolean;
    title: string;
    subtitle?: string | null;
    status?: ReactNode;
    externalUrl?: string | null;
    tabs: OperationalDetailTab<T>[];
    activeTab: T;
    onTabChange: (tab: T) => void;
    onClose: () => void;
    headerContent?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
}

export default function OperationalDetailModalShell<T extends string>({
    open,
    title,
    subtitle,
    status,
    externalUrl,
    tabs,
    activeTab,
    onTabChange,
    onClose,
    headerContent,
    footer,
    children,
}: OperationalDetailModalShellProps<T>) {
    return (
        <Dialog open={open} onClose={onClose} className="relative z-[90]">
            <DialogBackdrop className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
            <div className="fixed inset-0 overflow-y-auto p-0 sm:p-4 lg:p-7">
                <div className="flex min-h-full items-center justify-center">
                    <DialogPanel className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(900px,calc(100dvh-2rem))] sm:max-w-6xl sm:rounded-2xl sm:border sm:border-slate-200">
                        <header className="relative shrink-0 border-b border-slate-200 bg-white">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ff7900] via-[#ff9a3c] to-[#128131]" />
                            <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-6 sm:px-7">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff7900] ring-1 ring-orange-100 sm:flex">
                                        <Store size={21} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <DialogTitle className="truncate text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">{title}</DialogTitle>
                                            {status}
                                        </div>
                                        {subtitle && <p className="mt-1 truncate text-xs font-medium text-slate-500">{subtitle}</p>}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    {externalUrl && (
                                        <a href={externalUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-slate-500 transition hover:bg-orange-50 hover:text-[#d85f00] sm:px-3" title="Abrir tarefa no ClickUp">
                                            <ExternalLink size={17} /> <span className="hidden sm:inline">ClickUp</span>
                                        </a>
                                    )}
                                    <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900" aria-label="Fechar detalhes">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {headerContent && <div className="px-4 pb-4 sm:px-7">{headerContent}</div>}

                            <div className="scrollbar-none flex gap-1 overflow-x-auto px-3 sm:px-6" role="tablist" aria-label="Seções do detalhe da loja">
                                {tabs.map(({ id, label, icon: Icon, badge }) => {
                                    const selected = id === activeTab;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => onTabChange(id)}
                                            className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-bold transition ${selected ? 'border-[#ff7900] text-[#d85f00]' : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800'}`}
                                        >
                                            <Icon size={15} /> {label}
                                            {badge !== undefined && badge > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${selected ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{badge}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-7">
                            {children}
                        </div>

                        {footer && <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] sm:px-7">{footer}</footer>}
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}
