# Plano: Otimização de Layout e Temas do Sync Engine

## Objetivo
Ajustar o dashboard do Sync Engine para melhorar a visibilidade, corrigir inconsistências de tema (mistura de claro/escuro) e organizar o layout conforme as novas diretrizes.

## Problemas Identificados
1. **Inconsistência de Tema**: `SyncPage.tsx` possui fundo escuro fixo (`zinc-950`), enquanto `SyncHealthPanel.tsx` usa fundo claro (`white/60`). Isso cria um visual "bagunçado", especialmente em ambientes claros.
2. **Logs Desnecessários**: A tabela de "Histórico de Falhas" está ocupando espaço e tornando a página gigante. O usuário solicitou a remoção, pois os logs já são consultados no Render.
3. **Novos Tipos de Sync**: O sistema agora opera com 3 tipos principais de sincronismo que precisam estar bem distribuídos na tela.

## Solução Proposta

### Fase 1: Planejamento (Concluída)
- [x] Análise da base de código e identificação dos arquivos (`SyncPage.tsx`, `SyncHealthPanel.tsx`, `tailwind.config.js`).
- [x] Identificação de estilos hardcoded.

### Fase 2: Implementação (Aguardando Aprovação)

#### 1. Harmonização de Temas (@frontend-specialist)
- Ajustar `SyncPage.tsx` e `SyncHealthPanel.tsx` para usar variantes `dark:` do Tailwind ou padronizar um tema que respeite a preferência do sistema.
- Priorizar um visual limpo (light mode por padrão com suporte a dark mode) para evitar o aspecto "bagunçado" mencionado.
- Remover o fundo `bg-zinc-950` fixo do container principal.

#### 2. Reestruturação de Logs e Painéis (@frontend-specialist)
- **Remover Histórico de Falhas**: Excluir a tabela de erros do `SyncHealthPanel.tsx`.
- **Terminal de Logs em Tempo Real**: Manter apenas o terminal de execução (`Execution Logs // Stream`) com altura fixa e scroll, garantindo que ele não expanda a página.

#### 3. Organização dos 3 Tipos de Sync (@frontend-specialist)
- Reorganizar a interface para destacar os 3 pilares:
    1. **Vital Sync** (Otimizado/Rápido)
    2. **Deep Sync** (Completo/Raio-X)
    3. **Fast Sync** (Integração/Implantação - consolidar conforme feedback)
- Garantir que os cards tenham a mesma linguagem visual (mesmos raios de borda e ícones).

#### 4. Limpeza de Layout e UX (@frontend-specialist)
- Padronizar os raios de borda (alguns usam `rounded-3xl`, outros `rounded-[2rem]`).
- Corrigir o erro de "Invalid Date" no cabeçalho quando os dados de sync estão nulos.
- Ajustar margens e paddings para maior consistência.

#### 5. Verificação (@test-engineer)
- Executar `lint_runner.py` para garantir qualidade do código.
- Validar a responsividade e consistência visual.

## Arquivos a serem modificados
- `frontend/src/features/sync/SyncPage.tsx`
- `frontend/src/features/sync/SyncHealthPanel.tsx`
- `frontend/tailwind.config.js`

## Critérios de Sucesso
- Dashboard visualmente consistente e moderno.
- Página com altura controlada (sem expansão infinita por logs).
- Os 3 tipos de sync claramente identificados e funcionais.
- Erro de "Invalid Date" resolvido.
