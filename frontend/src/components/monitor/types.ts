export interface AIPrediction {
    predicted_date: string;
    contract_due: string;
    remaining_days_predicted: number;
    days_late_predicted: number;
    risk_level: string;
    breakdown: { step: string; status: string; contribution: number }[];
    is_concluded?: boolean;
}

export interface Store {
    id: number;
    name: string;
    custom_id: string | null;
    clickup_id: string;
    clickup_url?: string;
    status: string;
    status_norm: string;
    implantador: string | null;
    dias_em_transito: number | null;
    dias_na_etapa?: number | null;
    idle_days: number | null;
    risk_score: number;
    risk_breakdown?: {
        prazo: { score: number; value: string };
        idle: { score: number; value: string };
        financeiro: { score: number; value: string };
        qualidade: { score: number; value: string };
    };
    risk_hints?: string[];
    risk_level?: string;
    ai_risk_level?: string;
    ai_boost?: number;
    deep_sync_status: string;
    rede: string | null;
    tipo_loja: string | null;
    parent_id: number | null;
    parent_name?: string | null;

    data_inicio: string | null;
    is_manual_start_date?: boolean;
    data_fim: string | null;
    data_previsao: string | null;

    financeiro_status: string | null;
    valor_mensalidade: number | null;
    valor_implantacao: number | null;
    erp: string | null;
    cnpj: string | null;
    crm: string | null;

    teve_retrabalho: boolean;
    delivered_with_quality: boolean;
    observacoes: string | null;
    tempo_contrato: number;
    manual_finished_at: string;
    considerar_tempo: boolean;
    justificativa_tempo: string | null;

    ai_prediction?: AIPrediction;
    days_late_predicted?: number;
    previsao_ia?: string | null;
}
