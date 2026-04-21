from flask_apscheduler import APScheduler
import logging
from datetime import datetime

scheduler = APScheduler()
logger = logging.getLogger(__name__)

def init_scheduler(app):
    """Inicializa o agendador com a aplicação Flask."""
    if not app.config.get('SCHEDULER_API_ENABLED'):
        app.config['SCHEDULER_API_ENABLED'] = True
    
    # Prevenir inicialização dupla
    if not scheduler.running:
        scheduler.init_app(app)
        scheduler.start()
        logger.info("⏰ Scheduler iniciado com sucesso.")
    
    # Rodar sync de warm-up (apenas se for o primeiro do dia)
    with app.app_context():
        try:
            from app.models import SyncState, db
            state = SyncState.query.get(1)
            if not state:
                state = SyncState(id=1)
                db.session.add(state)
                db.session.commit()
            
            # Se não sincronizou hoje ainda, rodar um Vital Sync agora
            if not state.last_successful_sync_at or state.last_successful_sync_at.date() < datetime.now().date():
                logger.info("🌅 Primeiro início do dia detectado. Rodando Warm-up Sync...")
                # Agendar para rodar em 5 segundos para não travar o boot
                scheduler.add_job(id='warmup_sync', func=scheduled_vital_sync, trigger='date', run_date=datetime.now())
        except Exception as e:
            logger.error(f"Erro ao verificar warm-up sync: {e}")

@scheduler.task('cron', id='sync_vital_job', hour='10,12,14,16,18', minute=0)
def scheduled_vital_sync():
    """Job para sincronismo vital (rápido) durante o dia."""
    from app.services.sync_service import SyncService
    from app.models import SyncState
    
    # Usar o app context do scheduler
    with scheduler.app.app_context():
        # Proteção contra concorrência
        state = SyncState.query.get(1)
        if state and state.in_progress:
            logger.info("⚠️ Sync já em progresso. Pulando agendamento.")
            return

        logger.info("🚀 Iniciando SYNC VITAL agendado...")
        sync_service = SyncService()
        try:
            for _ in sync_service.run_sync_stream(force_full=False, vital_only=True):
                pass
            logger.info("✅ SYNC VITAL agendado finalizado.")
        except Exception as e:
            logger.error(f"Erro no SYNC VITAL agendado: {e}")

@scheduler.task('cron', id='sync_deep_job', hour=3, minute=0)
def scheduled_deep_sync():
    """Job para sincronismo profundo (pesado) na madrugada."""
    from app.services.sync_service import SyncService
    from app.models import SyncState
    
    with scheduler.app.app_context():
        # Proteção contra concorrência
        state = SyncState.query.get(1)
        if state and state.in_progress:
            logger.info("⚠️ Sync já em progresso. Pulando agendamento.")
            return

        logger.info("🚀 Iniciando SYNC DEEP agendado...")
        sync_service = SyncService()
        try:
            for _ in sync_service.run_sync_stream(force_full=False, vital_only=False):
                pass
            logger.info("✅ SYNC DEEP agendado finalizado.")
        except Exception as e:
            logger.error(f"Erro no SYNC DEEP agendado: {e}")
