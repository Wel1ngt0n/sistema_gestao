# PLAN: Infraestrutura de Webhook de Suporte e Deploy

## 📋 Visão Geral
Este plano descreve a orquestração e as etapas de implementação necessárias para colocar a infraestrutura de suporte online usando Render (Backend), Vercel (Frontend) e Supabase (Banco de Dados). Isso inclui a criação de uma Tela de Configuração de Webhooks, a exposição do manipulador de webhooks para a web e a implementação de uma funcionalidade de sincronização (sync) de suporte.

## 🤖 Agentes & Funções
| Agente | Função | Foco |
|-------|------|-------|
| `project-planner` | Arquiteto | Divisão das tarefas e alinhamento do sistema (Fase 1) |
| `frontend-specialist` | Desenvolvedor UI/UX | Tela de configuração de webhooks e interface de sync de suporte (Fase 2) |
| `backend-specialist` | Servidor e API | Manipulador de webhooks, lógica de sync e configuração de deploy no Render (Fase 2) |
| `devops-engineer` | Operações | Configuração do deploy para integrações com Vercel, Render e Supabase (Fase 2) |

---

## 🚀 Fase 1: Planejamento e Análise
- [x] Analisar o pedido do usuário para Deploy e Webhooks de Suporte.
- [x] Criar este `PLAN.md` para coordenar múltiplos agentes.

---

## 🛠️ Fase 2: Implementação (Aguardando Aprovação do Usuário)

### Passo 1: Infraestrutura de Webhook e Deploy no Render (Backend)
- Definir endpoints de webhook no backend para receber eventos externos de suporte.
- Configurar as definições de deploy para o Render.
- Configurar as strings de conexão do Supabase com segurança.

### Passo 2: Tela de Configuração de Webhooks (Frontend)
- Criar uma página dedicada `/support/settings` ou `/webhooks` no frontend.
- Exibir a URL pública do Webhook do sistema (ex: `https://api.seusistema.com/webhooks/...`) em destaque para fácil cópia.
- Implementar formulários para adicionar, editar, desativar e testar URLs de Webhooks.
- Garantir um design premium alinhado ao sistema existente.
- Preparar o deploy do frontend na Vercel.

### Passo 3: Funcionalidade de Sync de Suporte
- Criar um endpoint de API e uma tarefa em segundo plano para sincronizar os dados de suporte.
- Adicionar um gatilho "Sincronizar Agora" no dashboard de suporte.
- Exibir o status da sincronização, horário do último sync e logs de erros na interface.

### Passo 4: Verificação e Deploy Final
- Executar `security_scan.py` para garantir que os webhooks expostos estejam seguros.
- Verificar o funcionamento de ponta a ponta (E2E).

## ❓ Perguntas Pendentes (Portão Socrático)
1. Você já tem algum provedor de webhook específico em mente que enviará dados para nós (ex: Stripe, Hotmart, Intercom)?
2. Quais dados específicos de suporte devem ser sincronizados por essa funcionalidade de "Sync de Suporte"?
3. As contas do Render, Vercel e Supabase já estão criadas e vinculadas a este repositório?
