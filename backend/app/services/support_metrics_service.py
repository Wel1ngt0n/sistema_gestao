import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, or_

from app.models import (
    SupportAgentPerformance,
    SupportContact,
    SupportConversation,
    SupportImportBatch,
    SupportMessage,
    SupportMetricSnapshot,
    SystemConfig,
    ZenviaWebhookEvent,
    db,
)


def month_range(period: Optional[str]) -> Tuple[datetime, datetime, str]:
    selected = period or datetime.now().strftime("%Y-%m")
    start = datetime.strptime(f"{selected}-01", "%Y-%m-%d")
    if start.month == 12:
        end = datetime(start.year + 1, 1, 1)
    else:
        end = datetime(start.year, start.month + 1, 1)
    return start, end, selected


def format_seconds(seconds: Optional[float]) -> str:
    if not seconds:
        return "0m"
    seconds_i = int(seconds)
    days, rem = divmod(seconds_i, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, secs = divmod(rem, 60)
    if days:
        return f"{days}d {hours}h"
    if hours:
        return f"{hours}h {minutes}m"
    if minutes:
        return f"{minutes}m"
    return f"{secs}s"


def _metric_rows(period: str, metric_type: str) -> List[SupportMetricSnapshot]:
    return SupportMetricSnapshot.query.filter_by(period=period, metric_type=metric_type).all()


def _dimensions(row: SupportMetricSnapshot) -> Dict[str, Any]:
    if not row.dimensions_json:
        return {}
    try:
        return json.loads(row.dimensions_json)
    except Exception:
        return {}


def get_periods() -> List[str]:
    periods = set()
    for row in db.session.query(SupportAgentPerformance.period).distinct().all():
        if row.period:
            periods.add(row.period)
    for row in db.session.query(SupportMetricSnapshot.period).distinct().all():
        if row.period:
            periods.add(row.period)
    for row in db.session.query(SupportImportBatch.period).distinct().all():
        if row.period:
            periods.add(row.period)
    for row in db.session.query(func.substr(db.cast(SupportConversation.created_at_zenvia, db.String), 1, 7)).distinct().all():
        if row[0]:
            periods.add(row[0])
    if not periods:
        periods.add(datetime.now().strftime("%Y-%m"))
    return sorted(periods, reverse=True)


def get_support_kpis(period: Optional[str] = None) -> Dict[str, Any]:
    start, end, selected = month_range(period)

    open_convs = SupportConversation.query.filter_by(status="OPEN").count()
    closed_convs = SupportConversation.query.filter(
        SupportConversation.status == "CLOSED",
        SupportConversation.created_at_zenvia >= start,
        SupportConversation.created_at_zenvia < end,
    ).count()
    messages_in = SupportMessage.query.filter(
        SupportMessage.direction == "IN",
        SupportMessage.timestamp >= start,
        SupportMessage.timestamp < end,
    ).count()
    messages_out = SupportMessage.query.filter(
        SupportMessage.direction == "OUT",
        SupportMessage.timestamp >= start,
        SupportMessage.timestamp < end,
    ).count()
    agent_rows = SupportAgentPerformance.query.filter_by(period=selected).all()
    response_values = [a.avg_response_time_seconds for a in agent_rows if a.avg_response_time_seconds]
    avg_response_seconds = round(sum(response_values) / len(response_values), 0) if response_values else 0
    avg_nps_values = [a.avg_nps for a in agent_rows if a.avg_nps is not None]
    avg_nps = round(sum(avg_nps_values) / len(avg_nps_values), 2) if avg_nps_values else None
    pending_tickets = sum(a.pending_tickets or 0 for a in agent_rows)
    open_tickets = sum(a.open_tickets or 0 for a in agent_rows)

    last_sync = SystemConfig.query.filter_by(key="last_support_sync").first()
    last_import = SystemConfig.query.filter_by(key="last_support_import").first()

    return {
        "period": selected,
        "open_conversations": open_convs,
        "closed_conversations": closed_convs,
        "messages_in": messages_in,
        "messages_out": messages_out,
        "avg_response_time": format_seconds(avg_response_seconds),
        "avg_response_time_seconds": avg_response_seconds,
        "avg_nps": avg_nps,
        "pending_tickets": pending_tickets,
        "open_tickets": open_tickets,
        "last_sync": last_sync.value if last_sync else "Nunca",
        "last_import": last_import.value if last_import else "Nunca",
    }


def get_agent_performance(period: Optional[str] = None) -> List[Dict[str, Any]]:
    _, _, selected = month_range(period)
    agents = SupportAgentPerformance.query.filter_by(period=selected).order_by(
        SupportAgentPerformance.total_conversations.desc(),
        SupportAgentPerformance.total_messages_sent.desc(),
    ).all()
    return [{
        "id": a.id,
        "agent_name": a.agent_name,
        "period": a.period,
        "group_name": a.group_name,
        "total_contacts": a.total_contacts or 0,
        "total_conversations": a.total_conversations or 0,
        "new_conversations": a.new_conversations or 0,
        "closed_conversations": a.closed_conversations or 0,
        "total_messages_sent": a.total_messages_sent or 0,
        "avg_response_time_seconds": a.avg_response_time_seconds or 0,
        "avg_close_time_seconds": a.avg_close_time_seconds or 0,
        "avg_nps": a.avg_nps,
        "nps_count": a.nps_count or 0,
        "last_activity_at": a.last_activity_at.isoformat() if a.last_activity_at else None,
        "activities_today": a.activities_today or 0,
        "pending_tickets": a.pending_tickets or 0,
        "open_tickets": a.open_tickets or 0,
    } for a in agents]


def get_recent_messages(limit: int = 50) -> List[Dict[str, Any]]:
    messages = SupportMessage.query.order_by(SupportMessage.timestamp.desc()).limit(limit).all()
    result = []
    for msg in messages:
        contact_name = "Desconhecido"
        if msg.conversation and msg.conversation.contact:
            contact_name = msg.conversation.contact.name or "Desconhecido"
        result.append({
            "id": msg.id,
            "text": msg.text,
            "direction": msg.direction,
            "status": msg.status,
            "contact_name": contact_name,
            "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
            "source": "Webhook" if msg.zenvia_message_id and not msg.zenvia_message_id.startswith("CSV_") else "CSV",
        })
    return result


def get_nps_feedbacks(period: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    start, end, _ = month_range(period)
    convs = SupportConversation.query.filter(
        SupportConversation.nps_score.isnot(None),
        SupportConversation.created_at_zenvia >= start,
        SupportConversation.created_at_zenvia < end,
    ).order_by(SupportConversation.created_at_zenvia.desc()).limit(limit).all()
    return [{
        "id": c.id,
        "agent_name": c.agent_name,
        "nps_score": c.nps_score,
        "nps_comment": c.nps_comment,
        "contact_name": c.contact.name if c.contact else "Desconhecido",
        "date": c.created_at_zenvia.isoformat() if c.created_at_zenvia else None,
        "source": "CSV" if c.zenvia_conversation_id.startswith("CSV_") else "Webhook",
    } for c in convs]


def get_import_history(period: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    _, _, selected = month_range(period)
    batches = SupportImportBatch.query.filter_by(period=selected).order_by(
        SupportImportBatch.started_at.desc()
    ).limit(limit).all()
    result = []
    for batch in batches:
        stats = []
        if batch.stats_json:
            try:
                stats = json.loads(batch.stats_json)
            except Exception:
                stats = []
        result.append({
            "id": batch.id,
            "period": batch.period,
            "status": batch.status,
            "files_count": batch.files_count or 0,
            "rows_total": batch.rows_total or 0,
            "rows_imported": batch.rows_imported or 0,
            "errors_count": batch.errors_count or 0,
            "started_at": batch.started_at.isoformat() if batch.started_at else None,
            "finished_at": batch.finished_at.isoformat() if batch.finished_at else None,
            "stats": stats,
        })
    return result


def get_source_health(period: Optional[str] = None) -> Dict[str, Any]:
    _, _, selected = month_range(period)
    last_event = ZenviaWebhookEvent.query.order_by(ZenviaWebhookEvent.created_at.desc()).first()
    last_processed = ZenviaWebhookEvent.query.filter(
        ZenviaWebhookEvent.processed_at.isnot(None)
    ).order_by(ZenviaWebhookEvent.processed_at.desc()).first()
    pending = ZenviaWebhookEvent.query.filter_by(processed_at=None).count()
    total_events = ZenviaWebhookEvent.query.count()
    imports = get_import_history(selected, limit=5)

    return {
        "period": selected,
        "webhooks": {
            "total_events": total_events,
            "pending_events": pending,
            "last_received_at": last_event.created_at.isoformat() if last_event and last_event.created_at else None,
            "last_processed_at": last_processed.processed_at.isoformat() if last_processed and last_processed.processed_at else None,
            "last_event_type": last_event.event_type if last_event else None,
        },
        "imports": {
            "last_batches": imports,
            "last_status": imports[0]["status"] if imports else "never",
            "last_finished_at": imports[0]["finished_at"] if imports else None,
        },
    }


def get_conversations(
    period: Optional[str] = None,
    status: Optional[str] = None,
    agent: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> Dict[str, Any]:
    start, end, selected = month_range(period)
    query = SupportConversation.query.outerjoin(SupportContact).filter(
        SupportConversation.created_at_zenvia >= start,
        SupportConversation.created_at_zenvia < end,
    )
    if status:
        query = query.filter(SupportConversation.status == status)
    if agent:
        query = query.filter(SupportConversation.agent_name == agent)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            SupportContact.name.ilike(like),
            SupportContact.phone.ilike(like),
            SupportConversation.zenvia_conversation_id.ilike(like),
        ))

    total = query.count()
    items = query.order_by(SupportConversation.created_at_zenvia.desc()).offset(
        max(page - 1, 0) * page_size
    ).limit(page_size).all()

    return {
        "period": selected,
        "page": page,
        "page_size": page_size,
        "total": total,
        "items": [{
            "id": c.id,
            "conversation_id": c.zenvia_conversation_id,
            "contact_name": c.contact.name if c.contact else "Desconhecido",
            "phone": c.contact.phone if c.contact else None,
            "status": c.status,
            "channel": c.channel,
            "agent_name": c.agent_name,
            "created_at": c.created_at_zenvia.isoformat() if c.created_at_zenvia else None,
            "closed_at": c.closed_at.isoformat() if c.closed_at else None,
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
            "nps_score": c.nps_score,
            "source": "CSV" if c.zenvia_conversation_id.startswith("CSV_") else "Webhook",
        } for c in items],
    }


def get_overview(period: Optional[str] = None) -> Dict[str, Any]:
    _, _, selected = month_range(period)
    hourly = []
    for row in _metric_rows(selected, "hourly_response"):
        dims = _dimensions(row)
        hourly.append({
            "hour": row.metric_key,
            "day": dims.get("day"),
            "seconds": row.value_float or 0,
        })

    close_reasons_map: Dict[str, Dict[str, Any]] = {}
    for row in _metric_rows(selected, "close_reason"):
        dims = _dimensions(row)
        item = close_reasons_map.setdefault(row.metric_key, {"reason": row.metric_key})
        item[dims.get("field", "value")] = row.value_float

    daily_series = {}
    for metric_type in ["new_conversations", "new_contacts", "closed_conversations", "interactions"]:
        rows = _metric_rows(selected, metric_type)
        daily_series[metric_type] = [{
            "label": row.metric_key,
            "value": row.value_float or 0,
        } for row in rows]

    return {
        "period": selected,
        "kpis": get_support_kpis(selected),
        "agents": get_agent_performance(selected),
        "messages": get_recent_messages(20),
        "nps_feedbacks": get_nps_feedbacks(selected, 20),
        "hourly_response": hourly,
        "close_reasons": sorted(close_reasons_map.values(), key=lambda item: item.get("conversations") or 0, reverse=True),
        "daily_series": daily_series,
        "source_health": get_source_health(selected),
        "imports": get_import_history(selected, 5),
    }
