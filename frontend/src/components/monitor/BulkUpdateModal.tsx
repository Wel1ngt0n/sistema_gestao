import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Calendar, CheckCircle2, X } from 'lucide-react';

interface BulkUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { status?: string, manual_finished_at?: string }) => void;
    selectedCount: number;
    isLoading?: boolean;
}

export default function BulkUpdateModal({ isOpen, onClose, onConfirm, selectedCount, isLoading }: BulkUpdateModalProps) {
    const [status, setStatus] = useState('DONE');
    const [finishDate, setFinishDate] = useState(new Date().toISOString().split('T')[0]);

    const handleConfirm = () => {
        onConfirm({ 
            status, 
            manual_finished_at: status === 'DONE' ? finishDate : undefined 
        });
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                        <div>
                            <Dialog.Title className="text-lg font-bold text-zinc-900">Ações em Massa</Dialog.Title>
                            <Dialog.Description className="text-xs text-zinc-500 font-medium">
                                Atualizando {selectedCount} lojas simultaneamente
                            </Dialog.Description>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-200/50 rounded-xl transition-colors">
                            <X size={20} className="text-zinc-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Status Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Status de Destino</label>
                            <select 
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                            >
                                <option value="DONE">Concluída (Finalizar Implantação)</option>
                                <option value="IN_PROGRESS">Em Andamento</option>
                                <option value="PAUSED">Pausada</option>
                                <option value="WAITING">Aguardando</option>
                            </select>
                        </div>

                        {/* Date Selection (only if status is DONE) */}
                        {status === 'DONE' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Data de Conclusão</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar size={16} className="text-zinc-400" />
                                    </div>
                                    <input 
                                        type="date"
                                        value={finishDate}
                                        onChange={(e) => setFinishDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                            <p className="text-xs text-orange-700 leading-relaxed font-medium">
                                <strong>Atenção:</strong> Esta ação atualizará todas as lojas selecionadas de uma vez. O histórico de auditoria será registrado individualmente para cada uma.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex gap-3">
                        <button 
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-sm font-bold hover:bg-zinc-100 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    Confirmar Atualização
                                </>
                            )}
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
