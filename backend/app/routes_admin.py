from flask import Blueprint, jsonify, request
from app.models import db, SystemConfig, User, Role
from app.services.security_service import require_auth, require_permission, hash_password, log_audit
from datetime import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# --- System Config ---

@admin_bp.route('/configs', methods=['GET'])
@require_auth
@require_permission('manage_system')
def get_configs(payload):
    configs = SystemConfig.query.all()
    return jsonify([{
        "id": c.id,
        "key": c.key,
        "value": c.value,
        "description": c.description
    } for c in configs])

@admin_bp.route('/configs', methods=['POST'])
@require_auth
@require_permission('manage_system')
def update_config(payload):
    data = request.json
    key = data.get('key')
    value = data.get('value')
    
    if not key: return jsonify({"error": "Key required"}), 400
    
    config = SystemConfig.query.filter_by(key=key).first()
    if config:
        config.value = str(value)
    else:
        config = SystemConfig(key=key, value=str(value), description=data.get('description'))
        db.session.add(config)
        
    db.session.commit()
    
    log_audit(
        action="UPDATE_CONFIG",
        resource_type="SystemConfig",
        resource_id=key,
        details=f"Valor alterado para: {value}",
        user_id=payload['sub']
    )
    
    return jsonify({"status": "success", "key": key, "value": value})

# --- User Management ---

@admin_bp.route('/users', methods=['GET'])
@require_auth
@require_permission('manage_users')
def get_users(payload):
    users = User.query.all()
    return jsonify([{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.roles[0].name if u.roles else 'Visitante',
        "is_active": u.is_active,
        "last_login": u.last_login.strftime('%d/%m/%Y %H:%M') if u.last_login else None
    } for u in users])

@admin_bp.route('/users', methods=['POST'])
@require_auth
@require_permission('manage_users')
def create_user(payload):
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role_name = data.get('role', 'Operador')
    
    if not name or not email or not password:
        return jsonify({"error": "Preencha todos os campos corretamente."}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "O e-mail especificado já está sendo utilizado."}), 400
        
    user = User(
        name=name, 
        email=email, 
        password_hash=hash_password(password)
    )
    
    role = Role.query.filter_by(name=role_name).first()
    if role:
        user.roles.append(role)
        
    db.session.add(user)
    db.session.commit()
    
    log_audit(
        action="CREATE_USER",
        resource_type="User",
        resource_id=user.id,
        details=f"Usuário {name} ({email}) criado com papel {role_name}",
        user_id=payload['sub']
    )
    
    return jsonify({"status": "created", "id": user.id})

@admin_bp.route('/users/<int:id>', methods=['PUT'])
@require_auth
@require_permission('manage_users')
def update_user(payload, id):
    user = User.query.get_or_404(id)
    data = request.json
    
    if 'role' in data: 
        role = Role.query.filter_by(name=data['role']).first()
        if role:
            user.roles = [role]
            
    if 'is_active' in data: user.is_active = bool(data['is_active'])
    if 'name' in data: user.name = data['name']
    
    db.session.commit()
    
    log_audit(
        action="UPDATE_USER",
        resource_type="User",
        resource_id=id,
        details=f"Campos atualizados: {list(data.keys())}",
        user_id=payload['sub']
    )
    
    return jsonify({"status": "updated"})
