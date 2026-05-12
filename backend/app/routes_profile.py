import re

from flask import Blueprint, jsonify, request
from app.models import db, User
from app.services.security_service import require_auth, hash_password, verify_password

profile_bp = Blueprint('profile_bp', __name__, url_prefix='/api/profile')
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

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
        
    data = request.json or {}
    current_password = (data.get("current_password") or "").strip()
    
    # Atualiza campos básicos permitidos
    if 'name' in data:
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({"error": "Nome completo e obrigatorio."}), 400
        user.name = name

    if 'email' in data:
        email = (data.get('email') or '').strip().lower()
        if not EMAIL_RE.match(email):
            return jsonify({"error": "Informe um e-mail valido."}), 400

        if email != user.email.lower():
            if not current_password or not verify_password(current_password, user.password_hash):
                return jsonify({"error": "Senha atual obrigatoria para alterar o e-mail."}), 400

            existing = User.query.filter(User.email == email, User.id != user.id).first()
            if existing:
                return jsonify({"error": "Este e-mail ja esta em uso por outro usuario."}), 409

            user.email = email
        
    # Foto de perfil em base64 ou URL
    if 'profile_picture' in data:
        user.profile_picture = data['profile_picture']

    # Se quiser alterar a senha
    if 'password' in data and data['password'].strip() != '':
        password = data['password'].strip()
        if len(password) < 8:
            return jsonify({"error": "A nova senha deve ter pelo menos 8 caracteres."}), 400

        if not current_password or not verify_password(current_password, user.password_hash):
            return jsonify({"error": "Senha atual obrigatoria para alterar a senha."}), 400

        user.password_hash = hash_password(password)

    try:
        db.session.commit()
        return jsonify({"message": "Perfil atualizado com sucesso!", "user": user.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Erro ao atualizar o perfil: {str(e)}"}), 500
