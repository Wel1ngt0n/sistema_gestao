# Plano - Novo Monitor de Lojas da Integracao

## Status

- Fase 1 do workflow `.agent/workflows/orchestrate.md`.
- Planejamento revisado; implementacao ainda nao iniciada.
- Aguardando aprovacao explicita do usuario para iniciar a Fase 2.
- O modulo legado de Integracao sera preservado integralmente.

## Objetivo

Criar do zero um novo Monitor de Lojas da Integracao, com frontend, API,
servicos, sincronizacao e tabelas proprias. O Monitor de Implantacao sera a
referencia de experiencia, mas nao uma dependencia de dominio.

O universo do novo modulo sera formado por **todas as lojas que estiveram em
Implantacao desde o inicio do historico do sistema ate hoje**. Cada uma delas
devera aparecer no monitor mesmo quando ainda nao possuir tarefa, status ou
dados no quadro de Integracao do ClickUp.

O Kanban sera uma projecao fiel e dinamica do quadro de Integracao: cada etapa
ou status real do ClickUp correspondera a uma coluna. Inclusoes, renomes,
reordenacoes, alteracoes e desativacoes no ClickUp deverao ser refletidas pela
sincronizacao, sem exigir alteracao de codigo ou deploy.

## Decisoes fechadas

1. Criar apenas tabelas novas para o novo dominio de Integracao.
2. Nao usar `Store`, `TaskStep` ou `IntegrationMetric` como persistencia do
   novo modulo.
3. Usar o historico completo de lojas da Implantacao como populacao-base.
4. Manter lojas sem correspondencia na Integracao visiveis como "Ainda nao
   entrou na Integracao" ou estado tecnico equivalente.
5. Sincronizar a estrutura de status do quadro do ClickUp, alem das tarefas.
6. Preservar o historico de transicoes e o tempo em cada etapa.
7. Preservar periodos de bloqueio com inicio, fim, duracao e motivo quando
   disponivel.
8. Manter o modulo antigo, suas tabelas, rotas e contratos sem alteracoes.
9. Adicionar o novo modulo abaixo do modulo antigo no menu.
10. Todo comentario novo no codigo devera ser escrito em portugues.

## Padrao de codigo e comentarios

- Comentarios de codigo, docstrings e observacoes tecnicas novas deverao ser
  escritos em portugues.
- Os comentarios devem explicar regras de negocio, decisoes arquiteturais ou
  comportamentos nao obvios; nao devem apenas repetir o que o codigo ja diz.
- Priorizar comentarios nos pontos de reconciliacao de lojas, sincronizacao
  dinamica de status, idempotencia, reconstrucao do historico e calculos de
  tempo bruto, bloqueado e liquido.
- Nomes tecnicos exigidos por frameworks, APIs, contratos externos, tabelas,
  rotas e identificadores podem permanecer em ingles conforme o padrao do
  projeto.
- Revisoes e testes da Fase 2 deverao verificar que novos comentarios seguem
  esse padrao.

## Fontes de verdade

### Populacao-base

A fonte para descobrir as lojas sera o processo historico de Implantacao. A
carga inicial devera percorrer todo o periodo disponivel, sem limitar a lojas
ativas ou a uma janela recente.

Para cada loja, persistir no novo dominio:

- identificador estavel da loja/card de Implantacao;
- nome e identificadores de negocio disponiveis;
- primeira e ultima ocorrencia na Implantacao;
- referencia da tarefa/card de origem;
- metadados minimos para reconciliacao;
- data da ultima sincronizacao da fonte.

A tabela nova sera um snapshot/referencia independente. Nao devera possuir FK
obrigatoria para tabelas legadas, pois o modulo precisa continuar consistente
mesmo que o legado mude.

### Processo de Integracao

O quadro/lista `INTEGRACAO` do ClickUp sera a fonte da estrutura do Kanban, das
tarefas de Integracao, integradores, datas, transicoes, bloqueios e demais
campos operacionais.

O vinculo entre loja da populacao-base e tarefa de Integracao devera priorizar
IDs imutaveis do ClickUp e campos de relacionamento. Comparacao por nome sera
somente uma estrategia auditavel de excecao, nunca um vinculo silencioso.

## Arquitetura isolada

- Frontend novo em `frontend/src/features/integration-v2/`.
- Nova rota sugerida: `/integration-v2/monitor`.
- Novo blueprint sugerido: `/api/integration-v2`.
- Servicos novos de catalogo, sincronizacao, reconciliacao e metricas.
- Migrations apenas aditivas, com prefixo de tabelas `integration_v2_`.
- Reutilizacao permitida somente de infraestrutura transversal: autenticacao,
  RBAC, SQLAlchemy, cliente HTTP do ClickUp e componentes genericos de UI.
- Nenhuma mudanca de contrato em `/integration/*` ou `/api/integration/*`.

## Modelo de dados novo

Os nomes finais podem acompanhar o padrao do projeto, mantendo o namespace
`integration_v2`.

### `integration_v2_stores`

Catalogo historico proprio de todas as lojas que passaram pela Implantacao:

- ID local;
- IDs ClickUp/negocio da loja e da origem em Implantacao;
- nome e dados de identificacao;
- primeira e ultima data observada em Implantacao;
- estado de reconciliacao com a Integracao;
- `integration_task_id` nullable;
- timestamps de origem e sincronizacao;
- snapshot minimo auditavel da origem.

Estados de reconciliacao previstos:

- `NOT_IN_INTEGRATION`: loja ainda sem tarefa de Integracao;
- `MATCHED`: vinculo unico confirmado;
- `AMBIGUOUS`: mais de uma correspondencia possivel;
- `ORPHAN_INTEGRATION_TASK`: tarefa de Integracao sem loja da base;
- `DATA_ERROR`: identificadores ausentes ou invalidos.

### `integration_v2_tasks`

Dados novos da tarefa de Integracao:

- task ID e custom ID do ClickUp;
- loja reconciliada;
- status atual referenciado pelo ID do catalogo de status;
- datas de criacao, inicio, prazo, conclusao, fechamento e atualizacao;
- prioridade, tags, URL e campos customizados necessarios;
- indicadores atuais de bloqueio e qualidade de dados;
- payload de auditoria restrito ao necessario;
- ultima sincronizacao.

### `integration_v2_statuses`

Catalogo dinamico das etapas reais do quadro:

- ID imutavel do status no ClickUp, quando fornecido;
- lista/quadro de origem;
- nome, cor, tipo e categoria nativos;
- posicao/ordem atual da coluna;
- ativo/inativo;
- primeira e ultima vez observada;
- versao/assinatura da configuracao;
- timestamps de sincronizacao.

O nome do status nao sera sua chave. Renomes deverao preservar a identidade e o
historico. Status removidos/desativados permanecerao no banco para auditoria,
mas nao aparecerao como coluna ativa, salvo quando necessario para exibir
registros historicos.

### `integration_v2_status_history`

Linha do tempo imutavel por loja/tarefa:

- tarefa e status referenciados;
- entrada e saida da etapa;
- duracao em segundos;
- indicacao de intervalo atual;
- origem e qualidade do timestamp;
- ordem da ocorrencia;
- identificador/idempotency key da transicao.

Reentrada no mesmo status devera gerar um novo intervalo. As metricas poderao
somar todas as ocorrencias ou mostrar cada passagem separadamente.

### `integration_v2_assignees`

Relacionamento normalizado para todos os integradores/responsaveis, sem perder
multiplos assignees e sem escolher silenciosamente apenas o primeiro.

### `integration_v2_block_periods`

Historico explicito de bloqueios:

- loja/tarefa;
- status ou evento que iniciou o bloqueio;
- inicio, fim e duracao;
- bloqueio atual;
- motivo e origem do motivo, quando disponiveis;
- responsavel/evento relacionado;
- qualidade da inferencia;
- recorrencia/numero do bloqueio.

Bloqueios nao serao reduzidos a um booleano. O sistema preservara cada periodo
para calcular tempo bruto, tempo bloqueado e tempo liquido do processo.

### `integration_v2_status_catalog_runs` e `integration_v2_sync_runs`

Auditoria das sincronizacoes da estrutura e dos dados:

- tipo `FULL` ou `INCREMENTAL`;
- inicio, fim, status e cursor;
- lojas/tarefas/status lidos, criados, alterados e inativados;
- erros por item e resumo da execucao;
- assinatura da configuracao do quadro;
- ultima sincronizacao bem-sucedida.

## Sincronizacao

### 1. Catalogo de lojas

1. Ler todas as lojas que estiveram em Implantacao desde o primeiro registro.
2. Fazer upsert no catalogo `integration_v2_stores` por identificador estavel.
3. Nao remover lojas que deixaram de aparecer na fonte; marcar sua situacao.
4. Registrar cobertura, duplicidades e falhas de identificacao.

### 2. Estrutura do Kanban

1. Consultar os status configurados no quadro/lista de Integracao.
2. Fazer upsert por ID do ClickUp.
3. Atualizar nome, cor, tipo e ordem.
4. Detectar status novos e disponibiliza-los como novas colunas.
5. Preservar identidade em renomes e movimentar a coluna conforme a nova ordem.
6. Marcar status ausentes como inativos sem apagar seu historico.
7. Publicar a nova estrutura somente apos uma sincronizacao consistente.

A API e o frontend nunca terao uma lista fixa de status compilada no codigo.

### 3. Tarefas, historico e reconciliacao

1. Ler tarefas abertas, concluidas e arquivadas da Integracao.
2. Fazer upsert por task ID.
3. Reconciliar cada tarefa com o catalogo historico de lojas.
4. Sincronizar integradores e campos relevantes.
5. Obter/reconstruir todos os intervalos de status disponiveis.
6. Detectar reaberturas e reentradas em etapas.
7. Derivar periodos de bloqueio a partir dos status/eventos/campos confirmados.
8. Manter lojas sem tarefa no estado `NOT_IN_INTEGRATION`.
9. Expor tarefas orfas para correcao sem inclui-las silenciosamente nos totais.

### Consistencia

- Full sync inicial e incremental por watermark/data de atualizacao.
- Idempotencia de lojas, tarefas, status, transicoes e bloqueios.
- Retry/backoff para `429`, timeout e falhas transitorias.
- Cursor avanca somente apos lote confirmado.
- Falha parcial nao apaga o ultimo estado valido.
- Mudancas estruturais ficam visiveis no estado da sincronizacao.
- Primeira entrega e somente leitura em relacao ao ClickUp.

## Regras de tempo

- Armazenar timestamps em UTC e exibir em `America/Sao_Paulo`.
- Tempo na etapa: soma dos intervalos entre entrada e saida daquele status.
- Etapa atual: tempo entre a ultima entrada e agora.
- Tempo bruto de Integracao: fim menos inicio, ou agora menos inicio.
- Tempo bloqueado: soma da intersecao dos periodos de bloqueio com o processo.
- Tempo liquido: tempo bruto menos tempo bloqueado.
- Reentradas contam separadamente e tambem no total acumulado da etapa.
- Intervalos sem timestamp confiavel devem ser marcados como incompletos e nao
  convertidos silenciosamente para zero.
- SLA em dias uteis/corridos e statuses oficiais de inicio/fim/bloqueio serao
  confirmados no inventario do ClickUp.

## API proposta

- `GET /api/integration-v2/monitor`: lojas paginadas, incluindo as sem tarefa.
- `GET /api/integration-v2/monitor/metrics`: KPIs sobre o mesmo universo/filtros.
- `GET /api/integration-v2/monitor/filters`: status dinamicos, integradores e opcoes.
- `GET /api/integration-v2/kanban/schema`: colunas ativas na ordem do ClickUp.
- `GET /api/integration-v2/stores/<id>`: detalhe, etapas, tempos e bloqueios.
- `GET /api/integration-v2/stores/<id>/timeline`: transicoes completas.
- `GET /api/integration-v2/sync/status`: frescor e divergencias da sincronizacao.
- `POST /api/integration-v2/sync`: sync manual protegido por permissao.

Lista, Kanban e KPIs deverao compartilhar a mesma consulta-base e os mesmos
filtros. O contrato informara quando uma loja nao entrou na Integracao ou possui
reconciliacao ambigua.

## Frontend

- Nova feature `frontend/src/features/integration-v2/`.
- Novo item "Monitor de Lojas" abaixo do modulo legado.
- Visualizacoes Lista e Kanban inspiradas no Monitor de Implantacao.
- Colunas do Kanban consumidas da API, ordenadas e estilizadas pelos metadados
  do ClickUp; nenhuma coluna hardcoded.
- Coluna operacional adicional para lojas `NOT_IN_INTEGRATION`, separada dos
  status reais e identificada como estado local.
- Cards com loja, integradores, aging, tempo na etapa atual, prazo, bloqueio e
  qualidade da reconciliacao.
- Detalhe com timeline completa, tempo por etapa, reentradas e todos os periodos
  de bloqueio.
- Indicacao de ultima sincronizacao e alerta de divergencia estrutural.
- Busca, filtros, ordenacao, paginacao e responsividade equivalentes ao monitor
  de referencia.

## Metricas

- Total historico de lojas que passaram pela Implantacao.
- Lojas que ainda nao entraram na Integracao.
- Cobertura: percentual com tarefa de Integracao reconciliada.
- Tarefas orfas e reconciliacoes ambiguas.
- WIP total e por etapa real do quadro.
- Entradas, saidas e throughput por etapa/periodo.
- Tempo medio, mediano, P75 e P90 em cada etapa.
- Aging da etapa atual.
- Tempo bruto, bloqueado e liquido da Integracao.
- Lojas bloqueadas agora, total de bloqueios e recorrencia.
- Motivos de bloqueio, quando o dado existir.
- Gargalos por fila, permanencia e taxa de saida.
- Lead time total e cumprimento de SLA.
- Carga e entregas por integrador.
- Cobertura/qualidade de datas, vinculos, responsaveis e historico.

KPIs por etapa usam IDs persistidos, preservando continuidade quando o status e
renomeado. Status novos entram automaticamente nos agrupamentos dinamicos.

## Testes obrigatorios

- Carga historica completa de lojas da Implantacao.
- Loja sem Integracao, vinculo unico, ambiguidade e tarefa orfa.
- Tabelas novas sem leitura/escrita acidental nas tabelas legadas.
- Status novo, renomeado, reordenado, alterado e inativado no ClickUp.
- Kanban atualiza a estrutura sem deploy e sem perder historico.
- Mudanca de status, reentrada, reabertura e historico fora de ordem.
- Tempo por etapa aberta/fechada e soma de multiplas passagens.
- Um ou varios bloqueios, bloqueio aberto, motivo ausente e sobreposicao.
- Calculos de tempo bruto, bloqueado e liquido.
- Full sync e incremental idempotentes, inclusive apos falha parcial.
- Filtros coerentes entre lista, Kanban e KPIs.
- RBAC, paginacao, limites e ausencia de token/payload sensivel.
- Nao regressao de `/integration/*`, `/api/integration/*` e `/monitor`.
- Build, lint, testes backend/frontend, migration upgrade/downgrade,
  `security_scan.py`, `lint_runner.py`, inspecao visual desktop/mobile e
  `git diff --check`.

## Criterios de aceite

- Todas as lojas historicas da Implantacao aparecem no novo dominio.
- Loja sem tarefa de Integracao aparece explicitamente como nao iniciada.
- O novo modulo usa somente tabelas novas para seu estado e suas metricas.
- O modulo legado permanece funcional e inalterado.
- Cada status ativo real do ClickUp aparece como etapa/coluna na mesma ordem.
- Status novos, renomes e reordenacoes aparecem apos sincronizacao, sem deploy.
- Status removidos nao apagam historico nem quebram lojas antigas.
- Cada loja mostra tempo atual e acumulado em todas as etapas percorridas.
- Reentradas em uma etapa sao preservadas.
- Cada periodo de bloqueio e auditavel e entra nos tempos bruto/liquido.
- Integradores, datas, status e etapas correspondem a uma amostra validada do
  ClickUp.
- Sincronizacao e idempotente, observavel e tolerante a falhas parciais.
- Lista, Kanban e KPIs respondem aos mesmos filtros.
- Registros incompletos nao recebem valores inventados.
- Todos os comentarios e docstrings adicionados ao codigo estao em portugues.

## Sequencia da Fase 2

1. Inventariar fontes historicas de Implantacao e estrutura/status do ClickUp.
2. Fechar identificadores de reconciliacao e regras de inicio/fim/bloqueio.
3. Criar migrations e modelos `integration_v2_*`.
4. Implementar catalogo historico de lojas e reconciliacao.
5. Implementar sync dinamico de status e estrutura do Kanban.
6. Implementar sync de tarefas, integradores, historico e bloqueios.
7. Implementar consultas, metricas e API.
8. Implementar Lista, Kanban dinamico e detalhe no frontend.
9. Adicionar rota/menu abaixo do legado.
10. Validar dados com amostras do ClickUp e executar toda a verificacao.

## Questoes ainda abertas

1. Qual fonte ClickUp/lista representa o historico oficial de lojas que passaram
   pela Implantacao e qual campo e o identificador estavel da loja?
2. Quais status/campos/eventos definem inicio e fim oficial da Integracao?
3. Quais status, tags ou campos definem bloqueio e onde fica seu motivo?
4. O SLA e calculado em dias corridos ou uteis?
5. Como tratar tarefas de Integracao que existam sem loja na Implantacao?
6. A API do ClickUp fornece ID estavel para status neste quadro? Caso nao, sera
   necessario um algoritmo versionado de reconciliacao por configuracao.
7. Qual frequencia de sincronizacao e aceitavel para a fidelidade esperada?

As respostas tecnicas devem ser obtidas primeiro por inventario somente leitura
e fixtures anonimizadas. Nenhuma regra sera inferida silenciosamente.

## Checkpoint

Este plano deve ser aprovado explicitamente antes da Fase 2:

- `Y`: iniciar implementacao orquestrada.
- `N`: revisar o plano, sem alterar o produto.
