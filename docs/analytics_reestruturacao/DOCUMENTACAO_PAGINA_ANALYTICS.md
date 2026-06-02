# Documentação da Página de Analytics

## Objetivo desta documentação

Este material foi montado para apoiar a reestruturação visual e funcional da página `/analytics` do sistema. O foco aqui é dar ao time de design uma visão clara de:

- como a página funciona hoje;
- quais blocos visuais existem;
- quais tecnologias sustentam a experiência;
- quais endpoints reais são consumidos;
- quais dependências indiretas também impactam a tela;
- quais inconsistências atuais precisam ser consideradas no redesenho.

## Onde a página existe hoje

- Rota principal do frontend: `/analytics`
- Componente principal: `frontend/src/components/analytics/DashboardAnalytics.tsx`
- Entrada da rota: `frontend/src/App.tsx`
- Navegação lateral: `frontend/src/layouts/CRMLayout.tsx`

## Resumo executivo da experiência atual

A página atual de analytics é uma visão operacional da área de implantação. Ela mistura:

- indicadores executivos de pipeline, entregas e MRR;
- gráficos de tendência mensal e anual;
- leitura de risco operacional;
- gargalos por etapa;
- comparação de performance entre implantadores;
- inteligência assistida com blocos de recomendação e endpoints de IA;
- navegação para drill-down individual por implantador.

Hoje a tela está organizada em 3 abas:

1. `Visão Geral`
2. `Eficiência & Risco`
3. `Time & Performance`

## Tecnologias utilizadas

## Frontend

- `React 18`
- `TypeScript`
- `Vite`
- `React Router DOM`
- `@tanstack/react-query`
- `Axios`
- `Tailwind CSS`
- `@headlessui/react`
- `Chart.js`
- `react-chartjs-2`
- `ECharts`
- `echarts-for-react`
- `date-fns`
- `lucide-react`

## Backend

- `Flask`
- `Flask SQLAlchemy`
- `Flask Migrate`
- `Flask Talisman`
- `Flask Limiter`
- `SQLAlchemy`
- `psycopg2-binary`
- `pandas`
- `openpyxl`
- `python-dateutil`

## Segurança e autenticação

- Todas as rotas usadas pela página exigem autenticação via `@require_auth`.
- O cliente HTTP do frontend usa `Authorization: Bearer <token>` quando há token em memória.
- O `axios` também está com `withCredentials: true`.
- Em respostas `401`, o frontend limpa credenciais locais e redireciona para `/login`.

## Arquitetura atual da página

## Camada de entrada e navegação

- `frontend/src/App.tsx`
  - registra a rota `/analytics`
- `frontend/src/layouts/CRMLayout.tsx`
  - exibe a opção `Analytics` no grupo `Implantação`

## Camada principal da tela

- `frontend/src/components/analytics/DashboardAnalytics.tsx`
  - renderiza header, filtros e as 3 abas
  - carrega dados de analytics via `useAnalyticsData`
  - carrega dados complementares do cockpit do time

## Camada de dados do frontend

- `frontend/src/components/analytics/useAnalyticsData.ts`
  - centraliza os fetches da maior parte da tela
- `frontend/src/hooks/useDashboardUrlParams.ts`
  - lê e escreve filtros na URL
- `frontend/src/services/api.ts`
  - configura autenticação, base URL e interceptors

## Camada de backend

- `backend/app/routes_analytics.py`
  - rotas principais de KPIs, trends, risco, gargalos, exportação e distribuição
- `backend/app/routes_scoring.py`
  - rotas de performance e capacidade usadas pela mesma página
- `backend/app/routes_analysts_reports.py`
  - rotas do cockpit, IA, diagnóstico e navegação complementar do time
- `backend/app/services/analytics_service.py`
  - regras de negócio da maior parte do analytics
- `backend/app/services/scoring_service.py`
  - ranking oficial de performance
- `backend/app/services/analysts_report_service.py`
  - cockpit gerencial, resumo do time e diagnósticos

## Composição visual atual

## 1. Header da página

O topo da página contém:

- logo da Instabuy;
- subtítulo `Implantação`;
- título `Analytics operacional`;
- descrição curta;
- botão de atualizar;
- botão de filtros;
- botão de exportação.

## 2. Filtros

Os filtros atuais ficam em `AnalyticsFilters.tsx` e incluem:

- `Base Temporal`
  - opções:
  - `conclusao`
  - `inicio`
  - `snapshot`
- `Data de início`
- `Data de fim`
- `Implantador`
- `Atualizar dados`
- `Exportar`

Observação importante:

- o filtro `base_temporal` é salvo na URL e enviado pelo frontend, mas o backend atual não consome esse parâmetro nas rotas mapeadas desta tela.

## 3. Aba `Visão Geral`

Blocos atuais:

- cards de KPI:
  - `WIP (Pipeline Ativo)`
  - `Entregas (No Período)`
  - `MRR em Backlog`
  - `MRR Ativado`
  - `Pontos Entregues`
  - `Cycle Time Médio`
- gráfico de forecast financeiro
- gráfico de evolução de entregas
- gráfico anual acumulado vs metas

## 4. Aba `Eficiência & Risco`

Blocos atuais:

- cards de KPI:
  - `On-Time Delivery (OTD)`
  - `Risco Preditivo`
  - `Lojas Estagnadas`
  - `Matriz vs Filial (WIP)`
- gráfico `Matriz de Risco vs. Tempo`
- gráfico de eficiência operacional
- lista visual de gargalos de processo

## 5. Aba `Time & Performance`

Blocos atuais:

- tabela comparativa do time
- resumo lateral com métricas agregadas
- `TeamActionsBlock`
- `IntelligenceInsightBlock`

Essa aba também navega para drill-down individual do implantador ao clicar em linhas da tabela.

## 6. Modal de detalhe

Existe um modal em `PerformanceDetailModal.tsx`, mas no fluxo atual da tabela principal o clique navega para `/team-diagnostics/:name` em vez de abrir o modal.

Isso sugere que o modal existe no código, mas não está sendo realmente acionado pela interação principal atual.

## APIs e endpoints consumidos pela página

## Convenções gerais

- método predominante: `GET`
- autenticação: obrigatória
- base URL do frontend:
  - `import.meta.env.VITE_API_URL`
  - fallback: `http://localhost:5003`

## Endpoints principais usados em `/analytics`

### 1. `GET /api/analytics/kpi-cards`

Uso:

- cards do topo em `Visão Geral`
- cards do topo em `Eficiência & Risco`

Parâmetros aceitos pelo frontend:

- `start_date`
- `end_date`
- `implantador`
- `base_temporal`

Parâmetros realmente lidos no backend:

- `start_date`
- `end_date`
- `implantador`

Resposta esperada:

```json
{
  "wip_stores": 0,
  "throughput_period": 0,
  "mrr_backlog": 0,
  "mrr_done_period": 0,
  "cycle_time_avg": 0,
  "otd_percentage": 0,
  "idle_stores_count": 0,
  "avg_risk_score": 0,
  "matrix_count": 0,
  "filial_count": 0,
  "total_points_done": 0,
  "total_points_wip": 0
}
```

Fonte backend:

- `AnalyticsService.get_kpi_cards`

### 2. `GET /api/analytics/trends`

Uso:

- gráfico `Evolução de Entregas`
- gráfico `Eficiência Operacional`

Parâmetros enviados pelo frontend:

- `months=6`
- `start_date`
- `end_date`
- `implantador`
- `base_temporal`

Parâmetros realmente lidos no backend:

- `months`
- `implantador`

Resposta esperada:

```json
[
  {
    "month": "2026-01",
    "throughput": 0,
    "total_points": 0,
    "total_mrr": 0,
    "cycle_time_avg": 0,
    "otd_percentage": 0
  }
]
```

Observação:

- hoje `start_date`, `end_date` e `base_temporal` não alteram essa rota.

### 3. `GET /api/analytics/annual-trends`

Uso:

- componente `AnnualTrendCharts`

Parâmetros:

- o frontend atual não envia `year`

Resposta esperada:

```json
{
  "year": 2026,
  "annual_goals": {
    "mrr": 180000,
    "stores": 180
  },
  "trends": [
    {
      "month": "2026-01",
      "stores_monthly": 0,
      "mrr_monthly": 0,
      "cumulative_stores": 0,
      "cumulative_mrr": 0,
      "cycle_time_avg": 0,
      "target_cumulative_stores": 15,
      "target_cumulative_mrr": 15000
    }
  ]
}
```

### 4. `GET /api/scoring/performance`

Uso:

- ranking e comparativos de performance

Parâmetros enviados pelo frontend:

- `start_date`
- `end_date`
- `implantador`
- `base_temporal`

Parâmetros realmente lidos no backend:

- `start_date`
- `end_date`

Observações importantes:

- o frontend envia `implantador`, mas a rota atual não lê esse filtro;
- o frontend tipa alguns campos que não refletem exatamente a resposta real;
- existe também `GET /api/analytics/performance`, mas o hook principal usa `GET /api/scoring/performance`.

Resposta real esperada pelo fluxo atual:

```json
[
  {
    "implantador": "Nome",
    "wip": 0,
    "done": 0,
    "otd_percentage": 0,
    "avg_cycle_time": 0,
    "mrr_done": 0,
    "rework_percentage": 0,
    "quality_percentage": 0,
    "points": 0,
    "score": 0,
    "breakdown": {}
  }
]
```

### 5. `GET /api/analytics/bottlenecks`

Uso:

- bloco `Gargalos de Processo`

Parâmetros lidos:

- `implantador`

Resposta:

```json
[
  {
    "step_name": "Kickoff",
    "total_days": 0,
    "avg_days": 0,
    "reopens": 0
  }
]
```

### 6. `GET /api/scoring/capacity`

Uso:

- dados de capacidade utilizados no comparativo do time

Parâmetros:

- sem filtros no frontend atual

Resposta:

```json
[
  {
    "implantador": "Nome",
    "current_points": 0,
    "finished_points_semester": 0,
    "total_semester_points": 0,
    "max_points": 30,
    "store_count": 0,
    "finished_count_semester": 0,
    "utilization_pct": 0,
    "risk_level": "NORMAL",
    "active_networks": []
  }
]
```

### 7. `GET /api/analytics/forecast`

Uso:

- `FinancialForecastChart`

Parâmetros:

- `months=6`

Resposta:

```json
[
  {
    "month": "2026-01",
    "realized": 0,
    "projected": 0,
    "is_future": false,
    "total_accumulated": 0
  }
]
```

### 8. `GET /api/analytics/risk-scatter`

Uso:

- `RiskScatterPlot`

Parâmetros enviados pelo frontend:

- `implantador`

Resposta:

```json
[
  [12, 78, 2500, "Loja XPTO (Rede ABC)", "Atenção"]
]
```

Estrutura dos índices:

1. dias na etapa
2. score de risco
3. MRR
4. label da loja
5. grupo visual

Observação importante:

- o componente `RiskScatterPlot` faz sua própria chamada de dados internamente usando `useAnalyticsData`, então esse trecho pode duplicar requisições dependendo do ciclo de renderização.

### 9. `GET /api/analytics/distribution`

Uso:

- preparado no hook principal

Situação atual:

- o hook busca esta rota, mas ela não aparece como bloco evidente na composição principal atual da tela.

Resposta:

```json
{
  "steps": {
    "Kickoff": 10
  },
  "erps": {
    "BLING": 4
  }
}
```

### 10. `GET /api/analytics/implantador-detail/:implantador_name`

Uso:

- `PerformanceDetailModal`

Resposta:

```json
{
  "implantador": "Nome",
  "stores": [
    {
      "id": 1,
      "name": "Loja XPTO",
      "tipo": "Matriz",
      "status": "Em andamento",
      "is_done": false,
      "points": 0,
      "potential_points": 1,
      "finished_at": null,
      "reasons": []
    }
  ],
  "total_done_points": 0,
  "total_wip_points": 0,
  "score_breakdown": {
    "total": 0,
    "volume": 0,
    "otd": 0,
    "quality": 0,
    "time_score": 0
  }
}
```

### 11. `GET /api/analytics/export-csv`

Uso:

- botão de exportação em `AnalyticsFilters.tsx`

Parâmetros enviados:

- `start_date`
- `end_date`
- `implantador`

Observação crítica:

- apesar do nome da rota e do nome do método no frontend sugerirem `CSV`, o backend gera um arquivo `XLSX`.

Saída real:

- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Nome do arquivo:

- `analytics_report_YYYYMMDD_HHMMSS.xlsx`

## Endpoints complementares usados pela mesma experiência

Esses endpoints não pertencem ao namespace principal de analytics, mas impactam diretamente a página atual ou as navegações geradas a partir dela.

### 12. `GET /api/reports/implantadores/cockpit`

Uso:

- aba `Time & Performance`
- cards laterais
- `TeamActionsBlock`
- `IntelligenceInsightBlock`

Resposta:

```json
{
  "summary": {
    "total_ativos": 0,
    "total_entregues_mes": 0,
    "avg_sla": 0,
    "avg_retrabalho": 0,
    "team_health": "Good"
  },
  "avg_metrics": {
    "avg_carga": 0,
    "avg_idle": 0,
    "avg_throughput": 0,
    "avg_sla": 0
  },
  "alerts": [],
  "team_actions": [],
  "analysts": []
}
```

Observação crítica:

- o frontend chama `?period=all`, mas a rota atual só lê `start_date` e `end_date`;
- portanto o parâmetro `period` hoje é ignorado nesse endpoint.

### 13. `POST /api/reports/implantadores/jarvis/chat`

Uso:

- perguntas rápidas no `IntelligenceInsightBlock`

Body:

```json
{
  "message": "Qual analista está mais sobrecarregado?"
}
```

### 14. `POST /api/reports/implantadores/analyze/team`

Uso:

- botão `Análise Completa` no `IntelligenceInsightBlock`

Saída esperada:

- briefing textual do time;
- insumos de decisão;
- leitura consultiva da operação.

### 15. `GET /api/reports/implantadores/diagnostico`

Uso:

- página complementar de relatórios do time

Observação:

- o `TeamDiagnosticsView` envia `?period=...`, mas a rota atual não consome esse parâmetro.

### 16. `GET /api/reports/implantadores/resumo`

Uso:

- página complementar de relatórios do time

Observação:

- o `TeamDiagnosticsView` envia `?period=...`, mas a rota atual espera `start` e `end`.

### 17. `GET /api/reports/implantadores/:implantador_name`

Uso:

- drill-down individual em `/team-diagnostics/:name`

Observação:

- `AnalystProfileView` também envia `?period=...`, mas a rota atual espera `start` e `end`.

### 18. `POST /api/reports/implantadores/analyze/:implantador_name`

Uso:

- diagnóstico individual do analista

### 19. `PATCH /api/reports/implantadores/stores/:store_id/operational`

Uso:

- edição de controle operacional na tela individual do analista

## Fontes de dados do backend

Os cálculos desta página dependem principalmente destes modelos:

- `Store`
- `TaskStep`
- `MetricsSnapshotDaily`
- `SystemConfig`

## O que cada um sustenta

- `Store`
  - pipeline
  - entregas
  - MRR
  - tipo de loja
  - implantador
  - prazo
  - retrabalho
  - qualidade
- `TaskStep`
  - gargalos
  - tempo total por etapa
  - reaberturas
- `MetricsSnapshotDaily`
  - scatter de risco vs tempo
- `SystemConfig`
  - metas anuais
  - pesos de matriz e filial
  - capacidade máxima padrão

## Regras de negócio relevantes para o design

## Corte temporal de dados

Em múltiplos serviços há um corte explícito para considerar lojas concluídas apenas a partir de `01/01/2026`.

Impacto:

- a leitura histórica da tela não é “vida toda” para entregas concluídas;
- isso afeta como o designer pode apresentar comparativos históricos.

## Tipos de loja e pesos

A lógica atual trata:

- `Matriz` com peso padrão `1.0`
- `Filial` com peso padrão `0.7`

Esses pesos influenciam:

- pontos entregues;
- pontos em WIP;
- score;
- capacidade.

## Score, risco e capacidade são conceitos diferentes

- `score de performance`
  - ranking de entregas e qualidade
- `score de risco`
  - criticidade operacional da loja
- `capacidade`
  - carga atual e esforço acumulado do implantador

Esses três conceitos convivem na mesma tela e podem competir visualmente entre si no redesenho.

## Inconsistências e débitos atuais que o design deve considerar

## 1. Filtro `base_temporal` sem efeito real

O frontend oferece o controle, mas as rotas mapeadas não o utilizam.

## 2. Exportação chamada de CSV, mas entregando Excel

Isso cria desalinhamento de nomenclatura no botão e no endpoint.

## 3. Parâmetro `period` sendo enviado para rotas que não o leem

O problema aparece em:

- `/api/reports/implantadores/cockpit`
- `/api/reports/implantadores/diagnostico`
- `/api/reports/implantadores/resumo`
- `/api/reports/implantadores/:implantador_name`

## 4. Modal de detalhe existe, mas a navegação principal vai para outra rota

Hoje há dois padrões convivendo:

- modal local por implantador;
- drill-down em página dedicada.

## 5. Componentes existentes mas aparentemente fora do fluxo principal

Há componentes de analytics que existem no código, mas não estão claramente plugados na tela final atual, como:

- `TeamCapacityWidget.tsx`
- `TeamPerformanceMatrix.tsx`

## 6. Endpoint duplicado por domínio

Existe:

- `/api/analytics/performance`
- `/api/scoring/performance`

Mas o hook principal usa o segundo.

## 7. Possível duplicação de fetch do scatter

O `RiskScatterPlot` chama `useAnalyticsData(filters)` dentro dele mesmo, em vez de receber os dados prontos por props.

## Oportunidades de reestruturação para o designer

## 1. Separar mais claramente os contextos

Hoje a página mistura:

- visão executiva;
- risco operacional;
- capacidade do time;
- ranking de performance;
- bloco de IA.

Uma reorganização pode reduzir a densidade cognitiva.

## 2. Tratar filtros globais vs filtros por módulo

Nem todos os blocos obedecem aos mesmos filtros hoje. Isso precisa ser visível no redesenho ou corrigido na implementação.

## 3. Definir o papel do drill-down

É importante decidir se o padrão final será:

- modal rápido;
- página dedicada;
- ou ambos com papéis diferentes.

## 4. Reposicionar a camada de IA

O bloco de inteligência hoje compete visualmente com métricas críticas do time. Ele pode virar:

- área secundária;
- painel lateral;
- aba própria;
- drawer contextual.

## Pasta com o código atual

Foi criada uma pasta espelhada com os arquivos atuais relacionados à analytics em:

- `docs/analytics_reestruturacao/codigo_atual/`

Essa pasta serve como base estática para revisão, handoff e exploração do designer sem precisar procurar tudo manualmente na árvore principal.

## Arquivos principais que o designer provavelmente vai consultar primeiro

Frontend:

- `frontend/src/components/analytics/DashboardAnalytics.tsx`
- `frontend/src/components/analytics/useAnalyticsData.ts`
- `frontend/src/components/analytics/AnalyticsFilters.tsx`
- `frontend/src/components/analytics/RiskScatterPlot.tsx`
- `frontend/src/components/analytics/IntelligenceInsightBlock.tsx`
- `frontend/src/pages/implantadores/AnalystProfileView.tsx`

Backend:

- `backend/app/routes_analytics.py`
- `backend/app/routes_scoring.py`
- `backend/app/routes_analysts_reports.py`
- `backend/app/services/analytics_service.py`
- `backend/app/services/analysts_report_service.py`
- `backend/app/services/scoring_service.py`

## Observação final

Esta documentação descreve a implementação atual da experiência, não necessariamente a implementação ideal. Para a reestruturação, vale considerar esta base como um mapa do estado real da aplicação hoje.
