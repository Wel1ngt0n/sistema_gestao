"""
Notification Service — Slack Webhook Integration.
Sends alerts for SLA exceeded, weekly summaries, and goal achievements.
"""
import requests
import json
from datetime import datetime
from app.models import db, SystemConfig, Store


def get_config_value(key, default=""):
    cfg = SystemConfig.query.filter_by(key=key).first()
    return cfg.value if cfg else default


def send_slack_message(text, blocks=None):
    webhook_url = get_config_value("slack_webhook_url")
    if not webhook_url:
        return {"ok": False, "error": "Webhook URL não configurada"}
    
    payload = {"text": text}
    if blocks:
        payload["blocks"] = blocks
    
    try:
        r = requests.post(webhook_url, json=payload, timeout=10)
        return {"ok": r.status_code == 200, "status": r.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def check_sla_alerts():
    """Verifica lojas que ultrapassaram o SLA e envia alerta."""
    if get_config_value("notify_sla_exceeded", "true") != "true":
        return {"sent": False, "reason": "disabled"}
    
    sla_impl = int(get_config_value("sla_implantation_days", "90"))
    
    wip = Store.query.filter(
        Store.status_norm == 'IN_PROGRESS',
        Store.manual_finished_at.is_(None)
    ).all()
    
    over_sla = []
    for s in wip:
        days = s.dias_em_progresso
        if days > sla_impl:
            over_sla.append({
                "name": s.store_name,
                "days": days,
                "implantador": s.implantador or "N/A",
                "exceeded_by": days - sla_impl
            })
    
    if not over_sla:
        return {"sent": False, "reason": "no_alerts", "checked": len(wip)}
    
    over_sla.sort(key=lambda x: -x["exceeded_by"])
    
    lines = [f"🚨 *{len(over_sla)} lojas acima do SLA ({sla_impl} dias)*\n"]
    for s in over_sla[:10]:
        lines.append(f"• *{s['name']}* — {s['days']}d (+{s['exceeded_by']}d) | {s['implantador']}")
    
    if len(over_sla) > 10:
        lines.append(f"\n_...e mais {len(over_sla) - 10} lojas_")
    
    result = send_slack_message("\n".join(lines))
    result["alerts_count"] = len(over_sla)
    return result


def send_weekly_summary():
    """Envia resumo semanal com KPIs do sistema."""
    if get_config_value("notify_weekly_summary", "true") != "true":
        return {"sent": False, "reason": "disabled"}
    
    all_stores = Store.query.all()
    wip = [s for s in all_stores if s.status_norm == 'IN_PROGRESS' and not s.manual_finished_at]
    finished_2026 = [s for s in all_stores if s.effective_finished_at and s.effective_finished_at.year >= 2026]
    
    mrr_target = float(get_config_value("annual_mrr_target", "180000"))
    stores_target = int(get_config_value("annual_stores_target", "180"))
    sla_impl = int(get_config_value("sla_implantation_days", "90"))
    
    ytd_mrr = sum(s.valor_mensalidade or 0 for s in finished_2026)
    ytd_stores = len(finished_2026)
    mrr_pct = round(ytd_mrr / max(mrr_target, 1) * 100, 1)
    stores_pct = round(ytd_stores / max(stores_target, 1) * 100, 1)
    
    over_sla_count = sum(1 for s in wip if s.dias_em_progresso > sla_impl)
    
    now = datetime.now()
    
    text = (
        f"📊 *Resumo Semanal — {now.strftime('%d/%m/%Y')}*\n\n"
        f"*Metas Anuais:*\n"
        f"💰 MRR: R$ {ytd_mrr:,.0f} / R$ {mrr_target:,.0f} ({mrr_pct}%)\n"
        f"🏪 Lojas: {ytd_stores} / {stores_target} ({stores_pct}%)\n\n"
        f"*Operação:*\n"
        f"🔄 Em progresso: {len(wip)} lojas\n"
        f"⚠️ Acima do SLA: {over_sla_count}\n"
    )
    
    result = send_slack_message(text)
    result["summary_type"] = "weekly"
    return result


def check_goal_achievement(month_str=None):
    """Verifica se metas mensais foram batidas e notifica."""
    if get_config_value("notify_goal_achieved", "true") != "true":
        return {"sent": False, "reason": "disabled"}
    
    if not month_str:
        month_str = datetime.now().strftime('%Y-%m')
    
    all_stores = Store.query.all()
    finished_month = [s for s in all_stores 
                      if s.effective_finished_at and s.effective_finished_at.strftime('%Y-%m') == month_str]
    
    mrr_target = float(get_config_value("annual_mrr_target", "180000"))
    stores_target = int(get_config_value("annual_stores_target", "180"))
    
    monthly_mrr_target = mrr_target / 12
    monthly_stores_target = stores_target / 12
    
    month_mrr = sum(s.valor_mensalidade or 0 for s in finished_month)
    month_stores = len(finished_month)
    
    achievements = []
    if month_mrr >= monthly_mrr_target:
        achievements.append(f"💰 MRR mensal: R$ {month_mrr:,.0f} (meta: R$ {monthly_mrr_target:,.0f})")
    if month_stores >= monthly_stores_target:
        achievements.append(f"🏪 Lojas: {month_stores} (meta: {monthly_stores_target:.0f})")
    
    if not achievements:
        return {"sent": False, "reason": "no_achievements"}
    
    text = f"🎉 *Metas batidas em {month_str}!*\n\n" + "\n".join(achievements)
    
    result = send_slack_message(text)
    result["achievements"] = len(achievements)
    return result
