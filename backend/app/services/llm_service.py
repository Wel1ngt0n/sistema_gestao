from google import genai
import logging
import os
import json

class LLMService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        # Load from env
        self.api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
        
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                self.logger.error(f"Erro ao inicializar cliente Gemini: {e}")
                self.client = None
        else:
            self.logger.warning("GOOGLE_API_KEY não encontrada nas variáveis de ambiente.")
            self.client = None

    def analyze_store_risks(self, store_data):
        """
        Gera uma análise de risco qualitativa para uma loja usando o Google Gemini.
        """
        if not self.client:
            return {
                "error": "Google API Key not configured.",
                "analysis": "Sistema de IA não configurado. Adicione a chave de API do Google."
            }

        try:
            # Constrói o prompt com base nos dados da loja
            prompt = self._build_prompt(store_data)
            
            response = self.client.models.generate_content(
                model='gemini-flash-latest',
                contents=prompt
            ) 
            
            # Acessa o texto da resposta do Gemini
            analysis_text = response.text
            
            # Tentativa de limpar markdown json se houver
            cleaned_text = analysis_text.replace('```json', '').replace('```', '').strip()
            
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

    def generate_monthly_report_summary(self, context_data, format_type='simple'):
        """
        Gera um resumo executivo do mês para o gestor.
        Formats: 'simple' (Slack) or 'email' (Complete)
        """
        if not self.client:
            return "Erro: API Key não configurada."

        try:
            # Extrair dados
            month_str = context_data.get('month')
            total_stores = context_data.get('total_stores')
            total_mrr = context_data.get('total_mrr')
            avg_time = context_data.get('avg_time')
            median_time = context_data.get('median_time')
            stores_list = context_data.get('stores', []) # Lista de dicts {name, mrr, implantador}

            if format_type == 'simple':
                # Construir lista de lojas formatada
                stores_text = ""
                for s in stores_list:
                    mrr_formatted = f"R$ {s.get('mrr', 0):.2f}".replace('.', ',')
                    stores_text += f"{s.get('name')} - {mrr_formatted}\n"
                
                if not stores_text:
                    stores_text = "Nenhuma loja finalizada."

                prompt = f"""
                Você é um assistente administrativo. Gere uma mensagem de atualização para o Slack Exatamente neste formato:

                Fechamento {month_str}

                Lojas finalizadas e mensalidade:
                {stores_text}

                Resumo:
                Total de lojas: {total_stores}
                Total de recorrência (MRR): R$ {total_mrr}
                Média de dias (implantação): {avg_time}
                Mediana de dias: {median_time}

                Destaque do mês da implantação:
                [Analise a lista de lojas abaixo e escolha UM implantador destaque baseado no maior MRR ou complexidade. Cite o nome dele e crie 1 ponto positivo curto sobre a entrega].

                DADOS DAS LOJAS (Para análise do destaque):
                {json.dumps(stores_list, ensure_ascii=False)}

                REGRAS:
                - Mantenha a estrutura exata acima.
                - Não adicione saudações ou introduções.
                - No destaque, seja direto: "Nome - Motivo".
                """
            
            else:
                # Prompt Completo (Email)
                prompt = f"""
                Você é um Gerente de Operações de Implantação e deve escrever um relatório mensal para a Diretoria.
                Escreva uma mensagem de texto (estilo Email corporativo) com os resultados do mês.

                DADOS DO MÊS ({month_str}):
                - Lojas Finalizadas: {total_stores}
                - MRR Adicionado: R$ {total_mrr}
                - Tempo Médio de Implantação: {avg_time} dias
                - Mediana de Tempo: {median_time} dias
                - Pontuação Total de Entregas: {context_data.get('total_points')}

                LISTA DE ENTREGAS:
                {json.dumps(stores_list, ensure_ascii=False)}

                INSTRUÇÕES DE ESTILO:
                - Tom profissional, objetivo e orientado a resultados.
                - Use emojis moderados (📈, 🚀, ✅).
                - Destaque o MRR total e a quantidade de lojas.
                - Mencione se o tempo médio está bom (bom < 60 dias, ruim > 90 dias).
                - Faça uma análise breve sobre quem foi o destaque do mês (quem trouxe mais MRR ou entregou mais rápido).
                """
            
            response = self.client.models.generate_content(
                model='gemini-flash-latest',
                contents=prompt
            )
            return response.text
        except Exception as e:
            self.logger.error(f"Erro ao gerar relatório mensal IA: {e}")
            return f"Erro ao gerar relatório: {str(e)}"
