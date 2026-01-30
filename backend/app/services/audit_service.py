from app.models import db, ForecastAuditLog, Store
from datetime import datetime

class AuditService:
    @staticmethod
    def log_forecast_change(store_id, field_name, old_value, new_value, actor="local_user"):
        """
        Registra uma alteração no forecast se o valor mudou.
        """
        # Converter para string para comparação segura
        str_old = str(old_value) if old_value is not None else ""
        str_new = str(new_value) if new_value is not None else ""
        
        if str_old == str_new:
            return # Sem mudança real
            
        audit = ForecastAuditLog(
            store_id=store_id,
            field_name=field_name,
            old_value=str_old,
            new_value=str_new,
            changed_at=datetime.now(),
            actor=actor
        )
        db.session.add(audit)
        
    @staticmethod
    def get_store_audit_trail(store_id):
        """
        Retorna histórico de mudanças ordenado por data (recente primeiro).
        """
        logs = ForecastAuditLog.query.filter_by(store_id=store_id)\
            .order_by(ForecastAuditLog.changed_at.desc())\
            .all()
            
        return [{
            "id": l.id,
            "field": l.field_name,
            "old_value": l.old_value,
            "new_value": l.new_value,
            "changed_at": l.changed_at.isoformat(),
            "actor": l.actor
        } for l in logs]
