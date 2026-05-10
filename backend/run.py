import sys
import argparse
import logging
from app import create_app, db
from app.services.sync_service import SyncService

app = create_app()
logger = logging.getLogger(__name__)

def run_test_sync():
    # Configuracao de logging para execucao manual do sincronismo.
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler("debug_log.txt", mode='w', encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    logger = logging.getLogger(__name__)

    logger.info("--- INICIANDO SYNC DE TESTE (V2 - OTIMIZADO) ---")
    with app.app_context():
        try:
            service = SyncService()
            result = service.run_sync()
            logger.info(f"Resultado: {result}")
            
        except Exception as e:
            logger.error(f"ERRO FATAL DURANTE TESTE: {e}", exc_info=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', action='store_true', help='Executar teste de sincronizacao em vez do servidor')
    args = parser.parse_args()

    # O create_app ja inicializa tabelas e reparos; mantem contexto para compatibilidade local.
    with app.app_context():
        pass
        
        logger.info("Banco de dados inicializado.")


    if args.test:
        run_test_sync()
    else:
        # Verifica backup antes de subir o servidor local.
        try:
            from backup_manager import BackupManager
            BackupManager.check_and_run_backup()
        except Exception as e:
            logger.error(f"Falha ao executar backup de inicializacao: {e}")

        app.run(debug=True, host='0.0.0.0', port=5003)
