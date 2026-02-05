# 📋 Documentação de Progresso - Sistema de Gestão 3.0
**Status: Versão Alpha Funcional (Módulo Implantação Completo)**
**Data:** 05/02/2026

## 🏗️ Arquitetura do Sistema
O sistema foi reconstruído utilizando uma arquitetura moderna e containerizada:
*   **Backend**: Python (Flask) + SQLAlchemy (PostgreSQL) + Alembic (Migrações).
    *   Rodando na porta `5000` (interno) / `5003` (host).
    *   Estrutura modular: `app/modules/{implantacao, integracao, suporte}`.
*   **Frontend**: React (Vite) + TailwindCSS.
    *   Rodando na porta `3000` (interno) / `3003` (host).
*   **Infraestrutura**: Docker Compose (`backend_v3`, `frontend_v3`, `db_v3`).

## 🚀 Funcionalidades Entregues

### 1. Módulo de Implantação (Completo)
O foco principal até agora. Substitui o antigo "Monitor de Implantação".

#### A. Monitor Unificado (`/implantacao/monitor`)
*   **Tabela Dinâmica ("Excel Like")**:
    *   Reimplementada com `TanStack Table`.
    *   **Features**: Ordenação, Ocultar/Mostrar Colunas (persistente), Rolagem horizontal, Design limpo.
*   **Paridade com Legado**:
    *   Inclui todos os campos: `Risco`, `Status`, `Datas (Go-Live Manual)`, `Financeiro (MRR/Setup)`, `KPIs (Idle Days)`, `Contexto (ERP, CRM)`.
    *   Cálculo automático de dias parados (`idle_days`) e destaque visual (🔴) para riscos.

#### B. Dashboard & Analytics (`/implantacao/dashboard`, `/implantacao/analytics`)
*   **KPI Cards**: Visão executiva (MRR em Implantação, Backlog, Total de Lojas).
*   **Gráficos Avançados**:
    *   **Scatter Plot de Risco**: Eixo X (Dias) vs Eixo Y (Etapa), identificando gargalos visuais.
    *   **Forecast Financeiro**: Projeção de MRR baseada na data de Go-Live manual ou estimada.
    *   **Tabela de Gargalos**: Top 5 lojas travadas por mais tempo.

### 2. Banco de Dados & Modelagem
O banco de dados foi migrado para suportar tanto a lógica nova quanto os dados históricos vitais.

*   **Tabelas Principais**:
    *   `projects`: Entidade central (substitui a tabela solta de cards).
    *   `implementation_logic`: Dados específicos de implantação (1:1 com Project).
*   **Paridade Legada (Adicionados Recentemente)**:
    *   Campos de Forecast: `deployment_type` (Migração/Nova), `manual_go_live_date`, `projected_orders`.
    *   Campos de AI: `ai_summary`, `ai_analyzed_at`.
    *   Tabelas Auxiliares: `task_steps` (detalhe de sub-tarefas) e `project_pauses` (histórico de congelamento).

## 🔧 Como Rodar o Projeto (Nova Máquina)

1.  **Pré-requisitos**: Docker e Docker Desktop instalados.
2.  **Setup Inicial**:
    ```bash
    # Na raiz do projeto
    docker-compose up --build -d
    ```
3.  **Banco de Dados**:
    Como já criamos as migrações, basta aplicá-las:
    ```bash
    # Entrar no container backend
    docker-compose exec backend_v3 bash
    
    # Rodar migrações
    flask db upgrade
    ```
4.  **Acessando**:
    *   Frontend: `http://localhost:3003`
    *   Backend API: `http://localhost:5003`

## 📝 Próximos Passos (To-Do)
1.  **Sincronização ClickUp (Deep Sync)**: A estrutura está pronta (`sync_implementation_tasks`), mas precisa refinar a lógica para popular as novas tabelas `task_steps` com dados reais do ClickUp.
2.  **Módulo de Integração**: A estrutura de pastas existe, mas as telas ainda não foram migradas.
3.  **Autenticação**: O sistema atual roda aberto (sem login). Implementar JWT/Auth0 se necessário.

---
**Observação**: O arquivo `backend/app/models/implementation_logic.py` é a fonte da verdade para os dados de negócio da implantação.
