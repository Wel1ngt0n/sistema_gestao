import sys
from app import create_app
from app.services.sync_service import SyncService

app = create_app()

def run_test_sync():
    import logging
    
    # Configuração de logging
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
    parser.add_argument('--test', action='store_true', help='Run sync test instead of server')
    args = parser.parse_args()

    # Ensure tables exist (Docker Init)
    with app.app_context():
        db.create_all()
        print(">>> Database initialized.")

    if args.test:
        run_test_sync()
    else:
        app.run(debug=True, host='0.0.0.0')
