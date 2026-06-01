import { useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';

interface MonitorImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (dados: {
        arquivo: File;
        modo: 'atualizacao_campos' | 'financeiro_pagantes';
        atualizarNaoListadas: boolean;
        statusFinanceiroPadrao: string;
    }) => Promise<void>;
    isLoading?: boolean;
}

const OPCOES_MODO = [
    {
        valor: 'atualizacao_campos' as const,
        titulo: 'Atualizacao de campos',
        descricao: 'Atualiza implantador, rede, tipo de loja, status financeiro, CNPJ, qualidade e retrabalho.',
    },
    {
        valor: 'financeiro_pagantes' as const,
        titulo: 'Planilha do financeiro',
        descricao: 'Marca as lojas listadas como pagantes a partir do CNPJ.',
    },
];

export default function MonitorImportModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
}: MonitorImportModalProps) {
    const [arquivo, setArquivo] = useState<File | null>(null);
    const [modo, setModo] = useState<'atualizacao_campos' | 'financeiro_pagantes'>('atualizacao_campos');
    const [atualizarNaoListadas, setAtualizarNaoListadas] = useState(false);
    const [statusFinanceiroPadrao, setStatusFinanceiroPadrao] = useState('Pago');

    const nomeArquivo = useMemo(() => arquivo?.name || 'Nenhum arquivo selecionado', [arquivo]);

    const handleClose = () => {
        if (isLoading) return;
        setArquivo(null);
        setModo('atualizacao_campos');
        setAtualizarNaoListadas(false);
        setStatusFinanceiroPadrao('Pago');
        onClose();
    };

    const handleConfirm = async () => {
        if (!arquivo) {
            alert('Selecione uma planilha antes de importar.');
            return;
        }

        await onConfirm({
            arquivo,
            modo,
            atualizarNaoListadas,
            statusFinanceiroPadrao,
        });
        handleClose();
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[110]">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 p-6">
                        <div>
                            <Dialog.Title className="text-lg font-bold text-zinc-900">Importar planilha no monitor</Dialog.Title>
                            <Dialog.Description className="text-xs font-medium text-zinc-500">
                                A localizacao das lojas e feita sempre pelo CNPJ, com limpeza automatica da mascara.
                            </Dialog.Description>
                        </div>
                        <button onClick={handleClose} className="rounded-xl p-2 transition-colors hover:bg-zinc-200/60" disabled={isLoading}>
                            <X size={20} className="text-zinc-400" />
                        </button>
                    </div>

                    <div className="space-y-6 p-6">
                        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5">
                            <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Arquivo
                            </label>
                            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-orange-300 hover:bg-orange-50/40">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                                        <FileSpreadsheet size={17} className="text-orange-500" />
                                        <span className="truncate">{nomeArquivo}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-500">Aceita `.csv`, `.xlsx` e `.xls`.</p>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white">
                                    <Upload size={14} />
                                    Escolher arquivo
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={(evento) => setArquivo(evento.target.files?.[0] || null)}
                                />
                            </label>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Tipo de importacao
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                                {OPCOES_MODO.map((opcao) => {
                                    const ativo = modo === opcao.valor;
                                    return (
                                        <button
                                            key={opcao.valor}
                                            type="button"
                                            onClick={() => setModo(opcao.valor)}
                                            className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                                                ativo
                                                    ? 'border-orange-300 bg-orange-50 shadow-sm shadow-orange-100'
                                                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                                            }`}
                                        >
                                            <div className="text-sm font-bold text-zinc-900">{opcao.titulo}</div>
                                            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{opcao.descricao}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {modo === 'financeiro_pagantes' && (
                            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 animate-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                        Status financeiro para lojas listadas
                                    </label>
                                    <input
                                        type="text"
                                        value={statusFinanceiroPadrao}
                                        onChange={(evento) => setStatusFinanceiroPadrao(evento.target.value)}
                                        className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
                                        placeholder="Ex.: Pago"
                                    />
                                </div>

                                <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-zinc-700">
                                    <input
                                        type="checkbox"
                                        checked={atualizarNaoListadas}
                                        onChange={(evento) => setAtualizarNaoListadas(evento.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span>
                                        Marcar todas as lojas que NAO estiverem na planilha como <strong>Nao paga mensalidade</strong>.
                                        Use somente quando a planilha do financeiro estiver completa.
                                    </span>
                                </label>
                            </div>
                        )}

                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-600">
                            <p className="font-semibold text-zinc-800">Coluna obrigatoria</p>
                            <p className="mt-1">`CNPJ`.</p>
                            <p className="mt-3 font-semibold text-zinc-800">Colunas aceitas na atualizacao de campos</p>
                            <p className="mt-1">`implantador`, `rede`, `tipo_loja`, `status_financeiro`, `cnpj`, `entregue_com_qualidade`, `teve_retrabalho`.</p>
                        </div>
                    </div>

                    <div className="flex gap-3 border-t border-zinc-100 bg-zinc-50/60 p-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-100 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Importando...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Importar planilha
                                </>
                            )}
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
