# Plano: Padronizacao PT-BR e Manutencao do Backend

## Decisoes
- Escopo seguro: padronizar comentarios, docstrings, logs e mensagens internas sem alterar contratos publicos.
- Decisao posterior: traduzir tambem textos de erro/mensagem retornados em JSON, preservando chaves, rotas, status HTTP e status normalizados.
- Preservar rotas, payloads JSON, nomes de colunas/tabelas, status normalizados e termos vindos de integracoes externas.
- Comecar pelos dominios criticos: app factory/configuracao, autenticacao, sync, metricas e rotas principais.
- Adicionar guia e auditoria para evitar regressao de padrao.

## Agentes e Responsabilidades
- `project-planner`: consolidar este plano e manter o checklist de execucao.
- `backend-specialist`: aplicar limpezas seguras em codigo Python sem alterar contratos.
- `security-auditor`: revisar logs sensiveis, autenticacao, CORS e exposicao acidental de tokens.
- `documentation-writer`: documentar padrao PT-BR e excecoes permitidas.
- `test-engineer`: executar compile, auditoria, lint/security scan e testes disponiveis.

## Etapas de Implementacao
- Criar `docs/PADRAO_BACKEND_PTBR.md` com as regras de escrita, excecoes e exemplos.
- Criar `backend/scripts/maintenance/auditar_padrao_backend.py` para reportar comentarios/docstrings em ingles, prints/debug em areas sensiveis e arquivos grandes.
- Atualizar app factory, configuracao e bootstrap para usar comentarios/logs em PT-BR.
- Atualizar autenticacao e seguranca removendo prints de debug sensiveis e usando logger.
- Atualizar sync/metricas com comentarios PT-BR, sem renomear metodos, chaves ou status externos.
- Ajustar pontos de maior impacto em rotas principais, mantendo contratos HTTP intactos.
- Traduzir textos de erro/mensagem retornados ao cliente, sem renomear as chaves `error`, `message`, `status`, `code` ou valores normalizados externos.

## Checklist de Validacao
- [x] `python -m compileall backend`
- [x] `python backend/scripts/maintenance/auditar_padrao_backend.py`
- [x] `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- [x] `python .agent/skills/lint-and-validate/scripts/lint_runner.py backend` executado; bloqueado porque `ruff` nao esta instalado no ambiente.
- [ ] Testes HTTP destrutivos foram arquivados em `backend/archive/tests/`; reativar em uma suite dedicada quando houver API de teste disponivel em `API_URL`.

## Resultado Desta Rodada
- `compileall`: passou.
- Auditoria PT-BR: passou sem comentarios/docstrings em ingles ou prints/debug sensiveis; restaram apenas 6 arquivos grandes para refactor futuro.
- Textos de erro/mensagem em ingles no backend foram traduzidos onde nao eram chaves estruturais.
- Scanner de seguranca em `.`: executado; os achados criticos restantes estao no proprio script `.agent/skills/vulnerability-scanner/scripts/security_scan.py`, por autoanalise dos padroes regex.
- Scanner de seguranca em `backend`: sem segredos e sem padroes perigosos; restou aviso generico de headers porque o scanner so reconhece arquivos como `nginx.conf`/`next.config`, enquanto o backend configura CSP via Flask-Talisman.
- Lint runner: bloqueado por ausencia do comando `ruff`.
- Pytest: nao executado porque nao havia API ouvindo em `localhost:5000`; o teste antigo foi arquivado em `backend/archive/tests/test_security.py`.

## Fora de Escopo Nesta Rodada
- Renomear rotas, payloads JSON ou colunas do banco.
- Modularizar agressivamente `routes.py` e services grandes.
- Trocar framework, ORM ou arquitetura de persistencia.
- Corrigir todos os arquivos historicos/migracoes gerados por ferramentas.
