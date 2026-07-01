# Validador de Integração e Status ClickUp

## 📖 Visão Geral
Este módulo resolve o problema de loop de status de implantação no ClickUp e garante a ordem correta na criação e vinculação das tarefas de Integração. 

Ele atua em **duas fases** para toda loja em implantação:
1. **Garantir a Integração:** Verifica se a tarefa de "Cadastro Omie" já está concluída. Se sim, procura no board de Integração a tarefa correspondente à Loja e preenche o campo `_father_task_id` para vinculá-la ao card principal.
2. **Validar Status do Card Principal:** Impede que o card da Loja avance para etapas posteriores (como *Onboarding*, *Treinamento*, etc.) se a tarefa de Integração não estiver concluída. Se o card foi avançado indevidamente por alguma automação do ClickUp, o validador o retorna para a coluna "Cadastro Omie".

---

## ⚙️ Variáveis de Ambiente

Antes de usar o validador em produção (no seu deploy no Render), você deve configurar as seguintes variáveis de ambiente no painel:

| Variável | Valores Permitidos | Descrição |
|----------|-------------------|-----------|
| `CLICKUP_VALIDATOR_MODE` | `audit` ou `fix` | **`audit`** (padrão): Apenas lê o ClickUp e gera logs informando o que faria. Nenhuma tarefa é alterada.<br>**`fix`**: Efetivamente atualiza campos, altera status e adiciona comentários no ClickUp. |
| `CRON_SECRET` | *Qualquer string segura* | Uma senha/token que protege o endpoint do validador contra chamadas não autorizadas. Exemplo: `minha_senha_super_secreta_123` |

---

## ⏰ Como configurar o Cron Job (cron-job.org)

O script foi desenhado para ser acionado de forma recorrente por um serviço externo de cron (agendador de tarefas), já que varre o quadro identificando inconsistências.

**Passo a passo no cron-job.org:**

1. Crie uma conta gratuita em [cron-job.org](https://cron-job.org).
2. Clique em **Create Cronjob**.
3. Em **Title**, coloque um nome, ex: `Validador ClickUp Implantação`.
4. Em **URL**, cole o endereço do endpoint do backend no Render passando o token:
   ```text
   https://seu-backend.onrender.com/api/webhooks/clickup-validator?token=VALOR_DO_SEU_CRON_SECRET
   ```
   *(Substitua `seu-backend.onrender.com` pela URL correta do seu Render e o `VALOR_DO_SEU_CRON_SECRET` pela senha que você colocou nas variáveis de ambiente).*
5. Em **Execution schedule**, defina a frequência.
   > **Recomendação:** A cada 10 a 15 minutos. Intervalos muito curtos (como 1 minuto) podem estourar o limite da API do ClickUp (Rate Limit 429).
6. Clique em **Create**.

---

## 🛠️ Como usar na Prática (Modo Auditoria vs Correção)

Sempre que implementar uma nova regra pesada como essa, é recomendável usar o modo **Auditoria** primeiro.

1. Configure no Render: `CLICKUP_VALIDATOR_MODE=audit`.
2. Deixe o Cron Job rodar algumas vezes ao longo do dia.
3. Acesse os logs do seu backend no Render e procure por linhas como:
   - `[AUDIT] Would update task ...`
   - `[AUDIT] Would move parent card ... to 'cadastro omie'`
4. Verifique se as decisões automáticas que o sistema está simulando fazem sentido para você e não estão afetando cards errados.
5. Tudo certo? Altere no Render para: `CLICKUP_VALIDATOR_MODE=fix`. A partir desse momento, as alterações acontecerão magicamente nos cards.

---

## 🧩 Lógica de Vinculação (Fallback)

Como o sistema lida quando o Cadastro Omie acaba mas o card principal não está amarrado à Integração?
- Ele vai na lista de Integração e busca cards abertos.
- Se ele encontrar um card de Integração que tenha o nome igual (ou parte do nome) ao nome da Loja, ou cujo link da descrição seja igual ao link do card pai:
- **Ele salva o `custom_id` do card principal no campo `_father_task_id` da Integração encontrada.**
- *(Nota: O validador não cria cards novos do zero. Ele sempre pressupõe que o card de integração existe no board e se responsabiliza por garantir o vínculo correto).*

## 🛑 Status e Gatilhos de Parada

A validação vai barrar e retornar o Card Principal para "Cadastro Omie" se a integração **não estiver** em algum dos seguintes status:
`implantado`, `concluído`, `concluido`, `done`, `closed`, `finalizado`.

Se a Integração constar com outro status (ex: `em andamento`) e o card pai estiver na coluna `onboarding` ou `treinamento`, ele volta o card pai para `cadastro omie` e avisa nos comentários.
