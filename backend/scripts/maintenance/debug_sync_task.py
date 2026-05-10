
from app import create_app
from app.services.clickup import ClickUpService
from config import Config
from datetime import datetime

app = create_app()

def debug_task(task_id):
    with app.app_context():
        service = ClickUpService()
        print(f"--- Depurando tarefa {task_id} ---")
        
        # Consulta a tarefa diretamente no ClickUp para comparar com a configuracao local.
        data = service._get(f"task/{task_id}")
        if not data:
            print("❌ Tarefa nao encontrada pela API.")
            return

        print(f"Nome: {data.get('name')}")
        print(f"ID: {data.get('id')}")
        print(f"Lista: {data.get('list', {}).get('name')} (ID: {data.get('list', {}).get('id')})")
        print(f"Status: {data.get('status', {}).get('status')}")
        
        date_updated = data.get('date_updated')
        if date_updated:
            dt = datetime.fromtimestamp(int(date_updated)/1000)
            print(f"Data de atualizacao: {dt}")
        
        print("\n--- Verificacao de configuracao ---")
        print(f"ID esperado da lista principal: {Config.LIST_ID_PRINCIPAL}")
        
        if data.get('list', {}).get('id') != Config.LIST_ID_PRINCIPAL:
            print("⚠️ Divergencia: a tarefa NAO esta na lista principal.")
        else:
            print("✅ Tarefa localizada na lista principal correta.")

        print(f"Custom ID da tarefa: {data.get('custom_id')}")

if __name__ == "__main__":
    debug_task("86aef79q0")
