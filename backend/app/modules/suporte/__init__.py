from flask import Blueprint

suporte_bp = Blueprint('suporte', __name__)

@suporte_bp.route('/')
def index():
    return {'module': 'Suporte', 'status': 'under_construction'}
