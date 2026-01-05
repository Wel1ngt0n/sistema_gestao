import os
import logging
import google.generativeai as genai

class LLMService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        # Load from env
        self.api_key = os.getenv('GOOGLE_API_KEY')
        
        if self.api_key:
            # Configura a chave de API
            genai.configure(api_key=self.api_key)
            # Usa o modelo Gemini Flash mais recente disponível
            self.model = genai.GenerativeModel('gemini-flash-latest')
        else:
            self.logger.warning("GOOGLE_API_KEY não encontrada nas variáveis de ambiente.")
            self.model = None

    def analyze_store_risks(self, store_data):
        """
        Gera uma análise de risco qualitativa para uma loja usando o Google Gemini 1.5 Flash.
        """
        if not self.model:
            return {
                "error": "Google API Key not configured.",
                "analysis": "Sistema de IA não configurado. Adicione a chave de API do Google."
            }

        try:
            # Constrói o prompt com base nos dados da loja
            prompt = self._build_prompt(store_data)
            
            response = self.model.generate_content(prompt) # Generation config json?
            
            # Acessa o texto da resposta do Gemini
            analysis_text = response.text
            
            # Tentativa de limpar markdown json se houver
            cleaned_text = analysis_text.replace('```json', '').replace('```', '').strip()
            
            import json
            try:
                result_json = json.loads(cleaned_text)
                return result_json
            except:
                # Fallback se não for JSON válido
                return {
                    "risk_level": "MEDIUM",
                    "summary_network": "Erro ao parsear resposta da IA. Veja texto bruto.",
                    "specific_blockers": ["Erro de Formato IA"],
                    "action_plan": ["Verificar Logs"],
                    "raw_text": analysis_text
                }

        except Exception as e:
            self.logger.error(f"Erro ao chamar Google Gemini: {e}")
            error_str = str(e)
            if "429" in error_str or "Resource Exhausted" in error_str:
                return {
                    "risk_level": "LOW",
                    "summary_network": "Limite de API do Gemini atingido (429). Tente novamente mais tarde.",
                    "specific_blockers": [],
                    "action_plan": []
                }
            return {"error": error_str, "risk_level": "LOW", "summary_network": f"Erro de conexão IA: {error_str}"}

    def _build_prompt(self, data):
        """
        Helper para criar a string de prompt a partir dos dados da loja.
        """
        return f"""
        Você é um Auditor de Risco Operacional Sênior (CSM).
        Analise os dados desta implantação e do contexto da rede para gerar um **Diagnóstico Estruturado**.
        
        Sua saída DEVE ser um JSON válido (sem markdown, apenas raw json) com a seguinte estrutura:
        {{
            "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
            "summary_network": "Resumo de 1 frase focado no estado geral da rede/loja.",
            "specific_blockers": ["Lista de até 3 bloqueios práticos identificados"],
            "action_plan": ["Lista de 3 ações curtas e diretas para o implantador"],
            "ai_tags": ["técnico", "financeiro", "relacionamento", "operação"] (Escolha as tags relevantes)
        }}

        REGRAS DE CLASSIFICAÇÃO (GOVERNANÇA):
        - CRITICAL: Risco iminente de cancelamento, bloqueio financeiro grave (>30 dias) ou estagnação total.
        - HIGH: Problemas técnicos reais, cliente insatisfeito/ausente ou atraso considerável.
        - MEDIUM: Pequenos bloqueios, dúvidas de processo ou ritmo lento.
        - LOW: Fluxo normal, apenas monitoramento de rotina.

        DADOS DO CLIENTE:
        - Nome: {data.get('name')}
        - Status Atual: {data.get('status')}
        - Tempo no Status: {data.get('days_in_status')} dias
        - Tempo Total: {data.get('total_days')} dias (SLA: {data.get('sla')})
        - Ociosidade: {data.get('idle_days')} dias
        - Financeiro: {data.get('financeiro')}
        - ERP: {data.get('erp')}
        - Retrabalho: {data.get('retrabalho')}
        
        EVIDÊNCIAS DE CONTEXTO (Comentários):
        {data.get('comments')}

        Analise a "Vibe" dos comentários. Se houver brigas, caps lock ou reclamações, suba o risco. Se houver silêncio total há muito tempo, suba o risco.
        """

