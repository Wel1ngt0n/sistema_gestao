# Pacote final - Analytics de implantacao

Esta pasta contem os arquivos finais para copiar para o repositorio real do sistema.

## Estrutura

Copie a pasta `src/` deste pacote por cima da pasta `src/` do sistema, mantendo os caminhos:

- `src/components/analytics/PainelAnalyticsFinal.tsx`
- `src/components/analytics/PainelFinanceiroImplantacao.tsx`
- `src/components/analytics/graficos/temaGraficosAnalytics.ts`
- `src/hooks/useDadosFinanceiroImplantacao.ts`
- `src/docs/COMO_INTEGRAR_ANALYTICS_FINAL.md`
- `src/docs/CONTRATO_FINANCEIRO_IMPLANTACAO.md`

## O que muda no front

- Cria o painel final com 5 abas: Visao geral, Financeiro, Eficiencia e risco, Time e performance, Perfil dos analistas.
- Separa a aba Financeiro para acompanhar implantacao que virou cobranca.
- Mantem Chart.js/ECharts, Tailwind, Headless UI e React Query.
- Remove dependencia de icones externos nos arquivos novos.
- Usa linha de evolucao com meta variavel salva por snapshot.

## Ajuste de rota

No arquivo de rotas do sistema, troque a tela atual de analytics para renderizar:

```tsx
import PainelAnalyticsFinal from './components/analytics/PainelAnalyticsFinal';
```

Use `PainelAnalyticsFinal` no lugar do dashboard antigo da rota `/analytics`.

## Backend necessario

Para os numeros financeiros ficarem reais, criar o endpoint:

```text
GET /api/analytics/financeiro-implantacao
```

O contrato completo esta em:

```text
src/docs/CONTRATO_FINANCEIRO_IMPLANTACAO.md
```

Enquanto esse endpoint nao existir, a aba Financeiro roda com fallback dos KPIs atuais para MRR ativado, MRR pendente e lojas em implantacao.

## Meta variavel

A linha da meta no grafico de evolucao deve usar snapshot salvo, nao uma meta fixa no front.

Formula documentada:

```text
lojas_meta_total = meta_geral_valor / ticket_medio
lojas_restantes = lojas_meta_total - lojas_entregues_ano
meta_mensal_recalculada = lojas_restantes / meses_restantes
```

O backend deve salvar o snapshot em tabela historica e retornar `meta_mensal_variavel` na serie mensal ou `meta_variavel_snapshot` no resumo.

## Validacao

Depois de copiar no repositorio real, rode:

```bash
npm run build
```

Se houver erro de caminho, ajuste apenas imports para os caminhos reais do seu projeto. Os caminhos deste pacote foram alinhados ao dashboard atual exportado.
