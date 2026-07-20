# Plano funcional e técnico da Integração

## Objetivo

Manter uma única Integração ativa, com Monitor voltado à operação e Analytics
voltado à gestão, preservando o histórico completo desde a Implantação e sem
duplicar regras de negócio.

Estado em 19/07/2026: implementação e promoção canônica concluídas no ambiente
local. Produção ainda não recebeu migrations nem deploy.

## Princípios

- O Analytics usa a profundidade de métricas da Implantação como referência,
  adaptada ao processo de Integração.
- O Monitor permanece focado em busca, filtros, Kanban, lista e sincronização.
- Não existem dados simulados; métricas derivam do contrato real.
- Datas oficiais e tempos são calculados no backend.
- Dados pertencentes à Implantação aparecem como referência somente leitura.
- Edições manuais e decisões de bloqueio geram auditoria imutável.
- Nomes internos são funcionais e canônicos, sem sufixos de versão.

## Arquitetura canônica

### Frontend

- feature: `frontend/src/features/integration/`;
- monitor: `IntegrationMonitor`;
- Analytics: `IntegrationAnalytics`;
- detalhe de integrador: `IntegrationAssigneeDetail`;
- detalhe de loja: `IntegrationStoreDetail`;
- shell visual: `OperationalDetailModalShell`;
- rotas: `/integration/monitor` e `/integration/analytics`;
- cache: `integrationQueryKeys`.

### Backend

- blueprint: `/api/integration`;
- consultas: `IntegrationQueryService`;
- sincronização: `IntegrationSyncService`;
- modelos: `IntegrationStore`, `IntegrationTask`, `IntegrationStatus`,
  `IntegrationAssignee`, `IntegrationStatusHistory`,
  `IntegrationBlockPeriod` e `IntegrationAuditLog`.

### Banco

- `integration_stores`;
- `integration_tasks`;
- `integration_statuses`;
- `integration_assignees`;
- `integration_task_assignees`;
- `integration_status_history`;
- `integration_block_periods`;
- `integration_audit_logs`;
- `integration_status_catalog_runs`;
- `integration_sync_runs`.

A tabela anterior permanece preservada em `archive.integration_metrics`.

## Monitor

O Monitor deve oferecer:

- todas as lojas do recorte, inclusive as que ainda não têm tarefa vinculada;
- busca por nome ou identificador;
- filtros por etapa, integrador, reconciliação, bloqueio e período;
- Kanban com colunas vindas da ordem real do ClickUp;
- lista paginada;
- status da última sincronização;
- sincronização manual protegida por permissão;
- abertura do detalhe operacional da loja.

Os cards gerenciais consolidados não ocupam o Monitor.

## Analytics

O Analytics concentra:

- total de lojas, cobertura e reconciliação;
- concluídas, em andamento e ainda não iniciadas;
- bloqueios e tempo bloqueado;
- lead time bruto e líquido;
- distribuição e tempo acumulado por etapa;
- gargalos;
- performance por integrador;
- taxa de conclusão e volume atribuído;
- lista de lojas e métricas individuais ao selecionar um integrador.

Os filtros devem usar o mesmo universo do Monitor para evitar divergência entre
visão operacional e gerencial.

## Detalhe da loja

### Visão geral

- identificação, status e link de origem;
- tempo bruto, bloqueado e líquido;
- etapa atual;
- início e fim da Integração em evidência;
- início e fim do projeto de Implantação;
- integrador sincronizado ou sobrescrito manualmente;
- prazo e tarefa de Integração.

### Edição operacional

- integrador manual;
- responsável pela qualidade;
- existência e quantidade de problemas pós-integração;
- aderência ao processo correto;
- risco de churn;
- status de documentação;
- observações de qualidade.

O integrador manual tem precedência de apresentação sobre o responsável
sincronizado, sem destruir o dado de origem.

### Dados de referência da Implantação

- datas do projeto;
- ERP, CNPJ e demais dados técnicos disponíveis;
- rede e tipo matriz/filial;
- mensalidade e valor de implantação;
- histórico relacionado, com origem identificada.

### Datas oficiais

- início: primeira entrada histórica em `Contato/Comunicação`;
- fim: conclusão/fechamento oficial da tarefa;
- reentradas são preservadas e somadas nas métricas de etapa;
- ausência de evidência deve ser exibida como não informada, nunca inventada.

### Bloqueios

Cada período sincronizado possui revisão manual:

- pendente: ainda sem decisão;
- aprovado: desconta o período do tempo líquido;
- recusado: não desconta.

A decisão exige motivo, autor e data. Mudanças posteriores criam novos eventos;
o evento antigo não é apagado.

### Histórico

A linha do tempo reúne transições, edições manuais, decisões de bloqueio e
referências de Implantação. O frontend aceita o valor legado `INTEGRATION_V2`
somente para apresentar eventos antigos; novos eventos usam `INTEGRATION`.

## Contratos HTTP

- `GET /api/integration/monitor`;
- `GET /api/integration/monitor/metrics`;
- `GET /api/integration/monitor/filters`;
- `GET /api/integration/kanban/schema`;
- `GET /api/integration/stores/<id>`;
- `GET /api/integration/stores/<id>/timeline`;
- `PATCH /api/integration/stores/<id>/operational`;
- `PATCH /api/integration/stores/<id>/blocks/<block_id>`;
- `GET /api/integration/sync/status`;
- `POST /api/integration/sync`.

Leituras exigem autenticação. Escritas operacionais exigem
`manage_performance`; sincronização manual exige `sync_clickup`.

## Sincronização e consistência

1. Ler catálogo de status e ordem do quadro externo.
2. Fazer upsert de lojas por identificador estável.
3. Persistir tarefas mesmo antes da conciliação com uma loja.
4. Persistir responsáveis e associação N:N.
5. Registrar cada transição com chave de idempotência.
6. Derivar períodos de bloqueio do histórico, sem apagar revisões humanas.
7. Preservar execuções, erros e horário da última sincronização.
8. Manter a Integração fora do coletor genérico de etapas para evitar
   processamento duplicado.

## Preservação e migrations

As revisions históricas de fundação e revisão operacional mantêm seus nomes
originais. As revisões de consolidação são:

- `d5f8c1a3b7e2_integration_quality_preservation.py`;
- `f3a6d9e2c8b1_promote_integration_canonical.py`.

Regras:

- preflight fail-closed;
- PostgreSQL obrigatório;
- backfill somente em campos vazios;
- payload anterior preservado em auditoria;
- datas oficiais não são sobrescritas;
- tabela anterior é arquivada, não apagada;
- produção exige backup e teste de restauração.

## Critérios de aceite local

- rotas e classes ativas usam nomes canônicos;
- endpoints antigos retornam 404;
- endpoints canônicos exigem autenticação;
- Monitor e Analytics compilam e usam o mesmo contrato;
- edição e bloqueio aplicam RBAC e auditoria;
- contagens permanecem estáveis após migrations;
- não existem órfãos de FK;
- Performance e Jarvis usam o domínio canônico;
- scheduler executa apenas a sincronização canônica;
- testes, lint, build e smoke tests passam.

O resultado registrado está no
[relatório final da limpeza](../cleanup/FINAL_REPORT.md).

## Fora do escopo concluído

- aplicar migrations no Supabase;
- executar deploy de produção;
- reescrever o detalhe de Implantação no novo shell;
- remover dados arquivados;
- alterar definições de métricas sem decisão de produto;
- refatorar todos os arquivos grandes do sistema em um único lote.

## Referências

- [Registro de 19/07/2026](./DAILY_2026-07-19.md)
- [Runbook de migrations](./MIGRATION_RUNBOOK.md)
- [Evolução futura do detalhe](./FUTURE_DETAIL_MODAL.md)
- [Oportunidades futuras do sistema](../cleanup/FUTURE_IMPROVEMENTS.md)
