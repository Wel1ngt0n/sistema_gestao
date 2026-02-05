from flask import Blueprint, jsonify, request
from app.services.scoring_service import ScoringService
from app.services.analytics_service import AnalyticsService
from app.constants.scoring_constants import (
    RISK_WEIGHTS, RISK_PRAZO_THRESHOLDS, RISK_IDLE_THRESHOLDS, 
    PERFORMANCE_WEIGHTS, OP_WEIGHTS, LOAD_LEVELS
)
from datetime import datetime

scoring_bp = Blueprint('scoring_bp', __name__)

@scoring_bp.route('/api/scoring/performance', methods=['GET'])
def get_performance():
    try:
        start_str = request.args.get('start_date')
        end_str = request.args.get('end_date')
        
        start_date = datetime.strptime(start_str, '%Y-%m-%d') if start_str else None
        end_date = datetime.strptime(end_str, '%Y-%m-%d') if end_str else None
        
        ranking = ScoringService.get_performance_ranking(start_date, end_date)
        return jsonify(ranking), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@scoring_bp.route('/api/scoring/capacity', methods=['GET'])
def get_capacity():
    try:
        data = AnalyticsService.get_team_capacity()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@scoring_bp.route('/api/scoring/rules', methods=['GET'])
def get_rules():
    """Retorna constantes para a página de Regras no Frontend"""
    return jsonify({
        "risk_weights": RISK_WEIGHTS,
        "performance_weights": PERFORMANCE_WEIGHTS,
        "op_weights": OP_WEIGHTS,
        "prazo_thresholds": RISK_PRAZO_THRESHOLDS,
        "idle_thresholds": RISK_IDLE_THRESHOLDS,
        "load_levels": LOAD_LEVELS
    }), 200
