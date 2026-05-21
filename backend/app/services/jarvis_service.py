import json
import logging
import re
import time
from datetime import datetime, timedelta

from sqlalchemy import func, or_, text

from app.models import (
    db,
    IntegrationMetric,
    JarvisChatMessage,
    JarvisChatSession,
    Store,
    SupportAgentPerformance,
    SupportConversation,
    TaskStep,
)
from app.services.analysts_report_service import AnalystsReportService
from app.services.analytics_service import AnalyticsService
from app.services.forecast_service import ForecastService
from app.services.integration_analytics_service import IntegrationAnalyticsService
from app.services.llm_service import LLMService
from app.services.scoring_service import ScoringService

logger = logging.getLogger(__name__)


class JarvisService:
    DEFAULT_LIMIT = 20
    MAX_LIMIT = 50
    SQL_ALLOWED_TABLES = {
        "stores",
        "tasks_steps",
        "integration_metrics",
        "support_conversations",
        "support_agent_performance",
    }
    SQL_BLOCKED_WORDS = {
        "insert",
        "update",
        "delete",
        "drop",
        "truncate",
        "alter",
        "grant",
        "revoke",
        "create",
        "replace",
        "merge",
        "copy",
        "execute",
        "call",
    }

    def __init__(self):
        self.llm = LLMService()

    def chat(self, messages, user_id, session_id=None):
        """
        Interação principal com roteamento, tools operacionais e memória leve.
        Mantém o contrato público usado pelas rotas: response e session_id.
        """
        try:
            session = self._get_or_create_session(user_id, session_id)
            if isinstance(session, dict):
                return session

            history_db = self._get_history(session.id)
            user_message = self._extract_last_user_message(messages)
            if not user_message:
                return {"response": "Envie uma pergunta para eu analisar.", "session_id": session.id}

            self._persist_user_message(session, history_db, user_message)

            route = self._route_intention(user_message, history_db)
            tool_results = self._run_tools(route)
            context = self._build_operational_context(route, tool_results, user_id, session.id)
            response = self._generate_response(context)

            self._save_message(session.id, "assistant", response)
            return {"response": response, "session_id": session.id}
        except Exception as exc:
            logger.exception("Erro no chat Jarvis: %s", exc)
            return {
                "response": "Ocorreu um erro interno no Jarvis Service. Verifique os logs.",
                "session_id": session_id,
            }

    def _get_or_create_session(self, user_id, session_id=None):
        if not session_id:
            session = JarvisChatSession(user_id=user_id, title="Nova Conversa")
            db.session.add(session)
            db.session.commit()
            return session

        session = JarvisChatSession.query.get(session_id)
        if not session or session.user_id != user_id:
            return {"error": "Sessão não encontrada ou acesso negado."}
        return session

    def _get_history(self, session_id):
        return (
            JarvisChatMessage.query.filter_by(session_id=session_id)
            .order_by(JarvisChatMessage.created_at)
            .all()
        )

    def _extract_last_user_message(self, messages):
        for message in reversed(messages or []):
            if message.get("role") == "user" and message.get("content"):
                return message["content"].strip()
        return None

    def _persist_user_message(self, session, history_db, user_message):
        session.updated_at = datetime.utcnow()
        db.session.add(JarvisChatMessage(session_id=session.id, role="user", content=user_message))
        if not history_db:
            session.title = (user_message[:40] + "...") if len(user_message) > 40 else user_message
        db.session.commit()

    def _route_intention(self, user_message, history=None):
        text_lower = self._normalize_text(user_message)
        period = self._resolve_period(text_lower)
        mode = self._resolve_response_mode(text_lower)
        entities = {
            "analyst": self._extract_analyst_name(user_message),
            "store": self._extract_store_reference(user_message),
            "limit": self._extract_limit(text_lower),
        }

        intent = "GENERAL_QUESTION"
        confidence = 0.45
        tools = []

        if "slack" in text_lower:
            intent, confidence, mode = "SLACK_SUMMARY", 0.92, "slack"
            tools = ["get_team_performance", "get_mrr_summary", "get_sla_risks"]
        elif any(token in text_lower for token in ["suporte", "atendimento", "nps", "conversa", "ticket"]):
            intent, confidence = "SUPPORT_ANALYSIS", 0.9
            tools = ["get_support_summary"]
        elif any(token in text_lower for token in ["mrr", "mensalidade", "financeiro", "receita", "travado"]):
            intent, confidence = "FINANCIAL_MRR", 0.88
            tools = ["get_mrr_summary", "get_financial_forecast", "get_critical_stores"]
        elif any(token in text_lower for token in ["forecast", "previsao", "previsão", "go live", "projecao", "projeção"]):
            intent, confidence = "EXECUTIVE_SUMMARY", 0.86
            tools = ["get_forecast_summary", "get_financial_forecast"]
        elif any(token in text_lower for token in ["integracao", "integração", "integrador", "bugs", "documentacao", "documentação"]):
            intent, confidence = "EXECUTIVE_SUMMARY", 0.86
            tools = ["get_integration_overview"]
        elif any(token in text_lower for token in ["score", "scoring", "capacidade", "ranking", "otd", "retrabalho"]):
            intent, confidence = "TEAM_PERFORMANCE", 0.86
            tools = ["get_scoring_overview", "get_team_performance"]
        elif any(token in text_lower for token in ["gargalo", "gargalos", "bottleneck", "etapas lentas"]):
            intent, confidence = "SLA_RISK", 0.84
            tools = ["get_operational_dashboard", "get_final_stage_stores"]
        elif any(token in text_lower for token in ["funil", "pipeline", "status das lojas", "status geral"]):
            intent, confidence = "STORE_ANALYSIS", 0.84
            tools = ["get_store_pipeline_status", "get_critical_stores"]
        elif any(
            token in text_lower
            for token in ["cadastro de produto", "subir apps", "qualidade", "treinamento", "partes finais"]
        ):
            intent, confidence = "STORE_ANALYSIS", 0.86
            tools = ["get_final_stage_stores"]
        elif any(
            token in text_lower
            for token in [
                "entregas",
                "entregou",
                "entregaram",
                "entregues",
                "quem entregou",
                "lojas entregues",
                "loja esse mes",
                "loja este mes",
                "fechamento do mes",
            ]
        ):
            intent, confidence = "EXECUTIVE_SUMMARY", 0.82
            tools = ["get_monthly_delivery_summary", "get_team_performance", "get_mrr_summary"]
        elif any(token in text_lower for token in ["sla", "risco", "critica", "criticas", "atraso", "parada", "paradas"]):
            intent, confidence = "SLA_RISK", 0.86
            tools = ["get_sla_risks", "get_critical_stores"]
        elif entities["store"]:
            intent, confidence = "STORE_ANALYSIS", 0.82
            tools = ["get_store_details"]
        elif entities["analyst"] or any(token in text_lower for token in ["implantador", "analista", "acompanhar"]):
            intent, confidence = "ANALYST_PERFORMANCE", 0.8
            tools = ["get_analyst_performance", "get_team_performance"]
        elif any(token in text_lower for token in ["time", "equipe", "performando", "performance", "desempenho"]):
            intent, confidence = "TEAM_PERFORMANCE", 0.84
            tools = ["get_team_performance", "get_critical_stores"]
        elif any(token in text_lower for token in ["resumo", "executivo", "diretoria", "geral"]):
            intent, confidence = "EXECUTIVE_SUMMARY", 0.78
            tools = ["get_operational_dashboard", "get_team_performance", "get_mrr_summary", "get_support_summary"]
        elif any(token in text_lower for token in ["metricas", "métricas", "indicadores", "sistema", "modulos", "módulos"]):
            intent, confidence = "GENERAL_QUESTION", 0.76
            tools = ["get_metric_catalog", "get_operational_dashboard"]

        if not tools:
            tools = ["query_database"]

        return {
            "question": user_message,
            "intent": intent,
            "response_mode": mode,
            "period": period,
            "entities": entities,
            "confidence": confidence,
            "required_tools": tools,
            "fallback_allowed": intent == "GENERAL_QUESTION",
        }

    def _normalize_text(self, value):
        replacements = str.maketrans("áàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ", "aaaaeeioooucAAAAEEIOOOUC")
        return (value or "").translate(replacements).lower()

    def _resolve_period(self, text_lower):
        now = datetime.now()
        match = re.search(r"\b(20\d{2})[-/](0?[1-9]|1[0-2])\b", text_lower)
        if match:
            year = int(match.group(1))
            month = int(match.group(2))
            start = datetime(year, month, 1)
            return {"type": "month", "value": f"{year:04d}-{month:02d}", "start": start, "end": self._month_end(start)}

        month_names = {
            "janeiro": 1,
            "fevereiro": 2,
            "marco": 3,
            "abril": 4,
            "maio": 5,
            "junho": 6,
            "julho": 7,
            "agosto": 8,
            "setembro": 9,
            "outubro": 10,
            "novembro": 11,
            "dezembro": 12,
        }
        for name, month in month_names.items():
            if name in text_lower:
                year_match = re.search(r"\b(20\d{2})\b", text_lower)
                year = int(year_match.group(1)) if year_match else now.year
                start = datetime(year, month, 1)
                return {"type": "month", "value": f"{year:04d}-{month:02d}", "start": start, "end": self._month_end(start)}

        if any(token in text_lower for token in ["semana", "7 dias"]):
            start = now - timedelta(days=7)
            return {"type": "rolling_days", "value": "last_7_days", "start": start, "end": now}
        if any(token in text_lower for token in ["hoje", "agora"]):
            start = datetime(now.year, now.month, now.day)
            return {"type": "day", "value": start.strftime("%Y-%m-%d"), "start": start, "end": now}

        start = datetime(now.year, now.month, 1)
        return {"type": "month", "value": now.strftime("%Y-%m"), "start": start, "end": now}

    def _month_end(self, start):
        if start.month == 12:
            return datetime(start.year + 1, 1, 1) - timedelta(seconds=1)
        return datetime(start.year, start.month + 1, 1) - timedelta(seconds=1)

    def _resolve_response_mode(self, text_lower):
        if "slack" in text_lower:
            return "slack"
        if any(token in text_lower for token in ["o que fazer", "prioridade", "acao", "ação", "acompanhar", "plano"]):
            return "acao"
        if any(token in text_lower for token in ["por que", "porque", "causa", "gargalo", "investigar"]):
            return "investigacao"
        if any(token in text_lower for token in ["resumo", "executivo", "diretoria"]):
            return "executivo"
        return "diagnostico"

    def _extract_analyst_name(self, user_message):
        match = re.search(
            r"(?:com|sobre|preocupar com|acompanhar)\s+([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][\wÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç ]{1,50})",
            user_message,
        )
        if not match:
            return None
        name = match.group(1).strip(" ?.,")
        return name if len(name.split()) <= 4 else None

    def _extract_store_reference(self, user_message):
        match = re.search(
            r"(?:loja|cliente|rede)\s+([A-Za-z0-9ÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç][\wÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç ._-]{1,80})",
            user_message,
            re.IGNORECASE,
        )
        if match:
            candidate = match.group(1).strip(" ?.,")
            if self._looks_like_time_expression(candidate):
                return None
            return candidate
        id_match = re.search(r"\b(?:id|#)\s*(\d{1,8})\b", user_message, re.IGNORECASE)
        return id_match.group(1) if id_match else None

    def _looks_like_time_expression(self, value):
        normalized = self._normalize_text(value).strip()
        temporal_terms = [
            "esse mes",
            "este mes",
            "mes",
            "hoje",
            "agora",
            "semana",
            "esse mes ja",
            "este mes ja",
        ]
        return any(normalized == term or normalized.startswith(f"{term} ") for term in temporal_terms)

    def _extract_limit(self, text_lower):
        match = re.search(r"\b(?:top|limite|listar|mostre)\s*(\d{1,2})\b", text_lower)
        if match:
            return min(max(int(match.group(1)), 1), 20)
        return 10

    def _tool_catalog(self):
        return {
            "get_team_performance": self._get_team_performance,
            "get_analyst_performance": self._get_analyst_performance,
            "get_store_details": self._get_store_details,
            "get_critical_stores": self._get_critical_stores,
            "get_sla_risks": self._get_sla_risks,
            "get_mrr_summary": self._get_mrr_summary,
            "get_support_summary": self._get_support_summary,
            "get_monthly_delivery_summary": self._get_monthly_delivery_summary,
            "get_store_pipeline_status": self._get_store_pipeline_status,
            "get_final_stage_stores": self._get_final_stage_stores,
            "get_metric_catalog": self._get_metric_catalog,
            "get_operational_dashboard": self._get_operational_dashboard,
            "get_scoring_overview": self._get_scoring_overview,
            "get_forecast_summary": self._get_forecast_summary,
            "get_financial_forecast": self._get_financial_forecast,
            "get_integration_overview": self._get_integration_overview,
        }

    def _run_tools(self, route):
        results = []
        catalog = self._tool_catalog()
        for tool_name in route.get("required_tools", []):
            if tool_name == "query_database":
                results.append(self._query_database_fallback(route))
                continue
            tool = catalog.get(tool_name)
            if not tool:
                results.append(self._tool_error(tool_name, "Tool não encontrada."))
                continue
            try:
                results.append(tool(route))
            except Exception as exc:
                logger.exception("Erro na tool Jarvis %s: %s", tool_name, exc)
                results.append(self._tool_error(tool_name, str(exc)))
        return results

    def _tool_error(self, tool_name, error):
        return {
            "tool": tool_name,
            "status": "error",
            "metrics": {},
            "records": [],
            "alerts": [],
            "limitations": [error],
        }

    def _get_team_performance(self, route):
        period = route["period"]
        cockpit = AnalystsReportService.get_team_cockpit(period.get("start"), period.get("end"))
        analysts = cockpit.get("analysts", [])
        analysts_sorted = sorted(
            analysts,
            key=lambda item: (item.get("score", {}).get("score_final", 0), -(item.get("idle_medio") or 0)),
        )
        records = [
            self._trim_dict(
                analyst,
                [
                    "implantador",
                    "ativos",
                    "entregas_mes",
                    "carga_ponderada",
                    "mrr_ativo",
                    "pct_sla_concluidas",
                    "pct_sla_ativas",
                    "idle_medio",
                    "idle_critico_count",
                    "jarvis_status",
                    "recommendation",
                    "action_priority",
                    "score",
                ],
            )
            for analyst in analysts_sorted[:10]
        ]
        return {
            "tool": "get_team_performance",
            "status": "ok",
            "period": self._public_period(period),
            "metrics": {**cockpit.get("summary", {}), **cockpit.get("avg_metrics", {})},
            "records": records,
            "alerts": cockpit.get("alerts", []) + cockpit.get("team_actions", []),
            "limitations": [] if analysts else ["Não há dados de implantadores para o período."],
        }

    def _get_analyst_performance(self, route):
        analyst_name = route.get("entities", {}).get("analyst")
        if not analyst_name:
            return self._tool_error("get_analyst_performance", "Nome do analista não identificado.")

        period = route["period"]
        details = AnalystsReportService.get_analyst_details(analyst_name, period.get("start"), period.get("end"))
        team = AnalystsReportService.get_team_cockpit(period.get("start"), period.get("end"))
        summary = details.get("summary", {})
        avg_metrics = team.get("avg_metrics", {})
        comparisons = {
            "idle_vs_time": self._safe_delta(summary.get("idle_medio"), avg_metrics.get("avg_idle")),
            "carga_vs_time": self._safe_delta(summary.get("carga_ponderada"), avg_metrics.get("avg_carga")),
            "entregas_vs_media": self._safe_delta(summary.get("entregas_mes"), avg_metrics.get("avg_throughput")),
            "sla_vs_time": self._safe_delta(summary.get("pct_sla_concluidas"), avg_metrics.get("avg_sla")),
        }
        return {
            "tool": "get_analyst_performance",
            "status": "ok",
            "period": self._public_period(period),
            "metrics": {**summary, "comparisons": comparisons},
            "records": (details.get("carteira_atual") or [])[:10],
            "alerts": summary.get("personal_actions", []),
            "limitations": [] if summary else [f"Não há dados consolidados para {analyst_name}."],
        }

    def _get_store_details(self, route):
        ref = route.get("entities", {}).get("store")
        if not ref:
            return self._tool_error("get_store_details", "Não foi possível identificar a loja.")

        if str(ref).isdigit():
            store = Store.query.filter(Store.id == int(ref)).first()
        else:
            store = Store.query.filter(Store.store_name.ilike(f"%{ref}%")).first()
        if not store:
            return self._tool_error("get_store_details", f"Loja não encontrada para referência: {ref}")

        metric = (
            IntegrationMetric.query.filter_by(store_id=store.id)
            .order_by(IntegrationMetric.updated_at.desc())
            .first()
        )
        steps = sorted(store.steps or [], key=lambda step: step.idle_days or 0, reverse=True)[:8]
        return {
            "tool": "get_store_details",
            "status": "ok",
            "period": self._public_period(route["period"]),
            "metrics": {
                "id": store.id,
                "name": store.store_name,
                "status": store.status,
                "status_norm": store.status_norm,
                "implantador": store.implantador_atual or store.implantador,
                "idle_days": store.idle_days,
                "dias_em_progresso": getattr(store, "dias_em_progresso", None),
                "dias_totais_implantacao": getattr(store, "dias_totais_implantacao", None),
                "tempo_contrato": store.tempo_contrato,
                "mrr": store.valor_mensalidade,
                "churn_risk": bool(metric.churn_risk) if metric else False,
                "blocking_issue": bool(metric.has_blocking_issue) if metric else False,
                "last_blocker_reason": metric.last_blocker_reason if metric else None,
            },
            "records": [
                {
                    "step": step.step_name,
                    "group": step.step_list_name,
                    "status": step.status,
                    "assignee": step.assignee,
                    "idle_days": step.idle_days,
                    "total_time_days": step.total_time_days,
                }
                for step in steps
            ],
            "alerts": self._store_alerts(store, metric),
            "limitations": [] if metric else ["Não há IntegrationMetric vinculado a esta loja."],
        }

    def _get_critical_stores(self, route):
        limit = route.get("entities", {}).get("limit") or 10
        stores = Store.query.filter(Store.status_norm.notin_(["DONE", "CANCELED"])).all()
        ranked = sorted(stores, key=self._store_risk_score, reverse=True)[:limit]
        return {
            "tool": "get_critical_stores",
            "status": "ok",
            "period": self._public_period(route["period"]),
            "metrics": {"total_critical_candidates": len(stores), "returned": len(ranked)},
            "records": [self._store_record(store) for store in ranked],
            "alerts": [{"type": "critical_stores", "message": f"{len(ranked)} lojas priorizadas por risco composto."}],
            "limitations": ["Ranking heurístico: combina idle, SLA, status, MRR e flags de integração."],
        }

    def _get_sla_risks(self, route):
        stores = Store.query.filter(Store.status_norm.notin_(["DONE", "CANCELED"])).all()
        risk_stores = []
        for store in stores:
            sla_limit = store.tempo_contrato or 90
            days = getattr(store, "dias_em_progresso", None) or store.total_time_days or 0
            idle = store.idle_days or 0
            if days > sla_limit or idle > 7 or store.status_norm == "BLOCKED":
                risk_stores.append(store)

        risk_stores = sorted(risk_stores, key=self._store_risk_score, reverse=True)[:15]
        return {
            "tool": "get_sla_risks",
            "status": "ok",
            "period": self._public_period(route["period"]),
            "metrics": {
                "risk_count": len(risk_stores),
                "mrr_at_risk": round(sum(store.valor_mensalidade or 0 for store in risk_stores), 2),
                "idle_over_7_count": sum(1 for store in risk_stores if (store.idle_days or 0) > 7),
                "blocked_count": sum(1 for store in risk_stores if store.status_norm == "BLOCKED"),
            },
            "records": [self._store_record(store) for store in risk_stores],
            "alerts": self._sla_alerts(risk_stores),
            "limitations": ["SLA em lojas ativas usa tempo de contrato e dias em progresso disponíveis."],
        }

    def _get_mrr_summary(self, route):
        period = route["period"]
        start, end = period.get("start"), period.get("end")
        active = Store.query.filter(Store.status_norm.notin_(["DONE", "CANCELED"])).all()
        delivered_query = Store.query.filter(Store.status_norm == "DONE")
        if start:
            delivered_query = delivered_query.filter(
                or_(Store.manual_finished_at >= start, Store.end_real_at >= start, Store.finished_at >= start)
            )
        if end:
            delivered_query = delivered_query.filter(
                or_(Store.manual_finished_at <= end, Store.end_real_at <= end, Store.finished_at <= end)
            )
        delivered = delivered_query.all()
        blocked = [store for store in active if store.status_norm == "BLOCKED" or (store.idle_days or 0) > 7]
        return {
            "tool": "get_mrr_summary",
            "status": "ok",
            "period": self._public_period(period),
            "metrics": {
                "delivered_mrr": round(sum(store.valor_mensalidade or 0 for store in delivered), 2),
                "active_mrr": round(sum(store.valor_mensalidade or 0 for store in active), 2),
                "blocked_or_idle_mrr": round(sum(store.valor_mensalidade or 0 for store in blocked), 2),
                "delivered_count": len(delivered),
                "active_count": len(active),
                "blocked_or_idle_count": len(blocked),
            },
            "records": [self._store_record(store) for store in sorted(blocked, key=self._store_risk_score, reverse=True)[:10]],
            "alerts": [{"type": "mrr_at_risk", "message": "MRR travado considera lojas bloqueadas ou com idle acima de 7 dias."}],
            "limitations": ["Não separa inadimplência financeira sem campo operacional dedicado por vencimento."],
        }

    def _get_support_summary(self, route):
        period = route["period"]
        period_key = period.get("value") if period.get("type") == "month" else datetime.now().strftime("%Y-%m")
        conversations_query = SupportConversation.query
        if period.get("start"):
            conversations_query = conversations_query.filter(SupportConversation.created_at_zenvia >= period["start"])
        if period.get("end"):
            conversations_query = conversations_query.filter(SupportConversation.created_at_zenvia <= period["end"])
        conversations = conversations_query.all()
        agents = SupportAgentPerformance.query.filter_by(period=period_key).all()
        nps_values = [conv.nps_score for conv in conversations if conv.nps_score is not None]
        return {
            "tool": "get_support_summary",
            "status": "ok",
            "period": self._public_period(period),
            "metrics": {
                "conversations": len(conversations),
                "open": sum(1 for conv in conversations if conv.status == "OPEN"),
                "closed": sum(1 for conv in conversations if conv.status == "CLOSED"),
                "avg_nps": round(sum(nps_values) / len(nps_values), 2) if nps_values else None,
                "nps_count": len(nps_values),
                "agents": len(agents),
            },
            "records": [
                {
                    "agent_name": agent.agent_name,
                    "total_conversations": agent.total_conversations,
                    "closed_conversations": agent.closed_conversations,
                    "avg_nps": agent.avg_nps,
                    "pending_tickets": agent.pending_tickets,
                    "open_tickets": agent.open_tickets,
                    "avg_response_time_seconds": agent.avg_response_time_seconds,
                }
                for agent in sorted(agents, key=lambda item: item.open_tickets or 0, reverse=True)[:10]
            ],
            "alerts": [],
            "limitations": [] if conversations or agents else ["Não há dados de suporte para o período."],
        }

    def _get_monthly_delivery_summary(self, route):
        period = route["period"]
        start, end = period.get("start"), period.get("end")
        query = Store.query.filter(Store.status_norm == "DONE")
        if start:
            query = query.filter(or_(Store.manual_finished_at >= start, Store.end_real_at >= start, Store.finished_at >= start))
        if end:
            query = query.filter(or_(Store.manual_finished_at <= end, Store.end_real_at <= end, Store.finished_at <= end))
        stores = query.all()
        return {
            "tool": "get_monthly_delivery_summary",
            "status": "ok",
            "period": self._public_period(period),
            "metrics": {
                "delivered_count": len(stores),
                "delivered_mrr": round(sum(store.valor_mensalidade or 0 for store in stores), 2),
            },
            "records": [self._store_record(store) for store in stores[:30]],
            "alerts": [],
            "limitations": [],
        }

    def _get_store_pipeline_status(self, route):
        rows = (
            db.session.query(Store.status_norm, func.count(Store.id), func.coalesce(func.sum(Store.valor_mensalidade), 0))
            .group_by(Store.status_norm)
            .all()
        )
        return {
            "tool": "get_store_pipeline_status",
            "status": "ok",
            "period": self._public_period(route["period"]),
            "metrics": {
                row[0] or "UNKNOWN": {"count": row[1], "mrr": round(float(row[2] or 0), 2)}
                for row in rows
            },
            "records": [],
            "alerts": [],
            "limitations": [],
        }

    def _get_final_stage_stores(self, route):
        target_stages = [
            "CADASTRO_PRODUTOS",
            "CADASTRO PRODUTOS",
            "CADASTRO DE PRODUTOS",
            "CADASTRO DE PRODUTO",
            "SUBIR_APPS",
            "SUBIR APPS",
            "QUALIDADE",
            "TREINAMENTO",
            "TREINAMENTOS",
        ]
        normalized_targets = {self._normalize_text(stage).replace("_", " ") for stage in target_stages}
        steps = (
            TaskStep.query.join(Store)
            .filter(Store.status_norm.notin_(["DONE", "CANCELED"]))
            .filter(TaskStep.end_real_at.is_(None))
            .all()
        )
        matched = []
        for step in steps:
            stage_name = step.step_list_name or step.step_name or ""
            normalized_stage = self._normalize_text(stage_name).replace("_", " ")
            if not any(target in normalized_stage or normalized_stage in target for target in normalized_targets):
                continue
            matched.append(step)

        matched = sorted(matched, key=lambda step: (step.step_list_name or "", -(step.idle_days or 0)))[:50]
        stage_counts = {}
        records = []
        for step in matched:
            stage = step.step_list_name or step.step_name or "Etapa sem nome"
            stage_counts[stage] = stage_counts.get(stage, 0) + 1
            store = step.store
            records.append(
                {
                    "store_id": store.id,
                    "name": store.store_name,
                    "stage": stage,
                    "step": step.step_name,
                    "status": step.status,
                    "implantador": store.implantador_atual or store.implantador,
                    "idle_days": step.idle_days,
                    "mrr": store.valor_mensalidade,
                }
            )

        return {
            "tool": "get_final_stage_stores",
            "status": "ok",
            "period": self._public_period(route["period"]),
            "metrics": {
                "total": len(records),
                "by_stage": stage_counts,
            },
            "records": records,
            "alerts": [],
            "limitations": [] if records else ["Não encontrei lojas ativas nessas etapas finais."],
        }

    def _get_metric_catalog(self, route):
        domains = [
            {
                "domain": "implantacao",
                "description": "KPIs gerais de implantação, WIP, entregas, MRR, OTD, cycle time, idle, risco e gargalos.",
                "tools": ["get_operational_dashboard", "get_store_pipeline_status", "get_sla_risks"],
                "metrics": ["wip_stores", "throughput_period", "mrr_backlog", "mrr_done_period", "cycle_time_avg", "otd_percentage", "idle_stores_count", "avg_risk_score"],
            },
            {
                "domain": "performance_implantadores",
                "description": "Ranking, carga, capacidade, score, entregas, SLA, retrabalho e carteira por implantador.",
                "tools": ["get_team_performance", "get_analyst_performance", "get_scoring_overview"],
                "metrics": ["score", "carga_ponderada", "utilization_pct", "entregas_mes", "pct_sla_concluidas", "idle_medio"],
            },
            {
                "domain": "lojas_e_etapas",
                "description": "Detalhe de loja, funil, etapas atuais, etapas finais, idle por etapa e bloqueios.",
                "tools": ["get_store_details", "get_final_stage_stores", "get_critical_stores"],
                "metrics": ["status_norm", "step_list_name", "idle_days", "total_time_days", "mrr", "risk_score"],
            },
            {
                "domain": "financeiro_forecast",
                "description": "MRR entregue, MRR em implantação, MRR travado, projeção futura e go-live previsto.",
                "tools": ["get_mrr_summary", "get_financial_forecast", "get_forecast_summary"],
                "metrics": ["delivered_mrr", "active_mrr", "blocked_or_idle_mrr", "realized", "projected", "go_live_date"],
            },
            {
                "domain": "integracao",
                "description": "Volume de integrações, andamento, SLA, qualidade, bugs pós-go-live, documentação e churn risk.",
                "tools": ["get_integration_overview"],
                "metrics": ["total_volume", "ongoing", "done", "sla_pct", "quality_pct", "bugs_count", "churn_risk_count"],
            },
            {
                "domain": "suporte",
                "description": "Conversas, status, NPS, tempo de resposta/resolução, performance por atendente e tickets abertos.",
                "tools": ["get_support_summary"],
                "metrics": ["conversations", "open", "closed", "avg_nps", "avg_response_time_seconds", "open_tickets", "pending_tickets"],
            },
        ]
        return {
            "tool": "get_metric_catalog",
            "status": "ok",
            "period": self._public_period(route["period"]),
            "metrics": {"domains_count": len(domains)},
            "records": domains,
            "alerts": [],
            "limitations": ["Catálogo descreve cobertura operacional do Jarvis; permissões de escrita continuam fora do escopo."],
        }

    def _get_operational_dashboard(self, route):
        period = route["period"]
        kpis = AnalyticsService.get_kpi_cards(period.get("start"), period.get("end"))
        trends = AnalyticsService.get_monthly_trends(months=6)
        bottlenecks = AnalyticsService.get_bottlenecks()
        capacity = AnalyticsService.get_team_capacity()
        return {
            "tool": "get_operational_dashboard",
            "status": "ok",
            "period": self._public_period(period),
            "metrics": {
                **kpis,
                "trend_months": len(trends),
                "bottleneck_count": len(bottlenecks),
                "capacity_people": len(capacity),
            },
            "records": {
                "trends": trends[-6:],
                "bottlenecks": bottlenecks[:10],
                "capacity": capacity[:12],
            },
            "alerts": self._capacity_alerts(capacity),
            "limitations": ["Dashboard usa os mesmos cálculos do AnalyticsService; algumas métricas são calculadas em Python por propriedades do model."],
        }

    def _get_scoring_overview(self, route):
        period = route["period"]
        ranking = ScoringService.get_performance_ranking(period.get("start"), period.get("end"))
        capacity = ScoringService.get_team_capacity()
        records = ranking[:12] if isinstance(ranking, list) else []
        return {
            "tool": "get_scoring_overview",
            "status": "ok",
            "period": self._public_period(period),
            "metrics": {
                "ranked_people": len(records),
                "capacity_people": len(capacity) if isinstance(capacity, list) else 0,
                "top_score": records[0].get("score") if records and isinstance(records[0], dict) else None,
            },
            "records": {
                "ranking": records,
                "capacity": capacity[:12] if isinstance(capacity, list) else [],
            },
            "alerts": [],
            "limitations": ["Ranking de scoring exige lojas WIP e entregas 2026+; amostras pequenas devem ser interpretadas com cautela."],
        }

    def _get_forecast_summary(self, route):
        period = route["period"]
        forecast_rows = ForecastService.get_forecast_data()
        summary = ForecastService.get_summary_by_month()
        current_month = period.get("value")
        month_rows = [row for row in forecast_rows if row.get("month_go_live") == current_month] if current_month else []
        risk_rows = [row for row in forecast_rows if row.get("status") == "ATRASADA"]
        return {
            "tool": "get_forecast_summary",
            "status": "ok",
            "period": self._public_period(period),
            "metrics": {
                "forecast_stores": len(forecast_rows),
                "current_month_stores": len(month_rows),
                "late_stores": len(risk_rows),
                "summary_months": len(summary),
            },
            "records": {
                "current_month": month_rows[:20],
                "late": risk_rows[:15],
                "monthly_summary": summary[:12],
            },
            "alerts": [{"type": "forecast_late", "message": f"{len(risk_rows)} lojas atrasadas no forecast."}] if risk_rows else [],
            "limitations": ["Forecast usa data manual de go-live quando existe; caso contrário usa SLA/data inicial estimada."],
        }

    def _get_financial_forecast(self, route):
        forecast = AnalyticsService.get_financial_forecast(months=6)
        future = [row for row in forecast if row.get("is_future")]
        return {
            "tool": "get_financial_forecast",
            "status": "ok",
            "period": self._public_period(route["period"]),
            "metrics": {
                "months": len(forecast),
                "future_projected_mrr": round(sum(row.get("projected", 0) for row in future), 2),
                "future_realized_mrr": round(sum(row.get("realized", 0) for row in future), 2),
            },
            "records": forecast,
            "alerts": [],
            "limitations": ["Projeção financeira usa cycle time médio recente e MRR das lojas em progresso."],
        }

    def _get_integration_overview(self, route):
        kpis = IntegrationAnalyticsService.get_kpi_cards()
        trends = IntegrationAnalyticsService.get_monthly_trends(months=6)
        return {
            "tool": "get_integration_overview",
            "status": "ok",
            "period": self._public_period(route["period"]),
            "metrics": {**kpis, "trend_months": len(trends)},
            "records": trends,
            "alerts": [
                {"type": "integration_churn_risk", "message": f"{kpis.get('churn_risk_count', 0)} integrações com risco de churn."}
            ] if kpis.get("churn_risk_count") else [],
            "limitations": ["Integração usa IntegrationMetric; dados dependem de snapshot/atualização desse módulo."],
        }

    def _query_database_fallback(self, route):
        return {
            "tool": "query_database",
            "status": "skipped",
            "metrics": {},
            "records": [],
            "alerts": [],
            "limitations": [
                "Fallback SQL livre não foi executado automaticamente; as tools especializadas são o caminho principal."
            ],
        }

    def _build_operational_context(self, route, tool_results, user_id, session_id):
        ok_results = [result for result in tool_results if result.get("status") == "ok"]
        return {
            "question": route["question"],
            "intent": route["intent"],
            "response_mode": route["response_mode"],
            "period": self._public_period(route["period"]),
            "route_confidence": route["confidence"],
            "entities": route["entities"],
            "data_sources": sorted(
                {source for result in tool_results for source in self._data_sources_for_tool(result.get("tool"))}
            ),
            "main_metrics": self._merge_metrics(ok_results),
            "comparisons": self._extract_comparisons(ok_results),
            "alerts": self._collect_field(tool_results, "alerts", limit=12),
            "evidence": self._collect_records(tool_results, limit=18),
            "limitations": self._collect_field(tool_results, "limitations", limit=10),
            "memory": self._load_operational_memory(session_id),
            "tool_results": tool_results,
            "user_id": user_id,
        }

    def _generate_response(self, context):
        llm_response = self.llm.call_jarvis(
            [
                {"role": "system", "content": self._operational_system_prompt(context["response_mode"])},
                {
                    "role": "user",
                    "content": (
                        "Responda à pergunta do usuário usando o contexto operacional abaixo. "
                        "Se a pergunta for direta, responda direto, em linguagem natural, sem transformar em relatório. "
                        "Use somente os dados fornecidos e só declare limitações quando elas mudarem a decisão.\n\n"
                        f"{json.dumps(self._json_safe(context), ensure_ascii=False)}"
                    ),
                },
            ]
        )
        if llm_response and getattr(llm_response, "content", None):
            return llm_response.content
        return self._heuristic_response(context)

    def _operational_system_prompt(self, response_mode):
        return f"""
Você é o JARVIS, copiloto operacional de gestão Instabuy.

Modo de resposta: {response_mode}.

Regras:
- Fale como um copiloto operacional conversando com o gestor, não como relatório automático.
- Seja curto por padrão: 1 parágrafo ou até 4 bullets. Só aprofunde quando o usuário pedir diagnóstico, ranking detalhado ou plano de ação.
- Para perguntas diretas como "quem entregou?", "quais lojas?" ou "qual MRR?", responda primeiro a resposta objetiva e pare nos detalhes essenciais.
- Não use títulos grandes como "Diagnóstico Operacional", nem seções fixas "Fatos/Hipóteses/Recomendações" em perguntas simples.
- Use Fatos, Hipóteses e Recomendações apenas quando houver análise complexa, risco relevante ou pedido explícito de diagnóstico.
- Quando houver risco, indique prioridade e próxima ação.
- Quando envolver pessoas, compare com contexto de time e evite julgamento pessoal.
- Quando houver incerteza ou falta de dados, declare em uma frase curta.
- Para modo Slack, escreva texto pronto para envio, curto e com bullets.
- Não invente números, fontes ou entidades ausentes do contexto.
""".strip()

    def _heuristic_response(self, context):
        metrics = context.get("main_metrics", {})
        alerts = context.get("alerts", [])
        evidence = context.get("evidence", [])
        limitations = context.get("limitations", [])

        if context.get("response_mode") == "slack":
            lines = []
            for key, value in list(metrics.items())[:6]:
                lines.append(f"- {key}: {value}")
            if alerts:
                lines.append("- Atenção: " + self._alert_text(alerts[0]))
            return "\n".join(lines)

        if self._is_direct_question(context.get("question", "")):
            return self._direct_heuristic_response(context)

        facts = [f"- {key}: {value}" for key, value in list(metrics.items())[:5]]
        if evidence:
            facts.append(f"- Evidências priorizadas: {len(evidence)} registros.")
        hypotheses = [f"- {self._alert_text(alert)}" for alert in alerts[:2]]
        limitation_lines = [f"- {item}" for item in limitations[:2]]

        sections = ["Resumo", *(facts or ["- Não encontrei métricas suficientes para consolidar a leitura."])]
        if hypotheses:
            sections.extend(["", "Leitura", *hypotheses])
        sections.extend(["", "Próximos passos", *self._default_recommendations(context, alerts)[:2]])
        if limitation_lines:
            sections.extend(["", "Limitação", *limitation_lines])
        return "\n".join(
            sections
        )

    def _is_direct_question(self, question):
        normalized = self._normalize_text(question)
        direct_markers = ["quem", "quais", "qual", "quanto", "quantas", "foram de quem", "entregues foram"]
        return any(marker in normalized for marker in direct_markers)

    def _direct_heuristic_response(self, context):
        evidence = context.get("evidence", [])
        metrics = context.get("main_metrics", {})
        question = self._normalize_text(context.get("question", ""))

        final_stage_records = [
            record for record in evidence if record.get("source_tool") == "get_final_stage_stores"
        ]
        if final_stage_records and any(marker in question for marker in ["quais", "lojas", "partes finais"]):
            lines = []
            for record in final_stage_records[:12]:
                owner = f" — {record.get('implantador')}" if record.get("implantador") else ""
                idle = f", {record.get('idle_days')}d idle" if record.get("idle_days") is not None else ""
                lines.append(f"- {record.get('name')} ({record.get('stage')}{idle}){owner}")
            total = metrics.get("get_final_stage_stores.total", len(final_stage_records))
            return f"Encontrei {total} loja(s) nessas etapas finais:\n" + "\n".join(lines)

        if "quem" in question and evidence:
            owners = {}
            delivery_records = [
                record for record in evidence if record.get("source_tool") == "get_monthly_delivery_summary"
            ]
            scoped_records = delivery_records or evidence
            for record in scoped_records:
                owner = record.get("implantador")
                if not owner:
                    continue
                owners.setdefault(owner, 0)
                owners[owner] += 1
            if owners:
                summary = ", ".join(f"{owner} ({count})" for owner, count in owners.items())
                store_names = [
                    record.get("name")
                    for record in scoped_records[:4]
                    if record.get("name")
                ]
                stores_text = f": {', '.join(store_names)}" if store_names else ""
                return f"Foi {summary}. Foram {len(scoped_records)} loja(s) no período{stores_text}."

        if metrics:
            first_items = list(metrics.items())[:3]
            return "Aqui está o essencial: " + "; ".join(f"{key}: {value}" for key, value in first_items) + "."

        return "Não encontrei dados suficientes no contexto para responder com segurança."

    def _default_recommendations(self, context, alerts):
        intent = context.get("intent")
        if intent in {"SLA_RISK", "STORE_ANALYSIS", "FINANCIAL_MRR"}:
            return [
                "- Prioridade alta: revisar as lojas com maior idle e maior MRR primeiro.",
                "- Validar se o bloqueio é interno, de cliente ou de fluxo antes de redistribuir carga.",
                "- Registrar uma próxima ação por loja crítica para reduzir tempo parado.",
            ]
        if intent == "ANALYST_PERFORMANCE":
            return [
                "- Comparar carga, idle e entregas antes de concluir baixa performance.",
                "- Acompanhar as lojas paradas da carteira e remover bloqueios objetivos.",
            ]
        if alerts:
            return ["- Tratar primeiro os alertas com maior impacto operacional."]
        return ["- Faça uma pergunta mais específica se precisar de decisão por loja, analista ou período."]

    def _execute_read_only_query(self, sql, user_id=None, session_id=None, reason="fallback"):
        started = time.monotonic()
        validation_error = self._validate_sql(sql)
        if validation_error:
            return {"error": validation_error}

        safe_sql = self._apply_limit(sql)
        try:
            result = db.session.execute(text(safe_sql))
            rows = [dict(row._mapping) for row in result][: self.MAX_LIMIT]
            logger.info(
                "Jarvis SQL fallback user=%s session=%s rows=%s duration_ms=%s reason=%s",
                user_id,
                session_id,
                len(rows),
                round((time.monotonic() - started) * 1000, 2),
                reason,
            )
            return rows
        except Exception as exc:
            logger.error("Erro SQL Jarvis: %s", exc)
            return {"error": str(exc)}

    def _validate_sql(self, sql):
        if not sql or not isinstance(sql, str):
            return "SQL vazio ou inválido."
        stripped = sql.strip()
        lower = stripped.lower()
        if not lower.startswith("select"):
            return "Apenas consultas SELECT são permitidas."
        if ";" in stripped.rstrip(";"):
            return "Múltiplas statements não são permitidas."
        if "--" in lower or "/*" in lower or "*/" in lower:
            return "Comentários SQL não são permitidos no fallback."

        tokens = set(re.findall(r"\b[a-z_][a-z0-9_]*\b", lower))
        forbidden = tokens.intersection(self.SQL_BLOCKED_WORDS)
        if forbidden:
            return f"Operação não permitida: {sorted(forbidden)[0]}."

        referenced_tables = set(re.findall(r"\b(?:from|join)\s+([a-z_][a-z0-9_]*)\b", lower))
        blocked_tables = referenced_tables.difference(self.SQL_ALLOWED_TABLES)
        if blocked_tables:
            return f"Tabela não permitida no fallback: {sorted(blocked_tables)[0]}."
        return None

    def _apply_limit(self, sql):
        if re.search(r"\blimit\s+\d+\b", sql, flags=re.IGNORECASE):
            return re.sub(
                r"\blimit\s+(\d+)\b",
                lambda match: f"LIMIT {min(int(match.group(1)), self.MAX_LIMIT)}",
                sql,
                flags=re.IGNORECASE,
            )
        return f"{sql.rstrip().rstrip(';')} LIMIT {self.DEFAULT_LIMIT}"

    def _save_message(self, session_id, role, content):
        msg = JarvisChatMessage(session_id=session_id, role=role, content=content)
        db.session.add(msg)
        db.session.commit()

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

    def _infer_analyst_from_question(self, question):
        names = [
            row[0]
            for row in db.session.query(Store.implantador)
            .filter(Store.implantador.isnot(None), Store.implantador != "")
            .distinct()
            .all()
        ]
        normalized_question = self._normalize_text(question)
        for name in names:
            if self._normalize_text(name) in normalized_question:
                return name
        return None

    def _store_record(self, store):
        metric = (store.integration_metrics or [None])[-1] if hasattr(store, "integration_metrics") else None
        return {
            "id": store.id,
            "name": store.store_name,
            "status": store.status,
            "status_norm": store.status_norm,
            "implantador": store.implantador_atual or store.implantador,
            "idle_days": store.idle_days,
            "dias_em_progresso": getattr(store, "dias_em_progresso", None),
            "tempo_contrato": store.tempo_contrato,
            "mrr": store.valor_mensalidade,
            "risk_score": self._store_risk_score(store),
            "churn_risk": bool(metric.churn_risk) if metric else False,
            "blocking_issue": bool(metric.has_blocking_issue) if metric else False,
        }

    def _store_risk_score(self, store):
        idle = store.idle_days or 0
        mrr = store.valor_mensalidade or 0
        days = getattr(store, "dias_em_progresso", None) or store.total_time_days or 0
        sla = store.tempo_contrato or 90
        score = min(idle * 4, 40) + min((mrr / 1000) * 5, 25)
        if days > sla:
            score += 25
        if store.status_norm == "BLOCKED":
            score += 20
        metric = (store.integration_metrics or [None])[-1] if hasattr(store, "integration_metrics") else None
        if metric and (metric.churn_risk or metric.has_blocking_issue):
            score += 20
        return round(score, 1)

    def _store_alerts(self, store, metric=None):
        alerts = []
        if (store.idle_days or 0) > 7:
            alerts.append({"type": "idle", "priority": "high", "message": f"Loja parada há {store.idle_days} dias."})
        if store.status_norm == "BLOCKED":
            alerts.append({"type": "blocked", "priority": "high", "message": "Loja está em status bloqueado."})
        if metric and metric.churn_risk:
            alerts.append({"type": "churn", "priority": "high", "message": "Integração marcada com risco de churn."})
        if metric and metric.has_blocking_issue:
            alerts.append({"type": "blocking_issue", "priority": "medium", "message": metric.last_blocker_reason or "Há bloqueio registrado."})
        return alerts

    def _sla_alerts(self, stores):
        if not stores:
            return []
        high_idle = [store for store in stores if (store.idle_days or 0) > 7]
        return [
            {
                "type": "sla_risk",
                "priority": "high",
                "message": f"{len(stores)} lojas com risco de SLA; {len(high_idle)} com idle acima de 7 dias.",
            }
        ]

    def _capacity_alerts(self, capacity):
        alerts = []
        for person in capacity[:5]:
            risk = person.get("risk_level")
            if risk in {"HIGH", "CRITICAL"}:
                alerts.append(
                    {
                        "type": "capacity",
                        "priority": "high" if risk == "CRITICAL" else "medium",
                        "message": f"{person.get('implantador')} está com utilização em {person.get('utilization_pct')}%.",
                    }
                )
        return alerts

    def _trim_dict(self, source, keys):
        return {key: source.get(key) for key in keys if key in source}

    def _safe_delta(self, value, baseline):
        if value is None or baseline is None:
            return None
        return round(float(value or 0) - float(baseline or 0), 2)

    def _public_period(self, period):
        return {
            "type": period.get("type"),
            "value": period.get("value"),
            "start": period.get("start").isoformat() if period.get("start") else None,
            "end": period.get("end").isoformat() if period.get("end") else None,
        }

    def _data_sources_for_tool(self, tool_name):
        mapping = {
            "get_team_performance": ["stores"],
            "get_analyst_performance": ["stores", "tasks_steps"],
            "get_store_details": ["stores", "tasks_steps", "integration_metrics"],
            "get_critical_stores": ["stores", "integration_metrics"],
            "get_sla_risks": ["stores", "integration_metrics"],
            "get_mrr_summary": ["stores"],
            "get_support_summary": ["support_conversations", "support_agent_performance"],
            "get_monthly_delivery_summary": ["stores"],
            "get_store_pipeline_status": ["stores"],
            "get_final_stage_stores": ["stores", "tasks_steps"],
            "get_metric_catalog": [],
            "get_operational_dashboard": ["stores", "tasks_steps", "metrics_snapshot_daily"],
            "get_scoring_overview": ["stores"],
            "get_forecast_summary": ["stores"],
            "get_financial_forecast": ["stores"],
            "get_integration_overview": ["stores", "integration_metrics"],
            "query_database": list(self.SQL_ALLOWED_TABLES),
        }
        return mapping.get(tool_name, [])

    def _merge_metrics(self, results):
        merged = {}
        for result in results:
            tool_name = result.get("tool")
            for key, value in (result.get("metrics") or {}).items():
                merged[f"{tool_name}.{key}"] = value
        return merged

    def _extract_comparisons(self, results):
        comparisons = {}
        for result in results:
            metrics = result.get("metrics") or {}
            if "comparisons" in metrics:
                comparisons[result.get("tool")] = metrics["comparisons"]
        return comparisons

    def _collect_field(self, results, field, limit=10):
        items = []
        for result in results:
            value = result.get(field) or []
            if isinstance(value, list):
                items.extend(value)
            elif value:
                items.append(value)
        return items[:limit]

    def _collect_records(self, results, limit=18):
        records = []
        for result in results:
            raw_records = result.get("records") or []
            if isinstance(raw_records, dict):
                iterable = []
                for group_name, group_records in raw_records.items():
                    if isinstance(group_records, list):
                        for record in group_records:
                            if isinstance(record, dict):
                                iterable.append({"record_group": group_name, **record})
                    elif isinstance(group_records, dict):
                        iterable.append({"record_group": group_name, **group_records})
                raw_records = iterable
            for record in raw_records:
                if isinstance(record, dict):
                    records.append({"source_tool": result.get("tool"), **record})
        return records[:limit]

    def _load_operational_memory(self, session_id):
        messages = (
            JarvisChatMessage.query.filter_by(session_id=session_id, role="assistant")
            .order_by(JarvisChatMessage.created_at.desc())
            .limit(6)
            .all()
        )
        diagnostics, actions = [], []
        for message in messages:
            content = message.content or ""
            if "Hipótes" in content or "Diagn" in content:
                diagnostics.append(content[:280])
            if "Recomend" in content or "acao" in self._normalize_text(content):
                actions.append(content[:280])
        return {
            "previous_diagnostics": diagnostics[:3],
            "pending_actions": actions[:3],
            "recurring_questions": [],
        }

    def _json_safe(self, value):
        if isinstance(value, dict):
            return {key: self._json_safe(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self._json_safe(item) for item in value]
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    def _alert_text(self, alert):
        if isinstance(alert, dict):
            return alert.get("message") or alert.get("msg") or alert.get("description") or str(alert)
        return str(alert)
