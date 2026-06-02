# Mapa de Arquivos da Página de Analytics

## Estrutura criada para referência

Todo o material de apoio foi concentrado em:

- `docs/analytics_reestruturacao/`

Dentro dessa pasta existem:

- `DOCUMENTACAO_PAGINA_ANALYTICS.md`
- `MAPA_ARQUIVOS.md`
- `codigo_atual/`

## Critério de seleção dos arquivos copiados

Foram copiados:

- arquivos diretamente usados pela rota `/analytics`;
- arquivos de navegação e infraestrutura que impactam a tela;
- arquivos de drill-down ligados à experiência;
- arquivos backend de rotas e serviços que alimentam a página;
- arquivos auxiliares necessários para entender filtros, autenticação e widgets relacionados.

## Árvore esperada de referência

```text
codigo_atual/
  frontend/
    package.json
    src/
      App.tsx
      assets/
        logo.png
      components/
        analytics/
        reports/
          BottleneckDonutChart.tsx
          MRRNetProjectionWidget.tsx
          PerformanceScoreBadge.tsx
        ui/
          DatePicker.tsx
          PeriodFilter.tsx
          Select.tsx
          Skeleton.tsx
      hooks/
        useDashboardUrlParams.ts
      layouts/
        CRMLayout.tsx
      pages/
        implantadores/
    ...
  backend/
    requirements.txt
    app/
      __init__.py
      constants/
        scoring_constants.py
      routes_analytics.py
      routes_analysts_reports.py
      routes_scoring.py
      services/
        analytics_service.py
        analysts_report_service.py
        scoring_service.py
        security_service.py
```

## Arquivos mais importantes por área

## Frontend

- `codigo_atual/frontend/src/components/analytics/DashboardAnalytics.tsx`
  - composição principal da página
- `codigo_atual/frontend/src/components/analytics/useAnalyticsData.ts`
  - endpoints e contratos
- `codigo_atual/frontend/src/components/analytics/AnalyticsFilters.tsx`
  - controles de filtro e exportação
- `codigo_atual/frontend/src/components/analytics/RiskScatterPlot.tsx`
  - bloco de risco com ECharts
- `codigo_atual/frontend/src/components/analytics/IntelligenceInsightBlock.tsx`
  - bloco de IA e perguntas rápidas
- `codigo_atual/frontend/src/pages/implantadores/AnalystProfileView.tsx`
  - drill-down individual ligado ao fluxo

## Backend

- `codigo_atual/backend/app/routes_analytics.py`
  - endpoints principais
- `codigo_atual/backend/app/routes_scoring.py`
  - performance e capacidade
- `codigo_atual/backend/app/routes_analysts_reports.py`
  - cockpit, IA e drill-down
- `codigo_atual/backend/app/services/analytics_service.py`
  - regras centrais do analytics
- `codigo_atual/backend/app/services/analysts_report_service.py`
  - visão do time e heurísticas gerenciais
- `codigo_atual/backend/app/services/scoring_service.py`
  - score oficial de performance

## Observações de leitura

- alguns arquivos copiados são auxiliares e não representam telas finais, mas ajudam a entender contratos e dependências;
- a estrutura foi mantida próxima da original para facilitar comparação e navegação;
- se o designer quiser trabalhar primeiro só na arquitetura visual, os melhores pontos de partida são:
  - `DashboardAnalytics.tsx`
  - `AnalyticsFilters.tsx`
  - `RiskScatterPlot.tsx`
  - `IntelligenceInsightBlock.tsx`
  - `AnalystProfileView.tsx`
