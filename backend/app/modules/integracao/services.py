import requests
import os
from datetime import datetime
from app import db
from app.models.project import Project
from app.models.integration_logic import IntegrationLogic

CLICKUP_API_KEY = os.getenv('CLICKUP_API_KEY')
CLICKUP_LIST_ID = os.getenv('CLICKUP_INTEGRATION_LIST_ID')

HEADERS = {
    "Authorization": CLICKUP_API_KEY.strip() if CLICKUP_API_KEY else "",
    "Content-Type": "application/json"
}

def sync_integration_tasks():
    """
    Busca tarefas da lista de integração e atualiza o banco V3.
    """
    if not CLICKUP_API_KEY or not CLICKUP_LIST_ID:
        return {"error": "Missing ClickUp Config"}

    print(f"🔄 Syncing Integration List: {CLICKUP_LIST_ID}", flush=True)
    print(f"🔑 Debug Key: {CLICKUP_API_KEY[:8]}... len={len(CLICKUP_API_KEY) if CLICKUP_API_KEY else 0}", flush=True)
    
    url = f"https://api.clickup.com/api/v2/list/{CLICKUP_LIST_ID}/task?archived=false&include_closed=true&subtasks=true"
    
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200:
            return {"error": f"ClickUp API Error: {response.text}"}
            
        data = response.json()
        tasks = data.get('tasks', [])
        
        updated_count = 0
        created_count = 0
        
        for task in tasks:
            task_id = task['id']
            task_name = task['name']
            status = task['status']['status'].upper()
            task_url = task['url']
            
            # 1. Encontrar ou Criar Projeto
            project = Project.query.filter_by(clickup_task_id=task_id).first()
            if not project:
                project = Project(
                    name=task_name,
                    clickup_task_id=task_id,
                    has_integration=True
                )
                db.session.add(project)
                db.session.flush() # Gerar ID
                created_count += 1
            else:
                project.name = task_name # Atualiza nome caso tenha mudado
                project.has_integration = True
            
            # 2. Atualizar Dados de Integração
            integration = IntegrationLogic.query.filter_by(project_id=project.id).first()
            if not integration:
                integration = IntegrationLogic(project_id=project.id, clickup_task_id=task_id)
                db.session.add(integration)
            
            # Campos
            integration.clickup_status = status
            integration.clickup_url = task_url
            integration.last_synced_at = datetime.utcnow()
            
            # Assignee (Pega o primeiro)
            if task.get('assignees'):
                user = task['assignees'][0]
                integration.assignee_name = user['username']
                integration.assignee_id = str(user['id'])
                
            # Datas (Timestamp ms -> Datetime)
            if task.get('date_created'):
                # Exemplo simples, depois podemos refinar com lógica de status
                pass
                
            updated_count += 1
            
        db.session.commit()
        return {"status": "success", "processed": len(tasks), "created": created_count, "updated": updated_count}
        
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}
