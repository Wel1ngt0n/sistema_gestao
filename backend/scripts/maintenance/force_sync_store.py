
import sys
from app import create_app, db
from app.services.clickup import ClickUpService
from app.services.metrics import MetricsService
from app.models import Store

def force_sync(task_id):
    app = create_app()
    with app.app_context():
        clickup = ClickUpService()
        metrics = MetricsService()
        
        print(f"--- Forcando sincronizacao da tarefa {task_id} ---")
        
        # 1. Buscar tarefa
        data = clickup._get(f"task/{task_id}")
        if not data:
             print("❌ Tarefa nao encontrada no ClickUp.")
             return
             
        print(f"DEPURACAO: Chaves retornadas: {list(data.keys())}")
        print(f"DEPURACAO: Nome: {data.get('name')}")
        print(f"DEPURACAO: ID: {data.get('id')}")

             
        # 2. Processar
        try:
            store = metrics.process_store_data(data)
            db.session.commit()
            print(f"✅ Sucesso! Loja '{store.store_name}' (ID: {store.id}) sincronizada/atualizada.")
            
            # Verificar resultado gravado.
            s = Store.query.get(store.id)
            print(f"   Status: {s.status}")
            print(f"   Custom ID: {s.custom_store_id}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Erro ao processar tarefa: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python force_sync_store.py <task_id>")
        sys.exit(1)
    
    force_sync(sys.argv[1])
