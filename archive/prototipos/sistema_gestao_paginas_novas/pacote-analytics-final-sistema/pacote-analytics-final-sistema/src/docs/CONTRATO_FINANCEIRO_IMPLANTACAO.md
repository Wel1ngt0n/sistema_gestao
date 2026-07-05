# Contrato financeiro de implantacao

Este contrato alimenta a nova aba **Financeiro** do analytics sem trocar a tecnologia atual.

## Endpoint sugerido

`GET /api/analytics/financeiro-implantacao`

Aceita os mesmos filtros do analytics atual:

- `start_date`
- `end_date`
- `implantador`
- `base_temporal`

## Resposta esperada

```json
{
  "resumo": {
    "lojas_concluidas_pagantes": 12,
    "lojas_concluidas_nao_pagantes": 4,
    "mensalidade_pendente_entrada": 8300,
    "mrr_ativado": 42100,
    "mrr_pendente_cobranca": 15600,
    "lojas_em_implantacao": 38,
    "lojas_prontas_para_cobranca": 7
  },
  "meta_variavel_snapshot": {
    "data_snapshot": "2026-06-02",
    "meta_geral_valor": 120000,
    "ticket_medio": 1500,
    "lojas_meta_total": 80,
    "lojas_entregues_ano": 37,
    "meses_restantes": 7,
    "lojas_restantes": 43,
    "meta_mensal_recalculada": 6.14
  },
  "lojas": [
    {
      "id": 123,
      "nome": "Loja exemplo",
      "implantador": "Nome do analista",
      "etapa": "Concluida",
      "status_cobranca": "pendente_cobranca",
      "mensalidade": 1200,
      "data_conclusao": "2026-06-01",
      "data_prevista_cobranca": "2026-06-10",
      "dias_desde_conclusao": 2
    }
  ]
}
```

## Snapshot da meta variavel

A linha da meta no grafico de evolucao deve ser variavel e salva como snapshot.
Ela nao deve ser apenas uma linha fixa no front, porque a meta muda quando mudam:

- ticket medio;
- meta geral em valor;
- quantidade total de lojas da meta;
- quantidade ja entregue;
- meses restantes no ciclo.

Formula operacional:

```text
lojas_meta_total = meta_geral_valor / ticket_medio
lojas_restantes = lojas_meta_total - lojas_entregues_ano
meta_mensal_recalculada = lojas_restantes / meses_restantes
```

Regra de historico:

- salvar um snapshot diario ou mensal em tabela propria;
- nunca recalcular snapshots antigos na renderizacao do front;
- retornar no analytics a serie `meta_mensal_variavel` por mes quando houver historico;
- se nao houver serie historica, retornar pelo menos o objeto `meta_variavel_snapshot` atual.

Tabela sugerida:

```sql
CREATE TABLE analytics_meta_variavel_snapshot (
  id BIGSERIAL PRIMARY KEY,
  data_snapshot DATE NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  meta_geral_valor NUMERIC(14, 2) NOT NULL,
  ticket_medio NUMERIC(14, 2) NOT NULL,
  lojas_meta_total NUMERIC(10, 2) NOT NULL,
  lojas_entregues_ano NUMERIC(10, 2) NOT NULL,
  meses_restantes INTEGER NOT NULL,
  lojas_restantes NUMERIC(10, 2) NOT NULL,
  meta_mensal_recalculada NUMERIC(10, 2) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (data_snapshot, ano, mes)
);
```

## Estados financeiros

- `pagante`: loja concluida e ja em cobranca.
- `nao_pagante`: loja concluida, mas ainda sem pagamento ativo.
- `pendente_cobranca`: loja pronta para entrar em cobranca.
- `em_implantacao`: loja ainda nao concluida.

## Observacao de integracao

Enquanto o endpoint nao existir, a tela financeira roda usando fallback dos KPIs atuais:

- `mrr_done_period` como MRR ativado.
- `mrr_backlog` como MRR pendente.
- `wip_stores` como lojas em implantacao.

Os recortes de pagantes, nao pagantes e mensalidade pendente precisam do endpoint novo para serem reais.

