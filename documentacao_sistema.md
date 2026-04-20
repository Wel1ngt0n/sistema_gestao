# 📘 Documentação do Sistema de Gestão (Implantação Instabuy)

Este documento detalha as funcionalidades de cada página do sistema, explicando gráficos, tabelas e recursos disponíveis.

---

## 🧭 Navegação Principal
O sistema é dividido em abas principais, acessíveis pelo menu superior:

1.  **📊 Dashboard:** Visão executiva geral.
2.  **📈 Analytics:** Análises detalhadas de performance e tendências.
3.  **� Forecast:** Previsão de entregas e financeiro (CS/Financeiro).
4.  **�🖥️ Monitor:** Gestão operacional dia-a-dia (Lista, Kanban, Cards).
5.  **🔄 Sync:** Área para sincronização manual de dados com o ClickUp.

---

## 1. 📊 Dashboard (Visão Executiva)
**Objetivo:** Oferecer um resumo rápido da saúde da operação para gestores e diretores.

### **KPIs (Indicadores Chave)**
Localizados no topo, cards coloridos que mostram:
*   **🚀 Lojas em Progresso:** Total de implantações ativas no momento (Pipeline).
*   **✅ Entregas Totais:** Acumulado de projetos concluídos.
    *   *Subtexto:* % de projetos entregues dentro do prazo (SLA).
*   **💰 MRR em Implantação:** Soma da Receita Recorrente Mensal que está sendo trabalhada.
    *   *Subtexto:* Valor financeiro "devendo" (atrasado ou inadimplente).
*   **📅 MRR Entregue (Ano):** Receita total ativada no ano corrente.

### **Gráficos**
*   **📊 Volume por Implantador (Barra):**
    *   *O que mostra:* Quantidade de lojas ativas sob responsabilidade de cada implantador.
    *   *Uso:* Identificar quem está sobrecarregado ou ocioso.
*   **📈 Evolução de Entregas (Linha):**
    *   *O que mostra:* Histórico de quantas lojas foram concluídas mês a mês.
    *   *Uso:* Acompanhar o ritmo de entregas e tendências de produtividade.

### **Listas de Destaque**
*   **🔴 Atenção Necessária (Risco):** Lista automática das lojas com maior "Score de Risco".
    *   *Critérios:* Pontuação baseada em atraso, estagnação em etapas e falta de movimentação.
*   **🏆 Top Performance (Ranking):** Ranking dos implantadores com mais entregas e melhor % de prazo.

---

## 2. 📈 Analytics (Análise Profunda)
**Objetivo:** Ferramentas para coordenadores analisarem tendências, gargalos e capacidade.

*   **Filtros de Data:** Permite analisar "Últimos 30 dias", "Último Trimestre" ou "Ano Atual".
*   **Gráficos Específicos:**
    *   **Gargalos por Etapa:** Onde as lojas ficam paradas por mais tempo.
    *   **Previsão Financeira (Forecast):** Projeção de quando o MRR em pipeline será ativado.
    *   **Capacidade da Equipe:** Carga horária estimada vs. real de cada membro.
    *   **Dispersão de Risco:** Gráfico XY cruzando "Tempo de Casa" vs. "Atraso", identificando casos críticos visualmente.
*   **🔄 Force Sync:** Botão de atalho para atualizar os dados diretamente da tela de análise.

---

## 3. � Forecast (Previsão de Entregas) [NOVO]
**Objetivo:** Ferramenta para CS (Customer Success), Operações e Financeiro planejarem o mês.

*   **Tabela de Previsão:**
    *   Lista todas as lojas em implantação.
    *   **Data Prevista (Editável):** Permite que o gestor defina manualmente quando a loja deve entregar.
    *   **Previsão IA:** Sugestão automática baseada no ritmo histórico da equipe.
    *   **Considerar no Forecast:** Checkbox para incluir/excluir a loja da soma financeira do mês.
    *   **Observações:** Campo de texto livre para alinhar status entre as equipes.
*   **Filtros:** Ano, Mês e Status (Ativo/Concluído).
*   **Cards de Resumo:** MRR Previsto para o mês selecionado vs. Quantidade de Lojas.
*   **Exportar Excel:** Botão para baixar a planilha detalhada.

---

## 4. �🖥️ Monitor (Gestão Operacional)
**Objetivo:** A "Mesa de Trabalho" do implantador. Onde as coisas acontecem.

### **Modos de Visualização**
Você pode alternar entre 3 modos no canto superior direito:
1.  **📋 Lista (Tabela):** Visão clássica, ideal para ver muitos dados.
2.  **🏗️ Kanban:** Visão por colunas de status. Arraste e solte para mover!
3.  **🏙️ Cards:** Visão visual com cards detalhados por loja.

### **Colunas Importantes (Tabela)**
*   **Dias na Etapa:** Conta há quantos dias a loja está parada no status atual (Zera ao mudar de status).
*   **Dias Transito:** Tempo total de vida da implantação.
*   **Previsão IA:** Data estimada de conclusão calculada pelo sistema.

### **Filtros Avançados**
O painel lateral (ícone de filtro) permite refinar a busca por múltiplas dimensões:
*   **Status múltiplos:** Selecione "Fase 1" e "Fase 2" ao mesmo tempo.
*   **Etapas:** Filtre apenas lojas que estão em "Treinamento".
*   **Implantador:** Selecione um ou mais responsáveis.
*   **Alertas:** Filtre por lojas com "Risco Alto", "Atrasadas" ou "Paradas".

### **Recursos Especiais**
*   **🤖 Botão "Análise IA":** Usa o Google Gemini para ler o histórico da loja e gerar um relatório de riscos e plano de ação.
*   **✏️ Edição Rápida:** Clique em "Editar" para abrir a modal de detalhes da loja.
*   **📥 Exportar CSV:** Baixa todos os dados visíveis na tabela.

---

## 5. 🔄 Sync (Sincronização)
**Objetivo:** Manter o sistema atualizado com o ClickUp.

*   **Botão "Iniciar Sync Agora":** Dispara a sincronização inteligente (Incremental).
*   **Checkbox "Forçar Sincronização Completa":** Se marcado, o sistema varre TODAS as tarefas desde o início (mais lento, mas garante correção total).
*   **Log em Tempo Real:** Terminal que mostra o progresso da atualização passo a passo.

---

## 🛡️ Sistema de Backup (Segurança) [NOVO]

O sistema possui uma rotina de segurança para proteger seus dados:

1.  **Backup Automático na Inicialização:**
    *   Sempre que o sistema (ou container Docker) é reiniciado, ele verifica a data do último backup.
    *   Se o último backup tiver mais de 24h, um novo é criado antes do sistema subir.
2.  **Pasta de Destino:** Os arquivos ficam salvos em `backend/backups/`.
3.  **Rotação Automática:** O sistema mantém apenas os backups dos últimos **15 dias**, apagando os mais antigos automaticamente para economizar espaço.
4.  **Backup Manual (Admin):** Via API (`/api/admin/backup`) é possível forçar a criação de um backup a qualquer momento.

---

## ⚙️ Menu Admin (Gerenciador)
Acessível via `python manage.py` (Terminal) para operações avançadas:

*   **1. Rodar Localmente:** Inicia backend e frontend.
*   **2. Rodar Docker:** Sobe todo o ambiente via container.
*   **3. Banco de Dados:**
    *   Backup/Restore de dumps SQL.
    *   Resetar banco (Cuidado!).
    *   Patch DB (Atualizar colunas novas).
*   **5. Restart Docker:** Reinicia os containers forçando atualização (Rebuild).

---

## 🧠 Como funcionam as Pontuações e Inteligência (IA)

### 1. Score de Risco 🧮
Cálculo matemático: `Dias Corridos` + (`Dias Parado` x 2) + `Penalidades` (Financeiro/Retrabalho).

### 2. Avaliação da IA (Gemini V2) 🤖
Análise contextual que lê os comentários do ClickUp para entender se o cliente está insatisfeito ou se há bloqueios técnicos reais.

### 3. Ranking de Implantadores 🏆
Baseado no volume absoluto de entregas e percentual de cumprimento do prazo (SLA).
