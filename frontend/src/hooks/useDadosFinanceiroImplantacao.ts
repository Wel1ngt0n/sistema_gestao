import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { AnalyticsFiltersState } from './useDashboardUrlParams';

export interface ResumoFinanceiroImplantacao {
    lojas_concluidas_pagantes: number;
    lojas_concluidas_nao_pagantes: number;
    lojas_concluidas_nao_pagantes_explicitas?: number;
    lojas_concluidas_sem_status?: number;
    lojas_concluidas_devedores?: number;
    lojas_concluidas_canceladas?: number;
    mensalidade_pendente_entrada: number;
    mrr_ativado: number;
    mrr_concluido_nao_pagante?: number;
    mrr_concluido_sem_status?: number;
    mrr_concluido_devedor?: number;
    mrr_concluido_cancelado?: number;
    mrr_em_implantacao?: number;
    mrr_pendente_cobranca: number;
    lojas_em_implantacao: number;
    lojas_prontas_para_cobranca: number;
}

export interface LojaFinanceiroImplantacao {
    id: string | number;
    nome: string;
    implantador?: string;
    etapa: string;
    status_cobranca: 'pagante' | 'nao_pagante' | 'sem_status_financeiro' | 'pendente_cobranca' | 'em_implantacao' | 'devedor' | 'cancelado';
    mensalidade: number;
    data_conclusao?: string | null;
    data_prevista_cobranca?: string | null;
    dias_desde_conclusao?: number | null;
}

export interface DadosFinanceiroImplantacao {
    resumo: ResumoFinanceiroImplantacao;
    lojas: LojaFinanceiroImplantacao[];
}

const montarParametros = (filtros: AnalyticsFiltersState) => {
    const parametros = new URLSearchParams();
    if (filtros.startDate) parametros.append('start_date', filtros.startDate.toISOString().split('T')[0]);
    if (filtros.endDate) parametros.append('end_date', filtros.endDate.toISOString().split('T')[0]);
    if (filtros.implantador) parametros.append('implantador', filtros.implantador);
    if (filtros.baseTemporal) parametros.append('base_temporal', filtros.baseTemporal);
    return parametros;
};

export const useDadosFinanceiroImplantacao = (filtros: AnalyticsFiltersState) => {
    return useQuery({
        queryKey: [
            'analytics',
            'financeiro-implantacao',
            filtros.startDate?.toISOString(),
            filtros.endDate?.toISOString(),
            filtros.implantador,
            filtros.baseTemporal,
        ],
        queryFn: async () => {
            const resposta = await api.get<DadosFinanceiroImplantacao>('/api/analytics/financeiro-implantacao', {
                params: montarParametros(filtros),
            });
            return resposta.data;
        },
        retry: 1,
        staleTime: 1000 * 60 * 5,
    });
};
