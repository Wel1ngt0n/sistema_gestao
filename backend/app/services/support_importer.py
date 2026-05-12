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
from datetime import datetime
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
            name = normalize_empty(row.get("name")) or normalize_empty(row.get("phone")) or "Desconhecido"
            phone = normalize_empty(row.get("phone"))
            email = normalize_empty(row.get("email"))
            created_at = parse_datetime(row.get("created_at"))
            row_period = period_from_datetime(created_at, period)
            suffix = row_period.replace("-", "")
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

            conv_key = f"{slugify(phone or name)[:58]}_{suffix}"
            conv_id = f"CSV_CONV_{conv_key}"[:100]
            conv = SupportConversation.query.filter_by(zenvia_conversation_id=conv_id).first()
            if not conv:
                conv = SupportConversation(
                    zenvia_conversation_id=conv_id,
                    contact_id=contact.id,
                    channel=normalize_empty(row.get("channel")) or "whatsapp",
                    status="CLOSED",
                    created_at_zenvia=created_at,
                )
                db.session.add(conv)
                db.session.flush()
                stats["conversations_created"] += 1
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
        "errors": 0,
        "months_breakdown": {},
    }
    contact_cache: Dict[str, int] = {}
    conv_cache: Dict[str, int] = {}

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
            if not direction:
                continue

            contact_slug = slugify(contact_name)
            contact_id = contact_cache.get(contact_slug)
            if not contact_id:
                contact = SupportContact.query.filter_by(zenvia_contact_id=f"CSV_CONTACT_{contact_slug}"[:100]).first()
                if not contact:
                    contact = SupportContact(
                        zenvia_contact_id=f"CSV_CONTACT_{contact_slug}"[:100],
                        name=contact_name[:255],
                    )
                    db.session.add(contact)
                    db.session.flush()
                    stats["contacts_created"] += 1
                contact_id = contact.id
                contact_cache[contact_slug] = contact_id

            row_period = period_from_datetime(ts, period)
            suffix = row_period.replace("-", "")
            conv_key = f"{contact_slug[:58]}_{suffix}"
            conv_id = conv_cache.get(conv_key)
            if not conv_id:
                zenvia_conv_id = f"CSV_CONV_{conv_key}"[:100]
                conv = SupportConversation.query.filter_by(zenvia_conversation_id=zenvia_conv_id).first()
                if not conv:
                    conv = SupportConversation(
                        zenvia_conversation_id=zenvia_conv_id,
                        contact_id=contact_id,
                        status="CLOSED",
                        channel="whatsapp",
                        group_id=group_name,
                        created_at_zenvia=ts,
                        agent_name=agent_name,
                    )
                    db.session.add(conv)
                    db.session.flush()
                    stats["conversations_created"] += 1
                else:
                    if agent_name and not conv.agent_name:
                        conv.agent_name = agent_name
                    if ts and (not conv.last_message_at or ts > conv.last_message_at):
                        conv.last_message_at = ts
                conv_id = conv.id
                conv_cache[conv_key] = conv_id

            msg_hash = get_hash(f"{contact_slug}_{ts.isoformat()}_{direction}_{msg_text}")
            zenvia_message_id = f"CSV_MSG_{msg_hash}"[:100]
            if not SupportMessage.query.filter_by(zenvia_message_id=zenvia_message_id).first():
                db.session.add(SupportMessage(
                    zenvia_message_id=zenvia_message_id,
                    conversation_id=conv_id,
                    direction=direction,
                    channel="whatsapp",
                    text=msg_text,
                    timestamp=ts,
                    status="SENT" if direction == "OUT" else "READ",
                ))
                stats["messages_imported"] += 1

            stats["months_breakdown"][row_period] = stats["months_breakdown"].get(row_period, 0) + 1
            if stats["messages_imported"] and stats["messages_imported"] % 1000 == 0:
                db.session.commit()
        except Exception as exc:
            stats["errors"] += 1
            logger.debug("Erro ao importar atividade Zenvia: %s", exc)

    db.session.commit()
    return stats


def import_agent_performance_csv(data: Any, period: Optional[str] = None) -> Dict[str, Any]:
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
            perf = SupportAgentPerformance.query.filter_by(agent_name=name, period=period).first()
            if not perf:
                perf = SupportAgentPerformance(agent_name=name, period=period)
                db.session.add(perf)
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


def import_agents_status_csv(data: Any, period: Optional[str] = None) -> Dict[str, Any]:
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
            perf = SupportAgentPerformance.query.filter_by(agent_name=name, period=period).first()
            if not perf:
                perf = SupportAgentPerformance(agent_name=name, period=period)
                db.session.add(perf)
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


def import_snapshot_csv(data: Any, period: Optional[str], filename: str, csv_type: str) -> Dict[str, Any]:
    df = read_input_data(data)
    if df is None:
        return {"error": "CSV invalido ou ilegivel."}

    period = period or datetime.now().strftime("%Y-%m")
    stats = {"total_rows": len(df), "snapshots": 0, "errors": 0}
    source = filename or csv_type

    try:
        if csv_type == "hourly_response":
            for _, row in df.iterrows():
                day = normalize_empty(row.get("Day")) or "unknown"
                for col in df.columns:
                    if not str(col).endswith("h"):
                        continue
                    seconds = parse_time_to_seconds(row.get(col))
                    upsert_snapshot(period, source, "hourly_response", str(col), {"day": day}, seconds, None)
                    stats["snapshots"] += 1
        elif csv_type == "close_reasons":
            reason_col = "Razão para fechar" if "Razão para fechar" in df.columns else "Razao para fechar"
            for _, row in df.iterrows():
                reason = normalize_empty(row.get(reason_col))
                if not reason:
                    continue
                upsert_snapshot(period, source, "close_reason", reason, {"field": "contacts"}, safe_float(row.get("Total de contatos")), None)
                upsert_snapshot(period, source, "close_reason", reason, {"field": "conversations"}, safe_float(row.get("Conversas")), None)
                upsert_snapshot(period, source, "close_reason", reason, {"field": "close_time_seconds"}, parse_time_to_seconds(row.get("Hora de fechar / HT")), None)
                stats["snapshots"] += 3
        elif csv_type in {"new_conversations_series", "new_contacts_series", "closed_conversations_series", "interactions_series"}:
            metric_type = csv_type.replace("_series", "")
            for col in df.columns:
                value = safe_float(df.iloc[0].get(col)) if len(df) else None
                if value is not None:
                    upsert_snapshot(period, source, metric_type, str(col), {}, value, None)
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


def calculate_agent_nps(period: Optional[str] = None) -> Dict[str, Any]:
    period = period or datetime.now().strftime("%Y-%m")
    start = datetime.strptime(f"{period}-01", "%Y-%m-%d")
    if start.month == 12:
        end = datetime(start.year + 1, 1, 1)
    else:
        end = datetime(start.year, start.month + 1, 1)

    convs = SupportConversation.query.filter(
        SupportConversation.nps_score.isnot(None),
        SupportConversation.agent_name.isnot(None),
        SupportConversation.created_at_zenvia >= start,
        SupportConversation.created_at_zenvia < end,
    ).all()

    scores_by_agent: Dict[str, List[int]] = {}
    for conv in convs:
        agent = normalize_empty(conv.agent_name)
        if agent:
            scores_by_agent.setdefault(agent, []).append(conv.nps_score)

    for agent, scores in scores_by_agent.items():
        perf = SupportAgentPerformance.query.filter_by(agent_name=agent, period=period).first()
        if not perf:
            perf = SupportAgentPerformance(agent_name=agent, period=period)
            db.session.add(perf)
        perf.avg_nps = round(sum(scores) / len(scores), 2)
        perf.nps_count = len(scores)

    db.session.commit()
    return {"agents_with_nps": len(scores_by_agent), "nps_feedbacks": len(convs)}


def _all_uploaded_files(files_map: Any, form: Any) -> Iterable[Tuple[Any, Optional[str]]]:
    for key in files_map:
        for file_obj in files_map.getlist(key):
            explicit = form.get(f"type_{file_obj.filename}") or form.get(f"{key}_type") or key
            yield file_obj, explicit


def import_support_files(files_map: Any, form: Any, period: Optional[str] = None) -> Dict[str, Any]:
    period = period or datetime.now().strftime("%Y-%m")
    batch = SupportImportBatch(period=period, status="processing", started_at=datetime.utcnow())
    db.session.add(batch)
    db.session.commit()

    results = []
    totals = {"rows_total": 0, "rows_imported": 0, "errors_count": 0}

    try:
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

            if hasattr(file_obj, "seek"):
                file_obj.seek(0)

            if csv_type == "conversas":
                stats = enrich_contacts_from_conversations_csv(file_obj, period)
                imported = stats.get("contacts_created", 0) + stats.get("contacts_updated", 0)
            elif csv_type == "activities":
                stats = import_zenvia_activities_csv(file_obj, period)
                imported = stats.get("messages_imported", 0)
            elif csv_type == "performance":
                stats = import_agent_performance_csv(file_obj, period)
                imported = stats.get("agents_imported", 0)
            elif csv_type == "agents":
                stats = import_agents_status_csv(file_obj, period)
                imported = stats.get("agents_updated", 0)
            else:
                stats = import_snapshot_csv(file_obj, period, filename, csv_type)
                imported = stats.get("snapshots", 0)

            results.append({"file": filename, "type": csv_type, "stats": stats})
            totals["rows_total"] += int(stats.get("total_rows", len(df)) or 0)
            totals["rows_imported"] += int(imported or 0)
            totals["errors_count"] += int(stats.get("errors", 0) or (1 if stats.get("error") else 0))

        nps_stats = calculate_agent_nps(period)
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
        return {"status": batch.status, "batch_id": batch.id, "period": period, "results": results}
    except Exception as exc:
        db.session.rollback()
        batch.status = "failed"
        batch.errors_count = totals["errors_count"] + 1
        batch.stats_json = json.dumps({"error": str(exc), "results": results}, ensure_ascii=False)
        batch.finished_at = datetime.utcnow()
        db.session.add(batch)
        db.session.commit()
        raise
