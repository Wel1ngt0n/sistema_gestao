from flask import Blueprint, jsonify, request
from app.services.ai_service import OperationalAIService
from app.services.security_service import require_auth

ai_bp = Blueprint('ai', __name__)
ai_service = OperationalAIService()


@ai_bp.route('/api/ai/analyze-network/<int:store_id>', methods=['POST'])
@require_auth
def analyze_network(payload, store_id):
    """
    Gatilho manual para analisar uma rede de lojas.
    Identifica a rede baseada no store_id e roda a análise.
    Accepts ?force=true to bypass cache.
    """
    force = request.args.get('force', 'false').lower() == 'true'
    result = ai_service.analyze_network_context(store_id, force=force)
    if not result:
        return jsonify({"error": "Failed to analyze"}), 500
    if "error" in result:
        return jsonify(result), 500
        
    return jsonify(result)

@ai_bp.route('/api/ai/chat', methods=['POST'])
@require_auth
def chat_with_data(payload):
    """
    Endpoint para Chat com I.A. (RAG).
    Recebe: { "message": "string" }
    Retorna: { "response": "string", "sources": [] }
    """
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Message required"}), 400
        
    user_message = data['message']
    
    # Chamar serviço
    result = ai_service.chat_with_operational_context(user_message)
    
    return jsonify(result)
