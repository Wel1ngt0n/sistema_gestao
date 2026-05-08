# Plan: Gestão de Suporte (Integração Zenvia)

## Overview
Criação de um módulo de Suporte focado no monitoramento e gestão operacional de atendimentos integrados com a Zenvia via Webhooks. O objetivo é receber os eventos da Zenvia de forma rápida e segura, armazenando-os de maneira bruta para auditoria e normalizando-os para gerar métricas e indicadores de KPIs de atendimento. A aplicação lidará com os cenários de contatos conhecidos e órfãos (para posterior vinculação).

## Project Type
BACKEND & WEB (Full-Stack)

## Success Criteria
- O endpoint de webhook (`POST /api/webhooks/zenvia`) deve processar e retornar `200 OK` em tempo hábil para evitar o encerramento do timeout da Zenvia.
- Os requests devem ser validados usando um token via header para garantir a segurança.
- O sistema garantirá idempotência (por `event_id`) e não haverá mensagens ou conversas duplicadas.
- Contatos desconhecidos deverão ser tratados como "órfãos" com a capacidade de vinculação a lojas posteriormente.
- A tela "Suporte" no frontend deve exibir cards de KPI (conversas abertas, fechadas, tempo médio de resposta) baseados nos eventos.

## Tech Stack
- **Backend:** Python (Flask/FastAPI). A estratégia de ingestão consistirá de salvar rapidamente os dados na tabela bruta (`zenvia_webhook_events`) e retornar 200, delegando o processamento do payload (parsing e preenchimento das tabelas analíticas `support_messages`, `support_conversations`) para uma background task / thread separada ou processador cron para assegurar performance sem onerar o servidor ou exigir mensageria pesada (RabbitMQ/Celery) no MVP.
- **Banco de Dados:** Tabelas de métricas para suporte com esquema otimizado.
- **Frontend:** TypeScript + React (TSX). Gráficos de volume e tabelas de data grids.

## File Structure
```
backend/
  app/
    routes/
      webhook_routes.py         # Novo endpoint do webhook Zenvia
      support_routes.py         # Endpoints para fornecer os KPIs para o frontend
    services/
      zenvia_service.py         # Lógica de validação e ingestão do webhook bruto
      support_service.py        # Cálculos de KPI (primeira resposta, backlog, métricas)
      event_processor.py        # Processa eventos da tabela zenvia_webhook_events para as tabelas normalizadas
    models/
      support_models.py         # SQLAlchemy ou Models equivalentes (conversas, mensagens, contatos, agent events)

frontend/
  src/
    pages/
      SupportDashboard.tsx      # Dashboard principal de Suporte
    components/
      support/
        SupportKpiCards.tsx     # KPIs
        VolumeChart.tsx         # Gráfico de volume 
        ConversationsTable.tsx  # Tabela de conversas recentes
        ContactMatchingModal.tsx# Modal para vincular contatos órfãos a lojas
```

## Task Breakdown

### Tarefa 1: Modelagem do Banco de Dados
- **Agent:** `database-architect`
- **Skill:** `database-design`
- **Priority:** P0
- **INPUT:** Especificação dos campos do MVP (Tabelas: `zenvia_webhook_events`, `support_conversations`, `support_messages`, `support_contacts`, `support_agent_events`).
- **OUTPUT:** Migrations/Models criados na base.
- **VERIFY:** O banco é atualizado sem erros e todas as chaves primárias e relacionamentos estão estabelecidos.

### Tarefa 2: Endpoint de Webhook (Ingestão Bruta e Segurança)
- **Agent:** `backend-specialist`
- **Skill:** `api-patterns`
- **Priority:** P1
- **Dependencies:** Tarefa 1
- **INPUT:** Modelos de banco prontos. Rota: `POST /api/webhooks/zenvia`.
- **OUTPUT:** Endpoint protegido por um Token de Segurança configurado no .env, que salva os dados no `zenvia_webhook_events` validando unicidade por `event_id` e retorna imediatamente HTTP 200.
- **VERIFY:** Requisições simuladas disparam `200 OK` em <100ms e os payloads são gravados corretamente no banco; falhas de autenticação retornam 401.

### Tarefa 3: Processador de Eventos (Normalização)
- **Agent:** `backend-specialist`
- **Skill:** `clean-code`
- **Priority:** P1
- **Dependencies:** Tarefa 2
- **INPUT:** Dados brutos em `zenvia_webhook_events`.
- **OUTPUT:** Um worker ou background thread (`event_processor.py`) que processa os payloads brutos salvando-os em `support_conversations`, `support_messages` e identificando contatos (registrando como órfãos caso o telefone não bata com clientes atuais).
- **VERIFY:** O status da conversa e tempo de resposta são calculados em testes manuais ou automatizados com base nos payloads de evento MESSAGE_STATUS e CONVERSATION_STATUS.

### Tarefa 4: Serviço e API de Métricas de Suporte
- **Agent:** `backend-specialist`
- **Skill:** `api-patterns`
- **Priority:** P1
- **Dependencies:** Tarefa 3
- **INPUT:** Tabelas populadas com mensagens/conversas processadas.
- **OUTPUT:** Rotas `GET /api/support/kpis`, `GET /api/support/conversations`, etc., com parâmetros de filtro (período, canal, status).
- **VERIFY:** O endpoint retorna tempo médio/mediano de resposta válido, volumes separados e contatos agrupados.

### Tarefa 5: Dashboard Frontend e UI de Contatos Órfãos
- **Agent:** `frontend-specialist`
- **Skill:** `frontend-design`
- **Priority:** P2
- **Dependencies:** Tarefa 4
- **INPUT:** Endpoints e Mock de KPIs.
- **OUTPUT:** Tela de "Suporte" contendo os cards de KPI, Gráficos (Volume por dia), tabelas de conversas em andamento, backlog, e botões na tabela de contatos órfãos para "Vincular à Loja".
- **VERIFY:** O Dashboard exibe corretamente os dados; vinculação de cliente órfão via UI funciona adequadamente enviando request à API.

## ✅ PHASE X: VERIFICATION CHECKLIST
- [ ] Segurança: Token do webhook está no .env e endpoint rejeita sem o header correto (401).
- [ ] Performance: Endpoint webhook responde de forma rápida e síncrona retornando código 200, desacoplado do parser de entidades.
- [ ] UX Audit: A interface de Dashboard atende padrões do projeto, exibindo loading states, dados vazios limpos e sem erros de console.
- [ ] Regras de Negócio: O script não duplica conversas com o mesmo Id e métricas (First Response Time) refletem a matemática correta.
- [ ] Build & Test: `npm run build` ou compilador TS ocorre sem erros nas novas páginas.
