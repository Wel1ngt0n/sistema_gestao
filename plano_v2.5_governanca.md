# 📄 Plano de Evolução - Versão 2.5 (Governança e Rastreabilidade)

Este documento descreve as especificações funcionais e técnicas para a futura Versão 2.5 do sistema. O objetivo desta entrega é **melhorar a governança e rastreabilidade operacional** SEM implementar controle de usuários completo (RBAC).

---

## ⚠️ Regras Críticas (Segurança de Dados)
- **Zero Data Loss:** Nenhuma tabela ou coluna existente pode ser apagada ou alterada de forma destrutiva.
- **Backup Obrigatório:** Todo procedimento de migração deve ser precedido por um backup manual (`/admin/backup`).
- **Migração Aditiva:** As mudanças no banco de dados devem ser puramente aditivas (CREATE TABLE, ALTER TABLE ADD COLUMN).

---

## 📦 Escopo Funcional

### 1. Painel “Saúde do Sync” (Observabilidade)
**Objetivo:** Permitir que o operador saiba se o sistema está atualizado e saudável.

*   **UI:**
    *   Painel dentro da aba **Sync**.
    *   **Cards:** Último Sync (Data/Hora), Duração, Itens Processados, Status (Sucesso/Falha).
    *   **Alerta de "Dados Obsoletos":** Aviso visual se o último sync ocorreu há mais de 6 horas.
    *   **Tabela de Erros:** Lista dos últimos erros de sincronização (ex: "Falha na loja X: Campo Y inválido").
*   **Backend:**
    *   Persistir histórico de execuções (`sync_runs`).
    *   Persistir erros detalhados (`sync_errors`).

### 2. Audit Log do Forecast (Rastreabilidade)
**Objetivo:** Saber "quem mudou o que" nas previsões de entrega, já que datas manuais impactam o financeiro.

*   **Rastreamento:**
    *   Monitorar alterações em: `Data Prevista`, `Considerar no Forecast`, `Observações`.
    *   Registrar: Valor Antigo -> Valor Novo, Data da Mudança e Store ID.
*   **UI:**
    *   Botão **"Histórico"** na tabela de Forecast (ícone de relógio).
    *   Modal exibindo a linha do tempo das alterações.

### 3. Score de Risco Explicado (Breakdown)
**Objetivo:** Eliminar a dúvida de "por que essa loja está com risco alto?".

*   **UI:**
    *   Ao passar o mouse ou clicar no Score de Risco (Dashboard/Monitor), exibir o cálculo aberto:
        *   `Dias Corridos: +X`
        *   `Dias Parado: +Y`
        *   `Penalidade Financeira: +15`
        *   **Total: Z**

### 4. Dicionário de Métricas
**Objetivo:** Padronizar o entendimento dos termos do sistema.

*   **UI:**
    *   Modal acessível pelo menu ou ícone de ajuda (❓).
    *   Definições claras de: *SLA, MRR em Implantação, Dias de Trânsito, Dias na Etapa, Cálculo de Risco*.

---

## 🛠️ Especificação Técnica (Banco de Dados)

Serão criadas 3 novas tabelas para suportar essas funcionalidades sem tocar nas tabelas atuais (`stores`, `metrics_snapshot`, etc).

### `sync_runs`
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | Integer (PK) | Identificador da execução. |
| `started_at` | DateTime | Início do processo. |
| `finished_at` | DateTime | Fim do processo. |
| `status` | String | 'SUCCESS', 'PARTIAL', 'ERROR'. |
| `items_processed` | Integer | Total de lojas verificadas. |
| `items_updated` | Integer | Total de alterações salvas. |
| `error_summary` | Text | Resumo de falhas (se houver). |

### `sync_errors`
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | Integer (PK) | Identificador. |
| `sync_run_id` | Integer (FK) | Vínculo com a execução. |
| `store_id` | Integer (FK) | Loja afetada (opcional). |
| `error_msg` | Text | Mensagem de erro legível. |
| `traceback` | Text | Log técnico para debug. |
| `created_at` | DateTime | Carimbo de tempo. |

### `forecast_audit_logs`
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | Integer (PK) | Identificador. |
| `store_id` | Integer (FK) | Loja alterada. |
| `field_name` | String | Campo alterado (planned_date, etc). |
| `old_value` | String | Valor anterior. |
| `new_value` | String | Valor novo. |
| `changed_at` | DateTime | Data da alteração. |
| `actor` | String | "local_user" (V2.5 não tem login real). |

---

## 📅 Plano de Execução (Sugerido)

1.  **Backup Total:** Rodar `python backend/backup_manager.py`.
2.  **Migração DB:** Rodar script SQL/Python para criar as novas tabelas.
3.  **Backend Logic:** Atualizar `SyncService` para escrever nas novas tabelas.
4.  **Frontend:** Criar componentes visuais (`SyncHealthPanel`, `ForecastHistoryModal`).
5.  **Validação:** Testar fluxo completo garantindo integridade dos dados antigos.
