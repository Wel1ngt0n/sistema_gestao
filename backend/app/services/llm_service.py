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
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
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
# ESTRUTURA OBRIGATÓRIA

## 🚀 Resumo de Implantação – [Mês]

---
## 📊 Resumo Executivo
1-2 linhas com leitura geral do desempenho do time:
* volume
* eficiência
* principal ponto de atenção

---
## 📦 Volume de Entregas
* Total de lojas entregues
* Total de redes concluídas
* Distribuição entre matrizes e filiais

### 🔹 Detalhamento de redes (OBRIGATÓRIO)
* Listar TODAS as redes entregues no período
* Cada linha deve conter:

Formato:
• Nome da rede — X lojas | MRR: R$ X

Regras:
* NÃO resumir como "principais redes"
* NÃO cortar lista
* NÃO usar "+ outras"
* Sempre listar todas

---
## ⏱️ Eficiência
* Tempo médio de entrega
* Mediana
* Comparação com período anterior
* 1 linha interpretando (ex: ganho de eficiência ou inconsistência)

---
## 💰 MRR Entregue
* MRR total entregue
* Comparação percentual com período anterior

---
## 📈 Comparação vs Mês Anterior
* Variação em entregas
* Variação em tempo
* Variação em MRR

Finalizar com 1 linha:
👉 leitura geral da evolução (positiva, estável ou queda)

---
## 🏆 Destaque
* Nome do implantador destaque
* Justificativa baseada em:
  * volume
  * tempo
  * qualidade (se disponível)

Formato:
• Nome — resumo objetivo

---
# REGRAS CRÍTICAS
* Não passar do bloco de destaque (não adicionar seções extras)
* Não adicionar "pontos de atenção" ou "plano de ação"
* Não gerar texto longo
* Não repetir informações
* Não omitir redes no detalhamento
* Priorizar clareza e leitura rápida

---
# FORMATO
* Formatar para Slack
* Usar emojis com moderação
* Usar separadores "---"
* Usar negrito nos títulos
* Usar bullet points simples"""
            else:
                system_instruction = "Você é um gestor de operações sênior gerando um relatório mensal executivo de implantação SaaS."

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
