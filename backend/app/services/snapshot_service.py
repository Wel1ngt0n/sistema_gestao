from datetime import date, datetime
from app.models import db, Store, MetricsSnapshotDaily, SystemConfig
from sqlalchemy.exc import IntegrityError

class SnapshotService:
    @staticmethod
    def generate_daily_snapshot(target_date=None):
        """
        Gera um snapshot das métricas de TODAS as lojas ativas no dia.
        Se já existir snapshot para loja/data, atualiza.
        """
        if not target_date:
            target_date = date.today()

        print(f"[Snapshot] Iniciando snapshot para {target_date}...")
        
        # 1. Buscar todas as lojas para "fotografar"
        # Incluímos DONE também? Sim, para ter histórico de quando estava DONE.
        # Mas o foco principal é o WIP. Vamos pegar todas por segurança e permitir filtro depois.
        stores = Store.query.all()
        
        count_created = 0
        count_updated = 0
        
        for s in stores:
            # Calcular métricas 'on the fly' para congelar
            risk_score = (s.dias_em_progresso or 0) + (2 * (s.idle_days or 0))
            if s.financeiro_status == 'Devendo': risk_score += 15
            if s.teve_retrabalho: risk_score += 10
            
            # Pesos para cálculo de pontos
            # (Poderíamos cachear a config fora do loop, mas ok para job background)
            # Simplificação: assumir valores padrão se não carregar config
            w_matriz = 1.0
            w_filial = 0.7
            if s.tipo_loja == 'Matriz': points = w_matriz
            else: points = w_filial # Default Filial
            
            # Tentar buscar existente
            snapshot = MetricsSnapshotDaily.query.filter_by(
                snapshot_date=target_date, 
                store_id=s.id
            ).first()
            
            is_new = False
            if not snapshot:
                snapshot = MetricsSnapshotDaily(snapshot_date=target_date, store_id=s.id)
                is_new = True
            
            # Popular dados
            snapshot.implantador = s.implantador
            snapshot.rede = s.rede
            snapshot.status_norm = s.status_norm
            snapshot.days_in_stage = s.dias_em_progresso or 0
            snapshot.idle_days = s.idle_days
            snapshot.wip_points = points if s.status_norm == 'IN_PROGRESS' else 0.0
            snapshot.mrr = s.valor_mensalidade or 0.0
            snapshot.risk_score = risk_score
            
            if is_new:
                db.session.add(snapshot)
                count_created += 1
            else:
                count_updated += 1
        
        try:
            db.session.commit()
            print(f"[Snapshot] Sucesso! Criados: {count_created}, Atualizados: {count_updated}")
            return True
        except Exception as e:
            db.session.rollback()
            print(f"[Snapshot] Erro ao salvar: {str(e)}")
            return False
