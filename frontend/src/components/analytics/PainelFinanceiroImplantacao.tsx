import React, { useMemo } from 'react';
import { Chart as GraficoReact } from 'react-chartjs-2';
import 'chart.js/auto';
import type { AnalyticsFiltersState as EstadoFiltrosAnalytics } from '../../hooks/useDashboardUrlParams';
import type { KPIData as DadosKpi } from './useAnalyticsData';
import { useDadosFinanceiroImplantacao } from '../../hooks/useDadosFinanceiroImplantacao';
import {
    coresAnalytics,
    estiloBarraLaranja,
    estiloBarraVerde,
    formatarMoeda,
    formatarNumero,
    opcoesGraficoExecutivo,
} from './graficos/temaGraficosAnalytics';

interface PropriedadesPainelFinanceiroImplantacao {
    filtros: EstadoFiltrosAnalytics;
    kpis: DadosKpi | null;
}

type NomeIconeFinanceiro = 'ok' | 'alerta' | 'relogio' | 'carteira' | 'dinheiro' | 'cartao';

const iconesFinanceiros: Record<NomeIconeFinanceiro, string> = {
    ok: '✓',
    alerta: '!',
    relogio: 'h',
    carteira: '$',
    dinheiro: '$',
    cartao: 'R$',
};

const IconeFinanceiro = ({ nome }: { nome: NomeIconeFinanceiro }) => (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded text-xs font-bold leading-none">
        {iconesFinanceiros[nome]}
    </span>
);

const CartaoResumo = ({
    rotulo,
    valor,
    apoio,
    icone,
    tom = 'laranja',
}: {
    rotulo: string;
    valor: string;
    apoio: string;
    icone: NomeIconeFinanceiro;
    tom?: 'laranja' | 'verde' | 'neutro' | 'alerta';
}) => {
    const cor = tom === 'verde' ? coresAnalytics.verde : tom === 'alerta' ? coresAnalytics.alerta : tom === 'neutro' ? coresAnalytics.textoSuave : coresAnalytics.laranja;

    return (
        <div className="relative rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg" style={{ backgroundColor: cor }} />
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{rotulo}</p>
                    <p className="mt-2 text-[1.35rem] font-semibold leading-tight tracking-tight text-zinc-950">{valor}</p>
                </div>
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2" style={{ color: cor }}>
                    <IconeFinanceiro nome={icone} />
                </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">{apoio}</p>
        </div>
    );
};

const rotulosStatusCobranca: Record<string, string> = {
    pagante: 'Pagante',
    nao_pagante: 'Nao pagante',
    sem_status_financeiro: 'Sem status',
    pendente_cobranca: 'Pronta cobranca',
    em_implantacao: 'Em implantacao',
};

export const PainelFinanceiroImplantacao: React.FC<PropriedadesPainelFinanceiroImplantacao> = ({ filtros, kpis }) => {
    const consultaFinanceira = useDadosFinanceiroImplantacao(filtros);
    const dadosFinanceiros = consultaFinanceira.data;

    const resumo = dadosFinanceiros?.resumo;
    const lojas = dadosFinanceiros?.lojas || [];

    const resumoComFallback = {
        lojas_concluidas_pagantes: resumo?.lojas_concluidas_pagantes ?? 0,
        lojas_concluidas_nao_pagantes: resumo?.lojas_concluidas_nao_pagantes ?? 0,
        lojas_concluidas_nao_pagantes_explicitas: resumo?.lojas_concluidas_nao_pagantes_explicitas ?? resumo?.lojas_concluidas_nao_pagantes ?? 0,
        lojas_concluidas_sem_status: resumo?.lojas_concluidas_sem_status ?? 0,
        mensalidade_pendente_entrada: resumo?.mensalidade_pendente_entrada ?? 0,
        mrr_ativado: resumo?.mrr_ativado ?? kpis?.mrr_done_period ?? 0,
        mrr_concluido_nao_pagante: resumo?.mrr_concluido_nao_pagante ?? resumo?.mensalidade_pendente_entrada ?? 0,
        mrr_concluido_sem_status: resumo?.mrr_concluido_sem_status ?? 0,
        mrr_em_implantacao: resumo?.mrr_em_implantacao ?? kpis?.mrr_backlog ?? 0,
        mrr_pendente_cobranca: resumo?.mrr_pendente_cobranca ?? kpis?.mrr_backlog ?? 0,
        lojas_em_implantacao: resumo?.lojas_em_implantacao ?? kpis?.wip_stores ?? 0,
        lojas_prontas_para_cobranca: resumo?.lojas_prontas_para_cobranca ?? 0,
    };

    const dadosGrafico = useMemo(() => ({
        labels: ['Pagantes', 'Sem status', 'Nao pagantes', 'Prontas', 'Em implantacao'],
        datasets: [
            {
                label: 'Lojas',
                data: [
                    resumoComFallback.lojas_concluidas_pagantes,
                    resumoComFallback.lojas_concluidas_sem_status,
                    resumoComFallback.lojas_concluidas_nao_pagantes_explicitas,
                    resumoComFallback.lojas_prontas_para_cobranca,
                    resumoComFallback.lojas_em_implantacao,
                ],
                ...estiloBarraLaranja,
                backgroundColor: [
                    'rgba(18, 129, 49, 0.26)',
                    'rgba(113, 113, 122, 0.18)',
                    'rgba(255, 121, 0, 0.28)',
                    'rgba(234, 179, 8, 0.28)',
                    'rgba(59, 130, 246, 0.16)',
                ],
                borderColor: [
                    'rgba(18, 129, 49, 0.72)',
                    'rgba(113, 113, 122, 0.48)',
                    'rgba(255, 121, 0, 0.72)',
                    'rgba(234, 179, 8, 0.72)',
                    'rgba(59, 130, 246, 0.5)',
                ],
            },
            {
                label: 'MRR',
                data: [
                    resumoComFallback.mrr_ativado,
                    resumoComFallback.mrr_concluido_sem_status,
                    resumoComFallback.mrr_concluido_nao_pagante,
                    resumoComFallback.mrr_pendente_cobranca,
                    resumoComFallback.mrr_em_implantacao,
                ],
                ...estiloBarraVerde,
                yAxisID: 'y1',
            },
        ],
    }), [resumoComFallback]);

    const opcoesBaseGrafico = opcoesGraficoExecutivo<'bar'>() as any;

    const opcoesGrafico = {
        ...opcoesBaseGrafico,
        scales: {
            ...opcoesBaseGrafico.scales,
            y: {
                ...opcoesBaseGrafico.scales?.y,
                title: { display: true, text: 'Quantidade de lojas', color: coresAnalytics.textoSuave },
            },
            y1: {
                type: 'linear' as const,
                position: 'right' as const,
                beginAtZero: true,
                grid: { drawOnChartArea: false },
                ticks: {
                    color: coresAnalytics.textoSuave,
                    callback: (valor: string | number) => formatarMoeda(Number(valor)),
                },
                border: { display: false },
                title: { display: true, text: 'MRR / mensalidade', color: coresAnalytics.textoSuave },
            },
        },
        plugins: {
            ...opcoesBaseGrafico.plugins,
            tooltip: {
                ...opcoesBaseGrafico.plugins?.tooltip,
                callbacks: {
                    label: (contexto: any) => {
                        const valor = contexto.parsed.y || 0;
                        return contexto.dataset.label === 'MRR'
                            ? `${contexto.dataset.label}: ${formatarMoeda(valor)}`
                            : `${contexto.dataset.label}: ${formatarNumero(valor)}`;
                    },
                },
            },
        },
    };

    const listaLojas = lojas.slice(0, 8);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <CartaoResumo
                    rotulo="MRR ativado"
                    valor={formatarMoeda(resumoComFallback.mrr_ativado)}
                    apoio={`${formatarNumero(resumoComFallback.lojas_concluidas_pagantes)} lojas ja liberadas para cobranca.`}
                    icone="ok"
                    tom="verde"
                />
                <CartaoResumo
                    rotulo="MRR pendente concluido"
                    valor={formatarMoeda(resumoComFallback.mensalidade_pendente_entrada)}
                    apoio={`${formatarNumero(resumoComFallback.lojas_concluidas_nao_pagantes)} lojas concluidas sem receita ativada.`}
                    icone="alerta"
                    tom="laranja"
                />
                <CartaoResumo
                    rotulo="Sem status financeiro"
                    valor={formatarNumero(resumoComFallback.lojas_concluidas_sem_status)}
                    apoio={`${formatarMoeda(resumoComFallback.mrr_concluido_sem_status)} parado por cadastro financeiro vazio.`}
                    icone="relogio"
                    tom="alerta"
                />
                <CartaoResumo
                    rotulo="MRR em implantacao"
                    valor={formatarMoeda(resumoComFallback.mrr_em_implantacao)}
                    apoio={`${formatarNumero(resumoComFallback.lojas_em_implantacao)} lojas ainda em andamento.`}
                    icone="carteira"
                    tom="neutro"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-8">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                                <span className="text-[#ff7900]"><IconeFinanceiro nome="dinheiro" /></span>
                                Implantação convertida em cobrança
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500">
                                Compara lojas implantadas, pendências de pagamento e MRR pronto para entrar.
                            </p>
                        </div>
                        {consultaFinanceira.isError && (
                            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                                endpoint pendente
                            </span>
                        )}
                    </div>
                    <div className="h-[300px]">
                        <GraficoReact type="bar" data={dadosGrafico} options={opcoesGrafico} />
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600 md:grid-cols-3">
                        <div>
                            <span className="font-semibold text-zinc-900">{formatarNumero(resumoComFallback.lojas_concluidas_sem_status)}</span> concluidas sem status
                        </div>
                        <div>
                            <span className="font-semibold text-zinc-900">{formatarNumero(resumoComFallback.lojas_concluidas_nao_pagantes_explicitas)}</span> marcadas como nao pagantes
                        </div>
                        <div>
                            <span className="font-semibold text-zinc-900">{formatarNumero(resumoComFallback.lojas_prontas_para_cobranca)}</span> prontas para cobranca
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                        <span className="text-[#128131]"><IconeFinanceiro nome="cartao" /></span>
                        Ação financeira por loja
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                        Lista operacional para cobrar, ativar ou confirmar início de mensalidade.
                    </p>

                    <div className="mt-4 max-h-[410px] space-y-2 overflow-y-auto pr-1">
                        {listaLojas.length > 0 ? listaLojas.map((loja) => (
                            <div key={loja.id} className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-900">{loja.nome}</p>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            {loja.implantador || 'Sem implantador'} · {loja.etapa}
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                                        {rotulosStatusCobranca[loja.status_cobranca] || loja.status_cobranca.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-zinc-700">{formatarMoeda(loja.mensalidade)}</span>
                                    <span className="text-zinc-500">
                                        {loja.dias_desde_conclusao ? `${loja.dias_desde_conclusao} dias desde conclusão` : 'sem atraso calculado'}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
                                Aguardando o endpoint financeiro de implantação. Enquanto isso, os cartões usam MRR ativado e backlog atuais como fallback.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
