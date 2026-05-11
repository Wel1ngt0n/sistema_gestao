from flask import Blueprint, jsonify, request
from app.services.jarvis_service import JarvisService
from app.services.security_service import require_auth

jarvis_bp = Blueprint('jarvis', __name__)
jarvis_service = JarvisService()

@jarvis_bp.route('/api/jarvis/chat', methods=['POST'])
@require_auth
def chat(payload):
    """
    Endpoint principal de chat com o Jarvis.
    """
    data = request.get_json()
    if not data or 'messages' not in data:
        return jsonify({"error": "O campo 'messages' é obrigatório."}), 400
        
    messages = data['messages']
    
    # Chama o serviço do Jarvis
    result = jarvis_service.chat(messages)
    
    if "error" in result:
        return jsonify(result), 500
        
    return jsonify(result)
