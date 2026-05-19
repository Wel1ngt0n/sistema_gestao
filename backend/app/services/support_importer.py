"""
Importacao online de CSVs da Zenvia para o modulo de suporte.

Os arquivos sao enviados pelo usuario na tela de suporte. A pasta excel_suporte
serve apenas como amostra de formatos conhecidos; este modulo nao le arquivos do
disco automaticamente.
"""
import hashlib
import json
import logging
import re
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, Iterable, List, Optional, Tuple

import pandas as pd

from app.models import (
    SupportAgentPerformance,
    SupportContact,
    SupportConversation,
    SupportImportBatch,
    SupportMessage,
    SupportMetricSnapshot,
    SystemConfig,
    db,
)

logger = logging.getLogger(__name__)

WINDOW_KEY_SIZE = 7
CONVERSATION_MATCH_GRACE_HOURS = 12


def slugify(text: Any) -> str:
    if text is None:
        return "unknown"
    clean = re.sub(r"\W+", "_", str(text).strip().lower()).strip("_")
    return clean or "unknown"


def get_hash(text: Any) -> str:
    return hashlib.md5(str(text).encode("utf-8")).hexdigest()


def normalize_empty(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "null", "-"}:
        return None
    return text


def safe_int(value: Any, default: int = 0) -> int:
    text = normalize_empty(value)
    if text is None:
        return default
    try:
        return int(float(text.replace(".", "").replace(",", ".")))
    except Exception:
        return default


def safe_float(value: Any) -> Optional[float]:
    text = normalize_empty(value)
    if text is None:
        return None
    text = text.replace("%", "").replace(".", "").replace(",", ".")
    try:
        return float(text)
    except Exception:
        return None


def parse_time_to_seconds(time_str: Any) -> int:
    """
    Converte tempos da Zenvia para segundos.
    Exemplos: "5m 39s", "10h 53m", "27s", "04d 15h".
    """
    text = normalize_empty(time_str)
    if not text or text == "0s":
        return 0

    total = 0
    for amount, unit in re.findall(r"(\d+)\s*([dhms])", text.lower()):
        amount_i = int(amount)
        if unit == "d":
            total += amount_i * 86400
        elif unit == "h":
            total += amount_i * 3600
        elif unit == "m":
            total += amount_i * 60
        elif unit == "s":
            total += amount_i
    return total


def parse_datetime(value: Any) -> Optional[datetime]:
    text = normalize_empty(value)
    if not text:
        return None
    formats = [
        "%d/%m/%Y, %H:%M",
        "%d/%m/%Y %H:%M",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(text, fmt)
        except Exception:
            pass
    try:
        parsed = pd.to_datetime(text, errors="coerce")
        if pd.isna(parsed):
            return None
        return parsed.to_pydatetime()
    except Exception:
        return None


def period_from_datetime(value: Optional[datetime], fallback: Optional[str]) -> str:
    if value:
        return value.strftime("%Y-%m")
    return fallback or datetime.now().strftime("%Y-%m")


def parse_date_input(value: Any) -> Optional[date]:
    text = normalize_empty(value)
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except Exception:
            pass
    parsed = parse_datetime(text)
    return parsed.date() if parsed else None


def normalize_granularity(value: Any) -> str:
    raw = (normalize_empty(value) or "monthly").strip().lower()
    aliases = {
        "day": "daily",
        "daily": "daily",
        "week": "weekly",
        "weekly": "weekly",
        "month": "monthly",
        "monthly": "monthly",
        "custom": "custom",
    }
    return aliases.get(raw, "monthly")


def window_key(granularity: str, start_date: date, end_date: date) -> str:
    raw = f"{granularity}:{start_date.isoformat()}:{end_date.isoformat()}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:WINDOW_KEY_SIZE]


def window_label(granularity: str, start_date: date, end_date: date) -> str:
    start_text = start_date.strftime("%d/%m/%Y")
    end_text = end_date.strftime("%d/%m/%Y")
    if granularity == "daily" and start_date == end_date:
        return start_text
    if granularity == "weekly":
        return f"Semana {start_text} a {end_text}"
    if granularity == "monthly":
        return f"Mes {start_text} a {end_text}"
    return f"{start_text} a {end_text}"


def build_window(form: Any, fallback_period: Optional[str] = None) -> Dict[str, Any]:
    granularity = normalize_granularity(form.get("granularity"))
    start_date = parse_date_input(form.get("start_date"))
    end_date = parse_date_input(form.get("end_date"))
    period = normalize_empty(form.get("period")) or fallback_period

    if period and (not start_date or not end_date):
        try:
            month_start = datetime.strptime(f"{period}-01", "%Y-%m-%d").date()
            if month_start.month == 12:
                month_end = date(month_start.year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = date(month_start.year, month_start.month + 1, 1) - timedelta(days=1)
            start_date = start_date or month_start
            end_date = end_date or month_end
        except Exception:
            pass

    today = datetime.now().date()
    if not start_date and not end_date:
        if granularity == "daily":
            start_date = today
            end_date = today
        elif granularity == "weekly":
            end_date = today
            start_date = today - timedelta(days=6)
        else:
            start_date = today.replace(day=1)
            if start_date.month == 12:
                end_date = date(start_date.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(start_date.year, start_date.month + 1, 1) - timedelta(days=1)

    if start_date and not end_date:
        end_date = start_date
    if end_date and not start_date:
        start_date = end_date

    assert start_date is not None and end_date is not None
    if end_date < start_date:
        start_date, end_date = end_date, start_date

    return {
        "period": window_key(granularity, start_date, end_date),
        "granularity": granularity,
        "start_date": start_date,
        "end_date": end_date,
        "window_label": window_label(granularity, start_date, end_date),
        "start_at": datetime.combine(start_date, time.min),
        "end_at": datetime.combine(end_date, time.max),
    }


def read_input_data(data: Any, required_column: Optional[str] = None) -> Optional[pd.DataFrame]:
    """Le entrada que pode ser um DataFrame ou um arquivo vindo do Flask."""
    if isinstance(data, pd.DataFrame):
        df = data.copy()
    else:
        df = None
        for encoding in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
            try:
                if hasattr(data, "seek"):
                    data.seek(0)
                candidate = pd.read_csv(data, encoding=encoding)
                candidate.columns = [str(c).strip() for c in candidate.columns]
                if required_column and required_column not in candidate.columns:
                    continue
                df = candidate
                break
            except Exception:
                continue

    if df is None:
        return None
    df.columns = [str(c).strip() for c in df.columns]
    return df


def detect_csv_type(filename: str, df: pd.DataFrame, explicit_type: Optional[str] = None) -> str:
    known_types = {
        "conversas", "activities", "performance", "agents", "hourly_response",
        "close_reasons", "close_reasons_trend", "quality", "customer_panel",
        "conversation_panel", "new_conversations_series", "new_contacts_series",
        "closed_conversations_series", "interactions_series", "generic_snapshot",
    }
    if explicit_type and explicit_type in known_types:
        return explicit_type
    if explicit_type == "ignore":
        return "ignore"

    cols = set(df.columns)
    first_col = str(df.columns[0]) if len(df.columns) else ""
    name = (filename or "").lower()

    if {"Data", "Grupo", "Agente", "Cliente", "Detalhes"}.issubset(cols):
        return "activities"
    if {"phone", "name", "created_at", "extra"}.issubset(cols):
        return "conversas"
    if {"Consultor", "Total de contatos", "Conv. totais"}.issubset(cols):
        return "performance"
    if {"Consultor", "Ult. Atividade", "Atendimentos pendentes"}.issubset(cols):
        return "agents"
    if first_col == "Day" and any(c.endswith("h") for c in df.columns):
        return "hourly_response"
    if "Razão para fechar" in cols or "Razao para fechar" in cols:
        return "close_reasons"
    if "motivos de fechamento ao longo do tempo" in first_col.lower():
        return "close_reasons_trend"
    if "média de interações" in first_col.lower() or "media de interacoes" in first_col.lower():
        return "quality"
    if "volume de clientes" in first_col.lower():
        return "customer_panel"
    if "conversas por canal" in first_col.lower():
        return "conversation_panel"
    if "novas conversas" in name:
        return "new_conversations_series"
    if "novos atendimentos" in name:
        return "new_contacts_series"
    if "conversas fechadas" in name:
        return "closed_conversations_series"
    if "intera" in name and "contatos" in name:
        return "interactions_series"
    return "generic_snapshot"


def upsert_snapshot(
    period: str,
    import_batch_id: Optional[int],
    range_start: Optional[datetime],
    range_end: Optional[datetime],
    granularity: Optional[str],
    window_label_value: Optional[str],
    source: str,
    metric_type: str,
    metric_key: str,
    dimensions: Optional[Dict[str, Any]] = None,
    value_float: Optional[float] = None,
    value_text: Optional[str] = None,
) -> None:
    dimensions = dimensions or {}
    dimensions_json = json.dumps(dimensions, ensure_ascii=False, sort_keys=True)
    dimension_hash = get_hash(dimensions_json)
    snap = SupportMetricSnapshot.query.filter_by(
        period=period,
        source=source[:120],
        metric_type=metric_type[:80],
        metric_key=metric_key[:160],
        dimension_hash=dimension_hash,
    ).first()
    if not snap:
        snap = SupportMetricSnapshot(
            period=period,
            source=source[:120],
            metric_type=metric_type[:80],
            metric_key=metric_key[:160],
            dimension_hash=dimension_hash,
        )
        db.session.add(snap)
    snap.import_batch_id = import_batch_id
    snap.range_start = range_start
    snap.range_end = range_end
    snap.granularity = granularity
    snap.window_label = window_label_value
    snap.dimensions_json = dimensions_json
    snap.value_float = value_float
    snap.value_text = value_text
    snap.captured_at = datetime.utcnow()


def _extract_nps(extra_raw: Any) -> Tuple[Optional[int], Optional[str]]:
    extra_text = normalize_empty(extra_raw)
    if not extra_text:
        return None, None
    try:
        clean = extra_text.replace('""', '"')
        if clean.startswith('"') and clean.endswith('"'):
            clean = clean[1:-1]
        payload = json.loads(clean)
    except Exception:
        return None, None

    nps_val = payload.get("nps")
    if nps_val is None:
        return None, None
    nps_text = str(nps_val).strip()
    if nps_text.isdigit() and 0 <= int(nps_text) <= 10:
        return int(nps_text), None
    return None, nps_text if len(nps_text) > 1 else None


def _name_tokens(value: Any) -> List[str]:
    text = normalize_empty(value)
    if not text:
        return []
    normalized = re.sub(r"[^a-z0-9\s]+", " ", text.lower())
    return [token for token in normalized.split() if len(token) >= 3]


def _names_match(left: Any, right: Any) -> bool:
    left_tokens = set(_name_tokens(left))
    right_tokens = set(_name_tokens(right))
    if not left_tokens or not right_tokens:
        return False
    if left_tokens == right_tokens:
        return True
    overlap = left_tokens.intersection(right_tokens)
    return bool(overlap) and (len(overlap) >= min(len(left_tokens), len(right_tokens), 2) or overlap == left_tokens or overlap == right_tokens)


def _find_contact_by_activity_name(contact_name: str) -> Optional[SupportContact]:
    exact = SupportContact.query.filter_by(zenvia_contact_id=f"CSV_CONTACT_{slugify(contact_name)}"[:100]).first()
    if exact:
        return exact

    candidates = SupportContact.query.filter(SupportContact.name.isnot(None)).all()
    for candidate in candidates:
        if _names_match(candidate.name, contact_name):
            return candidate
    return None


def _load_contact_conversations(contact_id: int) -> List[SupportConversation]:
    return SupportConversation.query.filter_by(contact_id=contact_id).order_by(
        SupportConversation.created_at_zenvia.asc(),
        SupportConversation.id.asc(),
    ).all()


def _find_conversation_for_timestamp(conversations: List[SupportConversation], ts: datetime) -> Optional[SupportConversation]:
    eligible = [conv for conv in conversations if conv.created_at_zenvia and conv.created_at_zenvia <= ts]
    if not eligible:
        return None

    active = [
        conv for conv in eligible
        if conv.closed_at is None or conv.closed_at >= ts - timedelta(hours=CONVERSATION_MATCH_GRACE_HOURS)
    ]
    pool = active or eligible
    pool.sort(key=lambda conv: conv.created_at_zenvia or datetime.min, reverse=True)
    return pool[0] if pool else None


def _ensure_fallback_conversation(
    contact: SupportContact,
    ts: datetime,
    agent_name: Optional[str],
    group_name: Optional[str],
) -> SupportConversation:
    slug = slugify(contact.phone or contact.name or str(contact.id))
    conv = SupportConversation(
        zenvia_conversation_id=f"CSV_ACTIVITY_{slug}_{ts.strftime('%Y%m%d%H%M%S')}"[:100],
        contact_id=contact.id,
        channel="whatsapp",
        status="OPEN",
        group_id=group_name,
        created_at_zenvia=ts,
        last_message_at=ts,
        agent_name=agent_name,
    )
    db.session.add(conv)
    db.session.flush()
    return conv


def enrich_contacts_from_conversations_csv(data: Any, period: Optional[str] = None) -> Dict[str, Any]:
    df = read_input_data(data, "phone")
    if df is None:
        return {"error": "Formato de conversas invalido ou coluna 'phone' ausente."}

    stats = {
        "total_rows": len(df),
        "contacts_updated": 0,
        "contacts_created": 0,
        "conversations_created": 0,
        "nps_extracted": 0,
        "errors": 0,
        "months_breakdown": {},
    }

    for _, row in df.iterrows():
        try:
            row_id = normalize_empty(row.get("id"))
            name = normalize_empty(row.get("name")) or normalize_empty(row.get("phone")) or "Desconhecido"
            phone = normalize_empty(row.get("phone"))
            email = normalize_empty(row.get("email"))
            created_at = parse_datetime(row.get("created_at"))
            row_period = period_from_datetime(created_at, period)
            nps_score, nps_comment = _extract_nps(row.get("extra"))

            contact_slug = slugify(phone or name)
            contact = SupportContact.query.filter_by(phone=phone).first() if phone else None
            if not contact:
                contact = SupportContact.query.filter_by(zenvia_contact_id=f"CSV_CONTACT_{contact_slug}").first()

            if contact:
                contact.name = (name or contact.name or "Desconhecido")[:255]
                if phone:
                    contact.phone = phone
                if email:
                    contact.email = email
                if created_at and not contact.created_at_zenvia:
                    contact.created_at_zenvia = created_at
                contact.updated_at = datetime.utcnow()
                stats["contacts_updated"] += 1
            else:
                contact = SupportContact(
                    zenvia_contact_id=f"CSV_CONTACT_{contact_slug}"[:100],
                    name=name[:255],
                    phone=phone,
                    email=email,
                    created_at_zenvia=created_at,
                )
                db.session.add(contact)
                db.session.flush()
                stats["contacts_created"] += 1

            conv_key = row_id or f"{slugify(phone or name)[:58]}_{created_at.strftime('%Y%m%d%H%M%S') if created_at else row_period.replace('-', '')}"
            conv_id = f"CSV_CONV_{conv_key}"[:100]
            conv = SupportConversation.query.filter_by(zenvia_conversation_id=conv_id).first()
            if not conv:
                conv = SupportConversation(
                    zenvia_conversation_id=conv_id,
                    contact_id=contact.id,
                    channel=normalize_empty(row.get("channel")) or "whatsapp",
                    status="OPEN",
                    created_at_zenvia=created_at,
                    last_message_at=created_at,
                )
                db.session.add(conv)
                db.session.flush()
                stats["conversations_created"] += 1
            elif created_at and (not conv.last_message_at or created_at > conv.last_message_at):
                conv.last_message_at = created_at
            if nps_score is not None:
                conv.nps_score = nps_score
                stats["nps_extracted"] += 1
            if nps_comment and (not conv.nps_comment or len(nps_comment) > len(conv.nps_comment)):
                conv.nps_comment = nps_comment

            stats["months_breakdown"][row_period] = stats["months_breakdown"].get(row_period, 0) + 1
            if (stats["contacts_created"] + stats["contacts_updated"]) % 500 == 0:
                db.session.commit()
        except Exception as exc:
            stats["errors"] += 1
            logger.debug("Erro ao enriquecer contato de suporte: %s", exc)

    db.session.commit()
    return stats


def import_zenvia_activities_csv(data: Any, period: Optional[str] = None) -> Dict[str, Any]:
    df = read_input_data(data, "Cliente")
    if df is None:
        return {"error": "Formato de atividades invalido ou coluna 'Cliente' ausente."}

    stats = {
        "total_rows": len(df),
        "messages_imported": 0,
        "contacts_created": 0,
        "conversations_created": 0,
        "conversations_closed": 0,
        "agent_links": 0,
        "errors": 0,
        "months_breakdown": {},
    }
    contact_cache: Dict[str, SupportContact] = {}
    conv_cache: Dict[int, List[SupportConversation]] = {}

    for _, row in df.iterrows():
        try:
            ts = parse_datetime(row.get("Data"))
            contact_name = normalize_empty(row.get("Cliente"))
            agent_name = normalize_empty(row.get("Agente"))
            group_name = normalize_empty(row.get("Grupo"))
            details = normalize_empty(row.get("Detalhes"))
            if not ts or not contact_name or not details:
                continue

            direction = None
            msg_text = details
            if details.startswith("WhatsApp recebido:"):
                direction = "IN"
                msg_text = details.replace("WhatsApp recebido:", "", 1).strip()
            elif details.startswith("WhatsApp enviado:"):
                direction = "OUT"
                msg_text = details.replace("WhatsApp enviado:", "", 1).strip()
                parts = msg_text.split(":", 1)
                if len(parts) > 1 and len(parts[0]) < 35:
                    msg_text = parts[1].strip()

            contact_slug = slugify(contact_name)
            contact = contact_cache.get(contact_slug)
            if not contact:
                contact = _find_contact_by_activity_name(contact_name)
                if not contact:
                    contact = SupportContact(
                        zenvia_contact_id=f"CSV_CONTACT_{contact_slug}"[:100],
                        name=contact_name[:255],
                    )
                    db.session.add(contact)
                    db.session.flush()
                    stats["contacts_created"] += 1
                contact.updated_at = datetime.utcnow()
                contact_cache[contact_slug] = contact

            conversations = conv_cache.get(contact.id)
            if conversations is None:
                conversations = _load_contact_conversations(contact.id)
                conv_cache[contact.id] = conversations

            conv = _find_conversation_for_timestamp(conversations, ts)
            if not conv:
                conv = _ensure_fallback_conversation(contact, ts, agent_name, group_name)
                conversations.append(conv)
                conversations.sort(key=lambda item: (item.created_at_zenvia or datetime.min, item.id))
                stats["conversations_created"] += 1

            if group_name and not conv.group_id:
                conv.group_id = group_name

            if direction:
                if agent_name and direction == "OUT":
                    conv.agent_name = agent_name
                if ts and (not conv.last_message_at or ts > conv.last_message_at):
                    conv.last_message_at = ts
                if direction == "OUT" and conv.first_response_at is None:
                    conv.first_response_at = ts
                    if conv.created_at_zenvia:
                        conv.response_time_seconds = max(int((ts - conv.created_at_zenvia).total_seconds()), 0)
                msg_hash = get_hash(f"{contact_slug}_{ts.isoformat()}_{direction}_{msg_text}")
                zenvia_message_id = f"CSV_MSG_{msg_hash}"[:100]
                if not SupportMessage.query.filter_by(zenvia_message_id=zenvia_message_id).first():
                    db.session.add(SupportMessage(
                        zenvia_message_id=zenvia_message_id,
                        conversation_id=conv.id,
                        direction=direction,
                        channel="whatsapp",
                        text=msg_text,
                        timestamp=ts,
                        status="SENT" if direction == "OUT" else "READ",
                    ))
                    stats["messages_imported"] += 1
            elif "Contato transferido para" in details or "Contato atribuído a agente" in details:
                if agent_name:
                    conv.agent_name = agent_name
                    stats["agent_links"] += 1
            elif details == "Arquivou o cliente":
                conv.status = "CLOSED"
                conv.closed_at = ts
                conv.last_message_at = ts if not conv.last_message_at or ts > conv.last_message_at else conv.last_message_at
                if agent_name:
                    conv.agent_name = agent_name
                if conv.created_at_zenvia:
                    conv.resolution_time_seconds = max(int((ts - conv.created_at_zenvia).total_seconds()), 0)
                stats["conversations_closed"] += 1
            elif details == "Desarquivou o cliente":
                conv.status = "OPEN"
                conv.closed_at = None
                if agent_name:
                    conv.agent_name = agent_name

            row_period = period_from_datetime(ts, period)
            stats["months_breakdown"][row_period] = stats["months_breakdown"].get(row_period, 0) + 1
            if stats["messages_imported"] and stats["messages_imported"] % 1000 == 0:
                db.session.commit()
        except Exception as exc:
            stats["errors"] += 1
            logger.debug("Erro ao importar atividade Zenvia: %s", exc)

    db.session.commit()
    return stats


def import_agent_performance_csv(
    data: Any,
    period: Optional[str] = None,
    batch: Optional[SupportImportBatch] = None,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    granularity: Optional[str] = None,
    window_label_value: Optional[str] = None,
) -> Dict[str, Any]:
    df = read_input_data(data, "Consultor")
    if df is None:
        return {"error": "Formato de performance invalido ou coluna 'Consultor' ausente."}
    period = period or datetime.now().strftime("%Y-%m")
    stats = {"total_rows": len(df), "agents_imported": 0, "errors": 0}

    for _, row in df.iterrows():
        try:
            name = normalize_empty(row.get("Consultor"))
            if not name or name.upper() == "TOTAL":
                continue
            query = SupportAgentPerformance.query.filter_by(agent_name=name, period=period)
            if batch:
                query = query.filter_by(import_batch_id=batch.id)
            perf = query.first()
            if not perf:
                perf = SupportAgentPerformance(
                    agent_name=name,
                    period=period,
                    import_batch_id=batch.id if batch else None,
                    range_start=start_at,
                    range_end=end_at,
                    granularity=granularity,
                    window_label=window_label_value,
                )
                db.session.add(perf)
            else:
                perf.import_batch_id = batch.id if batch else perf.import_batch_id
                perf.range_start = start_at
                perf.range_end = end_at
                perf.granularity = granularity
                perf.window_label = window_label_value
            perf.group_name = normalize_empty(row.get("Grupo")) or perf.group_name or "Suporte N1"
            perf.total_contacts = safe_int(row.get("Total de contatos"))
            perf.total_conversations = safe_int(row.get("Conv. totais"))
            perf.new_conversations = safe_int(row.get("Novas converas", row.get("Novas conversas")))
            perf.closed_conversations = safe_int(row.get("Conv. fechadas"))
            perf.avg_close_time_seconds = parse_time_to_seconds(row.get("Fecha em"))
            perf.avg_response_time_seconds = parse_time_to_seconds(row.get("Responde em"))
            perf.total_messages_sent = safe_int(row.get("Mensagens enviadas"))
            stats["agents_imported"] += 1
        except Exception as exc:
            stats["errors"] += 1
            logger.debug("Erro ao importar performance de agente: %s", exc)
    db.session.commit()
    return stats


def import_agents_status_csv(
    data: Any,
    period: Optional[str] = None,
    batch: Optional[SupportImportBatch] = None,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    granularity: Optional[str] = None,
    window_label_value: Optional[str] = None,
) -> Dict[str, Any]:
    df = read_input_data(data, "Consultor")
    if df is None:
        return {"error": "Formato de agentes invalido ou coluna 'Consultor' ausente."}
    period = period or datetime.now().strftime("%Y-%m")
    stats = {"total_rows": len(df), "agents_updated": 0, "errors": 0}

    for _, row in df.iterrows():
        try:
            name = normalize_empty(row.get("Consultor"))
            if not name:
                continue
            query = SupportAgentPerformance.query.filter_by(agent_name=name, period=period)
            if batch:
                query = query.filter_by(import_batch_id=batch.id)
            perf = query.first()
            if not perf:
                perf = SupportAgentPerformance(
                    agent_name=name,
                    period=period,
                    import_batch_id=batch.id if batch else None,
                    range_start=start_at,
                    range_end=end_at,
                    granularity=granularity,
                    window_label=window_label_value,
                )
                db.session.add(perf)
            else:
                perf.import_batch_id = batch.id if batch else perf.import_batch_id
                perf.range_start = start_at
                perf.range_end = end_at
                perf.granularity = granularity
                perf.window_label = window_label_value
            perf.last_activity_at = parse_datetime(row.get("Ult. Atividade"))
            perf.activities_today = safe_int(row.get("Ativ. realizadas hoje"))
            perf.pending_tickets = safe_int(row.get("Atendimentos pendentes"))
            perf.open_tickets = safe_int(row.get("Atendimentos abertos"))
            stats["agents_updated"] += 1
        except Exception as exc:
            stats["errors"] += 1
            logger.debug("Erro ao importar status de agente: %s", exc)
    db.session.commit()
    return stats


def import_snapshot_csv(
    data: Any,
    period: Optional[str],
    filename: str,
    csv_type: str,
    batch: Optional[SupportImportBatch] = None,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    granularity: Optional[str] = None,
    window_label_value: Optional[str] = None,
) -> Dict[str, Any]:
    df = read_input_data(data)
    if df is None:
        return {"error": "CSV invalido ou ilegivel."}

    period = period or datetime.now().strftime("%Y-%m")
    stats = {"total_rows": len(df), "snapshots": 0, "errors": 0}
    source = filename or csv_type
    batch_id = batch.id if batch else None

    try:
        if csv_type == "hourly_response":
            for _, row in df.iterrows():
                day = normalize_empty(row.get("Day")) or "unknown"
                for col in df.columns:
                    if not str(col).endswith("h"):
                        continue
                    seconds = parse_time_to_seconds(row.get(col))
                    upsert_snapshot(period, batch_id, start_at, end_at, granularity, window_label_value, source, "hourly_response", str(col), {"day": day}, seconds, None)
                    stats["snapshots"] += 1
        elif csv_type == "close_reasons":
            reason_col = "Razão para fechar" if "Razão para fechar" in df.columns else "Razao para fechar"
            for _, row in df.iterrows():
                reason = normalize_empty(row.get(reason_col))
                if not reason:
                    continue
                upsert_snapshot(period, batch_id, start_at, end_at, granularity, window_label_value, source, "close_reason", reason, {"field": "contacts"}, safe_float(row.get("Total de contatos")), None)
                upsert_snapshot(period, batch_id, start_at, end_at, granularity, window_label_value, source, "close_reason", reason, {"field": "conversations"}, safe_float(row.get("Conversas")), None)
                upsert_snapshot(period, batch_id, start_at, end_at, granularity, window_label_value, source, "close_reason", reason, {"field": "close_time_seconds"}, parse_time_to_seconds(row.get("Hora de fechar / HT")), None)
                stats["snapshots"] += 3
        elif csv_type in {"new_conversations_series", "new_contacts_series", "closed_conversations_series", "interactions_series"}:
            metric_type = csv_type.replace("_series", "")
            for col in df.columns:
                value = safe_float(df.iloc[0].get(col)) if len(df) else None
                if value is not None:
                    upsert_snapshot(period, batch_id, start_at, end_at, granularity, window_label_value, source, metric_type, str(col), {}, value, None)
                    stats["snapshots"] += 1
        else:
            # Snapshot generico para paineis exportados em formato cruzado.
            for row_index, row in df.iterrows():
                for col in df.columns:
                    raw = normalize_empty(row.get(col))
                    if raw is None:
                        continue
                    numeric = safe_float(raw)
                    upsert_snapshot(
                        period,
                        batch_id,
                        start_at,
                        end_at,
                        granularity,
                        window_label_value,
                        source,
                        csv_type,
                        str(col),
                        {"row": int(row_index), "first_column": str(df.columns[0])},
                        numeric,
                        None if numeric is not None else raw,
                    )
                    stats["snapshots"] += 1
    except Exception as exc:
        stats["errors"] += 1
        logger.debug("Erro ao importar snapshot %s: %s", csv_type, exc)

    db.session.commit()
    return stats


def calculate_agent_nps(
    period: Optional[str] = None,
    batch: Optional[SupportImportBatch] = None,
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    granularity: Optional[str] = None,
    window_label_value: Optional[str] = None,
) -> Dict[str, Any]:
    if not start_at or not end_at:
        period = period or datetime.now().strftime("%Y-%m")
        start_at = datetime.strptime(f"{period}-01", "%Y-%m-%d")
        if start_at.month == 12:
            end_at = datetime(start_at.year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end_at = datetime(start_at.year, start_at.month + 1, 1) - timedelta(seconds=1)

    convs = SupportConversation.query.filter(
        SupportConversation.nps_score.isnot(None),
        SupportConversation.agent_name.isnot(None),
        SupportConversation.created_at_zenvia >= start_at,
        SupportConversation.created_at_zenvia <= end_at,
    ).all()

    scores_by_agent: Dict[str, List[int]] = {}
    for conv in convs:
        agent = normalize_empty(conv.agent_name)
        if agent:
            scores_by_agent.setdefault(agent, []).append(conv.nps_score)

    for agent, scores in scores_by_agent.items():
        query = SupportAgentPerformance.query.filter_by(agent_name=agent, period=period)
        if batch:
            query = query.filter_by(import_batch_id=batch.id)
        perf = query.first()
        if not perf:
            perf = SupportAgentPerformance(
                agent_name=agent,
                period=period,
                import_batch_id=batch.id if batch else None,
                range_start=start_at,
                range_end=end_at,
                granularity=granularity,
                window_label=window_label_value,
            )
            db.session.add(perf)
        perf.avg_nps = round(sum(scores) / len(scores), 2)
        perf.nps_count = len(scores)

    db.session.commit()
    return {"agents_with_nps": len(scores_by_agent), "nps_feedbacks": len(convs)}


def _all_uploaded_files(files_map: Any, form: Any) -> Iterable[Tuple[Any, Optional[str]]]:
    priority = {
        "conversas": 0,
        "activities": 1,
        "performance": 2,
        "agents": 3,
    }
    items: List[Tuple[int, int, Any, Optional[str]]] = []
    order = 0
    for key in files_map:
        for file_obj in files_map.getlist(key):
            explicit = form.get(f"type_{file_obj.filename}") or form.get(f"{key}_type") or key
            detected_priority = priority.get(str(explicit), 10)
            items.append((detected_priority, order, file_obj, explicit))
            order += 1
    items.sort(key=lambda item: (item[0], item[1]))
    for _, _, file_obj, explicit in items:
        yield file_obj, explicit


def import_support_files(files_map: Any, form: Any, period: Optional[str] = None) -> Dict[str, Any]:
    window = build_window(form, period)
    period = window["period"]
    batch = SupportImportBatch(
        period=period,
        range_start=window["start_at"],
        range_end=window["end_at"],
        granularity=window["granularity"],
        window_label=window["window_label"],
        status="processing",
        started_at=datetime.utcnow(),
    )
    db.session.add(batch)
    db.session.commit()

    results = []
    totals = {"rows_total": 0, "rows_imported": 0, "errors_count": 0}

    try:
        prepared_files = []
        type_priority = {
            "conversas": 0,
            "activities": 1,
            "performance": 2,
            "agents": 3,
        }

        for file_obj, explicit_type in _all_uploaded_files(files_map, form):
            df = read_input_data(file_obj)
            filename = getattr(file_obj, "filename", "arquivo.csv")
            if df is None:
                result = {"file": filename, "type": "unknown", "stats": {"error": "CSV invalido ou ilegivel.", "errors": 1}}
                results.append(result)
                totals["errors_count"] += 1
                continue

            csv_type = detect_csv_type(filename, df, explicit_type)
            if csv_type == "ignore":
                continue

            prepared_files.append((type_priority.get(csv_type, 10), file_obj, filename, csv_type, df))

        prepared_files.sort(key=lambda item: item[0])

        for _, file_obj, filename, csv_type, df in prepared_files:
            if hasattr(file_obj, "seek"):
                file_obj.seek(0)

            if csv_type == "conversas":
                stats = enrich_contacts_from_conversations_csv(file_obj, period)
                imported = stats.get("contacts_created", 0) + stats.get("contacts_updated", 0)
            elif csv_type == "activities":
                stats = import_zenvia_activities_csv(file_obj, period)
                imported = stats.get("messages_imported", 0)
            elif csv_type == "performance":
                stats = import_agent_performance_csv(
                    file_obj,
                    period,
                    batch=batch,
                    start_at=window["start_at"],
                    end_at=window["end_at"],
                    granularity=window["granularity"],
                    window_label_value=window["window_label"],
                )
                imported = stats.get("agents_imported", 0)
            elif csv_type == "agents":
                stats = import_agents_status_csv(
                    file_obj,
                    period,
                    batch=batch,
                    start_at=window["start_at"],
                    end_at=window["end_at"],
                    granularity=window["granularity"],
                    window_label_value=window["window_label"],
                )
                imported = stats.get("agents_updated", 0)
            else:
                stats = import_snapshot_csv(
                    file_obj,
                    period,
                    filename,
                    csv_type,
                    batch=batch,
                    start_at=window["start_at"],
                    end_at=window["end_at"],
                    granularity=window["granularity"],
                    window_label_value=window["window_label"],
                )
                imported = stats.get("snapshots", 0)

            results.append({"file": filename, "type": csv_type, "stats": stats})
            totals["rows_total"] += int(stats.get("total_rows", len(df)) or 0)
            totals["rows_imported"] += int(imported or 0)
            totals["errors_count"] += int(stats.get("errors", 0) or (1 if stats.get("error") else 0))

        nps_stats = calculate_agent_nps(
            period,
            batch=batch,
            start_at=window["start_at"],
            end_at=window["end_at"],
            granularity=window["granularity"],
            window_label_value=window["window_label"],
        )
        results.append({"file": "NPS Calculation", "type": "nps_calculation", "stats": nps_stats})

        batch.status = "success" if totals["errors_count"] == 0 else "partial"
        batch.files_count = len([r for r in results if r["type"] != "nps_calculation"])
        batch.rows_total = totals["rows_total"]
        batch.rows_imported = totals["rows_imported"]
        batch.errors_count = totals["errors_count"]
        batch.stats_json = json.dumps(results, ensure_ascii=False)
        batch.finished_at = datetime.utcnow()

        sync_time = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        config = SystemConfig.query.filter_by(key="last_support_import").first()
        if config:
            config.value = sync_time
        else:
            db.session.add(SystemConfig(
                key="last_support_import",
                value=sync_time,
                category="import",
                description="Ultima importacao de CSV de suporte pelo sistema online",
            ))
        db.session.commit()
        return {
            "status": batch.status,
            "batch_id": batch.id,
            "period": period,
            "granularity": window["granularity"],
            "start_date": window["start_date"].isoformat(),
            "end_date": window["end_date"].isoformat(),
            "window_label": window["window_label"],
            "results": results,
        }
    except Exception as exc:
        db.session.rollback()
        batch.status = "failed"
        batch.errors_count = totals["errors_count"] + 1
        batch.stats_json = json.dumps({"error": str(exc), "results": results}, ensure_ascii=False)
        batch.finished_at = datetime.utcnow()
        db.session.add(batch)
        db.session.commit()
        raise
