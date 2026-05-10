# PLANO DE IMPLEMENTAÇÃO: CENTRO DE EXCELÊNCIA EM SUPORTE (V3.1)

## 1. FASE DE ANÁLISE E MAPEAMENTO
- [x] Mapear chaves de cruzamento entre as planilhas
- [x] Identificar campos de "Extração Profunda" (NPS, Tempos)

## 2. FASE DE INFRAESTRUTURA (SCHEMA)
- [x] Evoluir `SupportConversation`: agent_name, nps_score, nps_comment, response_time_seconds, resolution_time_seconds, close_reason
- [x] Criar tabela `SupportAgentPerformance` (volume, tempos, NPS, atividade)
- [x] Adicionar schema_repair para deploy automático

## 3. FASE DE INGESTÃO (BACKEND)
- [x] Implementar motor multi-arquivo em `support_importer.py`:
  1. `enrich_contacts_from_conversations_csv` (Cadastro + NPS)
  2. `import_zenvia_activities_csv` (Mensagens + Agentes)
  3. `import_agent_performance_csv` (KPIs agregados)
  4. `import_agents_status_csv` (Estado atual)
  5. `calculate_agent_nps` (Pós-processamento)
- [x] Novos endpoints: `/api/support/agent-performance`, `/api/support/nps-feedbacks`

## 4. FASE DE DASHBOARD (FRONTEND)
- [x] Criar aba "Performance da Equipe" no SupportDashboard
- [x] Ranking de NPS por Atendente com medalhas
- [x] Tabela de Feedbacks de NPS Recentes
- [ ] Filtros por Período (próxima iteração)

## VERIFICAÇÃO
- [ ] Testar importação completa via botão "IMPORTAR HISTÓRICO"
