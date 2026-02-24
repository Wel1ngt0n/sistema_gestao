from flask import Blueprint, jsonify, request
from app.models import db, User
from app.services.security_service import require_auth, hash_password

profile_bp = Blueprint('profile_bp', __name__, url_prefix='/api/profile')

@profile_bp.route('', methods=['GET'])
@require_auth
def get_profile(payload):
    """Retorna o perfil do usuário logado"""
    user_id = payload.get('sub')
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
        
    return jsonify(user.to_dict()), 200

@profile_bp.route('', methods=['PUT'])
@require_auth
def update_profile(payload):
    """Atualiza dados do usuário logado"""
    user_id = payload.get('sub')
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
        
    data = request.json
    
    # Atualiza campos básicos permitidos
    if 'name' in data:
        user.name = data['name']
        
    # Foto de perfil em base64 ou URL
    if 'profile_picture' in data:
        user.profile_picture = data['profile_picture']

    # Se quiser alterar a senha
    if 'password' in data and data['password'].strip() != '':
        user.password_hash = hash_password(data['password'])

    try:
        db.session.commit()
        return jsonify({"message": "Perfil atualizado com sucesso!", "user": user.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Erro ao atualizar o perfil: {str(e)}"}), 500
