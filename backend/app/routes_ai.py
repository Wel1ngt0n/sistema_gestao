from flask import Blueprint, jsonify
from app.services.ai_service import GeminiService

ai_bp = Blueprint('ai', __name__)
ai_service = GeminiService()

@ai_bp.route('/api/ai/analyze-network/<int:store_id>', methods=['POST'])
def analyze_network(store_id):
    """
    Gatilho manual para analisar uma rede de lojas.
    Identifica a rede baseada no store_id e roda a análise.
    """
    result = ai_service.analyze_network_context(store_id)
    if not result:
        return jsonify({"error": "Failed to analyze"}), 500
    if "error" in result:
        return jsonify(result), 500
        
    return jsonify(result)
