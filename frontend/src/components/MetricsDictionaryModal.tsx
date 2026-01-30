import { X, BookOpen, Info } from 'lucide-react';

interface MetricsDictionaryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MetricsDictionaryModal({ isOpen, onClose }: MetricsDictionaryModalProps) {
    if (!isOpen) return null;

    const sections = [
        {
            title: "📈 Indicadores de Performance",
            items: [
                { term: "SLA (Prazo)", def: "Acordo de nível de serviço. O padrão é 90 dias a partir do início real, mas pode ser ajustado manualmente no cadastro da loja." },
                { term: "% Prazo", def: "Porcentagem de lojas CONCLUÍDAS que foram entregues dentro do prazo de contrato." },
                { term: "WIP (Work in Progress)", def: "Quantidade de lojas ativas (em implantação) no momento." }
            ]
        },
        {
            title: "💰 Financeiro",
            items: [
                { term: "MRR em Implantação", def: "Soma das mensalidades de todas as lojas que ainda não foram concluídas." },
                { term: "MRR Devendo", def: "Mensalidade de lojas que já deveriam estar pagando mas constam como 'Devendo' no cadastro." },
                { term: "Previsão Financeira", def: "Estimativa de quanto MRR será ativado em cada mês, baseada na Data Prevista de Go Live." }
            ]
        },
        {
            title: "⏳ Gestão de Tempo",
            items: [
                { term: "Dias na Etapa", def: "Tempo corrido desde a última mudança de status no ClickUp." },
                { term: "Dias em Trânsito", def: "Tempo total desde a criação da tarefa ou data de início manual. Pausas registradas são descontadas deste valor." },
                { term: "Idle Days (Ociosidade)", def: "Dias sem nenhuma movimentação ou comentário na tarefa." }
            ]
        },
        {
            title: "🧮 Score de Risco",
            items: [
                { term: "Score Total", def: "Soma ponderada dos fatores de risco. Acima de 150 é Crítico." },
                { term: "Fatores", def: "Dias Corridos + (Dias Parado x 2) + Penalidade Financeira + Penalidade Retrabalho." }
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-slate-900 dark:text-white">Dicionário de Métricas</h3>
                            <p className="text-sm text-slate-500">Entenda como cada número é calculado.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 hover:text-red-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {sections.map((section, idx) => (
                        <div key={idx} className="space-y-4">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                                {section.title}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {section.items.map((item, i) => (
                                    <div key={i} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                                        <div className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-1 flex items-center gap-1">
                                            <Info size={12} /> {item.term}
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {item.def}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-right">
                    <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-lg">
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
}
