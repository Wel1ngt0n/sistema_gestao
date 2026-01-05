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
            
            response = self.model.generate_content(prompt)
            
            # Acessa o texto da resposta do Gemini
            analysis_text = response.text
            return {"analysis": analysis_text}

        except Exception as e:
            self.logger.error(f"Erro ao chamar Google Gemini: {e}")
            error_str = str(e)
            if "429" in error_str or "Resource Exhausted" in error_str:
                return {"analysis": "⚠️ Limite Gratuito Atingido (Google Gemini).\nAguarde alguns instantes e tente novamente (Rate Limit)."}
            return {"error": error_str, "analysis": f"Erro ao gerar análise: {error_str}"}

    def _build_prompt(self, data):
        """
        Helper para criar a string de prompt a partir dos dados da loja.
        """
        return f"""
        Você é um analista sênior de implantação de software (CSM).
        Analise a seguinte situação de implantação de um cliente (loja) e forneça:
        1. Um resumo de 1 frase sobre o estado atual.
        2. O principal risco identificado.
        3. Uma ação sugerida para o implantador.

        DADOS DO CLIENTE:
        - Nome: {data.get('name')}
        - Status Atual: {data.get('status')}
        - Tempo no Status: {data.get('days_in_status')} dias
        - Tempo Total de Implantação: {data.get('total_days')} dias
        - SLA (Contrato): {data.get('sla')} dias
        - Dias sem movimentação (Idle): {data.get('idle_days')}
        - Status Financeiro: {data.get('financeiro')}
        - ERP: {data.get('erp')}
        - Houve Retrabalho? {data.get('retrabalho')}
        
        COMENTÁRIOS RECENTES DA EQUIPE (Contexto Importante):
        {data.get('comments')}

        Responda em tom profissional, direto e em Português do Brasil. Use markdown para formatar.
        """
