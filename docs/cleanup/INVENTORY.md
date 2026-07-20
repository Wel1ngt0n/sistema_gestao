# Inventário de limpeza e organização

Data da auditoria: 19/07/2026.

Este documento registra os critérios usados para decidir o que foi removido,
renomeado ou mantido. A classificação considerou imports, rotas, jobs, banco,
contratos externos e dados; nome de arquivo, isoladamente, não foi prova de
desuso.

## Baseline

- 502 arquivos rastreados no início da auditoria;
- backend: 49 testes oficiais aprovados antes da consolidação;
- frontend: build TypeScript/Vite aprovado;
- lint frontend indisponível no início por falta de configuração;
- banco local na revisão `c4a8f2d19e31`;
- coleta genérica do Pytest alcançava scripts arquivados por engano.

## Integração

O domínio anterior ainda alimentava Performance, Jarvis, sincronização genérica,
frontend e `integration_metrics`. A exclusão direta teria causado regressão e
perda de contexto. Esses consumidores foram migrados primeiro.

A implementação mais recente foi promovida para:

- `frontend/src/features/integration/`;
- `/integration/monitor` e `/integration/analytics`;
- `/api/integration`;
- `IntegrationQueryService` e `IntegrationSyncService`;
- tabelas `integration_*`.

As migrations históricas não foram reescritas. Auditorias antigas com origem
`INTEGRATION_V2` continuam legíveis.

## Dados encontrados

- 161 lojas;
- 617 tarefas, incluindo 461 ainda sem loja vinculada;
- 3.401 eventos de status;
- 202 períodos de bloqueio;
- 130 métricas anteriores;
- 128 vínculos únicos e seguros;
- duas métricas de lojas de 2025 fora do recorte atual;
- zero órfãos de FK.

A consolidação preservou todos esses registros. As 130 métricas estão em
`archive.integration_metrics`, e as 128 conciliadas também possuem auditoria de
importação.

## Remoção comprovada

- patch pontual `fix_analytics.py`;
- scripts rastreados de diagnóstico em `scratch/`;
- árvore antiga do frontend de Integração;
- componentes antigos de Analytics/Admin sem caminho a partir de `main.tsx`;
- componente de relatório e diagnóstico de equipe sem consumidor;
- serviços e rotas antigos depois da migração de Performance e Jarvis;
- dependências sem import ativo confirmadas pela busca e pelo build;
- backups sensíveis rastreados na raiz, após retirar sua dependência do
  `manage.py`.

## Renomeado por estar ativo

Os arquivos de Implantação com nomes temporários não eram lixo. Foram
preservados com nomes funcionais:

- `ImplantationMonitor.tsx`;
- `ImplantationMonitorTable.tsx`;
- `ImplantationStoreCockpitModal.tsx`.

O editor `MonitorStoreModal` também permanece ativo e não foi confundido com o
cockpit de leitura/operação.

## Mantido por segurança

- `backend/archive/`, como histórico fora do runtime;
- `design-system/`, por possível uso como referência visual;
- `excel_suporte/`, por possível valor como exportação única;
- endpoints sem consumidor frontend conhecido, pois podem atender integrações
  externas;
- arquivos locais não rastreados em `scratch/`;
- tabela histórica de métricas no schema `archive`;
- migrations já aplicadas.

Esses itens só devem ser removidos após confirmação de responsável, cópia
alternativa e rollback.

## Achados globais mantidos no backlog

- coexistência de Alembic, `db.create_all()` e reparos SQL;
- scheduler sujeito a múltiplos workers;
- arquivos backend e frontend grandes;
- pouca cobertura fora de Integração;
- ausência de testes frontend de componentes e fluxos;
- bundle frontend grande;
- necessidade de política de retenção para dumps, exports e `archive/`;
- necessidade de limpar segredos do histórico Git em operação coordenada.

Detalhes e prioridades: [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md).
Resultado e evidências: [FINAL_REPORT.md](./FINAL_REPORT.md).
