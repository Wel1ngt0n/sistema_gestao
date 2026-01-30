import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { X, User, Calendar, FileText, CheckSquare } from 'lucide-react';

const API_URL = 'http://localhost:5003/api';

interface ForecastHistoryModalProps {
    storeId: number;
    storeName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ForecastHistoryModal({ storeId, storeName, isOpen, onClose }: ForecastHistoryModalProps) {

    const { data: history, isLoading } = useQuery({
        queryKey: ['forecast-audit', storeId],
        queryFn: async () => {
            if (!storeId) return [];
            const res = await axios.get(`${API_URL}/audit/forecast/${storeId}`);
            return res.data;
        },
        enabled: isOpen && !!storeId
    });

    if (!isOpen) return null;

    const getFieldLabel = (field: string) => {
        const map: any = {
            'manual_go_live_date': 'Data Prevista',
            'include_in_forecast': 'Considerar no Forecast',
            'forecast_obs': 'Observações',
            'projected_orders': 'Projeção Pedidos',
            'order_rate': 'Taxa Conversão'
        };
        return map[field] || field;
    };

    const getIcon = (field: string) => {
        if (field.includes('date')) return <Calendar size={14} />;
        if (field.includes('include')) return <CheckSquare size={14} />;
        return <FileText size={14} />;
    };

    const formatValue = (field: string, val: string) => {
        if (val === 'True') return 'Sim';
        if (val === 'False') return 'Não';
        if (val === 'None') return 'Vazio';
        if (field.includes('date') && val && val.length > 10) return val.substring(0, 10);
        return val;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Histórico de Alterações</h3>
                        <p className="text-sm text-slate-500">{storeName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoading ? (
                        <div className="text-center text-slate-500 py-8">Carregando histórico...</div>
                    ) : history && history.length > 0 ? (
                        <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-6">
                            {history.map((log: any) => (
                                <div key={log.id} className="ml-6 relative">
                                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-slate-800"></div>

                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                        <span>{new Date(log.changed_at).toLocaleString('pt-BR')}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><User size={10} /> {log.actor}</span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 text-sm mb-2">
                                            {getIcon(log.field)}
                                            {getFieldLabel(log.field)}
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded strike-through line-through opacity-70">
                                                {formatValue(log.field, log.old_value)}
                                            </span>
                                            <span className="text-slate-400">→</span>
                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded font-bold">
                                                {formatValue(log.field, log.new_value)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 py-8 italic">
                            Nenhuma alteração registrada para esta loja.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
