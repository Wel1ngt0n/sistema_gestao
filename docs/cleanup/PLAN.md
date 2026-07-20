# Plano de limpeza e organização do sistema

Data: 19/07/2026.  
Escopo: frontend, backend, banco, infraestrutura, scripts e documentação.

## Objetivo

Remover código comprovadamente obsoleto sem perder dados ou contratos ativos,
promover a implementação atual da Integração para nomes canônicos e estabelecer
uma base verificável para limpezas futuras.

## Regras de segurança

- inventariar consumidores antes de excluir;
- não apagar arquivo apenas pelo nome ou pela ausência de import frontend;
- preservar alterações preexistentes no workspace;
- fazer backup antes de migration destrutiva ou rename de schema;
- validar contagens, FKs e restauração;
- manter migrations históricas imutáveis;
- não alterar Supabase/produção nesta frente;
- dividir remoções em lotes com testes, lint, build e smoke;
- documentar o que foi mantido e por quê.

## Fase 1 — inventário e baseline

Status: concluída.

- identificar stack e entrypoints;
- mapear rotas, imports, jobs, tabelas e consumidores externos;
- registrar status do Git e preservar arquivos não relacionados;
- executar testes backend, build frontend e lint disponível;
- classificar itens em remover, renomear, manter ou investigar.

Resultado: [Inventário](./INVENTORY.md).

## Fase 2 — consolidação da Integração

Status: concluída no ambiente local.

### Frontend

- promover a feature ativa para `features/integration`;
- manter `IntegrationMonitor` e `IntegrationAnalytics`;
- atualizar rotas, menu, API, cache e armazenamento local;
- remover telas e componentes do módulo anterior;
- preservar a leitura do valor histórico `INTEGRATION_V2` em logs.

### Backend

- promover blueprint para `/api/integration`;
- promover serviços de consulta e sincronização;
- migrar Performance e Jarvis;
- remover o coletor antigo e evitar sync duplicado;
- proteger leitura, edição e sync com autenticação/RBAC;
- manter auditoria imutável.

### Banco

- preservar campos sem equivalente exato;
- registrar payload antigo em auditoria;
- renomear tabelas e objetos para `integration_*`;
- mover `integration_metrics` para `archive`, sem apagar;
- validar as duas exceções de 2025 separadamente.

## Fase 3 — limpeza global comprovada

Status: concluída para o lote seguro.

- remover componentes sem caminho de execução;
- remover scripts pontuais rastreados;
- renomear componentes ativos de Implantação;
- retirar dependências sem uso confirmado;
- organizar scripts de manutenção e arquivo;
- retirar backups sensíveis rastreados e exigir caminho explícito no restore;
- configurar escopo oficial do Pytest e ESLint;
- padronizar comentários e mensagens tocados pela frente em português.

Itens inconclusivos foram mantidos e registrados, não apagados.

## Fase 4 — validação

Status: concluída no ambiente local.

- 57 testes backend aprovados e 1 ignorado;
- 8 de 8 cenários de migration aprovados em PostgreSQL 17 descartável;
- ESLint aprovado;
- build frontend aprovado;
- auditoria npm de produção sem vulnerabilidades conhecidas;
- Docker local saudável;
- health e frontend HTTP 200;
- endpoint canônico sem sessão HTTP 401;
- endpoint antigo HTTP 404;
- CORS de produção validado.

## Fase 5 — documentação e produção

Status: documentação concluída; produção bloqueada.

- registrar removidos, renomeados e mantidos;
- registrar contagens antes/depois e backup local;
- documentar rollback;
- separar conexão de runtime e migration no Render;
- consolidar backlog de melhorias.

Produção só poderá avançar depois de backup novo do Supabase, teste de
restauração, rotação dos segredos expostos e preflight somente leitura.

## Critérios de aceite

- uma única Integração ativa e canônica;
- histórico e dados anteriores preservados;
- migrations locais em `f3a6d9e2c8b1`;
- zero órfãos de FK;
- consumidores críticos migrados;
- legado indisponível nas rotas antigas;
- testes, lint, build e smoke aprovados;
- nenhum segredo publicado na documentação;
- oportunidades não seguras separadas em backlog.

## Entregáveis

- [Relatório final](./FINAL_REPORT.md)
- [Inventário](./INVENTORY.md)
- [Melhorias futuras](./FUTURE_IMPROVEMENTS.md)
- [Registro do dia](../integration/DAILY_2026-07-19.md)
- [Runbook de migrations](../integration/MIGRATION_RUNBOOK.md)
- [Plano funcional da Integração](../integration/PLAN.md)
