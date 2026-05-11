import logging
import json
from datetime import datetime
from sqlalchemy import text
from app.models import db, Store, User, TaskStep, IntegrationMetric, PerformanceReview, JarvisChatSession, JarvisChatMessage
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

class JarvisService:
    def __init__(self):
        self.llm = LLMService()
        self.schema_summary = self._get_schema_summary()

    def chat(self, messages, user_id, session_id=None):
        """
        Interação principal com o Jarvis com suporte a sessões.
        """
        # Se não tiver session_id, cria uma nova
        if not session_id:
            session = JarvisChatSession(user_id=user_id, title="Nova Conversa")
            db.session.add(session)
            db.session.commit()
            session_id = session.id
        else:
            session = JarvisChatSession.query.get(session_id)
            if not session or session.user_id != user_id:
                return {"error": "Sessão não encontrada ou acesso negado."}

        system_prompt = f"""
Você é o JARVIS 5.4 mini, o braço direito inteligente da gestão Instabuy.
Você tem acesso total aos dados da operação (Implantadores, Lojas, SLAs, Financeiro e Suporte).

SUAS DIRETRIZES:
1. **Foco em Decisão**: Transforme dados em insights. Não apenas liste lojas, diga quais precisam de atenção urgente.
2. **Consultivo e Analítico**: Sua missão é ajudar gestores a identificar gargalos e prever problemas.
3. **Personalidade**: Você é sofisticado, eficiente e proativo. Use emojis de forma elegante (🚀, 📊, ⚠️, 💡).
4. **Contexto**: Você pode consultar o banco de dados e lembra-se de partes importantes da conversa.

CONHECIMENTO DO SISTEMA:
- **Implantação**: Monitoramento de lojas, SLAs, ociosidade e motivos de pausa.
- **Integração**: Métricas de qualidade, bugs pós-go-live e churn risk.
- **Performance**: Avaliações 40/40/20 dos analistas, pontos de esforço e MRR.
- **Suporte**: Conversas do Zenvia, NPS, tempo de resposta e performance dos agentes.

ESQUEMA DO BANCO DE DADOS (Resumo):
{self.schema_summary}

Se o usuário fizer uma pergunta que requer dados reais, use sempre a ferramenta 'query_database'.
Sempre que o resultado de uma query for vazio, informe isso educadamente.
"""
        
        # Prepara o histórico para a LLM
        # Nota: 'messages' vindo do front pode ser parcial ou total.
        # Por segurança, vamos carregar o histórico real do banco se for uma sessão existente
        history_db = JarvisChatMessage.query.filter_by(session_id=session_id).order_by(JarvisChatMessage.created_at).all()
        llm_messages = [{"role": "system", "content": system_prompt}]
        
        for msg in history_db:
            llm_messages.append({"role": msg.role, "content": msg.content})
            
        # Adiciona as novas mensagens (geralmente apenas a última do usuário)
        # Se o front enviar o histórico inteiro, pegamos só a última.
        if messages:
            last_msg = messages[-1]
            if last_msg['role'] == 'user':
                llm_messages.append(last_msg)
                # Salva a mensagem do usuário no banco
                user_message_db = JarvisChatMessage(session_id=session_id, role="user", content=last_msg['content'])
                db.session.add(user_message_db)
                
                # Se for a primeira mensagem, tenta atualizar o título da sessão
                if len(history_db) == 0:
                    session.title = (last_msg['content'][:40] + '...') if len(last_msg['content']) > 40 else last_msg['content']
                
                db.session.commit()

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
                            }
                        },
                        "required": ["sql"]
                    }
                }
            }
        ]

        response_message = self.llm.call_jarvis(llm_messages, tools=tools)
        
        if not response_message:
            return {"response": "Desculpe, tive um erro interno ao processar sua solicitação.", "session_id": session_id}

        # Lidar com Tool Calls
        if response_message.tool_calls:
            llm_messages.append(response_message)
            for tool_call in response_message.tool_calls:
                if tool_call.function.name == "query_database":
                    function_args = json.loads(tool_call.function.arguments)
                    sql = function_args.get("sql")
                    result = self._execute_read_only_query(sql)
                    
                    llm_messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "query_database",
                        "content": json.dumps(result, default=str)
                    })
            
            final_response = self.llm.call_jarvis(llm_messages)
            if final_response:
                # Salva resposta no banco
                assistant_message_db = JarvisChatMessage(session_id=session_id, role="assistant", content=final_response.content)
                db.session.add(assistant_message_db)
                db.session.commit()
                return {"response": final_response.content, "session_id": session_id}
        
        # Salva resposta direta no banco
        if response_message.content:
            assistant_message_db = JarvisChatMessage(session_id=session_id, role="assistant", content=response_message.content)
            db.session.add(assistant_message_db)
            db.session.commit()

        return {"response": response_message.content, "session_id": session_id}

    def get_user_sessions(self, user_id):
        """Retorna as sessões de chat de um usuário."""
        sessions = JarvisChatSession.query.filter_by(user_id=user_id).order_by(JarvisChatSession.updated_at.desc()).all()
        return [{"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()} for s in sessions]

    def get_session_history(self, user_id, session_id):
        """Retorna o histórico de mensagens de uma sessão."""
        session = JarvisChatSession.query.get(session_id)
        if not session or session.user_id != user_id:
            return None
        
        messages = JarvisChatMessage.query.filter_by(session_id=session_id).order_by(JarvisChatMessage.created_at).all()
        return [{"role": m.role, "content": m.content} for m in messages]

    def delete_session(self, user_id, session_id):
        """Remove uma sessão de chat."""
        session = JarvisChatSession.query.get(session_id)
        if not session or session.user_id != user_id:
            return False
        
        db.session.delete(session)
        db.session.commit()
        return True

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
