from app import db
from app.models.project import Project
from app.models.implementation_logic import ImplementationLogic
import os
import requests
from datetime import datetime

CLICKUP_API_KEY = os.getenv('CLICKUP_API_KEY')
# LIST_ID_PRINCIPAL from V2.5 config
CLICKUP_LIST_ID = "211186088" 

HEADERS = {
    "Authorization": CLICKUP_API_KEY.strip() if CLICKUP_API_KEY else "",
    "Content-Type": "application/json"
}

def sync_implementation_tasks():
    """
    Sincroniza tarefas da Lista Principal de Implantação (V2.5 Legacy List).
    Identifica Lojas por Custom Fields (ID Loja) e atualiza ImplementationLogic.
    """
    if not CLICKUP_API_KEY:
        return {"error": "Missing ClickUp Config"}

    print(f"🔄 Syncing Implementation List: {CLICKUP_LIST_ID}", flush=True)
    
    # 1. Fetch Tasks (Pagination loop simplified for V3 MVP - Start with Page 0)
    url = f"https://api.clickup.com/api/v2/list/{CLICKUP_LIST_ID}/task?archived=false&include_closed=false&subtasks=true"
    
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200:
            return {"error": f"ClickUp API Error: {response.text}"}
            
        tasks = response.json().get('tasks', [])
        processed_count = 0
        created_count = 0
        updated_count = 0
        
        for task in tasks:
            # Identificação da Loja (Nome da Tarefa geralmente é o nome da loja)
            task_name = task.get('name')
            task_id = task.get('id')
            
            # Tentar encontrar projeto existente pelo clickup_task_id (Melhor match)
            # OU pelo nome (se não tiver ID ainda)
            project = Project.query.filter_by(clickup_task_id=task_id).first()
            if not project:
                # Tentar pelo nome (Normalização básica)
                project = Project.query.filter(Project.name.ilike(task_name)).first()
            
            is_new = False
            if not project:
                project = Project(
                    name=task_name,
                    clickup_task_id=task_id,
                    has_implementation=True
                )
                db.session.add(project)
                db.session.flush() # Gerar ID
                is_new = True
                created_count += 1
            else:
                updated_count += 1
                project.has_implementation = True # Garantir flag

            # Atualizar/Criar Lógica de Implantação
            impl_logic = ImplementationLogic.query.get(project.id)
            if not impl_logic:
                impl_logic = ImplementationLogic(project_id=project.id)
                db.session.add(impl_logic)
            
            # --- Mapeamento de Campos (Simplificado por enquanto) ---
            # Status
            status_obj = task.get('status', {})
            status_name = status_obj.get('status', 'unknown').upper()
            
            # Normalização de Status (Exemplos comuns)
            if status_name in ['COMPLETE', 'DONE', 'CONCLUÍDO']:
                impl_logic.status_norm = 'DONE'
            else:
                impl_logic.status_norm = 'IN_PROGRESS'
            
            # Atualizar Assignee
            assignees = task.get('assignees', [])
            if assignees:
                user = assignees[0]
                impl_logic.implantador_id = str(user.get('id'))
                impl_logic.implantador_name = user.get('username')
                
            processed_count += 1
        
        db.session.commit()
        return {
            "status": "success",
            "processed": processed_count,
            "created": created_count,
            "updated": updated_count
        }

    except Exception as e:
        db.session.rollback()
        print(f"❌ Sync Error: {str(e)}", flush=True)
        return {"error": str(e)}
