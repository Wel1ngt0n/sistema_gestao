"""
Slack notification service for operational alerts.

The service is intentionally database-backed through SystemConfig so it can run
both from authenticated manual routes and scheduler jobs without adding a new
notification table in this iteration.
"""
from datetime import datetime
import json
import re

import requests

from app.models import db, SystemConfig, Store


def get_config_value(key, default=""):
    cfg = SystemConfig.query.filter_by(key=key).first()
    return cfg.value if cfg and cfg.value is not None else default


def set_config_value(key, value, description=None, category="notifications"):
    cfg = SystemConfig.query.filter_by(key=key).first()
    if not cfg:
        cfg = SystemConfig(
            key=key,
            value=str(value),
            description=description or key,
            category=category,
        )
        db.session.add(cfg)
    else:
        cfg.value = str(value)
        if description and not cfg.description:
            cfg.description = description
        if not cfg.category:
            cfg.category = category
    db.session.commit()


def is_enabled(key, default="true"):
    return str(get_config_value(key, default)).strip().lower() in {"true", "1", "yes", "sim", "on"}


def safe_int(key, default):
    try:
        return int(float(get_config_value(key, str(default))))
    except (TypeError, ValueError):
        return default


def safe_float(key, default):
    try:
        return float(get_config_value(key, str(default)))
    except (TypeError, ValueError):
        return default


def format_money(value):
    return f"R$ {value:,.0f}".replace(",", ".")


def normalize_name(value):
    return re.sub(r"\s+", " ", str(value or "").strip()).lower()


def parse_slack_mentions():
    raw = get_config_value("slack_user_mentions", "{}")
    if not raw:
        return {}

    mapping = {}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            mapping = data
    except json.JSONDecodeError:
        # Fallback friendly format:
        # Nome Sobrenome=U123ABC
        # Outro Nome: U456DEF
        for line in raw.splitlines():
            if "=" in line:
                name, slack_id = line.split("=", 1)
            elif ":" in line:
                name, slack_id = line.split(":", 1)
            else:
                continue
            mapping[name.strip()] = slack_id.strip()

    return {
        normalize_name(name): str(slack_id).strip().strip("<@>")
        for name, slack_id in mapping.items()
        if str(name).strip() and str(slack_id).strip()
    }


def slack_mention_for(owner_name):
    slack_id = parse_slack_mentions().get(normalize_name(owner_name))
    if not slack_id:
        return owner_name or "Sem responsavel"
    return f"<@{slack_id}>"


def send_slack_message(text, blocks=None):
    webhook_url = get_config_value("slack_webhook_url")
    if not webhook_url:
        return {"ok": False, "sent": False, "error": "Webhook URL do Slack nao configurada"}

    if not webhook_url.startswith("https://"):
        return {"ok": False, "sent": False, "error": "Webhook URL do Slack deve usar HTTPS"}

    payload = {"text": text}
    if blocks:
        payload["blocks"] = blocks

    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        ok = 200 <= response.status_code < 300
        return {
            "ok": ok,
            "sent": ok,
            "status": response.status_code,
            "error": None if ok else response.text[:300],
        }
    except requests.RequestException as exc:
        return {"ok": False, "sent": False, "error": str(exc)}


def _store_line(store, sla_days):
    days = store.dias_em_progresso
    exceeded_by = max(0, days - sla_days)
    owner = store.implantador or store.implantador_atual or "Sem responsavel"
    return f"- *{store.store_name}* | {days}d (+{exceeded_by}d) | {slack_mention_for(owner)}"


def _wip_stores():
    return Store.query.filter(
        Store.status_norm == "IN_PROGRESS",
        Store.manual_finished_at.is_(None),
    ).all()


def check_sla_alerts(force=False):
    """Checks active stores and sends Slack alert for SLA risk/exceeded."""
    if not is_enabled("notify_sla_exceeded", "true"):
        return {"ok": True, "sent": False, "reason": "disabled"}

    today_key = datetime.now().strftime("%Y-%m-%d")
    if not force and get_config_value("notify_sla_last_sent_date") == today_key:
        return {"ok": True, "sent": False, "reason": "already_sent_today"}

    sla_days = safe_int("sla_implantation_days", 90)
    warning_days = safe_int("sla_warning_days", 7)
    stores = _wip_stores()

    over_sla = [store for store in stores if store.dias_em_progresso > sla_days]
    warning_from = max(0, sla_days - warning_days)
    at_risk = [
        store for store in stores
        if warning_from <= store.dias_em_progresso <= sla_days
    ]

    if not over_sla and not at_risk:
        return {"ok": True, "sent": False, "reason": "no_alerts", "checked": len(stores)}

    over_sla.sort(key=lambda store: store.dias_em_progresso, reverse=True)
    at_risk.sort(key=lambda store: store.dias_em_progresso, reverse=True)

    lines = [
        f"*Alerta de SLA de Implantacao*",
        f"SLA configurado: {sla_days} dias | janela de aviso: {warning_days} dias",
        "",
        f"*Acima do SLA ({len(over_sla)}):*",
    ]
    lines.extend(_store_line(store, sla_days) for store in over_sla[:10])
    if len(over_sla) > 10:
        lines.append(f"- ...e mais {len(over_sla) - 10} lojas acima do SLA")

    if at_risk:
        lines.extend(["", f"*Em risco ({len(at_risk)}):*"])
        lines.extend(_store_line(store, sla_days) for store in at_risk[:8])
        if len(at_risk) > 8:
            lines.append(f"- ...e mais {len(at_risk) - 8} lojas em risco")

    result = send_slack_message("\n".join(lines))
    result.update({
        "alerts_count": len(over_sla),
        "risk_count": len(at_risk),
        "checked": len(stores),
    })
    if result.get("ok"):
        set_config_value(
            "notify_sla_last_sent_date",
            today_key,
            "Ultima data em que o alerta de SLA foi enviado",
        )
    return result


def send_weekly_summary(force=False):
    """Sends weekly operational summary to Slack."""
    if not is_enabled("notify_weekly_summary", "true"):
        return {"ok": True, "sent": False, "reason": "disabled"}

    now = datetime.now()
    week_key = f"{now.isocalendar().year}-W{now.isocalendar().week:02d}"
    if not force and get_config_value("notify_weekly_summary_last_sent_week") == week_key:
        return {"ok": True, "sent": False, "reason": "already_sent_this_week"}

    all_stores = Store.query.all()
    wip = [store for store in all_stores if store.status_norm == "IN_PROGRESS" and not store.manual_finished_at]
    finished_year = [
        store for store in all_stores
        if store.effective_finished_at and store.effective_finished_at.year == now.year
    ]
    finished_month = [
        store for store in finished_year
        if store.effective_finished_at and store.effective_finished_at.strftime("%Y-%m") == now.strftime("%Y-%m")
    ]

    mrr_target = safe_float("annual_mrr_target", 180000)
    stores_target = safe_int("annual_stores_target", 180)
    sla_days = safe_int("sla_implantation_days", 90)
    ytd_mrr = sum(store.valor_mensalidade or 0 for store in finished_year)
    ytd_stores = len(finished_year)
    over_sla_count = sum(1 for store in wip if store.dias_em_progresso > sla_days)

    mrr_pct = round(ytd_mrr / max(mrr_target, 1) * 100, 1)
    stores_pct = round(ytd_stores / max(stores_target, 1) * 100, 1)

    text = "\n".join([
        f"*Resumo semanal - {now.strftime('%d/%m/%Y')}*",
        "",
        "*Metas anuais:*",
        f"- MRR: {format_money(ytd_mrr)} / {format_money(mrr_target)} ({mrr_pct}%)",
        f"- Lojas: {ytd_stores} / {stores_target} ({stores_pct}%)",
        "",
        "*Operacao:*",
        f"- Em progresso: {len(wip)} lojas",
        f"- Concluidas no mes: {len(finished_month)}",
        f"- Acima do SLA: {over_sla_count}",
    ])

    result = send_slack_message(text)
    result.update({
        "summary_type": "weekly",
        "week": week_key,
        "wip": len(wip),
        "finished_month": len(finished_month),
        "over_sla": over_sla_count,
    })
    if result.get("ok"):
        set_config_value(
            "notify_weekly_summary_last_sent_week",
            week_key,
            "Ultima semana em que o resumo semanal foi enviado",
        )
    return result


def check_goal_achievement(month_str=None, force=False):
    """Sends Slack notification when monthly goals are reached."""
    if not is_enabled("notify_goal_achieved", "true"):
        return {"ok": True, "sent": False, "reason": "disabled"}

    if not month_str:
        month_str = datetime.now().strftime("%Y-%m")

    if not force and get_config_value("notify_goal_last_sent_month") == month_str:
        return {"ok": True, "sent": False, "reason": "already_sent_this_month"}

    all_stores = Store.query.all()
    finished_month = [
        store for store in all_stores
        if store.effective_finished_at and store.effective_finished_at.strftime("%Y-%m") == month_str
    ]

    mrr_target = safe_float("annual_mrr_target", 180000) / 12
    stores_target = safe_int("annual_stores_target", 180) / 12
    month_mrr = sum(store.valor_mensalidade or 0 for store in finished_month)
    month_stores = len(finished_month)

    achievements = []
    if month_mrr >= mrr_target:
        achievements.append(f"- MRR mensal: {format_money(month_mrr)} (meta: {format_money(mrr_target)})")
    if month_stores >= stores_target:
        achievements.append(f"- Lojas entregues: {month_stores} (meta: {stores_target:.0f})")

    if not achievements:
        return {
            "ok": True,
            "sent": False,
            "reason": "no_achievements",
            "month": month_str,
            "month_mrr": month_mrr,
            "month_stores": month_stores,
        }

    text = "\n".join([
        f"*Metas batidas em {month_str}*",
        "",
        *achievements,
    ])

    result = send_slack_message(text)
    result.update({
        "achievements": len(achievements),
        "month": month_str,
        "month_mrr": month_mrr,
        "month_stores": month_stores,
    })
    if result.get("ok"):
        set_config_value(
            "notify_goal_last_sent_month",
            month_str,
            "Ultimo mes em que alerta de meta foi enviado",
        )
    return result
