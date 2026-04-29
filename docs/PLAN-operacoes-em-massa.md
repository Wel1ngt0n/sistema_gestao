# PLAN-operacoes-em-massa.md

## Visão Geral
Implementar operações de ação em massa para a gestão de lojas no sistema.
- **Locais**: `MonitorV2` (Visualização em Tabela) e `MonthlyReport` (Relatório Mensal).
- **Recurso Principal**: Conclusão em massa (status=DONE + manual_finished_at).

## Critérios de Sucesso
- [ ] Usuários podem selecionar múltiplas linhas no Monitor e nos Relatórios.
- [ ] Uma interface de "Ações em Massa" aparece quando itens são selecionados.
- [ ] Atualizar mais de 10 lojas de uma vez deve levar menos de 2 segundos.
- [ ] Todas as alterações devem ser registradas no `StoreSyncLog` e `AuditLog`.

## Arquitetura Sugerida
- **Backend**: Estender o endpoint `/api/stores/bulk-update` para aceitar os campos `status` e `manual_finished_at`.
- **Frontend**: Criar um componente `BulkActionBar` flutuante e um `BulkUpdateModal` para confirmação e entrada de dados (como a data de conclusão).

## Divisão de Tarefas

### Fase 1: Backend (P0)
- **Tarefa**: Estender o endpoint `/stores/bulk-update`.
- **Agente**: `backend-specialist`
- **Descrição**: Modificar a lógica em `backend/app/routes.py` para iterar sobre os IDs e aplicar `status` e `manual_finished_at` usando o `MetricsService` para logar as mudanças.
- **Verificação**: Teste via `curl` ou Postman atualizando status e data de 3 lojas simultaneamente.

### Fase 2: Seleção no Frontend (P1)
- **Tarefa**: Adicionar seleção por checkbox ao `MonitorTableViewV2` e `MonthlyReport`.
- **Agente**: `frontend-specialist`
- **Descrição**: Implementar estado de seleção local. Adicionar coluna de checkbox na tabela.
- **Verificação**: Checkboxes funcionais e contador de itens selecionados visível.

### Fase 3: Interface de Ações em Massa (P1)
- **Tarefa**: Criar `BulkActionBar` e `BulkUpdateModal`.
- **Agente**: `frontend-specialist`
- **Descrição**: A barra deve aparecer apenas quando `selectedCount > 0`. O modal deve permitir escolher a data de conclusão.
- **Verificação**: Modal abre com a contagem correta e seletor de data funcional.

### Fase 4: Integração Final (P2)
- **Tarefa**: Conectar a interface ao endpoint de Bulk Update.
- **Agente**: `frontend-specialist`
- **Descrição**: Enviar a requisição para o backend e tratar os estados de carregamento (loading) e sucesso (toast).
- **Verificação**: Fluxo completo: Selecionar -> Concluir -> Verificar mudança no banco/lista.

## Fase X: Verificação Final
- [ ] Executar `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- [ ] Executar `python .agent/skills/frontend-design/scripts/ux_audit.py .`
- [ ] Teste E2E manual: Selecionar 5 lojas → Marcar como Concluído → Validar no Monitor.
