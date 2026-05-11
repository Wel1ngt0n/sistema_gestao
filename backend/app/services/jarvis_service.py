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

    def chat(self, messages, user_id, session_id=None):
        """
        Interação principal com o Jarvis com suporte a sessões e memória.
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

        # Atualiza o timestamp da sessão
        session.updated_at = datetime.utcnow()

        system_prompt = f"""
Você é o JARVIS 5.4 mini, o braço direito inteligente da gestão Instabuy.
Você tem acesso aos dados da operação (Implantadores, Lojas, SLAs, Financeiro e Suporte).

DIRETRIZES:
1. **Foco em Decisão**: Transforme dados em insights. Identifique gargalos e lojas críticas.
2. **Consultivo**: Ajude o gestor a entender por que os números estão assim.
3. **Personalidade**: Sofisticado, eficiente e proativo. Use emojis (🚀, 📊, ⚠️, 💡).
4. **SQL**: Use 'query_database' para obter dados reais. Se a query falhar ou der erro de coluna, tente corrigi-la.

ESQUEMA DO BANCO (Tabelas Principais):
- stores: id, store_name, status_norm (IN_PROGRESS, DONE, BLOCKED), implantador, total_time_days, idle_days, valor_mensalidade, created_at, finished_at.
- tasks_steps: store_id, step_name, status, idle_days.
- integration_metrics: store_id, points, sla_days, post_go_live_bugs, churn_risk.
- users: id, name, email (Analistas).
- support_conversations: status, agent_name, nps_score, resolution_time_seconds.

Se o usuário perguntar sobre datas, use 'created_at' ou 'finished_at' da tabela 'stores'.
"""
        
        # Carrega histórico do banco
        history_db = JarvisChatMessage.query.filter_by(session_id=session_id).order_by(JarvisChatMessage.created_at).all()
        llm_messages = [{"role": "system", "content": system_prompt}]
        
        for msg in history_db:
            llm_messages.append({"role": msg.role, "content": msg.content})
            
        # Adiciona a última mensagem do usuário
        if messages:
            last_msg = messages[-1]
            if last_msg['role'] == 'user':
                llm_messages.append(last_msg)
                # Salva no banco
                user_message_db = JarvisChatMessage(session_id=session_id, role="user", content=last_msg['content'])
                db.session.add(user_message_db)
                
                # Atualiza título na primeira mensagem
                if len(history_db) == 0:
                    session.title = (last_msg['content'][:40] + '...') if len(last_msg['content']) > 40 else last_msg['content']
                
                db.session.commit()

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "query_database",
                    "description": "Executa SQL (Read-Only). Use apenas SELECT.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sql": {"type": "string", "description": "Query SQL SELECT."}
                        },
                        "required": ["sql"]
                    }
                }
            }
        ]

        try:
            response_message = self.llm.call_jarvis(llm_messages, tools=tools)
            
            if not response_message:
                return {"response": "Desculpe, a LLM não respondeu. Tente novamente.", "session_id": session_id}

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
                if final_response and final_response.content:
                    self._save_message(session_id, "assistant", final_response.content)
                    return {"response": final_response.content, "session_id": session_id}
                else:
                    msg = "Não consegui processar os dados da consulta no momento."
                    self._save_message(session_id, "assistant", msg)
                    return {"response": msg, "session_id": session_id}
            
            # Resposta direta
            if response_message.content:
                self._save_message(session_id, "assistant", response_message.content)
                return {"response": response_message.content, "session_id": session_id}

            return {"response": "Entendido. Como posso ajudar mais?", "session_id": session_id}

        except Exception as e:
            logger.error(f"Erro no chat Jarvis: {e}")
            return {"response": "Ocorreu um erro interno no Jarvis Service. Verifique os logs.", "session_id": session_id}

    def _save_message(self, session_id, role, content):
        msg = JarvisChatMessage(session_id=session_id, role=role, content=content)
        db.session.add(msg)
        db.session.commit()

    def _execute_read_only_query(self, sql):
        sql_lower = sql.strip().lower()
        forbidden = ["insert", "update", "delete", "drop", "truncate", "alter", "grant", "revoke"]
        
        if not sql_lower.startswith("select"):
            return {"error": "Apenas consultas SELECT são permitidas."}
        
        for word in forbidden:
            if f" {word} " in f" {sql_lower} " or sql_lower.startswith(word):
                return {"error": f"Operação '{word}' não permitida."}

        try:
            result = db.session.execute(text(sql))
            rows = [dict(row._mapping) for row in result]
            return rows[:50]
        except Exception as e:
            logger.error(f"Erro SQL Jarvis: {e}")
            return {"error": str(e)}

    def get_user_sessions(self, user_id):
        sessions = JarvisChatSession.query.filter_by(user_id=user_id).order_by(JarvisChatSession.updated_at.desc()).all()
        return [{"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()} for s in sessions]

    def get_session_history(self, user_id, session_id):
        session = JarvisChatSession.query.get(session_id)
        if not session or session.user_id != user_id:
            return None
        messages = JarvisChatMessage.query.filter_by(session_id=session_id).order_by(JarvisChatMessage.created_at).all()
        return [{"role": m.role, "content": m.content} for m in messages]

    def delete_session(self, user_id, session_id):
        session = JarvisChatSession.query.get(session_id)
        if not session or session.user_id != user_id:
            return False
        db.session.delete(session)
        db.session.commit()
        return True
