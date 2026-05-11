from openai import OpenAI
import logging
import os
import json

class LLMService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        # Carrega a chave da OpenAI do ambiente
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        
        if self.openai_api_key:
            try:
                self.openai_client = OpenAI(api_key=self.openai_api_key)
            except Exception as e:
                self.logger.error(f"Erro ao inicializar cliente OpenAI: {e}")
                self.openai_client = None
        else:
            self.openai_client = None

    def call_openai_diagnostic(self, prompt, system_role="Você é um analista de operações sênior especializado em implantação de sistemas SaaS."):
        """
        Executa uma análise usando o GPT-4o (OpenAI).
        Retorna um dicionário JSON.
        """
        if not self.openai_client:
            return {"error": "OpenAI API Key not configured."}

        try:
            # Usando gpt-4o-mini como padrão de custo-benefício para diagnósticos rápidos se solicitado, 
            # mas mantendo gpt-4o para diagnósticos complexos.
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_role},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
            
        except Exception as e:
            self.logger.error(f"Erro ao chamar OpenAI: {e}")
            return {"error": str(e)}

    def call_jarvis(self, messages, tools=None):
        """
        Interface principal do Jarvis.
        Suporta histórico de mensagens e ferramentas (functions).
        """
        if not self.openai_client:
            return {"error": "OpenAI API Key not configured."}

        try:
            jarvis_model = os.getenv("JARVIS_MODEL", "gpt-5.4-mini")
            params = {
                "model": jarvis_model,
                "messages": messages,
            }
            if not jarvis_model.startswith("gpt-5"):
                params["temperature"] = 0.7
            if tools:
                params["tools"] = tools
                params["tool_choice"] = "auto"

            response = self.openai_client.chat.completions.create(**params)
            return response.choices[0].message
            
        except Exception as e:
            self.logger.error(f"Erro no call_jarvis: {e}")
            return None

    def analyze_store_risks(self, store_data):
        """
        Gera uma análise de risco qualitativa para uma loja usando o GPT-4o.
        """
        if not self.openai_client:
            return {"error": "OpenAI API Key not configured."}

        try:
            prompt = self._build_risk_prompt(store_data)
            return self.call_openai_diagnostic(prompt, system_role="Você é um auditor de risco operacional sênior.")
        except Exception as e:
            self.logger.error(f"Erro ao chamar OpenAI (Risk): {e}")
            return {"error": str(e)}

    def _build_risk_prompt(self, data):
        """
        Helper para criar a string de prompt a partir dos dados da loja.
        """
        return f"""
        Você é um Auditor de Risco Operacional Sênior (CSM).
        Analise os dados desta implantação e do contexto da rede para gerar um **Diagnóstico Estruturado**.
        
        Sua saída DEVE ser um JSON válido com a seguinte estrutura:
        {{
            "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
            "summary_network": "Resumo de 1 frase focado no estado geral da rede/loja.",
            "specific_blockers": ["Lista de até 3 bloqueios práticos identificados"],
            "action_plan": ["Lista de 3 ações curtas e diretas para o implantador"],
            "ai_tags": ["técnico", "financeiro", "relacionamento", "operação"]
        }}

        DADOS DO CLIENTE:
        - Nome: {data.get('name')}
        - Status Atual: {data.get('status')}
        - Tempo no Status: {data.get('days_in_status')} dias
        - Tempo Total: {data.get('total_days')} dias (SLA: {data.get('sla')})
        - Ociosidade: {data.get('idle_days')} dias
        
        EVIDÊNCIAS DE CONTEXTO (Comentários):
        {data.get('comments')}
        """

    def generate_monthly_report_summary(self, context_data, format_type="simple"):
        """
        Gera um relatório mensal consolidado.
        """
        if not self.openai_client:
            return "Erro: OpenAI API Key não configurada."

        try:
            if format_type == "simple":
                system_instruction = """Você é um gestor operacional de implantação SaaS.

Seu objetivo é gerar um resumo executivo mensal de desempenho do time de implantação, no formato ideal para envio no Slack para diretoria.

O resumo deve ser objetivo, estruturado, claro e focado em decisão.

---
# REGRAS GERAIS
* Seja direto e conciso
* Não escrever textos longos
* Não explicar conceitos
* Não usar linguagem técnica excessiva
* Não fazer julgamentos pessoais
* Sempre interpretar os dados (não apenas listar)
* Analisar as observações individuais de cada loja para capturar insights qualitativos e avaliações de gestão
* Regra de Observação por Rede: Se houver observações em apenas uma loja de uma rede, considere que elas se aplicam a todas as lojas dessa rede naquele mês, exceto se houver observações específicas em outras lojas.
* Considerar o peso de esforço (Matriz = 1.0, Filial = 0.7) representado pelo campo 'points' para avaliar a produtividade real de cada implantador.
* Usar bullet points
* Manter padrão visual consistente
* Pensar em leitura rápida (até 30 segundos)

---
# ESTRUTURA OBRIGATÓRIA (Suscinta)

## 🚀 Resumo de Implantação – [Mês]

---
📊 **Resumo Executivo**
* MRR Total: R$ [Valor] ([Var %] vs mês anterior)
* Lojas Entregues: [Total] ([Var %] vs mês anterior) — ([X] Matrizes / [Y] Filiais)
* Média de Dias: [Média] dias ([Var %] vs mês anterior)

---
👤 **Desempenho por Implantador**
[Listar cada implantador que realizou entregas no mês]
Formato: • Nome: [X] lojas ([Y] Matrizes / [Z] Filiais) — MRR: R$ [Valor] — Esforço: [Points] pts

---
# REGRAS DE VARIAÇÃO
* Para MRR e Lojas: Variação positiva (+) = Superação/Melhora.
* Para Média de Dias: Variação negativa (-) = Superação/Melhora (foi mais rápido).
* Se a variação for positiva em tempo, indique como aumento (alerta).

---
📦 **Lojas Entregues**
[Listar TODAS as lojas/redes entregues no período]
Formato: • Nome da Loja/Rede — R$ [MRR]

---
🏆 **Destaque do Mês**
• [Nome do Implantador] — [Resumo objetivo do porquê foi destaque, citando volume e esforço/pontos]

---
# REGRAS CRÍTICAS
* NÃO adicionar seções extras (como "Eficiência" detalhada ou "Comparação")
* NÃO resumir a lista de lojas; listar TODAS as entregues
* NÃO usar linguagem técnica excessiva
* Manter o texto extremamente curto e direto
* Formatar para leitura rápida no Slack usando negritos e emojis
* Usar separadores "---" entre seções"""
            else:
                system_instruction = "Você é um gestor de operações sênior geran do um relatório mensal executivo de implantação SaaS."

            prompt = f"Aqui estão os dados do mês fechado:\n{json.dumps(context_data, indent=2)}\n\nPor favor, gere o resumo conforme o formato solicitado."
            
            res = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ]
            )
            return res.choices[0].message.content
        except Exception as e:
            self.logger.error(f"Erro ao gerar relatório mensal OpenAI: {e}")
            return f"Erro ao gerar relatório: {str(e)}"
