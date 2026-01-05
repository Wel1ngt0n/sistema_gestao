import { useEffect, useState } from 'react';
import axios from 'axios';
import { Store } from './types';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface MonitorAIModalProps {
    isOpen: boolean;
    onClose: () => void;
    store: Store | null;
}

interface AIAnalysisResult {
    risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    summary_network: string;
    specific_blockers: string[];
    action_plan: string[];
}

export default function MonitorAIModal({ isOpen, onClose, store }: MonitorAIModalProps) {
    const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && store) {
            fetchAnalysis(store.id);
        } else {
            if (!isOpen) {
                setAnalysis(null);
                setLoading(false);
                setError(null);
            }
        }
    }, [isOpen, store]);

    const fetchAnalysis = async (storeId: number) => {
        setLoading(true);
        setAnalysis(null);
        setError(null);
        try {
            // New endpoint for network-aware analysis
            const res = await axios.post(`http://localhost:5000/api/ai/analyze-network/${storeId}`);
            setAnalysis(res.data);
        } catch (e) {
            console.error(e);
            setError("Não foi possível conectar à Inteligência Artificial no momento. Verifique se a chave de API está configurada.");
        } finally {
            setLoading(false);
        }
    };

    const getRiskBadge = (level: string) => {
        switch (level) {
            case 'CRITICAL': return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-500 border border-red-500/50 font-bold animate-pulse">CRÍTICO</span>;
            case 'HIGH': return <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-500 border border-orange-500/50 font-bold">ALTO</span>;
            case 'MEDIUM': return <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 font-bold">MÉDIO</span>;
            case 'LOW': return <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 font-bold">BAIXO</span>;
            default: return <span className="px-3 py-1 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/50">DESCONHECIDO</span>;
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 text-left align-middle shadow-xl transition-all">
                                {/* Header */}
                                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                                    <div>
                                        <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-white flex items-center gap-2">
                                            🤖 Análise de Risco & Contexto
                                        </Dialog.Title>
                                        <p className="text-sm text-slate-400 mt-1">
                                            Análise baseada em toda a rede (Matriz + Filiais)
                                        </p>
                                    </div>
                                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                                        <span className="sr-only">Fechar</span>
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-8">
                                    {loading ? (
                                        <div className="space-y-6 animate-pulse">
                                            <div className="flex gap-4">
                                                <div className="h-8 w-24 bg-slate-800 rounded-full"></div>
                                                <div className="h-8 w-full bg-slate-800 rounded-lg"></div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="h-4 bg-slate-800 rounded w-full"></div>
                                                <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                                                <div className="h-4 bg-slate-800 rounded w-4/6"></div>
                                            </div>
                                            <div className="h-32 bg-slate-800 rounded-xl"></div>
                                        </div>
                                    ) : error ? (
                                        <div className="text-center py-10">
                                            <div className="text-4xl mb-4">😵</div>
                                            <h3 className="text-lg font-bold text-slate-300">Ops, algo deu errado.</h3>
                                            <p className="text-slate-500 mt-2 max-w-md mx-auto">{error}</p>
                                            <button
                                                onClick={() => store && fetchAnalysis(store.id)}
                                                className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors"
                                            >
                                                Tentar Novamente
                                            </button>
                                        </div>
                                    ) : analysis ? (
                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            {/* Status Row */}
                                            <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                                <div className="flex flex-col">
                                                    <span className="text-xs uppercase font-bold text-slate-500">Nível de Risco Identificado</span>
                                                    <div className="mt-1">{getRiskBadge(analysis.risk_level)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs text-slate-500">Loja Analisada</span>
                                                    <p className="font-bold text-white">{store?.name}</p>
                                                </div>
                                            </div>

                                            {/* Summary */}
                                            <div>
                                                <h4 className="text-sm font-bold uppercase text-slate-400 mb-3 flex items-center gap-2">
                                                    📄 Resumo Executivo (Rede)
                                                </h4>
                                                <p className="text-slate-300 leading-relaxed bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                                                    {analysis.summary_network}
                                                </p>
                                            </div>

                                            {/* Blockers */}
                                            {analysis.specific_blockers && analysis.specific_blockers.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-bold uppercase text-rose-400 mb-3 flex items-center gap-2">
                                                        🚧 Bloqueios/Gargalos
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {analysis.specific_blockers.map((blocker, idx) => (
                                                            <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg">
                                                                <span className="text-rose-500 mt-0.5">⚠️</span>
                                                                {blocker}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Action Plan */}
                                            <div>
                                                <h4 className="text-sm font-bold uppercase text-emerald-400 mb-3 flex items-center gap-2">
                                                    ✅ Plano de Ação Sugerido
                                                </h4>
                                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl overflow-hidden">
                                                    {analysis.action_plan.map((action, idx) => (
                                                        <div key={idx} className="flex items-start gap-4 p-4 border-b border-emerald-500/10 last:border-0 hover:bg-emerald-500/10 transition-colors">
                                                            <div className="flex-none bg-emerald-500/20 text-emerald-400 font-bold w-6 h-6 rounded flex items-center justify-center text-xs">
                                                                {idx + 1}
                                                            </div>
                                                            <p className="text-slate-200 text-sm font-medium">{action}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => store && fetchAnalysis(store.id)}
                                                    className="text-xs text-slate-500 hover:text-indigo-400 underline"
                                                >
                                                    Regerar análise
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
