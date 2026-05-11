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
    session_id = data.get('session_id')
    user_id = int(payload['sub'])
    
    # Chama o serviço do Jarvis
    result = jarvis_service.chat(messages, user_id, session_id)
    
    if "error" in result:
        return jsonify(result), 500
        
    return jsonify(result)

@jarvis_bp.route('/api/jarvis/sessions', methods=['GET'])
@require_auth
def get_sessions(payload):
    """Retorna as sessões do usuário."""
    user_id = int(payload['sub'])
    sessions = jarvis_service.get_user_sessions(user_id)
    return jsonify(sessions)

@jarvis_bp.route('/api/jarvis/history/<int:session_id>', methods=['GET'])
@require_auth
def get_history(payload, session_id):
    """Retorna o histórico de uma sessão."""
    user_id = int(payload['sub'])
    history = jarvis_service.get_session_history(user_id, session_id)
    if history is None:
        return jsonify({"error": "Sessão não encontrada."}), 404
    return jsonify(history)

@jarvis_bp.route('/api/jarvis/session/<int:session_id>', methods=['DELETE'])
@require_auth
def delete_session(payload, session_id):
    """Exclui uma sessão."""
    user_id = int(payload['sub'])
    success = jarvis_service.delete_session(user_id, session_id)
    if not success:
        return jsonify({"error": "Sessão não encontrada ou erro ao excluir."}), 404
    return jsonify({"success": True})

