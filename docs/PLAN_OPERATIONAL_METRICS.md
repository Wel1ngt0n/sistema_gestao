# Plano: Métricas Operacionais e Observações Privadas

## Objetivo
Integrar o controle operacional (Qualidade, Retrabalho, SLA) e as observações privadas no cálculo de performance dos implantadores e nos relatórios gerenciais (Cockpit/Raio-X).

## 1. Definição dos Campos (Tabela `stores`)
- `qualidade_completa` (Boolean): Indica se a loja chegou completa na qualidade (Meta: 100%).
- `teve_retrabalho` (Boolean): Já existe. Indica retrabalho pós-go-live (Penalidade: Alta).
- `considerar_tempo_implantacao` (Boolean): Já existe (Label: "Considerar SLA?").
- `observacoes` (Text): Já existe (Label: "Observações Privadas").

## 2. Impacto no Score Final
O cálculo atual em `_calculate_score` deve ser evoluído:
- **Qualidade (Peso 20%)**: Composto por `qualidade_completa` (10%) e `teve_retrabalho` (10%).
- **SLA (Peso 40%)**: Se `considerar_tempo_implantacao` for `False`, a loja é ignorada no cálculo de atraso (SLA), protegendo o analista de atrasos causados por fatores externos/clientes.

## 3. Inteligência Artificial (Raio-X)
- Enviar o conteúdo de `observacoes` para o prompt da IA no `AnalystsReportService`.
- A IA deve usar as observações para justificar scores baixos ou destacar dificuldades específicas reportadas pelo gestor.

## 4. Interface (UI/UX)
- Implementar o componente "CONTROLE OPERACIONAL / SLA" com os checkboxes.
- Implementar a área de "OBSERVAÇÕES PRIVADAS" com autosave.
- Exibir ícones de status (ex: ⚠️ para retrabalho, ✅ para qualidade) na lista de lojas do analista.

## Cronograma
- [ ] **Fase 1**: Schema Update (Adicionar `qualidade_completa`).
- [ ] **Fase 2**: Refatoração da lógica de Score no Backend.
- [ ] **Fase 3**: Integração das Observações no prompt do Raio-X.
- [ ] **Fase 4**: Criação dos componentes de UI e integração com API.
