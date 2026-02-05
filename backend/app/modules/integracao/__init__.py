from flask import Blueprint, jsonify
from .services import sync_integration_tasks
from app.models.integration_logic import IntegrationLogic
from app.models.project import Project

integracao_bp = Blueprint('integracao', __name__)

@integracao_bp.route('/')
def index():
    return {'module': 'Integracao', 'status': 'active'}

@integracao_bp.route('/sync', methods=['POST'])
def run_sync():
    result = sync_integration_tasks()
    return jsonify(result)

@integracao_bp.route('/list', methods=['GET'])
def list_integrations():
    items = IntegrationLogic.query.join(Project).all()
    data = []
    for item in items:
        data.append({
            "id": item.id,
            "project_name": item.project.name,
            "status": item.clickup_status,
            "assignee": item.assignee_name,
            "clickup_url": item.clickup_url
        })
    return jsonify(data)
