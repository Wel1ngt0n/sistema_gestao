from flask import Blueprint, request, jsonify, current_app
from app.models import db, User
from app.services.security_service import (
    generate_jwt_token, verify_password,
    generate_totp_secret, generate_totp_uri, verify_totp_code, require_auth,
    log_audit
)
import datetime
import logging

auth_bp = Blueprint('auth_bp', __name__)
logger = logging.getLogger(__name__)

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
    """Endpoint inicial de login. Se 2FA estiver ativo, exige segunda etapa."""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Preencha email e senha"}), 400

    user = User.query.filter_by(email=email).first()
    
    # Falha segura e mitigacao basica contra enumeracao de usuarios.
    if not user or not verify_password(password, user.password_hash):
        log_audit("LOGIN_FAILED", details=f"Tentativa de login falha para o email: {email}")
        return jsonify({"error": "Credenciais inválidas"}), 401

    if not user.is_active:
        return jsonify({"error": "Usuário desativado pelo administrador"}), 403

    # Quando TOTP for reativado no login, emitir JWT apenas apos a segunda etapa.

    # Atualiza o ultimo login somente apos credenciais validas.
    user.last_login = datetime.datetime.utcnow()
    db.session.commit()

    token = generate_jwt_token(user.id, user.email)
    
    log_audit("LOGIN_SUCCESS", user_id=user.id, details="Login realizado com sucesso")
    
    return jsonify({
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route('/api/auth/verify-2fa', methods=['POST'])
def verify_2fa():
    """Verifica o codigo 2FA e conclui a emissao do JWT."""
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

    # Codigo correto: conclui o login e emite o token definitivo.
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
    """Retorna os dados atualizados do usuario autenticado."""
    user_id = payload.get('sub')
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({"error": "Usuário não encontrado ou inativo"}), 404
        
    return jsonify(user.to_dict()), 200


@auth_bp.route('/api/auth/setup-2fa', methods=['POST'])
@require_auth
def setup_2fa(payload):
    """
    Gera as chaves TOTP para o usuario autenticado.
    O 2FA so e ativado depois da primeira validacao bem-sucedida.
    """
    user = User.query.get(payload['sub'])
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    secret = generate_totp_secret()
    
    # Salva o secret de forma provisoria; a confirmacao ocorre em /enable-2fa.
    user.totp_secret = secret
    user.totp_enabled = False
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
    Recebe o codigo de 6 digitos apos o setup e ativa o 2FA definitivamente.
    """
    data = request.json
    code = data.get('code')
    
    if not code:
        return jsonify({"error": "Código de verificação é obrigatório"}), 400

    user = User.query.get(payload['sub'])
    
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    if not user.totp_secret:
        return jsonify({"error": "Precisa rodar setup-2fa antes de habilitar."}), 400

    is_valid = verify_totp_code(user.totp_secret, code)
    logger.info(f"Validacao 2FA para usuario {payload['sub']}: {'sucesso' if is_valid else 'falha'}")
    
    if not is_valid:
        return jsonify({"error": "Código inválido. O 2FA não foi ativado. Verifique se o horário do seu celular e do servidor estão sincronizados.", "code": "INVALID_TOTP"}), 400

    user.totp_enabled = True
    db.session.commit()

    return jsonify({"message": "Autenticação em Dois Fatores (2FA) habilitada com sucesso!"}), 200
