import logging
import json
from datetime import datetime
from sqlalchemy import text
from app.models import db, Store, User, TaskStep, IntegrationMetric, PerformanceReview
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

class JarvisService:
    def __init__(self):
        self.llm = LLMService()
        self.schema_summary = self._get_schema_summary()

    def chat(self, messages):
        """
        Interação principal com o Jarvis.
        """
        system_prompt = f"""
Você é o JARVIS 5.4 mini, a Inteligência Artificial central deste sistema de gestão.
Você tem acesso total aos dados da operação (Implantadores, Lojas, SLAs, Financeiro e Suporte).

SUAS DIRETRIZES:
1. **Conhecimento Total**: Você conhece o esquema do banco de dados e pode consultá-lo.
2. **Consultivo e Analítico**: Sua missão é ajudar gestores a identificar gargalos, prever problemas e analisar o desempenho do time.
3. **Segurança**: Você opera em modo Read-Only por padrão para consultas complexas.
4. **Personalidade**: Você é eficiente, direto, usa emojis estrategicamente e tem uma postura de 'braço direito' do gestor.

CONHECIMENTO DO SISTEMA:
- **Implantação**: Monitoramento de lojas, SLAs, ociosidade e motivos de pausa.
- **Integração**: Métricas de qualidade, bugs pós-go-live e churn risk.
- **Performance**: Avaliações 40/40/20 dos analistas, pontos de esforço e MRR.
- **Suporte**: Conversas do Zenvia, NPS, tempo de resposta e performance dos agentes.

ESQUEMA DO BANCO DE DADOS (Resumo):
{self.schema_summary}

Se o usuário fizer uma pergunta que requer dados específicos, use a ferramenta 'query_database'.
Se a pergunta for sobre como usar o sistema, explique com base nas ferramentas que você conhece.
"""
        
        # Insere o system prompt no início
        if not messages or messages[0].get('role') != 'system':
            messages.insert(0, {"role": "system", "content": system_prompt})

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "query_database",
                    "description": "Executa uma consulta SQL (Read-Only) no banco de dados para obter informações reais sobre lojas, analistas, metas, suporte, etc.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sql": {
                                "type": "string",
                                "description": "A query SQL a ser executada. Use apenas SELECT."
                            },
                            "explanation": {
                                "type": "string",
                                "description": "Uma breve explicação do que você está buscando."
                            }
                        },
                        "required": ["sql"]
                    }
                }
            }
        ]

        response_message = self.llm.call_jarvis(messages, tools=tools)
        
        if not response_message:
            return {"response": "Desculpe, tive um erro interno ao processar sua solicitação.", "history": messages}

        # Lidar com Tool Calls
        if response_message.tool_calls:
            messages.append(response_message)
            for tool_call in response_message.tool_calls:
                if tool_call.function.name == "query_database":
                    function_args = json.loads(tool_call.function.arguments)
                    sql = function_args.get("sql")
                    
                    # Executa a query
                    result = self._execute_read_only_query(sql)
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "query_database",
                        "content": json.dumps(result, default=str)
                    })
            
            # Segunda chamada com os resultados das ferramentas
            final_response = self.llm.call_jarvis(messages)
            if final_response:
                return {"response": final_response.content, "history": messages + [{"role": "assistant", "content": final_response.content}]}
        
        return {"response": response_message.content, "history": messages + [{"role": "assistant", "content": response_message.content}]}

    def _get_schema_summary(self):
        return """
- stores: id, store_name, custom_store_id, status_norm (IN_PROGRESS, DONE, BLOCKED), implantador, total_time_days, idle_days, valor_mensalidade, tipo_loja (Matriz/Filial), cnpj, rede.
- tasks_steps: store_id, step_name, status, idle_days, total_time_days.
- integration_metrics: store_id, points, sla_days, post_go_live_bugs, churn_risk.
- performance_reviews: user_id, cycle, final_score, bonus_eligible.
- users: id, name, email (Analistas).
- support_conversations: status (OPEN/CLOSED), agent_name, nps_score, resolution_time_seconds.
- support_messages: text, direction (IN/OUT).
- metrics_snapshot_daily: snapshot_date, store_id, risk_score.
"""

    def _execute_read_only_query(self, sql):
        """
        Executa uma query SQL garantindo que seja apenas leitura.
        """
        sql_lower = sql.strip().lower()
        forbidden = ["insert", "update", "delete", "drop", "truncate", "alter", "grant", "revoke"]
        
        if not sql_lower.startswith("select"):
            return {"error": "Apenas consultas SELECT são permitidas por segurança."}
        
        for word in forbidden:
            if word in sql_lower:
                return {"error": f"Operação '{word}' não permitida."}

        try:
            result = db.session.execute(text(sql))
            rows = [dict(row._mapping) for row in result]
            return rows[:50] # Limite de 50 linhas para não estourar contexto
        except Exception as e:
            logger.error(f"Erro ao executar query SQL Jarvis: {e}")
            return {"error": str(e)}
