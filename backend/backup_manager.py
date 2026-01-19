import os
import shutil
import glob
from datetime import datetime, timedelta

# Configuration defaults
DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'metrics.db')
BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')
RETENTION_DAYS = 15

class BackupManager:
    @staticmethod
    def ensure_backup_dir():
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)
            print(f">>> Backup directory created: {BACKUP_DIR}")

    @staticmethod
    def run_backup():
        """Creates a timestamped copy of the database and rotates old backups."""
        BackupManager.ensure_backup_dir()
        
        if not os.path.exists(DB_PATH):
            print(f">>> Database file not found at {DB_PATH}. Skipping backup.")
            return False

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"metrics_{timestamp}.db"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        
        try:
            shutil.copy2(DB_PATH, backup_path)
            print(f">>> Backup created successfully: {backup_filename}")
            
            # Rotation: Delete backups older than RETENTION_DAYS
            BackupManager.rotate_backups()
            return True
        except Exception as e:
            print(f">>> Error creating backup: {e}")
            return False

    @staticmethod
    def rotate_backups():
        """Deletes files in backup dir older than RETENTION_DAYS."""
        cutoff_date = datetime.now() - timedelta(days=RETENTION_DAYS)
        
        files = glob.glob(os.path.join(BACKUP_DIR, "metrics_*.db"))
        for f in files:
            try:
                # Use file modification time
                mtime = os.path.getmtime(f)
                file_dt = datetime.fromtimestamp(mtime)
                
                if file_dt < cutoff_date:
                    os.remove(f)
                    print(f">>> Old backup removed: {os.path.basename(f)}")
            except Exception as e:
                print(f">>> Error checking/removing old backup {f}: {e}")

    @staticmethod
    def check_and_run_backup(interval_days=1):
        """
        Standard Startup Check:
        Wraps run_backup but only executes if the latest backup is older than interval_days.
        """
        BackupManager.ensure_backup_dir()
        
        files = glob.glob(os.path.join(BACKUP_DIR, "metrics_*.db"))
        
        should_run = False
        if not files:
            should_run = True
            print(">>> No existing backups found. Running initial backup...")
        else:
            # Sort by modification time (newest last)
            latest_file = max(files, key=os.path.getmtime)
            last_mtime = datetime.fromtimestamp(os.path.getmtime(latest_file))
            
            # Check age
            if datetime.now() - last_mtime > timedelta(days=interval_days):
                print(f">>> Last backup ({os.path.basename(latest_file)}) is older than {interval_days} day(s). Running backup...")
                should_run = True
            else:
                print(f">>> Valid backup found ({os.path.basename(latest_file)}). Skipping startup backup.")
        
        if should_run:
            BackupManager.run_backup()

if __name__ == "__main__":
    # Manual run
    BackupManager.run_backup()
