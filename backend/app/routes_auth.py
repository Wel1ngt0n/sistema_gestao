from flask import Blueprint, request, jsonify, current_app
from app.models import db, User
from app.services.security_service import (
    generate_jwt_token, verify_password,
    generate_totp_secret, generate_totp_uri, verify_totp_code, require_auth, hash_password,
    log_audit
)
import datetime

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    limiter = getattr(current_app, 'limiter', None)
    if limiter:
        @limiter.limit("5 per minute")
        def rate_limited_login():
            return login_logic()
        return rate_limited_login()
    
    return login_logic()

def login_logic():
    """Endpoint inicial de Login. Se 2FA ativado, exige 2º passo."""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Preencha email e senha"}), 400

    user = User.query.filter_by(email=email).first()
    
    # Falha Segura e Mitigação de Enumeração de Usuários (sempre deve demorar o mesmo tempo)
    if not user or not verify_password(password, user.password_hash):
        log_audit("LOGIN_FAILED", details=f"Tentativa de login falha para o email: {email}")
        return jsonify({"error": "Credenciais inválidas"}), 401

    if not user.is_active:
        return jsonify({"error": "Usuário desativado pelo administrador"}), 403

    # Se TOTP está ativo, não devolvemos o JWT Token definitivo ainda.
    if user.totp_enabled:
        return jsonify({
            "requires_2fa": True,
            "user_id": user.id,
            "message": "Código 2FA obrigatório"
        }), 200

    # Atualiza o último login
    user.last_login = datetime.datetime.utcnow()
    db.session.commit()

    # Gera o JWT
    token = generate_jwt_token(user.id, user.email)
    
    log_audit("LOGIN_SUCCESS", user_id=user.id, details="Login realizado com sucesso")
    
    return jsonify({
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route('/api/auth/verify-2fa', methods=['POST'])
def verify_2fa():
    """Verifica código 2FA pós-login e, se correto, conclui a emissão do JWT."""
    data = request.json
    user_id = data.get('user_id')
    code = data.get('code')

    if not user_id or not code:
        return jsonify({"error": "user_id e código 2FA necessários"}), 400

    user = User.query.get(user_id)
    if not user or not user.totp_secret:
        return jsonify({"error": "Autenticação em dois fatores não está configurada para este usuário"}), 400

    if not verify_totp_code(user.totp_secret, code):
        return jsonify({"error": "Código 2FA inválido ou expirado"}), 401

    # Código correto, conclui o Login
    user.last_login = datetime.datetime.utcnow()
    db.session.commit()

    token = generate_jwt_token(user.id, user.email)
    
    return jsonify({
        "token": token,
        "user": user.to_dict()
    }), 200


@auth_bp.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me(payload):
    """Retorna os dados atualizados do usuário logado baseado no Token"""
    user_id = payload.get('sub')
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({"error": "Usuário não encontrado ou inativo"}), 404
        
    return jsonify(user.to_dict()), 200


@auth_bp.route('/api/auth/setup-2fa', methods=['POST'])
@require_auth
def setup_2fa(payload):
    """
    Gera as chaves TOTP para o usuário autenticado que deseja ligar a proteção 2FA.
    Não ativa o 2FA até que ele forneça o primeiro código de validação com sucesso.
    """
    user = User.query.get(payload['sub'])
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    secret = generate_totp_secret()
    
    # Salva o secret de forma provisória no banco ou atualiza o antigo (desabilitado)
    user.totp_secret = secret
    user.totp_enabled = False # Só fica True na próxima rota confirmando que ele colou o Auth certo
    db.session.commit()

    uri = generate_totp_uri(secret, user.email)

    return jsonify({
        "secret": secret,
        "uri": uri,
        "message": "Escaneie o QR Code no seu aplicativo (Google Authenticator) e verifique via /enable-2fa com um código ativo."
    }), 200


@auth_bp.route('/api/auth/enable-2fa', methods=['POST'])
@require_auth
def enable_2fa(payload):
    """
    Recebe o código de 6 dígitos após o setup e ativa o flag `totp_enabled = True` definitivamente.
    """
    data = request.json
    code = data.get('code')
    
    if not code:
        return jsonify({"error": "Código de verificação é obrigatório"}), 400

    user = User.query.get(payload['sub'])
    
    print(f"DEBUG 2FA: user_id={payload['sub']}, email={user.email if user else 'None'}")
    print(f"DEBUG 2FA: secret_exists={bool(user.totp_secret)}, code_received={code}")
    
    if not user.totp_secret:
        return jsonify({"error": "Precisa rodar setup-2fa antes de habilitar."}), 400

    is_valid = verify_totp_code(user.totp_secret, code)
    print(f"DEBUG 2FA: code_valid={is_valid}")
    
    if not is_valid:
        return jsonify({"error": "Código inválido. O 2FA não foi ativado. Verifique se o horário do seu celular e do servidor estão sincronizados.", "code": "INVALID_TOTP"}), 400

    user.totp_enabled = True
    db.session.commit()

    return jsonify({"message": "Autenticação em Dois Fatores (2FA) habilitada com sucesso!"}), 200
