import os
import jwt
import pyotp
import datetime
import logging
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import request, jsonify

logger = logging.getLogger(__name__)

# Configuracao JWT. Em producao, a chave deve vir do ambiente.
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY and os.environ.get('FLASK_ENV') != 'development':
    raise ValueError("ERRO CRITICO DE SEGURANCA: JWT_SECRET_KEY precisa estar definida em producao.")
elif not JWT_SECRET_KEY:
    JWT_SECRET_KEY = 'default_dev_secret_key_123!@#' # Permitido apenas em desenvolvimento local.

JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

def hash_password(password: str) -> str:
    """Gera hash seguro da senha com o algoritmo padrao do Werkzeug."""
    return generate_password_hash(password, method='scrypt')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano bate com o hash."""
    return check_password_hash(hashed_password, password)

def generate_jwt_token(user_id: int, user_email: str) -> str:
    """Gera um token JWT com expiracao para o usuario logado."""
    payload = {
        'sub': str(user_id), # PyJWT requer subject como string.
        'email': user_email,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str):
    """Decodifica e valida o JWT; retorna None quando estiver invalido ou expirado."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError as e:
        logger.info(f"JWT expirado: {e}")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT invalido: {e}")
        return None
    except Exception as e:
        logger.error(f"Erro inesperado ao validar JWT: {e}")
        return None

def generate_totp_secret() -> str:
    """Gera uma nova chave secreta (Base32) para o Google Authenticator (TOTP)."""
    return pyotp.random_base32()

def generate_totp_uri(secret: str, user_email: str, issuer_name: str = "ClickUp CRM") -> str:
    """Gera a URI que será transformada num QR Code para o usuário escanear."""
    return pyotp.totp.TOTP(secret).provisioning_uri(name=user_email, issuer_name=issuer_name)

def verify_totp_code(secret: str, code: str) -> bool:
    """Verifica se o codigo de 6 digitos informado e valido para o secret do usuario."""
    # valid_window=1 permite 30s de tolerancia para pequenas diferencas de relogio.
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1) 

def require_auth(f):
    """
    Decorator que valida o JWT e repassa o payload decodificado para a rota.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Preflight CORS nao deve exigir token.
        if request.method == "OPTIONS":
            return f({}, *args, **kwargs)

        auth_header = request.headers.get("Authorization")
        token = None
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            # Fallback para EventSource/SSE, que nem sempre permite Authorization header.
            token = request.args.get("token")

        if not token:
            logger.warning(f"Autenticacao ausente em {request.path}.")
            return jsonify({"error": "Token de autenticação ausente ou inválido.", "code": "AUTH_MISSING"}), 401
            
        payload = decode_jwt_token(token)
        
        if not payload:
            logger.warning(f"Token invalido em {request.path}.")
            return jsonify({"error": "Sessão expirada ou token inválido. Faça login novamente.", "code": "AUTH_INVALID"}), 401
            
        return f(payload, *args, **kwargs)
    return decorated_function

def require_permission(permission_name: str):
    """
    Decorator para RBAC. Verifica se o usuario autenticado possui a permissao especificada.
    Deve ser usado SEMPRE ABAIXO do @require_auth.
    Exemplo:
        @require_auth
        @require_permission('view_dashboard')
        def my_route(payload): ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(payload, *args, **kwargs):
            from app.models import User  # Import local para evitar ciclo no boot.
            
            user = User.query.get(payload['sub'])
            if not user:
                return jsonify({"error": "Usuário não encontrado.", "code": "USER_NOT_FOUND"}), 404
                
            # Super Admin pode tudo; demais usuarios precisam da permissao especifica.
            has_perm = user.has_permission(permission_name)
            is_super = any(role.name == "Super Admin" for role in user.roles)
            
            if not has_perm and not is_super:
                return jsonify({
                    "error": f"Acesso negado. Necessária permissão: {permission_name}", 
                    "code": "FORBIDDEN"
                }), 403
                
            return f(payload, *args, **kwargs)
        return decorated_function
    return decorator

def log_audit(action, resource_type=None, resource_id=None, details=None, user_id=None):
    """
    Registra uma acao no log de auditoria.
    """
    from app.models import db, AuditLog
    
    new_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        details=details if isinstance(details, str) else str(details),
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string if request.user_agent else None
    )
    
    try:
        db.session.add(new_log)
        db.session.commit()
    except Exception as e:
        logger.error(f"Erro ao registrar auditoria: {e}")
        db.session.rollback()

def validate_schema(schema_class):
    """
    Decorator para validar JSON de entrada.
    Mantem validacao minima ate adotarmos uma biblioteca estruturada.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({"error": "Formato de dados inválido. Esperado JSON.", "code": "JSON_REQUIRED"}), 400
            
            # Ponto de extensao para schema_class quando a validacao estruturada for adotada.
            return f(*args, **kwargs)
        return decorated_function
    return decorator

