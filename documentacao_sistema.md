# 📘 Documentação do Sistema de Gestão (Implantação Instabuy)

Este documento detalha as funcionalidades de cada página do sistema, explicando gráficos, tabelas e recursos disponíveis.

---

## 🧭 Navegação Principal
O sistema é dividido em abas principais, acessíveis pelo menu superior:

1.  **📊 Dashboard:** Visão executiva geral.
2.  **📈 Analytics:** Análises detalhadas de performance e tendências.
3.  **🖥️ Monitor:** Gestão operacional dia-a-dia (Lista, Kanban, Cards).
4.  **📋 Etapas:** Visualização detalhada do progresso por etapas.
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

---

## 3. 🖥️ Monitor (Gestão Operacional)
**Objetivo:** A "Mesa de Trabalho" do implantador. Onde as coisas acontecem.

### **Modos de Visualização**
Você pode alternar entre 3 modos no canto superior direito:
1.  **📋 Lista (Tabela):** Visão clássica, ideal para ver muitos dados e ordenar colunas.
2.  **🏗️ Kanban:** Visão por colunas de status (Novo, Iniciado, Em Homologação, etc). Arraste e solte para mover!
3.  **🏙️ Cards:** Visão visual com cards detalhados por loja.

### **Filtros Rápidos (Chips)**
Botões no topo para filtrar rapidamente:
*   **🔥 Alto Risco:** Lojas com problemas críticos.
*   **⚠️ Atrasados:** Lojas que já estouraram o prazo de contrato.
*   **💰 Inadimplentes:** Lojas com pendências financeiras.
*   **👤 Seletor de Implantador:** Filtra a visão para um dono específico.

### **Recursos Especiais**
*   **🤖 Botão "Análise IA":**
    *   Disponível na tabela ou nos cards.
    *   Usa o Google Gemini 1.5 Flash para ler o histórico da loja e gerar um relatório automático com riscos, resumo e plano de ação.
*   **✏️ Edição Rápida:**
    *   Clique em "Editar" para abrir a modal de detalhes da loja.
    *   Permite mudar status, implantador, datas e forçar sincronização profunda (Deep Sync).

---

## 4. 🔄 Sync (Sincronização)
**Objetivo:** Manter o sistema atualizado com o ClickUp.

*   **Botão "Iniciar Sync Agora":** Dispara o processo de varredura.
*   **Log em Tempo Real:** Uma janela estilo terminal mostra o que está acontecendo (ex: "Atualizando loja X...", "Baixando comentários...").
*   **O que ele faz?**
    1.  Busca todas as tarefas da lista do ClickUp.
    2.  Atualiza status, datas e valores personalizados.
    3.  Calcula métricas de atraso localmente.

---

## ⚙️ Menu Admin (Gerenciador)
Acessível via `python manage.py` (Terminal) ou botão de engrenagem no Monitor (se habilitado).

*   **Backup/Restore:** Para salvar e recuperar dados.
*   **Docker Reset:** Para reiniciar o sistema em caso de travamento.
*   **Configurações de Banco:** Resetar, migrar ou corrigir schema.

---

## 🧠 Como funcionam as Pontuações e Inteligência (IA)

O sistema utiliza três modelos diferentes para avaliar a saúde das lojas. Entenda cada um:

### 1. Score de Risco (Cálculo Matemático) 🧮
É um número "frio" calculado automaticamente toda vez que você abre o Dashboard ou Monitor. Quanto maior, pior.
*   **Onde aparece?** No widget "Atenção Necessária" (Dashboard) e na coluna "Score" do Monitor.
*   **Fórmula:**
    > `Dias Corridos` + (`Dias Parado` x 2) + `Penalidades`
    *   **Penalidades:**
        *   +15 pontos se Financeiro = "Devendo"
        *   +10 pontos se Teve Retrabalho = "Sim"

### 2. Avaliação da IA (Gemini V2 - Rede) 🤖
É uma análise "subjetiva" e contextual feita pelo Google Gemini.
*   **Diferencial:** Analisa o contexto da **REDE** inteira (Matriz + Filiais). Se uma filial está travada, a IA alerta a Matriz.
*   **Onde aparece?** Ao clicar no botão "🤖 Análise" no Monitor.
*   **Níveis:**
    *   🟢 **LOW:** Tudo certo, fluxo normal.
    *   🟡 **MEDIUM:** Pequenos bloqueios ou dúvidas.
    *   🟠 **HIGH:** Problemas técnicos reais ou cliente insatisfeito.
    *   🔴 **CRITICAL:** Risco de cancelamento, bloqueio financeiro grave ou estagnação total.

### 3. Previsão de Entrega (Analytics) 🔮
É um cálculo estatístico baseada na média histórica da equipe.
*   **Onde aparece?** Na tabela de lojas (coluna oculta "Previsão IA") e relatórios.
*   **Como funciona?** O sistema pega a média de dias que a equipe leva em cada etapa (ex: Treinamento leva 5 dias em média). Se a loja ainda não fez o Treinamento, ele soma +5 dias na data de hoje para estimar o fim.
*   **Classificação:**
    *   Se a previsão estourar o contrato em > 30 dias = **CRÍTICO**.

### 4. Ranking de Implantadores (Performance) 🏆
Define a ordem da lista "Top Performance" no Dashboard.
*   **Critério Principal:** Quantidade absoluta de lojas **Concluídas**. Quem entrega mais, fica em cima.
*   **Critério Secundário (Visual):** % de Entregas no Prazo.
    *   Verde: >= 85% no prazo.
    *   Laranja: < 85% no prazo.
*   **Medalhas:**
    *   🥇 1º Lugar: Maior volume de entregas.
    *   🥈 2º Lugar
    *   � 1º Lugar: Maior volume de entregas.
    *   🥈 2º Lugar
    *   �🥉 3º Lugar

### 5. Previsão Financeira (Forecast) 💰
*   **Onde aparece?** Analytics > Forecast Financeiro.
*   **Lógica:** Projeta quanto de MRR será ativado nos próximos meses.
    *   Baseia-se na `Data Prevista de Conclusão` de cada loja em andamento.
    *   Se a loja não tem data prevista manual, o sistema usa a **Previsão Estatística** (item 3) para alocar o valor no mês provável.

