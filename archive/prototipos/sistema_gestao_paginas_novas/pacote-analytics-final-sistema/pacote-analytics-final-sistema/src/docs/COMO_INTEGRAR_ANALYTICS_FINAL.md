# Como integrar as telas finais do analytics

## Arquivos criados

- `src/components/analytics/PainelAnalyticsFinal.tsx`
- `src/components/analytics/PainelFinanceiroImplantacao.tsx`
- `src/components/analytics/graficos/temaGraficosAnalytics.ts`
- `src/hooks/useDadosFinanceiroImplantacao.ts`
- `src/docs/CONTRATO_FINANCEIRO_IMPLANTACAO.md`

## Aplicacao no sistema

1. Copiar os arquivos para os mesmos caminhos no repositorio real.
2. Manter os componentes atuais em `src/components/analytics`, porque a tela final reaproveita:
   - `AnalyticsFilters`
   - `FinancialForecastChart`
   - `AnnualTrendCharts`
   - `RiskScatterPlot`
   - `KPICard`
   - `TeamActionsBlock`
   - `IntelligenceInsightBlock`
3. Trocar a rota `/analytics` para usar `PainelAnalyticsFinal` no lugar do `DashboardAnalytics` atual.
4. Criar o endpoint `/api/analytics/financeiro-implantacao` conforme `CONTRATO_FINANCEIRO_IMPLANTACAO.md`.
5. Persistir o snapshot da meta variavel antes de renderizar o grafico de evolucao:
   - calcular `lojas_meta_total = meta_geral_valor / ticket_medio`;
   - calcular `meta_mensal_recalculada = (lojas_meta_total - lojas_entregues_ano) / meses_restantes`;
   - salvar o resultado em tabela historica;
   - retornar `meta_mensal_variavel` na serie mensal ou `meta_variavel_snapshot` no resumo.
6. Rodar validacao no repositorio real:

```bash
npm run build
```

## Tecnologia

Nao inclui tecnologia nova. A remodelagem usa a stack atual:

- React
- TypeScript
- Tailwind
- Headless UI
- React Query
- Chart.js
- ECharts
- Icones locais simples nos componentes finais, sem dependencia nova de icones.

Se depois quisermos padronizar a camada grafica com uma biblioteca mais simples para manutencao, a opcao mais direta seria avaliar Recharts ou Nivo. Para esta fase, nao e necessario.

