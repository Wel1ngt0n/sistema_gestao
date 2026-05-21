import json
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_

from app.models import (
    SupportAgentPerformance,
    SupportContact,
    SupportConversation,
    SupportImportBatch,
    SupportMessage,
    SupportMetricSnapshot,
    SystemConfig,
    ZenviaWebhookEvent,
)


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


def parse_date_value(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    if len(raw) == 7:
        try:
            return datetime.strptime(f"{raw}-01", "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def start_of_day(value: date) -> datetime:
    return datetime.combine(value, time.min)


def end_of_day(value: date) -> datetime:
    return datetime.combine(value, time.max)


def current_month_window() -> Tuple[datetime, datetime]:
    today = datetime.now().date()
    start = today.replace(day=1)
    if start.month == 12:
        end = date(start.year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(start.year, start.month + 1, 1) - timedelta(days=1)
    return start_of_day(start), end_of_day(end)


def resolve_window(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
) -> Tuple[datetime, datetime, str]:
    start = parse_date_value(start_date)
    end = parse_date_value(end_date)

    if period and (not start or not end):
        period_start = parse_date_value(period)
        if period_start:
            start = start or period_start.replace(day=1)
            if period_start.month == 12:
                period_end = date(period_start.year + 1, 1, 1) - timedelta(days=1)
            else:
                period_end = date(period_start.year, period_start.month + 1, 1) - timedelta(days=1)
            end = end or period_end

    if not start and not end:
        start_at, end_at = current_month_window()
        return start_at, end_at, f"{start_at.date().isoformat()}:{end_at.date().isoformat()}"

    if start and not end:
        end = start
    if end and not start:
        start = end

    assert start is not None and end is not None
    if end < start:
        start, end = end, start

    return start_of_day(start), end_of_day(end), f"{start.isoformat()}:{end.isoformat()}"


def _load_dimensions(row: SupportMetricSnapshot) -> Dict[str, Any]:
    if not row.dimensions_json:
        return {}
    try:
        return json.loads(row.dimensions_json)
    except Exception:
        return {}


def _rows_for_window(query, start_at: datetime, end_at: datetime):
    return query.filter(
        or_(
            and_(
                query.column_descriptions[0]["entity"].range_start.isnot(None),
                query.column_descriptions[0]["entity"].range_end.isnot(None),
                query.column_descriptions[0]["entity"].range_start <= end_at,
                query.column_descriptions[0]["entity"].range_end >= start_at,
            ),
            and_(
                query.column_descriptions[0]["entity"].range_start.is_(None),
                query.column_descriptions[0]["entity"].range_end.is_(None),
            ),
        )
    )


def _support_batches(start_at: datetime, end_at: datetime) -> List[SupportImportBatch]:
    query = SupportImportBatch.query
    rows = query.filter(
        or_(
            and_(
                SupportImportBatch.range_start.isnot(None),
                SupportImportBatch.range_end.isnot(None),
                SupportImportBatch.range_start <= end_at,
                SupportImportBatch.range_end >= start_at,
            ),
            and_(
                SupportImportBatch.range_start.is_(None),
                SupportImportBatch.range_end.is_(None),
            ),
        )
    ).order_by(SupportImportBatch.range_end.desc().nullslast(), SupportImportBatch.id.desc()).all()
    return rows


def get_windows() -> List[Dict[str, Any]]:
    batches = SupportImportBatch.query.order_by(
        SupportImportBatch.range_end.desc().nullslast(),
        SupportImportBatch.id.desc(),
    ).limit(50).all()
    return [{
        "id": batch.id,
        "period": batch.period,
        "granularity": batch.granularity or "monthly",
        "window_label": batch.window_label or batch.period,
        "start_date": batch.range_start.date().isoformat() if batch.range_start else None,
        "end_date": batch.range_end.date().isoformat() if batch.range_end else None,
        "status": batch.status,
    } for batch in batches]


def get_periods() -> List[str]:
    windows = get_windows()
    if windows:
        return [item["window_label"] for item in windows]
    start_at, _, _ = resolve_window()
    return [start_at.strftime("%Y-%m")]


def _agent_rows_for_window(start_at: datetime, end_at: datetime) -> List[SupportAgentPerformance]:
    return SupportAgentPerformance.query.filter(
        SupportAgentPerformance.range_start.isnot(None),
        SupportAgentPerformance.range_end.isnot(None),
        SupportAgentPerformance.range_start <= end_at,
        SupportAgentPerformance.range_end >= start_at,
    ).all()


def _weighted_average(total_value: float, total_weight: float) -> float:
    return round(total_value / total_weight, 0) if total_weight else 0


def _aggregate_agent_rows(rows: List[SupportAgentPerformance]) -> List[Dict[str, Any]]:
    grouped: Dict[str, Dict[str, Any]] = {}

    for row in rows:
        item = grouped.setdefault(row.agent_name, {
            "agent_name": row.agent_name,
            "group_name": row.group_name,
            "total_contacts": 0,
            "total_conversations": 0,
            "new_conversations": 0,
            "closed_conversations": 0,
            "total_messages_sent": 0,
            "avg_response_numerator": 0.0,
            "avg_response_weight": 0.0,
            "avg_close_numerator": 0.0,
            "avg_close_weight": 0.0,
            "avg_nps_numerator": 0.0,
            "avg_nps_weight": 0.0,
            "nps_count": 0,
            "last_activity_at": None,
            "activities_today": 0,
            "pending_tickets": 0,
            "open_tickets": 0,
        })

        item["group_name"] = item["group_name"] or row.group_name or "Suporte"
        item["total_contacts"] += row.total_contacts or 0
        item["total_conversations"] += row.total_conversations or 0
        item["new_conversations"] += row.new_conversations or 0
        item["closed_conversations"] += row.closed_conversations or 0
        item["total_messages_sent"] += row.total_messages_sent or 0

        response_weight = row.total_conversations or 0
        close_weight = row.closed_conversations or 0
        nps_weight = row.nps_count or 0

        item["avg_response_numerator"] += (row.avg_response_time_seconds or 0) * response_weight
        item["avg_response_weight"] += response_weight
        item["avg_close_numerator"] += (row.avg_close_time_seconds or 0) * close_weight
        item["avg_close_weight"] += close_weight
        if row.avg_nps is not None:
            item["avg_nps_numerator"] += row.avg_nps * nps_weight
            item["avg_nps_weight"] += nps_weight
        item["nps_count"] += nps_weight

        if row.last_activity_at and (item["last_activity_at"] is None or row.last_activity_at > item["last_activity_at"]):
            item["last_activity_at"] = row.last_activity_at
            item["activities_today"] = row.activities_today or 0
            item["pending_tickets"] = row.pending_tickets or 0
            item["open_tickets"] = row.open_tickets or 0

    result = []
    for item in grouped.values():
        result.append({
            "agent_name": item["agent_name"],
            "group_name": item["group_name"],
            "total_contacts": item["total_contacts"],
            "total_conversations": item["total_conversations"],
            "new_conversations": item["new_conversations"],
            "closed_conversations": item["closed_conversations"],
            "total_messages_sent": item["total_messages_sent"],
            "avg_response_time_seconds": _weighted_average(item["avg_response_numerator"], item["avg_response_weight"]),
            "avg_close_time_seconds": _weighted_average(item["avg_close_numerator"], item["avg_close_weight"]),
            "avg_nps": round(item["avg_nps_numerator"] / item["avg_nps_weight"], 2) if item["avg_nps_weight"] else None,
            "nps_count": item["nps_count"],
            "last_activity_at": item["last_activity_at"].isoformat() if item["last_activity_at"] else None,
            "activities_today": item["activities_today"],
            "pending_tickets": item["pending_tickets"],
            "open_tickets": item["open_tickets"],
        })

    return sorted(result, key=lambda row: (row["total_conversations"], row["total_messages_sent"]), reverse=True)


def get_support_kpis(
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    start_at, end_at, selected = resolve_window(start_date, end_date, period)

    open_convs = SupportConversation.query.filter(
        SupportConversation.status == "OPEN",
        SupportConversation.created_at_zenvia >= start_at,
        SupportConversation.created_at_zenvia <= end_at,
    ).count()
    closed_convs = SupportConversation.query.filter(
        SupportConversation.status == "CLOSED",
        SupportConversation.created_at_zenvia >= start_at,
        SupportConversation.created_at_zenvia <= end_at,
    ).count()
    messages_in = SupportMessage.query.filter(
        SupportMessage.direction == "IN",
        SupportMessage.timestamp >= start_at,
        SupportMessage.timestamp <= end_at,
    ).count()
    messages_out = SupportMessage.query.filter(
        SupportMessage.direction == "OUT",
        SupportMessage.timestamp >= start_at,
        SupportMessage.timestamp <= end_at,
    ).count()

    agent_rows = _aggregate_agent_rows(_agent_rows_for_window(start_at, end_at))
    response_values = [row["avg_response_time_seconds"] for row in agent_rows if row["avg_response_time_seconds"]]
    avg_response_seconds = round(sum(response_values) / len(response_values), 0) if response_values else 0

    nps_rows = SupportConversation.query.filter(
        SupportConversation.nps_score.isnot(None),
        SupportConversation.created_at_zenvia >= start_at,
        SupportConversation.created_at_zenvia <= end_at,
    ).all()
    nps_scores = [row.nps_score for row in nps_rows if row.nps_score is not None]
    avg_nps = round(sum(nps_scores) / len(nps_scores), 2) if nps_scores else None

    pending_tickets = sum(row["pending_tickets"] for row in agent_rows)
    open_tickets = sum(row["open_tickets"] for row in agent_rows)

    last_sync = SystemConfig.query.filter_by(key="last_support_sync").first()
    last_import = SystemConfig.query.filter_by(key="last_support_import").first()

    return {
        "period": selected,
        "start_date": start_at.date().isoformat(),
        "end_date": end_at.date().isoformat(),
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


def get_agent_performance(
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    start_at, end_at, _ = resolve_window(start_date, end_date, period)
    return _aggregate_agent_rows(_agent_rows_for_window(start_at, end_at))


def get_recent_messages(limit: int = 50, start_at: Optional[datetime] = None, end_at: Optional[datetime] = None) -> List[Dict[str, Any]]:
    query = SupportMessage.query
    if start_at and end_at:
        query = query.filter(
            SupportMessage.timestamp >= start_at,
            SupportMessage.timestamp <= end_at,
        )
    messages = query.order_by(SupportMessage.timestamp.desc()).limit(limit).all()
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


def get_nps_feedbacks(
    period: Optional[str] = None,
    limit: int = 50,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    start_at, end_at, _ = resolve_window(start_date, end_date, period)
    convs = SupportConversation.query.filter(
        SupportConversation.nps_score.isnot(None),
        SupportConversation.created_at_zenvia >= start_at,
        SupportConversation.created_at_zenvia <= end_at,
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


def get_import_history(
    period: Optional[str] = None,
    limit: int = 20,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    start_at, end_at, _ = resolve_window(start_date, end_date, period)
    batches = _support_batches(start_at, end_at)[:limit]
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
            "window_label": batch.window_label,
            "granularity": batch.granularity,
            "start_date": batch.range_start.date().isoformat() if batch.range_start else None,
            "end_date": batch.range_end.date().isoformat() if batch.range_end else None,
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


def get_source_health(
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    start_at, end_at, selected = resolve_window(start_date, end_date, period)
    last_event = ZenviaWebhookEvent.query.order_by(ZenviaWebhookEvent.created_at.desc()).first()
    last_processed = ZenviaWebhookEvent.query.filter(
        ZenviaWebhookEvent.processed_at.isnot(None)
    ).order_by(ZenviaWebhookEvent.processed_at.desc()).first()
    pending = ZenviaWebhookEvent.query.filter_by(processed_at=None).count()
    total_events = ZenviaWebhookEvent.query.count()
    imports = get_import_history(start_date=start_at.date().isoformat(), end_date=end_at.date().isoformat(), limit=5)

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
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    start_at, end_at, selected = resolve_window(start_date, end_date, period)
    query = SupportConversation.query.outerjoin(SupportContact).filter(
        SupportConversation.created_at_zenvia >= start_at,
        SupportConversation.created_at_zenvia <= end_at,
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
        "start_date": start_at.date().isoformat(),
        "end_date": end_at.date().isoformat(),
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


def _group_label(value: datetime, group_by: str) -> str:
    if group_by == "week":
        week_start = value.date() - timedelta(days=value.weekday())
        week_end = week_start + timedelta(days=6)
        return f"{week_start.strftime('%d/%m')} a {week_end.strftime('%d/%m')}"
    if group_by == "month":
        return value.strftime("%m/%Y")
    return value.strftime("%d/%m")


def _group_datetime(value: datetime, group_by: str) -> datetime:
    if group_by == "week":
        week_start = value.date() - timedelta(days=value.weekday())
        return start_of_day(week_start)
    if group_by == "month":
        return start_of_day(value.date().replace(day=1))
    return start_of_day(value.date())


def _timeline_for_window(start_at: datetime, end_at: datetime, group_by: str) -> List[Dict[str, Any]]:
    buckets: Dict[datetime, Dict[str, Any]] = defaultdict(lambda: {
        "bucket_date": None,
        "label": "",
        "new_conversations": 0,
        "new_contacts": 0,
        "closed_conversations": 0,
        "interactions": 0,
        "nps_sum": 0,
        "nps_count": 0,
    })

    conversations = SupportConversation.query.filter(
        SupportConversation.created_at_zenvia >= start_at,
        SupportConversation.created_at_zenvia <= end_at,
    ).all()
    for conversation in conversations:
        if not conversation.created_at_zenvia:
            continue
        bucket = _group_datetime(conversation.created_at_zenvia, group_by)
        row = buckets[bucket]
        row["bucket_date"] = bucket
        row["label"] = _group_label(conversation.created_at_zenvia, group_by)
        row["new_conversations"] += 1
        if conversation.status == "CLOSED":
            row["closed_conversations"] += 1
        if conversation.nps_score is not None:
            row["nps_sum"] += conversation.nps_score
            row["nps_count"] += 1

    contacts = SupportContact.query.filter(
        SupportContact.created_at_zenvia >= start_at,
        SupportContact.created_at_zenvia <= end_at,
    ).all()
    for contact in contacts:
        if not contact.created_at_zenvia:
            continue
        bucket = _group_datetime(contact.created_at_zenvia, group_by)
        row = buckets[bucket]
        row["bucket_date"] = bucket
        row["label"] = _group_label(contact.created_at_zenvia, group_by)
        row["new_contacts"] += 1

    messages = SupportMessage.query.filter(
        SupportMessage.timestamp >= start_at,
        SupportMessage.timestamp <= end_at,
    ).all()
    for message in messages:
        if not message.timestamp:
            continue
        bucket = _group_datetime(message.timestamp, group_by)
        row = buckets[bucket]
        row["bucket_date"] = bucket
        row["label"] = _group_label(message.timestamp, group_by)
        row["interactions"] += 1

    timeline = []
    for bucket in sorted(buckets.keys()):
        row = buckets[bucket]
        timeline.append({
            "label": row["label"],
            "bucket_date": bucket.date().isoformat(),
            "new_conversations": row["new_conversations"],
            "new_contacts": row["new_contacts"],
            "closed_conversations": row["closed_conversations"],
            "interactions": row["interactions"],
            "avg_nps": round(row["nps_sum"] / row["nps_count"], 2) if row["nps_count"] else None,
        })
    return timeline


def _snapshot_rows(start_at: datetime, end_at: datetime, metric_type: str) -> List[SupportMetricSnapshot]:
    return SupportMetricSnapshot.query.filter(
        SupportMetricSnapshot.metric_type == metric_type,
        SupportMetricSnapshot.range_start.isnot(None),
        SupportMetricSnapshot.range_end.isnot(None),
        SupportMetricSnapshot.range_start <= end_at,
        SupportMetricSnapshot.range_end >= start_at,
    ).all()


def get_overview(
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    group_by: str = "day",
) -> Dict[str, Any]:
    start_at, end_at, selected = resolve_window(start_date, end_date, period)
    group_by = group_by if group_by in {"day", "week", "month"} else "day"

    hourly = []
    for row in _snapshot_rows(start_at, end_at, "hourly_response"):
        dims = _load_dimensions(row)
        hourly.append({
            "hour": row.metric_key,
            "day": dims.get("day"),
            "seconds": row.value_float or 0,
            "window_label": row.window_label,
        })

    close_reasons_map: Dict[str, Dict[str, Any]] = {}
    for row in _snapshot_rows(start_at, end_at, "close_reason"):
        dims = _load_dimensions(row)
        item = close_reasons_map.setdefault(row.metric_key, {
            "reason": row.metric_key,
            "contacts": 0,
            "conversations": 0,
            "close_time_weighted": 0.0,
            "close_time_weight": 0.0,
        })
        field_name = dims.get("field", "value")
        if field_name == "close_time_seconds":
            weight = item["conversations"] or 1
            item["close_time_weighted"] += (row.value_float or 0) * weight
            item["close_time_weight"] += weight
        else:
            item[field_name] = (item.get(field_name) or 0) + (row.value_float or 0)

    close_reasons = []
    for item in close_reasons_map.values():
        close_reasons.append({
            "reason": item["reason"],
            "contacts": item["contacts"],
            "conversations": item["conversations"],
            "close_time_seconds": round(item["close_time_weighted"] / item["close_time_weight"], 0) if item["close_time_weight"] else 0,
        })

    timeline = _timeline_for_window(start_at, end_at, group_by)
    daily_series = {
        "new_conversations": [{"label": row["label"], "value": row["new_conversations"]} for row in timeline],
        "new_contacts": [{"label": row["label"], "value": row["new_contacts"]} for row in timeline],
        "closed_conversations": [{"label": row["label"], "value": row["closed_conversations"]} for row in timeline],
        "interactions": [{"label": row["label"], "value": row["interactions"]} for row in timeline],
    }

    return {
        "period": selected,
        "start_date": start_at.date().isoformat(),
        "end_date": end_at.date().isoformat(),
        "group_by": group_by,
        "window_label": f"{start_at.strftime('%d/%m/%Y')} a {end_at.strftime('%d/%m/%Y')}",
        "kpis": get_support_kpis(start_date=start_at.date().isoformat(), end_date=end_at.date().isoformat()),
        "agents": get_agent_performance(start_date=start_at.date().isoformat(), end_date=end_at.date().isoformat()),
        "messages": get_recent_messages(20, start_at=start_at, end_at=end_at),
        "nps_feedbacks": get_nps_feedbacks(start_date=start_at.date().isoformat(), end_date=end_at.date().isoformat(), limit=20),
        "hourly_response": hourly,
        "close_reasons": sorted(close_reasons, key=lambda item: item.get("conversations") or 0, reverse=True),
        "daily_series": daily_series,
        "timeline": timeline,
        "source_health": get_source_health(start_date=start_at.date().isoformat(), end_date=end_at.date().isoformat()),
        "imports": get_import_history(start_date=start_at.date().isoformat(), end_date=end_at.date().isoformat(), limit=5),
    }
