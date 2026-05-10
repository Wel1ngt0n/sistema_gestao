import os
import shutil
import glob
import logging
from datetime import datetime, timedelta

# Caminhos padrao do backup local em SQLite.
DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'metrics.db')
BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')
RETENTION_DAYS = 15
logger = logging.getLogger(__name__)

class BackupManager:
    @staticmethod
    def ensure_backup_dir():
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)
            logger.info(f"Diretorio de backup criado: {BACKUP_DIR}")

    @staticmethod
    def run_backup():
        """Cria uma copia datada do banco local e remove backups antigos."""
        BackupManager.ensure_backup_dir()
        
        if not os.path.exists(DB_PATH):
            logger.info(f"Banco local nao encontrado em {DB_PATH}. Backup ignorado.")
            return False

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"metrics_{timestamp}.db"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        
        try:
            shutil.copy2(DB_PATH, backup_path)
            logger.info(f"Backup criado com sucesso: {backup_filename}")
            
            # Rotacao: remove backups mais antigos que a retencao configurada.
            BackupManager.rotate_backups()
            return True
        except Exception as e:
            logger.error(f"Erro ao criar backup: {e}")
            return False

    @staticmethod
    def rotate_backups():
        """Remove arquivos de backup mais antigos que RETENTION_DAYS."""
        cutoff_date = datetime.now() - timedelta(days=RETENTION_DAYS)
        
        files = glob.glob(os.path.join(BACKUP_DIR, "metrics_*.db"))
        for f in files:
            try:
                # Usa a data de modificacao do arquivo como referencia de retencao.
                mtime = os.path.getmtime(f)
                file_dt = datetime.fromtimestamp(mtime)
                
                if file_dt < cutoff_date:
                    os.remove(f)
                    logger.info(f"Backup antigo removido: {os.path.basename(f)}")
            except Exception as e:
                logger.error(f"Erro ao verificar/remover backup antigo {f}: {e}")

    @staticmethod
    def check_and_run_backup(interval_days=1):
        """
        Executa backup de inicializacao apenas quando o ultimo backup esta vencido.
        """
        BackupManager.ensure_backup_dir()
        
        files = glob.glob(os.path.join(BACKUP_DIR, "metrics_*.db"))
        
        should_run = False
        if not files:
            should_run = True
            logger.info("Nenhum backup existente encontrado. Executando backup inicial.")
        else:
            # Seleciona o arquivo mais recente pela data de modificacao.
            latest_file = max(files, key=os.path.getmtime)
            last_mtime = datetime.fromtimestamp(os.path.getmtime(latest_file))
            
            if datetime.now() - last_mtime > timedelta(days=interval_days):
                logger.info(f"Ultimo backup ({os.path.basename(latest_file)}) tem mais de {interval_days} dia(s). Executando novo backup.")
                should_run = True
            else:
                logger.info(f"Backup valido encontrado ({os.path.basename(latest_file)}). Backup de inicializacao ignorado.")
        
        if should_run:
            BackupManager.run_backup()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    BackupManager.run_backup()
