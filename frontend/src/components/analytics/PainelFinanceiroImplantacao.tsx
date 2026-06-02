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
        <div className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg" style={{ backgroundColor: cor }} />
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{rotulo}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{valor}</p>
                </div>
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2" style={{ color: cor }}>
                    <IconeFinanceiro nome={icone} />
                </div>
            </div>
            <p className="mt-3 text-sm text-zinc-500">{apoio}</p>
        </div>
    );
};

export const PainelFinanceiroImplantacao: React.FC<PropriedadesPainelFinanceiroImplantacao> = ({ filtros, kpis }) => {
    const consultaFinanceira = useDadosFinanceiroImplantacao(filtros);
    const dadosFinanceiros = consultaFinanceira.data;

    const resumo = dadosFinanceiros?.resumo;
    const lojas = dadosFinanceiros?.lojas || [];

    const resumoComFallback = {
        lojas_concluidas_pagantes: resumo?.lojas_concluidas_pagantes ?? 0,
        lojas_concluidas_nao_pagantes: resumo?.lojas_concluidas_nao_pagantes ?? 0,
        mensalidade_pendente_entrada: resumo?.mensalidade_pendente_entrada ?? 0,
        mrr_ativado: resumo?.mrr_ativado ?? kpis?.mrr_done_period ?? 0,
        mrr_pendente_cobranca: resumo?.mrr_pendente_cobranca ?? kpis?.mrr_backlog ?? 0,
        lojas_em_implantacao: resumo?.lojas_em_implantacao ?? kpis?.wip_stores ?? 0,
        lojas_prontas_para_cobranca: resumo?.lojas_prontas_para_cobranca ?? 0,
    };

    const dadosGrafico = useMemo(() => ({
        labels: ['Pagantes', 'Não pagantes', 'Prontas cobrança', 'Em implantação'],
        datasets: [
            {
                label: 'Lojas',
                data: [
                    resumoComFallback.lojas_concluidas_pagantes,
                    resumoComFallback.lojas_concluidas_nao_pagantes,
                    resumoComFallback.lojas_prontas_para_cobranca,
                    resumoComFallback.lojas_em_implantacao,
                ],
                ...estiloBarraLaranja,
                backgroundColor: [
                    'rgba(18, 129, 49, 0.26)',
                    'rgba(255, 121, 0, 0.28)',
                    'rgba(234, 179, 8, 0.28)',
                    'rgba(113, 113, 122, 0.18)',
                ],
                borderColor: [
                    'rgba(18, 129, 49, 0.72)',
                    'rgba(255, 121, 0, 0.72)',
                    'rgba(234, 179, 8, 0.72)',
                    'rgba(113, 113, 122, 0.48)',
                ],
            },
            {
                label: 'MRR',
                data: [
                    resumoComFallback.mrr_ativado,
                    resumoComFallback.mrr_pendente_cobranca,
                    resumoComFallback.mensalidade_pendente_entrada,
                    0,
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CartaoResumo
                    rotulo="Concluídas pagantes"
                    valor={formatarNumero(resumoComFallback.lojas_concluidas_pagantes)}
                    apoio="Lojas implantadas que já entraram em cobrança."
                    icone="ok"
                    tom="verde"
                />
                <CartaoResumo
                    rotulo="Concluídas não pagantes"
                    valor={formatarNumero(resumoComFallback.lojas_concluidas_nao_pagantes)}
                    apoio="Implantadas, mas ainda sem início de pagamento."
                    icone="alerta"
                    tom="laranja"
                />
                <CartaoResumo
                    rotulo="Mensalidade pendente"
                    valor={formatarMoeda(resumoComFallback.mensalidade_pendente_entrada)}
                    apoio="Valor que falta entrar após lojas já concluídas."
                    icone="relogio"
                    tom="alerta"
                />
                <CartaoResumo
                    rotulo="MRR ativado"
                    valor={formatarMoeda(resumoComFallback.mrr_ativado)}
                    apoio="Receita recorrente já liberada para cobrança."
                    icone="carteira"
                    tom="verde"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-7">
                    <div className="mb-5 flex items-start justify-between gap-4">
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
                    <div className="h-[360px]">
                        <GraficoReact type="bar" data={dadosGrafico} options={opcoesGrafico} />
                    </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                        <span className="text-[#128131]"><IconeFinanceiro nome="cartao" /></span>
                        Ação financeira por loja
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                        Lista operacional para cobrar, ativar ou confirmar início de mensalidade.
                    </p>

                    <div className="mt-5 space-y-3">
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
                                        {loja.status_cobranca.replaceAll('_', ' ')}
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
