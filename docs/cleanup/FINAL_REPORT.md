# Relatório final da limpeza e organização

Data: 19/07/2026  
Escopo: sistema completo — frontend, backend, banco, infraestrutura e
documentação.

## Resultado

O módulo mais recente de Integração foi promovido ao nome canônico e passou a
ser a única implementação ativa. O legado foi retirado do runtime depois que
Performance, Jarvis, sincronização, rotas e frontend foram migrados. Os dados
anteriores não foram apagados: foram conciliados, auditados e arquivados por
migration.

A limpeza também alcançou o restante do sistema: componentes sem consumidor,
scripts pontuais, dependências comprovadamente sem uso, nomenclatura temporária,
comentários, configuração de testes, lint, segurança de inicialização e deploy.
Arquivos cuja ausência de uso não pôde ser provada foram mantidos.

Produção não foi alterada. Nenhuma migration foi executada no Supabase.

## Removido

### Integração antiga

- telas antigas de Dashboard, Monitor, Analytics e Relatórios;
- componentes de Kanban, tabela, matriz de equipe e modal antigos;
- serviço analítico baseado em `integration_metrics`;
- rotas e chamadas antigas depois da migração dos consumidores;
- scripts de manutenção com nomes de versões temporárias.

### Limpeza global comprovada

- componentes de Admin, Analytics, Relatórios e Implantação sem caminho a
  partir da aplicação;
- scripts pontuais rastreados em `scratch/` e `fix_analytics.py`;
- backups sensíveis que estavam rastreados na raiz do repositório;
- dependências frontend `date-fns-tz` e `tailwind-merge`;
- dependências backend `flask-cors` e `google-genai`, sem imports ativos;
- artefatos de versão temporária em testes e scripts ativos.

Os backups removidos do repositório não substituem a cópia operacional privada.
Apagar um arquivo no commit atual também não remove seu conteúdo do histórico
Git; a eventual higienização desse histórico exige operação separada, rotação de
segredos e coordenação com todos os clones.

## Renomeado ou promovido

| Antes | Depois |
| --- | --- |
| feature frontend temporária | `frontend/src/features/integration/` |
| monitor temporário | `IntegrationMonitor` |
| Analytics temporário | `IntegrationAnalytics` |
| serviço de consulta temporário | `IntegrationQueryService` |
| serviço de sincronização temporário | `IntegrationSyncService` |
| blueprint temporário | `/api/integration` |
| rotas de interface temporárias | `/integration/monitor` e `/integration/analytics` |
| tabelas temporárias da Integração | tabelas canônicas `integration_*` |
| `MonitorV2.tsx` de Implantação | `ImplantationMonitor.tsx` |
| tabela temporária de Implantação | `ImplantationMonitorTable.tsx` |
| cockpit temporário de Implantação | `ImplantationStoreCockpitModal.tsx` |

Os nomes temporários permanecem somente em migrations históricas já encadeadas.
O valor `INTEGRATION_V2` ainda é aceito na leitura de auditorias antigas; novos
eventos usam `INTEGRATION`.

## Mantido deliberadamente

- migrations históricas: revisões aplicadas nunca devem ser reescritas;
- `archive.integration_metrics`, com todas as 130 linhas anteriores;
- as duas métricas de lojas de 2025 sem vínculo canônico seguro;
- `backend/archive/`, materiais de `design-system/` e exportações em
  `excel_suporte/`, pois não há prova suficiente para apagá-los;
- endpoints sem consumidor frontend conhecido, que podem ser contratos de
  integrações externas;
- os dois fluxos ativos de detalhe de Implantação, agora com nomes funcionais;
- arquivos locais não rastreados em `scratch/`; a limpeza não recebeu
  autorização para apagar conteúdo local incerto.

## Banco de dados e preservação

### Antes

- revisão Alembic: `c4a8f2d19e31`;
- 161 lojas;
- 617 tarefas, das quais 461 ainda sem loja vinculada, preservadas como estado
  operacional válido;
- 3.401 eventos de status;
- 202 períodos de bloqueio;
- 130 métricas na tabela anterior;
- 128 vínculos únicos entre métricas anteriores e lojas canônicas;
- zero órfãos de FK.

### Migrations novas

- `d5f8c1a3b7e2`: adiciona os campos de preservação de qualidade, faz backfill
  apenas quando o destino está vazio e grava o payload anterior em auditoria;
- `f3a6d9e2c8b1`: renomeia dez tabelas, sequences, índices e constraints para o
  namespace canônico e move `integration_metrics` para o schema `archive`.

As migrations fazem preflight e abortam em caso de manifesto, vínculo ou schema
incompatível. Não persistem novamente métricas derivadas como lead time, SLA e
pontos.

### Depois no banco local

| Verificação | Resultado |
| --- | ---: |
| Revisão | `f3a6d9e2c8b1 (head)` |
| Lojas | 161 |
| Tarefas | 617 |
| Histórico de status | 3.401 |
| Bloqueios | 202 |
| `archive.integration_metrics` | 130 |
| Auditorias `LEGACY_METRIC_IMPORTED` | 128 |
| Órfãos de FK | 0 |
| Tabela anterior em `public` | ausente |

Nenhum registro desses conjuntos foi perdido.

## Backup e rollback

Antes da promoção canônica foi criado
`backend/backups/pre_cleanup_canonical_20260719_2056.dump`. O dump custom do
PostgreSQL foi lido e o checksum foi registrado sem ser publicado neste
relatório.

Estratégia de retorno:

1. falha no preflight: não executar a migration;
2. problema de aplicação após upgrade: preferir rollback da aplicação quando
   compatível com o schema;
3. reversão de schema/dados: somente em janela controlada, usando backup cuja
   restauração foi testada;
4. não executar downgrade improvisado em produção.

O backup local não serve como backup do Supabase. Produção exige dump novo e
teste de restauração antes do deploy.

## Validações executadas

| Validação | Resultado |
| --- | --- |
| Testes backend oficiais | 57 aprovados, 1 ignorado |
| Migrations em PostgreSQL 17 descartável | 8 de 8 cenários aprovados |
| ESLint frontend | aprovado |
| Build TypeScript/Vite | aprovado; 3.818 módulos transformados |
| Auditoria de dependências de produção | 0 vulnerabilidades conhecidas pelo npm |
| Docker local | migrado, reiniciado e saudável |
| `GET /health` | HTTP 200 |
| Frontend local | HTTP 200 |
| endpoint canônico sem autenticação | HTTP 401 |
| endpoint antigo | HTTP 404 |
| CORS em modo produção | origens explícitas validadas |

O checklist do orquestrador aprovou segurança, lint, schema e testes. Os checks
heuristicos de UX/SEO continuaram marcando sete componentes sem elementos de
formulario reais e duas paginas internas da SPA sem meta tags individuais. O
`index.html` possui descricao, Open Graph e `noindex`; os checkboxes reais da
tabela receberam rotulos acessiveis. Esses alertas foram classificados como
falsos positivos do analisador estatico para uma aplicacao privada autenticada.
O verificador ampliado tambem registrou divida nao bloqueante: 22 usos de
`any`, cobertura de tipos heuristica de 43% e 58 alertas de acessibilidade que
precisam de triagem em navegador. i18n e GEO falharam por ausencia de arquivos
de idioma e conteudo publico estruturado; ambos estao fora do objetivo atual de
uma aplicacao interna, em portugues e marcada como `noindex`.

Avisos não bloqueantes observados:

- bundle principal do frontend continua grande;
- base `caniuse-lite` está desatualizada;
- 308 avisos preexistentes relacionados a `datetime.utcnow()` foram observados
  na suíte anterior e continuam como dívida de modernização;
- a cobertura automatizada do sistema ainda é concentrada em Integração;
- não foi registrada nesta etapa uma validação visual completa por navegador e
  dispositivo real.

## RBAC e segurança

As rotas sensíveis continuam protegidas por autenticação e permissões centrais:

- `sync_clickup` para sincronização manual;
- `manage_performance` para edição operacional, qualidade e revisão de
  bloqueios da Integração;
- `edit_store` e `delete_store` nos fluxos de loja correspondentes;
- `manage_system` para operações administrativas.

A autenticação central rejeita usuários inexistentes ou inativos. Leituras da
Integração exigem autenticação; o smoke test confirmou HTTP 401 sem sessão. As
alterações operacionais geram auditoria imutável com ator, valores e motivo.

Também foram endurecidos CORS de produção, limites de upload e inicialização de
migrations. Permanecem ações obrigatórias antes de produção:

- rotacionar a senha de banco compartilhada durante a sessão;
- rotacionar o webhook exposto durante a auditoria;
- confirmar todos os secrets no cofre do provedor;
- executar varredura de histórico Git em frente coordenada, sem publicar
  qualquer segredo encontrado.

## Deploy Render e Supabase

O `render.yaml` agora usa `backend/production-entrypoint.sh`. O processo falha
fechado quando `MIGRATION_DATABASE_URL` não está configurada, aplica Alembic
antes de iniciar o Gunicorn e exige que o deploy mantenha uma unica instancia
de migration.

Configuração esperada:

- `DATABASE_URL`: conexão de runtime, podendo usar o pooler apropriado à API;
- `MIGRATION_DATABASE_URL`: conexão direta ou pooler em modo de sessão, porta
  `5432`, exclusiva de DDL e manutenção.

O deploy de produção está bloqueado. Antes de acioná-lo é obrigatório criar e
testar um backup novo do Supabase, rotacionar os segredos e executar o preflight
somente leitura descrito no runbook. Nenhuma migration deve ser aplicada agora.

## Próximos documentos

- [Runbook de migrations e produção](../integration/MIGRATION_RUNBOOK.md)
- [Registro completo de 19/07/2026](../integration/DAILY_2026-07-19.md)
- [Inventário e critérios de remoção](./INVENTORY.md)
- [Oportunidades futuras consolidadas](./FUTURE_IMPROVEMENTS.md)
- [Evolução futura do detalhe operacional](../integration/FUTURE_DETAIL_MODAL.md)
