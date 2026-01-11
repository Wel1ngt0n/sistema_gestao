import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface RulesData {
    risk_weights: Record<string, number>;
    performance_weights: Record<string, number>;
    op_weights: Record<string, number>;
    prazo_thresholds: [number, number][];
    idle_thresholds: [number, number][];
    load_levels: Record<string, number>;
}

const ScoringRulesPage: React.FC = () => {
    const [rules, setRules] = useState<RulesData | null>(null);

    useEffect(() => {
        api.get('/api/scoring/rules')
            .then(res => setRules(res.data))
            .catch(err => console.error("Erro ao carregar regras", err));
    }, []);

    if (!rules || !rules.risk_weights) return <div className="p-8 text-center text-slate-500">Carregando Regras... (Ou erro de conexão)</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">📋 Regras de Pontuação do Sistema</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Entenda como o Risco, a Performance e a Capacidade são calculados. Transparência total.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. RISCO DA LOJA */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">🤖 Score de Risco Loja (0-100)</h2>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Quanto maior, PIOR</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Mede a saúde da implantação. Usado no Monitor e Dashboard.
                    </p>

                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg mb-6">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Pilar</th>
                                    <th className="px-4 py-2 font-medium text-right">Peso</th>
                                    <th className="px-4 py-2 font-medium">O que afeta?</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                <tr>
                                    <td className="px-4 py-2">Prazo</td>
                                    <td className="px-4 py-2 text-right">{(rules.risk_weights.PRAZO * 100).toFixed(0)}%</td>
                                    <td className="px-4 py-2 text-slate-500">% do Contrato consumido</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2">Ociosidade (Idle)</td>
                                    <td className="px-4 py-2 text-right">{(rules.risk_weights.IDLE * 100).toFixed(0)}%</td>
                                    <td className="px-4 py-2 text-slate-500">Dias sem mexer no ClickUp</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2">Financeiro</td>
                                    <td className="px-4 py-2 text-right">{(rules.risk_weights.FINANCEIRO * 100).toFixed(0)}%</td>
                                    <td className="px-4 py-2 text-slate-500">Pendências ou Inadimplência</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2">Qualidade</td>
                                    <td className="px-4 py-2 text-right">{(rules.risk_weights.QUALIDADE * 100).toFixed(0)}%</td>
                                    <td className="px-4 py-2 text-slate-500">Retrabalho apontado</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-4">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Regra de Prazo (Consumo do Tempo)</h3>
                        <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-400 list-disc pl-4">
                            {rules.prazo_thresholds.map(([limit, score], i) => (
                                <li key={i}>
                                    Até <b>{(limit * 100).toFixed(0)}%</b> do tempo = <b className={score > 50 ? 'text-red-500' : 'text-green-500'}>{score} pts</b>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Regra de Ociosidade (Idle)</h3>
                        <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-400 list-disc pl-4">
                            {rules.idle_thresholds.map(([limit, score], i) => (
                                <li key={i}>
                                    Até <b>{limit === Infinity || limit > 1000 ? '> 20' : limit} dias</b> = <b className={score > 50 ? 'text-red-500' : 'text-green-500'}>{score} pts</b>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>



                {/* 1.5 RISCO IA & PRIORIZAÇÃO */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">🧠 Inteligência Artificial & Priorização</h2>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">Camada Preditiva</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        A IA monitora padrões e pode agravar o nível de risco independentemente da pontuação base.
                    </p>

                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">Alertas de Atraso (Preditivo)</h3>
                            <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-400 list-disc pl-4">
                                <li>Previsão de atraso <b>&gt; 7 dias</b> = Risco <span className="text-red-500 font-bold">CRÍTICO</span> (imediato).</li>
                                <li>Previsão de atraso <b>&gt; 0 dias</b> = Risco <span className="text-amber-500 font-bold">ALTO</span>.</li>
                            </ul>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">AI Boost (Priorização)</h3>
                            <p className="text-xs text-slate-500 mb-2">Fator de ordenação nas listas de prioridade:</p>
                            <code className="block bg-slate-200 dark:bg-slate-900 p-2 rounded text-xs font-mono text-slate-700 dark:text-slate-300">
                                Boost = (Dias Atraso Previsto * 2) + (Idle Score * 0.5)
                            </code>
                        </div>
                    </div>
                </div>

                {/* 2. PERFORMANCE IMPLANTADOR */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">🏆 Performance (Ranking)</h2>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Quanto maior, MELHOR</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Define a posição no Ranking Mensal. Baseado em entregas CONCLUÍDAS.
                    </p>

                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg mb-6">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Critério</th>
                                    <th className="px-4 py-2 font-medium text-right">Peso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                <tr>
                                    <td className="px-4 py-2">Volume (Entregas Ponderadas)</td>
                                    <td className="px-4 py-2 text-right">{(rules.performance_weights.VOLUME * 100).toFixed(0)}%</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2">OTD (No Prazo)</td>
                                    <td className="px-4 py-2 text-right">{(rules.performance_weights.OTD * 100).toFixed(0)}%</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2">Qualidade (Sem Retrabalho)</td>
                                    <td className="px-4 py-2 text-right">{(rules.performance_weights.QUALIDADE * 100).toFixed(0)}%</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2">Eficiência (Tempo Médio)</td>
                                    <td className="px-4 py-2 text-right">{(rules.performance_weights.EFICIENCIA * 100).toFixed(0)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                        <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-2">Pesos Operacionais (Matriz vs Filial)</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                            <b>Matriz:</b> {rules.op_weights.MATRIZ} ponto<br />
                            <b>Filial:</b> {rules.op_weights.FILIAL} ponto
                        </p>
                        <p className="text-xs text-slate-500 mt-2">* Válido para contagem de Volume e Carga de Trabalho.</p>
                    </div>
                </div>

                {/* 3. CAPACIDADE (CARGA) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm col-span-1 md:col-span-2">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">⚖️ Capacidade & Carga (Team Load)</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Mede se o time está sobrecarregado com lojas ativas (IN_PROGRESS).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/10 rounded-lg">
                            <span className="text-xs font-bold uppercase text-green-700 dark:text-green-400">Nível Normal</span>
                            <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                                40% - {rules.load_levels.NORMAL}%
                            </div>
                            <div className="text-sm text-green-600 dark:text-green-400">Zona ideal de produtividade</div>
                        </div>

                        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-lg">
                            <span className="text-xs font-bold uppercase text-red-700 dark:text-red-400">Sobrecarga</span>
                            <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                                &gt; {rules.load_levels.ALTO}%
                            </div>
                            <div className="text-sm text-red-600 dark:text-red-400">Risco de Burnout / Queda de Qualidade</div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ScoringRulesPage;
