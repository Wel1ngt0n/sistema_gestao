# PLAN: Padronizacao de Configuracoes e Melhoria do Sync

## Contexto

O sistema ja possui uma area de configuracoes, uma tela de sincronizacao e APIs relacionadas, mas elas ainda estao mais proximas de um painel tecnico pontual do que de uma tela completa de configuracao SaaS. O objetivo desta etapa e transformar a aba de Configuracoes em um hub administrativo padronizado, coerente com o visual atual do CRM, e melhorar o modulo de Sync no frontend e backend sem quebrar os contratos existentes.

Conforme solicitado, esta e a fase de planejamento antes da implementacao. A execucao deve aguardar aprovacao explicita.

## Dominios Envolvidos

- Frontend/UI: padronizacao visual das telas de Configuracoes e Sync.
- Backend/API: ampliacao segura das configuracoes, melhorias no health do Sync e validacoes.
- Seguranca: separar configuracoes sensiveis, preservar cookies/tokens e restringir acoes administrativas.
- Testes/Validacao: build frontend, checagem Python e verificacao de fluxos principais.

## Escopo

### Incluido

- Recriar a tela `Configuracoes > Geral` como uma tela SaaS completa, com navegacao por secoes e cards densos.
- Ampliar categorias de configuracao:
  - Geral
  - Metas
  - Pesos e performance
  - SLA e prazos
  - Seguranca
  - Sync
  - Suporte
  - Notificacoes
  - Webhooks e integracoes
- Melhorar a API `GET /api/config` e `POST /api/config` para aceitar novas configuracoes com metadados consistentes.
- Manter permissao administrativa para salvar configuracoes.
- Mostrar endpoint de webhook Zenvia e token de forma mais clara, com copia e geracao segura no frontend.
- Adicionar campos de configuracao para import CSV, limites, Sync, 2FA, sessoes, alertas e webhooks.
- Melhorar `GET /api/sync/health` com dados operacionais mais uteis:
  - status da ultima execucao
  - timestamps ISO e legiveis
  - duracao
  - total processado/atualizado
  - erros recentes
  - resumo das ultimas 24h
  - threshold de stale vindo de configuracao
  - informacoes de agenda do Sync
- Melhorar o frontend do Sync:
  - fechamento correto de EventSource anterior
  - logs mais claros
  - estados de carregamento/erro
  - leitura dos novos dados de health
  - layout mais proximo das demais telas administrativas
- Preservar o fallback atual de token via query string apenas para `/api/sync/stream`, pois EventSource nao permite header Authorization.
- Validar que a tela de Monitor nao volte a gerar scroll lateral global.

### Fora do Escopo Nesta Iteracao

- Criar uma plataforma completa de billing/assinaturas.
- Criar novas tabelas complexas de configuracao por tenant.
- Migrar todo o sistema para feature flags multi-tenant.
- Alterar profundamente o motor de sincronizacao com ClickUp.
- Substituir o provedor de deploy.
- Criar testes E2E com browser se o projeto ainda nao tiver essa base pronta.

## Arquivos Provaveis

### Frontend

- `frontend/src/features/admin/SettingsPage.tsx`
  - Reestruturar a tela de configuracoes.
  - Adicionar categorias, busca/filtros, componentes de campo, toggles, selects e estados de alteracao.

- `frontend/src/features/sync/SyncPage.tsx`
  - Melhorar controle do EventSource.
  - Melhorar layout, logs e acoes de Sync.

- `frontend/src/features/sync/SyncHealthPanel.tsx`
  - Consumir novos campos de `/api/sync/health`.
  - Exibir resumo de execucoes, agenda e erros.

### Backend

- `backend/app/routes.py`
  - Expandir `DEFAULT_CONFIGS`.
  - Tornar `POST /api/config` mais robusto para configs novas, valores vazios e metadados.

- `backend/app/routes_governance.py`
  - Melhorar `/api/sync/health`.
  - Opcionalmente melhorar `/api/sync/runs` mantendo compatibilidade.

- `backend/app/models.py`
  - Evitar alteracoes nesta etapa, salvo se um campo existente impedir totalmente a implementacao.

## Desenho Tecnico

### 1. Configuracoes SaaS

Criar uma estrutura de categorias no frontend com metadados:

- icone
- titulo
- descricao
- tom visual
- ordem fixa

Cada item vindo da API sera renderizado por tipo inferido:

- booleano: toggle
- URL: input URL
- token/secret: input protegido com acao de gerar
- numero: input numerico
- timezone/schedule: input apropriado ou texto validado
- texto comum: input simples

Tambem sera mantido um estado de `initialValues` e `editValues` para:

- mostrar quantidade de alteracoes pendentes
- permitir descartar alteracoes
- enviar apenas o estado editado atual

### 2. Backend de Configuracoes

Expandir `DEFAULT_CONFIGS` com chaves estaveis e curtas. Exemplos:

- `system_name`
- `system_environment_label`
- `support_contact_email`
- `default_timezone`
- `auth_require_2fa`
- `auth_session_hours`
- `auth_login_rate_limit`
- `csv_max_file_mb`
- `csv_max_files_per_import`
- `sync_vital_schedule`
- `sync_deep_schedule`
- `sync_stale_after_hours`
- `sync_auto_retry`
- `support_webhook_auto_process`
- `webhook_zenvia_enabled`
- `webhook_dedupe_window_hours`

Ao salvar:

- exigir usuario autenticado e permissao `manage_system`
- validar payload como objeto
- preservar valores vazios quando fizer sentido
- completar descricao/categoria para chaves padrao
- registrar auditoria quando disponivel

### 3. Sync Backend

`/api/sync/health` deve continuar retornando os campos antigos, mas adicionar:

- `summary`
- `scheduler`
- `last_run.started_at_iso`
- `last_run.finished_at_iso`
- `last_run.duration_sec`
- `last_run.items_updated`

O stale deve usar `sync_stale_after_hours`, com fallback seguro para 6 horas.

### 4. Sync Frontend

Melhorias previstas:

- manter uma referencia do EventSource ativo e fechar antes de iniciar novo Sync
- fechar a conexao em unmount
- adicionar logs padronizados por tipo
- manter `withCredentials: true`
- continuar anexando token curto/atual na query apenas para stream
- exibir health com indicadores mais operacionais

## Riscos e Cuidados

- Nao quebrar login/cookies apos as alteracoes recentes de seguranca.
- Nao remover o token via query para `/api/sync/stream` antes de existir uma alternativa real para SSE.
- Nao expor valores sensiveis de token em texto aberto desnecessariamente.
- Nao alterar screenshots ou arquivos nao relacionados.
- Nao introduzir scroll lateral global no layout.
- Evitar migracoes de banco pesadas nesta rodada.

## Plano de Execucao

1. Backend Configuracoes
   - Expandir configs padrao.
   - Robustecer salvar configuracoes.
   - Preservar compatibilidade da resposta de `/api/config`.

2. Backend Sync
   - Melhorar `/api/sync/health`.
   - Manter campos antigos e adicionar novos campos.
   - Usar threshold configuravel.

3. Frontend Configuracoes
   - Recriar UI em padrao SaaS.
   - Adicionar secoes, navegacao, campos inteligentes e acoes auxiliares.
   - Melhorar mensagens de erro/sucesso.

4. Frontend Sync
   - Melhorar estado, logs, EventSource e health panel.
   - Ajustar visual para o mesmo padrao da area administrativa.

5. Validacao
   - Rodar checagem Python nos arquivos alterados.
   - Rodar `npm run build`.
   - Revisar `git diff`.
   - Commitar e subir para `main` e branch de evolucao se aprovado.

## Test Plan

- `.\.venv\Scripts\python.exe -m py_compile backend\app\routes.py backend\app\routes_governance.py`
- `npm run build`
- Validar manualmente:
  - abrir Configuracoes > Geral
  - editar um campo simples
  - gerar token de webhook
  - copiar endpoint
  - abrir Sincronizacao
  - iniciar Sync vital/fast
  - confirmar que `/api/sync/stream` autentica corretamente
  - confirmar que `/api/sync/health` carrega sem 401

## Criterios de Aceite

- Tela de configuracoes com visual consistente, denso e completo.
- Configuracoes novas aparecem automaticamente apos seed.
- Salvamento exige permissao administrativa e nao quebra campos existentes.
- Sync mostra health operacional melhorado.
- SSE do Sync continua funcionando com auth.
- Build frontend passa.
- Arquivos nao relacionados permanecem intocados.

