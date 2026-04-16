import React from 'react';
import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';

interface Props {
    teamData: any[]; // The result from /reports/team-diagnostics
}

export const AlertSummaryBar: React.FC<Props> = ({ teamData }) => {
    // Only warn if they actually have active stores.
    const criticos = teamData.filter(d => (d.score?.score_final ?? 100) < 60 && d.ativos > 0).length;
    const atencao = teamData.filter(d => (d.score?.score_final ?? 100) >= 60 && (d.score?.score_final ?? 0) < 80 && d.ativos > 0).length;
    
    // Calculate total idle critical stores
    const idleCriticoCount = teamData.reduce((acc, curr) => acc + (curr.idle_critico_count || 0), 0);

    if (criticos === 0 && atencao === 0 && idleCriticoCount === 0) {
        return null; // Don't render if everything is fine
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {criticos > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-400 flex-1">
                    <AlertCircle size={20} className="shrink-0" />
                    <div>
                        <p className="text-sm font-semibold">Estado Crítico</p>
                        <p className="text-xs opacity-90">{criticos} analista{criticos > 1 ? 's' : ''} com score abaixo de 60</p>
                    </div>
                </div>
            )}
            
            {atencao > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-700 dark:text-amber-400 flex-1">
                    <AlertTriangle size={20} className="shrink-0" />
                    <div>
                        <p className="text-sm font-semibold">Atenção Necessária</p>
                        <p className="text-xs opacity-90">{atencao} analista{atencao > 1 ? 's' : ''} com score entre 60 e 79</p>
                    </div>
                </div>
            )}

            {idleCriticoCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-700 dark:text-blue-400 flex-1">
                    <Clock size={20} className="shrink-0" />
                    <div>
                        <p className="text-sm font-semibold">Lojas Paradas</p>
                        <p className="text-xs opacity-90">{idleCriticoCount} loja{idleCriticoCount > 1 ? 's' : ''} sem atualização há mais de 7 dias</p>
                    </div>
                </div>
            )}
        </div>
    );
};
