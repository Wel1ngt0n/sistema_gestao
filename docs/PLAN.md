# PLAN: Evolucao do Jarvis para Copiloto Operacional

## Contexto

O Jarvis atual em `backend/app/services/jarvis_service.py` funciona como um chat com uma unica ferramenta generica `query_database`. A LLM recebe o esquema resumido, gera SQL livre, executa consultas read-only simples e depois resume o resultado.

O objetivo deste plano e evoluir o Jarvis para um copiloto de gestao operacional: classificar a intencao da pergunta, buscar dados por ferramentas especializadas, montar contexto estruturado, interpretar o cenario, sugerir acoes e manter memoria operacional.

Conforme `.agent/workflows/orchestrate.md`, esta e a Fase 1 de planejamento usando o agente `project-planner`. A implementacao deve aguardar aprovacao explicita do usuario.

## Escopo

### Incluido

- Manter o contrato atual das rotas em `backend/app/routes_jarvis.py`: `JarvisService.chat(messages, user_id, session_id)`.
- Adicionar um Intention Router para classificar perguntas em:
  - `TEAM_PERFORMANCE`
  - `ANALYST_PERFORMANCE`
  - `STORE_ANALYSIS`
  - `FINANCIAL_MRR`
  - `SLA_RISK`
  - `SUPPORT_ANALYSIS`
  - `EXECUTIVE_SUMMARY`
  - `SLACK_SUMMARY`
  - `GENERAL_QUESTION`
- Criar tools especializadas dentro do fluxo do Jarvis:
  - `get_team_performance(period)`
  - `get_analyst_performance(name, period)`
  - `get_store_details(store_id_or_name)`
  - `get_critical_stores(limit)`
  - `get_sla_risks(period)`
  - `get_mrr_summary(period)`
  - `get_support_summary(period)`
  - `get_monthly_delivery_summary(month)`
  - `get_store_pipeline_status()`
- Manter `query_database` como fallback controlado, nao como caminho principal.
- Criar um Context Builder que consolide dados, metricas, comparacoes, alertas e limitacoes antes da resposta final.
- Suportar modos de resposta:
  - `executivo`
  - `diagnostico`
  - `acao`
  - `slack`
  - `investigacao`
- Revisar o prompt base para obrigar interpretacao, separacao entre fato, hipotese e recomendacao, e tratamento explicito de incerteza.
- Persistir memoria operacional usando a estrutura existente de mensagens/sessoes inicialmente, sem exigir migracao pesada.
- Reforcar seguranca SQL: read-only, timeout, bloqueio de tabelas sensiveis, log, limite de retorno e preferencia por agregacoes.

### Fora do Escopo Nesta Iteracao

- Alterar frontend ou contrato dos endpoints.
- Criar automacoes que escrevam em entidades operacionais reais.
- Criar tabelas novas obrigatorias via migracao pesada.
- Substituir todos os relatorios existentes do sistema.
- Treinar modelo proprio ou adicionar infraestrutura externa de memoria vetorial.

## Arquivos Provaveis

### Edicao Principal

- `backend/app/services/jarvis_service.py`
  - Concentrar roteamento, catalogo de tools, Context Builder, memoria operacional leve, prompt base e seguranca da query fallback.

### Possiveis Edicoes Auxiliares

- `backend/app/services/llm_service.py`
  - Apenas se for necessario adicionar chamada estruturada para classificacao de intencao ou parametrizar `temperature`, `timeout` e `response_format`.
- `backend/app/models.py`
  - Evitar alteracao nesta fase de implementacao inicial. Se a memoria operacional exigir persistencia formal depois, propor modelo dedicado em etapa futura.
- `backend/app/routes_jarvis.py`
  - Idealmente sem mudancas. So alterar se for necessario aceitar modo de resposta explicitamente no payload, mantendo compatibilidade com ausencia do campo.
- Testes existentes ou novos em estrutura de testes do backend, caso exista no repositorio.

### Dependencias de Dados Ja Identificadas

- `Store`
- `TaskStep`
- `IntegrationMetric`
- `SupportConversation`
- `SupportAgentPerformance`
- `JarvisChatSession`
- `JarvisChatMessage`
- `AnalyticsService`
- `AnalystsReportService`
- `IntegrationAnalyticsService`, se o resumo de integracao/MRR precisar reutilizar metricas ja consolidadas.

## Desenho Tecnico

### 1. Fluxo Principal

1. Receber mensagens pelo contrato atual.
2. Criar ou validar sessao.
3. Persistir a mensagem do usuario.
4. Extrair pergunta atual e contexto recente.
5. Classificar intencao e modo de resposta.
6. Resolver periodo, analista, loja, limite e filtros citados.
7. Selecionar tools especializadas.
8. Executar tools com consultas ORM/SQL controladas.
9. Montar payload estruturado.
10. Chamar LLM final para interpretacao e recomendacao.
11. Salvar resposta e memoria operacional leve.
12. Retornar `{ "response": "...", "session_id": id }`.

### 2. Intention Router

Implementar um metodo interno, por exemplo `_route_intention(user_message, history)`, retornando:

```json
{
  "intent": "TEAM_PERFORMANCE",
  "response_mode": "diagnostico",
  "period": {"type": "month", "value": "2026-05"},
  "entities": {"analyst": null, "store": null},
  "confidence": 0.86,
  "required_tools": ["get_team_performance", "get_critical_stores"],
  "fallback_allowed": true
}
```

Preferencia de implementacao:

- Comecar com regras deterministicas para palavras-chave fortes e extracao simples de modo.
- Usar LLM estruturada apenas quando a regra nao tiver confianca suficiente.
- Registrar quando a classificacao for incerta no payload final.

### 3. Catalogo de Tools Especializadas

Criar um mapa interno de tools, por exemplo:

```python
SPECIALIZED_TOOLS = {
    "get_team_performance": self._get_team_performance,
    "get_analyst_performance": self._get_analyst_performance,
    ...
}
```

Cada tool deve retornar dicionario padronizado:

```json
{
  "tool": "get_team_performance",
  "status": "ok",
  "period": {...},
  "metrics": {...},
  "records": [...],
  "alerts": [...],
  "limitations": [...]
}
```

Diretrizes por tool:

- `get_team_performance(period)`: usar `AnalystsReportService.get_team_resume` e/ou `get_team_cockpit`; calcular ranking, produtividade, idle medio, carteira ativa e comparacao com meta quando disponivel.
- `get_analyst_performance(name, period)`: usar `AnalystsReportService.get_analyst_details`; comparar analista com media do time, carga, idle, entregas e MRR.
- `get_store_details(store_id_or_name)`: buscar `Store`, `TaskStep` e `IntegrationMetric`; trazer status, implantador, idle, SLA, MRR, comentarios e gargalos.
- `get_critical_stores(limit)`: listar lojas ativas ordenadas por risco composto, combinando idle, total de dias, MRR, status bloqueado e risco de churn.
- `get_sla_risks(period)`: consolidar lojas com idle alto, SLA excedido, etapas travadas e risco de churn.
- `get_mrr_summary(period)`: consolidar MRR entregue, backlog, travado, devendo e em risco conforme campos disponiveis.
- `get_support_summary(period)`: usar `SupportConversation` e `SupportAgentPerformance` para volume, status, NPS e tempo de resolucao.
- `get_monthly_delivery_summary(month)`: usar entregas por `finished_at`, `manual_finished_at`, `end_real_at` quando aplicavel, com MRR e implantador.
- `get_store_pipeline_status()`: consolidar funil por status, etapa atual, implantador, idle e MRR.

### 4. Context Builder

Criar metodo interno, por exemplo `_build_operational_context(route, tool_results, user_id, session_id)`.

Payload esperado:

```json
{
  "question": "...",
  "intent": "SLA_RISK",
  "response_mode": "acao",
  "period": {...},
  "data_sources": ["stores", "tasks_steps", "integration_metrics"],
  "main_metrics": {...},
  "comparisons": {...},
  "alerts": [...],
  "evidence": [...],
  "limitations": [...],
  "memory": {
    "previous_diagnostics": [...],
    "pending_actions": [...],
    "recurring_questions": [...]
  }
}
```

A LLM final deve receber esse payload e nao linhas cruas grandes. Listas devem ser limitadas e agregadas.

### 5. Prompt Base Revisado

O system prompt deve reforcar:

- Nunca responder apenas com dados brutos.
- Sempre interpretar o que os dados significam para a operacao.
- Separar claramente:
  - `Fatos`
  - `Hipoteses`
  - `Recomendacoes`
- Quando houver risco, indicar acao sugerida e prioridade.
- Quando envolver pessoas, comparar com time e considerar contexto de carteira/carga.
- Quando houver incerteza, declarar a incerteza.
- Quando faltar dado, explicar o dado ausente.
- Evitar julgamento pessoal sobre analistas; focar comportamento operacional mensuravel.
- Para modo Slack, gerar texto pronto para envio.

### 6. Modos de Resposta

Implementar normalizacao de modo:

- Se o usuario pedir "resumo", "diretoria" ou "executivo": `executivo`.
- Se pedir "por que", "causa", "gargalo": `diagnostico` ou `investigacao`.
- Se pedir "o que fazer", "prioridade", "acompanhar": `acao`.
- Se mencionar Slack: `slack`.
- Caso contrario, usar `executivo` para perguntas amplas e `diagnostico` para perguntas especificas.

O modo deve afetar tamanho, estrutura e nivel de detalhe da resposta final.

### 7. Memoria Operacional

Fase inicial sem migracao pesada:

- Salvar respostas do Jarvis com marcadores estruturados discretos no conteudo ou metadados embutidos em JSON quando apropriado.
- Criar helpers que leem historico recente de `JarvisChatMessage` para extrair:
  - diagnosticos anteriores
  - recomendacoes feitas
  - decisoes registradas
  - acoes pendentes
  - perguntas recorrentes
- Incluir essa memoria resumida no Context Builder.

Fase futura recomendada:

- Criar tabela dedicada, por exemplo `jarvis_operational_memory`, com tipo, entidade, payload, status, created_at e resolved_at.
- Migrar gradualmente a memoria operacional para registros consultaveis sem depender de parsing do historico.

## Estrategia de Seguranca

### SQL Fallback

- `query_database` deve ser chamada apenas quando nenhuma tool especializada cobrir a pergunta.
- Manter somente `SELECT`.
- Bloquear comandos perigosos mesmo dentro de CTEs ou comentarios:
  - `insert`, `update`, `delete`, `drop`, `truncate`, `alter`, `grant`, `revoke`, `create`, `replace`, `merge`, `copy`, `execute`, `call`.
- Bloquear multiplas statements.
- Bloquear comentarios SQL quando nao forem necessarios.
- Aplicar allowlist de tabelas consultaveis:
  - `stores`
  - `tasks_steps`
  - `integration_metrics`
  - `support_conversations`
  - `support_agent_performance`
- Bloquear tabelas sensiveis:
  - `users` em retorno bruto
  - tabelas de autenticacao, tokens, logs internos e configuracoes
- Aplicar `LIMIT` maximo quando a query nao tiver limite.
- Limitar retorno bruto a no maximo 50 linhas, preferindo 20 para fallback.
- Registrar query, usuario, sessao, timestamp, duracao, quantidade de linhas e motivo do fallback.
- Adicionar timeout de query no nivel possivel com SQLAlchemy/engine ou controle de tempo no servico.

### Dados de Pessoas

- Comparar analistas com contexto operacional, nao com julgamento pessoal.
- Evitar respostas acusatorias; usar termos como "sinal de risco", "carteira concentrada", "idle acima da media".
- Quando a amostra for pequena, declarar limitacao.

### LLM

- A LLM final nao deve escolher SQL livre como primeira opcao.
- Tool results devem ser serializados em JSON compacto.
- Se tool falhar, resposta deve mencionar limitacao e usar dados restantes.

## Testes e Verificacao

### Testes Unitarios Recomendados

- Roteamento de intencao:
  - "quem esta performando mal no time?" => `TEAM_PERFORMANCE`
  - "devo me preocupar com Joao?" => `ANALYST_PERFORMANCE`
  - "quais lojas estao criticas hoje?" => `STORE_ANALYSIS` + `get_critical_stores`
  - "gere um resumo para Slack" => `SLACK_SUMMARY` + modo `slack`
  - "qual MRR esta travado?" => `FINANCIAL_MRR`
- Selecionador de tools por intencao.
- Context Builder com payload padronizado.
- Prompt final contendo fato, hipotese, recomendacao e limitacoes.
- Sanitizacao SQL:
  - rejeitar `UPDATE`, `DELETE`, `DROP`, multiplas statements e tabelas bloqueadas.
  - aplicar limite quando ausente.

### Testes de Integracao Recomendados

- `JarvisService.chat` mantendo retorno com `response` e `session_id`.
- Sessao nova e sessao existente.
- Tool especializada retornando dados agregados sem quebrar resposta final.
- Fallback SQL funcionando para pergunta generica segura.
- Erro de tool gerando resposta com limitacao, sem exception exposta ao usuario.

### Verificacao Manual

Executar perguntas reais:

- "Quem esta performando mal no time?"
- "Quais lojas estao mais criticas hoje?"
- "Qual implantador eu devo acompanhar?"
- "Qual MRR esta travado?"
- "Gere um resumo para Slack do desempenho do mes."
- "Devo me preocupar com determinado analista?"

Critérios de aceite:

- Jarvis identifica a intencao.
- Usa tool especializada antes do SQL fallback.
- Resposta interpreta os dados.
- Resposta separa fato, hipotese e recomendacao quando aplicavel.
- Indica acao quando ha risco.
- Declara limitacoes quando faltam dados.

### Comandos Provaveis

- `python -m pytest` ou comando de teste equivalente identificado no repositorio.
- Se nao houver suite configurada, criar testes focados ou executar verificacoes pontuais via Flask app context.

## Riscos

- O modelo atual de memoria (`JarvisChatMessage`) nao tem metadados estruturados; a memoria inicial pode ser limitada ate existir tabela dedicada.
- Alguns campos de data e status tem variacoes (`finished_at`, `manual_finished_at`, `end_real_at`, `status`, `status_norm`), exigindo criterio consistente para evitar metricas divergentes.
- Reaproveitar services existentes reduz duplicacao, mas pode carregar regras antigas que precisam ser documentadas no payload de limitacoes.
- Timeout SQL pode depender da configuracao do banco/driver em uso.
- Classificacao por LLM pode variar; por isso o roteador deve ter regras deterministicas para intents comuns.
- Perguntas sobre performance individual podem gerar respostas injustas se nao compararem carga, carteira, MRR e complexidade.

## Plano de Implementacao Apos Aprovacao

### Fase 2.1: Fundacao Backend

- Refatorar `JarvisService.chat` em etapas menores mantendo o contrato publico.
- Adicionar enum/constantes de intents e modos.
- Implementar `_route_intention`.
- Implementar `_resolve_period`.
- Criar catalogo de tools especializadas.

### Fase 2.2: Tools e Contexto

- Implementar tools com ORM/services existentes.
- Criar `_build_operational_context`.
- Garantir limite de listas e agregacoes.
- Adicionar alertas e limitacoes padronizados.

### Fase 2.3: Prompt e Resposta Final

- Revisar system prompt.
- Criar prompt final baseado em payload estruturado.
- Ajustar modos de resposta.
- Tratar falhas parciais de tools.

### Fase 2.4: Memoria e Seguranca

- Implementar memoria operacional leve via historico.
- Reforcar `_execute_read_only_query`.
- Adicionar logs de query fallback.
- Adicionar timeout ou controle de duracao.

### Fase 2.5: Testes

- Adicionar testes unitarios para router, tools, context builder e SQL guard.
- Rodar suite disponivel.
- Corrigir regressões mantendo rotas compativeis.

## Checkpoint

Plano criado em `docs/PLAN.md`.

Antes de iniciar a implementacao, o usuario deve aprovar explicitamente:

- `Y`: iniciar implementacao.
- `N`: revisar este plano.

## Checkpoint de Verificacao

Verificacao feita apos pedido do usuario para aplicar o plano.

- [x] Corrigido erro Ruff `F821` em `backend/app/services/jarvis_service.py` causado por uma linha solta `user`.
- [x] Normalizado `backend/app/routes_jarvis.py`, que estava modificado apenas por finais de linha CRLF e gerava `git diff --check` com trailing whitespace.
- [x] Fase 2.1 aplicada: `JarvisService.chat` foi refatorado em etapas menores, com roteador de intencao, resolucao de periodo e catalogo de tools.
- [x] Fase 2.2 aplicada: tools iniciais foram implementadas para time, analista, loja, lojas criticas, SLA, MRR, suporte, entregas mensais e funil.
- [x] Fase 2.3 aplicada: resposta final passou a usar contexto operacional estruturado, prompt revisado e fallback heuristico local.
- [x] Fase 2.4 aplicada: memoria operacional leve e SQL fallback reforcado com allowlist, bloqueios, limite e log de execucao.
- [x] Sintaxe validada com `python3 -m py_compile backend/app/services/jarvis_service.py backend/app/routes_jarvis.py`.
- [x] Whitespace validado com `git diff --check -- backend/app/services/jarvis_service.py backend/app/routes_jarvis.py docs/PLAN.md`.
- [ ] Testes completos com dependencias seguem pendentes porque o ambiente WSL nao tem Flask instalado e o venv presente e Windows (`.venv/Scripts/python.exe`), que falhou ao executar no WSL.
