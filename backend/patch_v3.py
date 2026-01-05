from app import create_app, db
from sqlalchemy import text
import sys

app = create_app()

def patch_database():
    print("Iniciando patch V3 do banco de dados (SQLite)...")
    
    with app.app_context():
        # create_all will create the new StoreSyncLog table
        db.create_all()
        
        conn = db.engine.connect()
        try:
            # Check for delivered_with_quality in stores
            result = conn.execute(text("PRAGMA table_info(stores)")).fetchall()
            columns = [r[1] for r in result]
            
            if 'delivered_with_quality' not in columns:
                print(" -> Adicionando coluna 'delivered_with_quality'...")
                conn.execute(text("ALTER TABLE stores ADD COLUMN delivered_with_quality BOOLEAN DEFAULT 1"))
            else:
                print(" -> Coluna 'delivered_with_quality' já existe.")
            
            print("\n✅ Patch concluído com sucesso!")
            
        except Exception as e:
            print(f"\n❌ Erro: {str(e)}")
            sys.exit(1)
        finally:
            conn.close()

if __name__ == "__main__":
    patch_database()
