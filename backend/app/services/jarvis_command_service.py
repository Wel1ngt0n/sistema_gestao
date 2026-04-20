import logging
import json
from datetime import datetime
from app.services.llm_service import LLMService
from app.services.analysts_report_service import AnalystsReportService
from app.models import db, Store

logger = logging.getLogger(__name__)

class JarvisCommandService:
    @staticmethod
    def process_message(message):
        """
        Processa uma mensagem do gestor, identifica intenção e executa ações.
        """
        llm = LLMService()
        
        # 1. Identificar Intenção via IA
        intent_prompt = f"""
Analise a mensagem do Gestor de Implantação e identifique a intenção.
MENSAGEM: "{message}"

Sua saída deve ser um JSON:
{{
  "intent": "QUERY" | "ACTION" | "GREETING",
  "action_type": "CHANGE_STATUS" | "ADD_ALERT" | "MOVE_STORE" | null,
  "target_name": "nome da loja ou analista se houver",
  "parameters": {{ "status": "...", "priority": "..." }},
  "confidence": 0.0 a 1.0
}}
"""
        intent_data = llm.call_openai_diagnostic(intent_prompt, system_role="Você é o interpretador de comandos do sistema JARVIS.")
        
        if intent_data.get('intent') == "ACTION":
            return JarvisCommandService._execute_action(intent_data, message)
        elif intent_data.get('intent') == "QUERY":
            return JarvisCommandService._handle_query(message)
        else:
            return {
                "response": "Olá! Eu sou o Jarvis. Como posso ajudar na gestão do seu time hoje?",
                "type": "text"
            }

    @staticmethod
    def _execute_action(intent_data, original_msg):
        """
        Executa uma ação no banco de dados baseada na intenção da IA.
        """
        action = intent_data.get('action_type')
        target = intent_data.get('target_name')
        params = intent_data.get('parameters', {})

        if action == "CHANGE_STATUS" and target:
            # Tentar encontrar a loja (ajustado para store_name)
            store = Store.query.filter(Store.store_name.ilike(f"%{target}%")).first()
            if store:
                # Ação Real: Adicionar observação de atenção do Jarvis
                new_obs = f"\n[JARVIS ALERT {datetime.now().strftime('%d/%m')}]: Gestor solicitou ATENÇÃO para esta loja."
                if store.observacoes:
                    store.observacoes += new_obs
                else:
                    store.observacoes = new_obs
                
                db.session.commit()
                
                return {
                    "response": f"Compreendido. Acabei de sinalizar a loja **{store.store_name}** com um alerta de atenção nas observações internas.",
                    "type": "action_success",
                    "action": "flag_store",
                    "details": {"store": store.store_name, "new_status": "Attention"}
                }
            
        return {
            "response": f"Identifiquei que você quer realizar uma ação em '{target}', mas não encontrei uma loja com esse nome exato nos meus registros.",
            "type": "action_failed"
        }

    @staticmethod
    def _handle_query(message):
        """
        Responde perguntas sobre o time usando os dados do cockpit.
        """
        cockpit_data = AnalystsReportService.get_team_cockpit()
        
        prompt = f"""
Você é o JARVIS. Responda à pergunta do gestor usando os dados reais do time abaixo.
DADOS DO TIME: {json.dumps(cockpit_data, indent=2)}
PERGUNTA: "{message}"

Seja breve, use emojis e foque em insights.
"""
        llm = LLMService()
        # Usando call_openai_diagnostic mas tratando como texto se necessário
        # Ou criando um método específico de chat
        res = llm.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Você é o JARVIS, copiloto de operações da Instabuy."},
                {"role": "user", "content": prompt}
            ]
        )
        
        return {
            "response": res.choices[0].message.content,
            "type": "text"
        }
