# Evolução futura do detalhe operacional de lojas

## Objetivo

O detalhe da Integração é a referência visual e de interação para uma futura
modernização do detalhe de Implantação. A proposta não é unificar regras de
negócio, e sim compartilhar uma estrutura visual consistente, mantendo
permissões, APIs e persistência isoladas por domínio.

Estado atual:

- a Integração possui modal central, abas, resumo executivo, edição, revisão de
  bloqueios e auditoria;
- `OperationalDetailModalShell` ainda vive dentro da feature de Integração;
- Implantação usa `ImplantationMonitor`, `ImplantationMonitorTable`,
  `ImplantationStoreCockpitModal` e o editor `MonitorStoreModal` em fluxos
  ativos distintos;
- a migração visual de Implantação não fez parte da limpeza de 19/07/2026.

## Responsabilidade do shell compartilhável

O shell pode cuidar de:

- diálogo central responsivo, backdrop e contenção de foco;
- cabeçalho com loja, status, identificador e link de origem;
- área de datas ou indicadores em evidência;
- abas com badges;
- conteúdo rolável;
- rodapé fixo com salvar, cancelar e alterações pendentes;
- estados de carregamento, erro, vazio e salvamento;
- confirmação antes de descartar alterações.

O shell não deve conhecer campos de Implantação, Integração, pausas, bloqueios
ou ClickUp. Cada domínio fornece seus próprios conteúdos, comandos, validações e
adaptadores.

## Componentes candidatos

Destino futuro sugerido: `frontend/src/components/operational-detail/`.

| Componente | Responsabilidade compartilhável | Permanece no domínio |
| --- | --- | --- |
| `OperationalDetailModalShell` | diálogo, cabeçalho, abas, scroll e rodapé | textos, dados e comandos |
| `OperationalSummaryGrid` | grade responsiva | indicadores e cálculos |
| `OperationalDateHighlight` | apresentação de início/fim | fonte oficial e precedência |
| `OperationalSectionCard` | estrutura de seção | campos e validações |
| `OperationalAuditTimeline` | layout de evento, autor e data | tradução dos eventos |
| `ReviewDecisionCard` | decisão, motivo e estado | pausa ou bloqueio |
| hooks de diálogo | foco, Escape, scroll lock e descarte | fetch, mutation e cache |

Tipos de API, formulários e mutations não devem entrar na camada visual
compartilhada. Composição por props e slots é preferível a condicionais por
módulo.

## Diferenças que devem permanecer

| Tema | Implantação | Integração |
| --- | --- | --- |
| Processo | projeto, cronograma e prazo contratual | fluxo operacional do quadro de Integração |
| Início/fim | datas do projeto e ajustes próprios | primeira entrada em Contato/Comunicação e conclusão oficial |
| Responsável | implantador e responsáveis do projeto | integrador sincronizado/manual e qualidade |
| Desconto | pausas do projeto | bloqueios revisados |
| Qualidade | regras atuais da Implantação | processo correto, pós-integração, risco e documentação |
| Dados complementares | fonte proprietária | referência somente leitura da Implantação |
| Histórico | etapas, edições e pausas | transições, edições e decisões de bloqueio |

Dados herdados devem indicar origem e frescor. Sua edição continua no domínio
proprietário.

## Contrato de edição e auditoria

Toda adoção futura deve:

1. separar DTO de leitura e rascunho local;
2. enviar somente campos editáveis do domínio;
3. validar permissão e dados no servidor;
4. adicionar controle de concorrência por versão ou `updated_at`;
5. retornar o registro atualizado e invalidar apenas caches afetados;
6. registrar evento imutável com antes/depois, ator, data, origem e motivo;
7. nunca gravar token ou payload externo sensível em logs.

Recalcular duração no backend. O frontend apenas apresenta o valor oficial.

## Estratégia incremental para Implantação

### 1. Estabilizar a referência

- validar fluxos de Integração em desktop e mobile;
- cobrir estados vazios, extensos e incompletos;
- concluir acessibilidade e testes de teclado;
- remover dependências de domínio do shell.

### 2. Extrair primitivas

- mover somente componentes visuais comprovadamente reutilizáveis;
- manter reexports temporários durante a troca de imports;
- criar fixtures e testes para os dois domínios.

### 3. Criar adaptador de Implantação

- mapear lojas, logs, etapas e pausas para view models;
- preservar endpoints e regras atuais nessa fase;
- encapsular `alert`, `prompt` e `confirm` do editor antes do redesenho.

### 4. Migrar por abas

- começar pelo resumo somente leitura;
- migrar cronograma e histórico;
- migrar edição e pausas/descontos por último;
- usar feature flag e manter retorno temporário ao fluxo anterior.

### 5. Desativar o detalhe anterior

- comparar respostas, cálculos e auditorias;
- atualizar Monitor, Relatórios e demais consumidores;
- acompanhar erros e tempo de tarefa;
- remover o componente anterior somente após aceite e janela segura.

## Acessibilidade e responsividade

- diálogo semântico com título associado e focus trap;
- restauração do foco no elemento de origem;
- teclado nas abas, `Escape` e ordem de foco coerente;
- `aria-selected`, `aria-controls` e feedback `aria-live`;
- contraste WCAG AA e estados que não dependem apenas de cor;
- alvos de toque de pelo menos 44 px;
- viewport e safe areas em telas pequenas;
- rolagem apenas da área principal em desktop;
- respeito a `prefers-reduced-motion`.

## Riscos e dívida técnica

- o shell ainda não é uma API compartilhada estável;
- o editor `MonitorStoreModal` concentra consulta, estado, mutação e UI;
- formatos de log e duração diferem entre os domínios;
- falta um contrato comum para conflito de edição;
- históricos extensos podem exigir paginação ou virtualização;
- a migração precisa de testes visuais, de teclado e responsividade.

## Critério de conclusão

Implantação só deve abandonar o detalhe atual quando houver paridade funcional,
cálculos equivalentes, auditoria preservada, acessibilidade validada,
consumidores atualizados e rollback seguro.

Este trabalho está consolidado no backlog global:
[Oportunidades futuras do sistema](../cleanup/FUTURE_IMPROVEMENTS.md).
