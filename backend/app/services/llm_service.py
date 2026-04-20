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
            prompt = f"Gere um resumo executivo de implantação (formato: {format_type}) para os dados: {context_data}"
            
            res = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}]
            )
            return res.choices[0].message.content
        except Exception as e:
            self.logger.error(f"Erro ao gerar relatório mensal OpenAI: {e}")
            return f"Erro ao gerar relatório: {str(e)}"
