# Oportunidades futuras do sistema

Este backlog foi separado da limpeza atual para evitar misturar remocao de
legado com mudancas amplas de arquitetura. A ordem considera risco operacional,
seguranca dos dados e retorno para a equipe.

Estado de referencia: limpeza local concluida em 19/07/2026. Evidencias e
limites estao no [relatorio final](./FINAL_REPORT.md). Este e o backlog unico;
documentos de dominio apenas detalham os itens aqui listados.

## P0 - antes dos proximos deploys de banco

### Pipeline unico de migrations

- Manter `flask db upgrade` como etapa obrigatoria e bloqueante em todos os
  ambientes, seguindo o modelo fail-closed ja configurado no Render.
- Validar explicitamente a revision esperada depois do upgrade.
- Manter rollback documentado e nunca editar revisions ja aplicadas.
- Depois de estabilizado, retirar `db.create_all()` e reparos SQL automaticos do
  boot normal; deixar reparo somente como comando administrativo explicito.

### Backup real de PostgreSQL/Supabase

- Substituir o backup atual, que atende SQLite, por `pg_dump` verificavel.
- Gerar manifesto com data, revision Alembic, tamanho, checksum e contagens.
- Testar restauracao periodicamente em banco descartavel.
- Guardar backups fora do Git, criptografados e com politica de retencao.
- Remover backups de producao do historico Git em uma operacao separada e
  coordenada, depois de confirmar copias privadas.

### Segredos e credenciais

- Rotacionar credenciais que tenham sido compartilhadas em terminal, conversa,
  log ou arquivo rastreado.
- Usar o cofre do provedor para banco, ClickUp, OpenAI e webhooks.
- Adicionar varredura de segredos no CI e bloquear novos dumps no repositorio.

### Permissoes administrativas

- Avaliar uma permissao especifica de gestao da Integracao para substituir o
  uso amplo de `manage_performance` em edicao, bloqueio, desconto, qualidade e
  alteracao de responsavel.
- Registrar ator, valores anterior/novo, data e origem em toda alteracao.
- Definir politica de retencao e consulta dos logs de auditoria.

## P1 - confiabilidade e manutencao

### Cobertura de testes do sistema inteiro

- Criar testes de contrato para autenticacao, Implantacao, Analytics,
  Relatorios, Performance, Suporte, Jarvis, Admin e Perfil.
- Adicionar testes frontend para componentes e fluxos criticos.
- Criar smoke tests Playwright desktop e mobile com usuario de teste.
- Validar migrations com upgrade, downgrade controlado, contagens e FKs.
- Publicar cobertura no CI e impedir queda abaixo do limite acordado.

### Qualidade automatizada

- Ativar ESLint com configuracao versionada e regras compativeis com React.
- Adotar formatacao automatica e checagem de tipos no CI.
- Adicionar Ruff/Black ou ferramenta equivalente no Python, em rollout gradual.
- Padronizar UTF-8 e comentarios/docstrings em portugues.
- Usar imports absolutos e limites claros entre dominios.

### Acessibilidade e tipagem do frontend

- Auditar os fluxos principais com ferramenta WCAG em navegador, incluindo
  teclado, foco, nomes acessiveis, contraste e reducao de movimento.
- Revisar os 58 alertas do analisador estatico, separando ocorrencias reais de
  falsos positivos em componentes React.
- Elevar gradualmente a cobertura de tipos; a heuristica atual encontrou 22
  usos de `any` e estimou 43% de cobertura.
- Definir se o produto continuara exclusivamente em portugues. Somente adotar
  uma camada de i18n se houver requisito real de outros idiomas.
- Manter a aplicacao privada com `noindex`; SEO/GEO de paginas internas nao e
  objetivo enquanto o sistema exigir autenticacao.

### Scheduler sem duplicidade

- Executar jobs em um processo dedicado ou fila de tarefas.
- Evitar iniciar APScheduler em cada worker Gunicorn.
- Implementar lock distribuido, idempotencia e painel de execucoes.
- Alertar falhas, atrasos e execucoes concorrentes.

### Observabilidade

- Estruturar logs em JSON com correlation ID e identificador de usuario.
- Medir latencia e erros por rota, duracao de sync e atraso das filas.
- Integrar rastreamento de excecoes e alertas operacionais.
- Criar health checks separados para aplicacao, banco e dependencias externas.

## P2 - evolucao arquitetural

### Separacao por dominio no backend

- Dividir `routes.py`, `models.py`, `jarvis_service.py`,
  `analytics_service.py`, `analysts_report_service.py` e
  `support_importer.py` em pacotes menores.
- Manter contratos publicos estaveis durante a extracao.
- Isolar queries, regras de negocio, serializacao e adaptadores externos.

### Modelo reutilizavel de cockpit de loja

- Extrair o shell visual do detalhe de Integracao como componente de dominio
  compartilhavel com Implantacao.
- Padronizar cabecalho, abas, timeline, auditoria, formularios, estados de
  carregamento e confirmacoes.
- Manter campos e permissoes especificos em adaptadores de cada modulo.
- Migrar Implantacao apenas depois de testes visuais e funcionais equivalentes.

### Contratos de API

- Versionar apenas APIs publicas quando houver necessidade real, sem levar
  sufixos de versao para nomes internos permanentes.
- Gerar especificacao OpenAPI e cliente TypeScript.
- Padronizar paginacao, filtros, erros, datas, moeda e enums.
- Criar periodo de compatibilidade antes de remover endpoints externos.

### Dados e Analytics

- Criar camada de metricas com definicoes versionadas de lead time, tempo
  bloqueado, cobertura, taxa de conclusao e qualidade.
- Evitar duplicar valores derivados em varias tabelas.
- Registrar origem e instante de sincronizacao de cada dado externo.
- Avaliar views materializadas ou pipeline analitico quando o volume justificar.

### Dependencias e builds

- Fixar versoes Python com lockfile e atualizacao automatizada controlada.
- Usar `npm ci` nas imagens e CI.
- Dividir o bundle frontend por rota e medir impacto antes/depois.
- Alinhar a versao do PostgreSQL local com a versao de producao.
- Remover dependencias sem uso somente com build, testes e smoke aprovados.

## P3 - organizacao do repositorio

- Substituir copias de codigo em documentos por links para commits, diagramas e
  patches pequenos.
- Mover materiais de design e exportacoes para armazenamento documentado quando
  houver copia confirmada.
- Definir politica para `archive/`, `scratch/`, dumps e scripts pontuais.
- Criar mapa de donos por dominio e checklist para excluir codigo legado.
- Automatizar deteccao de imports mortos, arquivos grandes e dependencias sem uso.

## Criterio para promover uma melhoria

Cada item deve ter responsavel, escopo, risco, plano de rollback, cobertura e
metrica de sucesso. Itens que alteram dados ou contratos externos precisam de
janela de compatibilidade e validacao em ambiente de homologacao.

Detalhamento relacionado ao cockpit compartilhavel:
[Evolucao futura do detalhe operacional](../integration/FUTURE_DETAIL_MODAL.md).
