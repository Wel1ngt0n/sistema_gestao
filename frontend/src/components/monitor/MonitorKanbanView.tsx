import { useMemo, useState, DragEvent } from 'react';
import { Store } from './types';
import { getStatusColor, formatDate } from './monitorUtils';

interface MonitorKanbanViewProps {
    data: Store[];
    onEdit: (store: Store) => void;
    // Callback para quando o card for movido para outra coluna
    // Status pode ser uma string que representa o novo status principal daquela coluna
    onStatusChange?: (storeId: number, newStatus: string) => void;
}

// Definição das Colunas do Kanban
const KANBAN_COLUMNS = [
    { id: 'backlog', title: 'Backlog / Fila', match: ['fila', 'backlog', 'novo', 'not_started'] },
    { id: 'omie', title: 'Cadastro Omie', match: ['omie', 'cadastro omie'] },
    { id: 'onboarding', title: 'Onboarding', match: ['onboarding', 'reunião inicial'] },
    { id: 'creation', title: 'Criação de Loja', match: ['criação de loja', 'criacao', 'store creation'] },
    { id: 'erp', title: 'Integração ERP', match: ['integração', 'erp', 'integra'] },
    { id: 'products', title: 'Cadastro de Produtos', match: ['produtos', 'cardápio', 'catalogo'] },
    { id: 'apps', title: 'Subir Apps', match: ['subir apps', 'app', 'ios', 'android', 'publicar'] },
    { id: 'qa', title: 'Controle de Qualidade', match: ['qa', 'qualidade', 'teste', 'revisão'] },
    { id: 'training', title: 'Treinamento', match: ['treinamento', 'treina'] },
    { id: 'done', title: 'Loja Entregue', match: ['entregue', 'finaliz', 'conclu', 'done'] },
];

export default function MonitorKanbanView({ data, onEdit, onStatusChange }: MonitorKanbanViewProps) {
    const [draggedStoreId, setDraggedStoreId] = useState<number | null>(null);

    // Agrupar Lojas por Coluna
    const columns = useMemo(() => {
        // Inicializa colunas vazias
        const cols: Record<string, Store[]> = {};
        KANBAN_COLUMNS.forEach(c => cols[c.id] = []);
        cols['others'] = []; // Coluna para o que não der match

        data.forEach(store => {
            const status = (store.status || '').toLowerCase();
            let matched = false;

            for (const col of KANBAN_COLUMNS) {
                if (col.match.some(m => status.includes(m))) {
                    cols[col.id].push(store);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                cols['others'].push(store);
            }
        });

        return cols;
    }, [data]);

    // Handlers de Drag & Drop
    const handleDragStart = (e: DragEvent<HTMLDivElement>, storeId: number) => {
        setDraggedStoreId(storeId);
        e.dataTransfer.effectAllowed = 'move';
        // Hack para transparência no drag ghost se necessário
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessário para permitir o drop
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, targetColumnId: string) => {
        e.preventDefault();

        if (draggedStoreId === null) return;
        if (!onStatusChange) return;

        // Encontrar o mapping do status de destino
        // Por simplicidade, vamos pegar o primeiro match da coluna como "Novo Status"
        // Em um cenário real, você provavelmente enviaria o ID da coluna e o backend decidiria o status exato
        const targetColDef = KANBAN_COLUMNS.find(c => c.id === targetColumnId);

        // Se for a coluna "Outros", talvez não devêssemos permitir drop, ou definir um status padrão "Unknown"
        if (!targetColDef && targetColumnId !== 'others') return;

        // Simulação de novo status (usando o primeiro termo match como status key)
        const newStatusKey = targetColDef ? targetColDef.match[0] : 'fila';

        onStatusChange(draggedStoreId, newStatusKey);
        setDraggedStoreId(null);
    };

    return (
        <div className="flex gap-4 items-start min-w-full pb-4">
            {KANBAN_COLUMNS.map(col => (
                <div
                    key={col.id}
                    className="flex-none w-80 flex flex-col bg-slate-100/40 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800 backdrop-blur-sm"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    {/* Column Header */}
                    <div className="p-3 border-b border-slate-200/60 dark:border-slate-800 flex justify-between items-center bg-slate-100/40 dark:bg-slate-900/40 rounded-t-xl sticky top-0 backdrop-blur-md z-20">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${columns[col.id]?.length > 0 ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                            {col.title}
                        </h4>
                        <span className="text-[10px] font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                            {columns[col.id]?.length || 0}
                        </span>
                    </div>

                    {/* Cards Container */}
                    <div className="p-2 space-y-2.5 min-h-[150px]">
                        {columns[col.id]?.map(store => (
                            <div
                                key={store.id}
                                draggable={!!onStatusChange}
                                onDragStart={(e) => handleDragStart(e, store.id)}
                                onClick={() => onEdit(store)}
                                className={`
                                    bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 
                                    cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group relative
                                    ${draggedStoreId === store.id ? 'opacity-40 ring-2 ring-indigo-500 rotate-2 scale-95 shadow-xl bg-indigo-50' : 'shadow-sm'}
                                `}
                            >
                                {/* Risk Indicator Line */}
                                {store.risk_score > 20 && (
                                    <div className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-rose-500/50 shadow-sm" title="Alto Risco"></div>
                                )}

                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">#{store.id}</span>
                                </div>

                                <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {store.name}
                                </h5>

                                {/* Tags Row */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[120px] border ${getStatusColor(store.status).includes('emerald')
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                        : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600'
                                        }`}>
                                        {store.status}
                                    </span>
                                    {store.financeiro_status === 'Devendo' && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                                            $ Devendo
                                        </span>
                                    )}
                                </div>

                                {/* Footer (Implantador & Date) */}
                                <div className="flex justify-between items-end pt-2 border-t border-slate-50 dark:border-slate-700/50 mt-1">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Responsável</span>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {store.implantador ? (
                                                <>
                                                    <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[8px] font-bold border border-indigo-50 dark:border-indigo-800">
                                                        {store.implantador.substring(0, 1)}
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[80px]">
                                                        {store.implantador.split(' ')[0]}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">--</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Previsão</span>
                                        <span className={`text-xs font-mono font-medium mt-0.5 ${(store.days_late_predicted || 0) > 0 ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {formatDate(store.data_previsao)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Unmapped Column (Ghost) */}
            {columns['others']?.length > 0 && (
                <div className="flex-none w-80 flex flex-col bg-slate-50/30 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="p-3 border-b border-dashed border-slate-300 dark:border-slate-800 flex justify-between items-center bg-transparent">
                        <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Outros / Não Mapeado</h4>
                        <span className="text-xs font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">{columns['others'].length}</span>
                    </div>
                    <div className="p-2 space-y-2">
                        {columns['others'].map(store => (
                            <div key={store.id} onClick={() => onEdit(store)} className="cursor-pointer bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white hover:shadow-sm transition-all">
                                <h5 className="font-medium text-sm text-slate-600 dark:text-slate-400">{store.name}</h5>
                                <span className="text-[10px] text-slate-400">{store.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
