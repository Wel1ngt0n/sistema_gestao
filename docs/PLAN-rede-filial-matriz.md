# PLAN-rede-filial-matriz.md

Este plano detalha as alterações necessárias no backend e frontend do sistema para unificar e automatizar a amarração lógica de Redes de lojas, Matrizes (headquarters) e Filiais (branches).

## Contexto & Objetivos

Atualmente, os campos `rede`, `tipo_loja` (Matriz/Filial) e `parent_id` (vínculo com Matriz) são manipulados de forma independente. O objetivo é criar uma amarração inteligente:
1. **Herança de Rede automática:** Ao vincular uma loja a uma Matriz, ela deve herdar a Rede dessa Matriz.
2. **Propagação de Rede:** Se a Rede de uma Matriz for renomeada, todas as suas Filiais devem ter seus nomes de Rede atualizados automaticamente.
3. **Consistência de Tipos:** Vincular a uma matriz automaticamente define o tipo como "Filial". Mudar o tipo para "Matriz" remove o vínculo de parent.
4. **Vínculo em Massa:** Ativar e implementar a funcionalidade de vincular várias lojas selecionadas a uma Matriz simultaneamente.

---

## Detalhamento das Alterações

### 1. Backend (API Flask)

* **`routes.py` (`update_store` / PUT `/api/store/<id>`)**:
  * Ao receber `parent_id` válido (vínculo a uma Matriz):
    * Define `store.tipo_loja = 'Filial'`.
    * Busca a matriz e define a `rede` da filial igual à `rede` da matriz.
    * Se a matriz não tiver `rede` preenchida, define a `rede` da matriz como seu próprio `store_name` e depois propaga.
  * Ao receber `tipo_loja = 'Matriz'`:
    * Define `store.parent_id = None`.
    * Se `store.rede` for nulo/vazio, inicializa como seu próprio `store_name`.
  * Ao atualizar a `rede` de qualquer loja de um grupo (Matriz ou Filial):
    * Propaga a alteração para todas as lojas conectadas (Matriz e todas as suas filiais) mantendo o grupo sintonizado sob o mesmo nome de Rede.

* **`routes.py` (`bulk_link_stores` / POST `/api/stores/bulk-link`)**:
  * Corrige o bug em `parent_store.name` (que deve ser `parent_store.store_name`).
  * Garante que todas as lojas vinculadas em massa assumam `tipo_loja = 'Filial'` e herdem a `rede` da matriz.

* **`routes.py` (`bulk_update_stores` / POST `/api/stores/bulk-update`)**:
  * Garante as mesmas regras e preenchimento de `rede` e `tipo_loja` no fluxo de edição em massa de múltiplos registros.

---

### 2. Frontend (React + TypeScript)

* **`BulkLinkModal.tsx` (Novo Componente)**:
  * Modal contendo uma seleção de Matrizes para vincular em massa as lojas previamente selecionadas na tabela.

* **`BulkActionBar.tsx`**:
  * Remove a restrição de `disabled` do botão **"Vincular"**.
  * Adiciona gatilho `onBulkLink` para exibir a nova modal.

* **`MonitorV2.tsx`**:
  * Integra o `BulkLinkModal`.
  * Implementa a função de chamada à API `handleBulkLink` apontando para `/api/stores/bulk-link`.

* **`MonitorStoreModal.tsx` & `MonitorStoreModalV2.tsx`**:
  * Adiciona sincronização em tempo real no formulário: ao selecionar um `parent_id` (Matriz) no dropdown, o campo `rede` é atualizado visualmente para a Rede correspondente.
  * Garante paridade de campos entre as duas versões do modal (incluindo tipo de loja e vínculo).

---

## Plano de Verificação

### Testes Automatizados
* Executar linter do frontend:
  ```bash
  npm run lint
  ```
* Validar a integridade e segurança do backend:
  ```bash
  python .agent/scripts/checklist.py .
  ```

### Testes Manuais
1. Vincular uma loja à matriz pelo modal de edição e checar se o tipo e rede são auto-preenchidos e salvos.
2. Alterar o nome da Rede na Matriz e verificar se a alteração se propaga para as filiais vinculadas.
3. Selecionar 3 lojas, clicar em "Vincular", selecionar a Matriz e verificar a atualização em massa na tabela.
