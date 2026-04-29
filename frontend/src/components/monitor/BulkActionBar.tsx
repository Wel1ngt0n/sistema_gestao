import { CheckCircle2, Edit3, X } from 'lucide-react';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onBulkAction: () => void;
}

export default function BulkActionBar({ selectedCount, onClearSelection, onBulkAction }: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-3xl shadow-2xl px-6 py-4 flex items-center gap-8 ring-1 ring-white/10">
                
                {/* Count & Info */}
                <div className="flex items-center gap-4">
                    <div className="bg-orange-500 text-white w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg shadow-orange-500/30">
                        {selectedCount}
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-none">Lojas Selecionadas</p>
                        <p className="text-zinc-400 text-[10px] mt-1 uppercase tracking-widest font-medium">Ações em Massa Disponíveis</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-zinc-700/50"></div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onBulkAction}
                        className="flex items-center gap-2 bg-white text-zinc-900 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-tight hover:bg-orange-500 hover:text-white transition-all duration-300"
                    >
                        <CheckCircle2 size={16} />
                        Concluir / Editar
                    </button>
                    
                    <button 
                        disabled
                        className="flex items-center gap-2 bg-zinc-800 text-zinc-500 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-tight cursor-not-allowed opacity-50"
                        title="Em breve: Vincular Matriz"
                    >
                        <Edit3 size={16} />
                        Vincular
                    </button>
                </div>

                {/* Close/Clear */}
                <button 
                    onClick={onClearSelection}
                    className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
                    title="Limpar Seleção"
                >
                    <X size={20} />
                </button>

            </div>
        </div>
    );
}
