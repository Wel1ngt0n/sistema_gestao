import os
import jwt
import pyotp
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import request, jsonify

# JWT Configuration
# Segurança Crítica (A04): Em produção, usar sempre variáveis de ambiente fortes.
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY and os.environ.get('FLASK_ENV') != 'development':
    raise ValueError("CRITICAL SECURITY ERROR: JWT_SECRET_KEY must be set in production mode!")
elif not JWT_SECRET_KEY:
    JWT_SECRET_KEY = 'default_dev_secret_key_123!@#' # Só permitido se explicitly development

JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

def hash_password(password: str) -> str:
    """Gera o hash da senha usando werkzeug.security (seguro com scrypt em 2025)."""
    return generate_password_hash(password, method='scrypt')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano bate com o hash."""
    return check_password_hash(hashed_password, password)

def generate_jwt_token(user_id: int, user_email: str) -> str:
    """Gera um token JWT com expiração para o usuário logado."""
    payload = {
        'sub': str(user_id), # PyJWT requer que o subject seja uma string
        'email': user_email,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str):
    """Decodifica e valida o JWT. Retorna o payload se válido, ou None se inválido/expirado."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError as e:
        print(f"JWT_DECODE_EXPIRED: {e}")
        return None # Token expirado
    except jwt.InvalidTokenError as e:
        print(f"JWT_DECODE_INVALID: {e}")
        return None # Token inválido
    except Exception as e:
        print(f"JWT_DECODE_ERROR: {e}")
        return None

def generate_totp_secret() -> str:
    """Gera uma nova chave secreta (Base32) para o Google Authenticator (TOTP)."""
    return pyotp.random_base32()

def generate_totp_uri(secret: str, user_email: str, issuer_name: str = "ClickUp CRM") -> str:
    """Gera a URI que será transformada num QR Code para o usuário escanear."""
    return pyotp.totp.TOTP(secret).provisioning_uri(name=user_email, issuer_name=issuer_name)

def verify_totp_code(secret: str, code: str) -> bool:
    """Verifica se o código de 6 dígitos que o usuário digitou é válido para o secret dele."""
    # window=1 permite uma variação de 30 segundos pra trás ou pra frente em caso de fuso horário levemente incorreto
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1) 

def require_auth(f):
    """
    Decorator genérico que exibe na rota se o payload JWT está presente e válido.
    Passa o `user_id` decodificado para a função original.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Allow CORS preflight requests
        if request.method == "OPTIONS":
            return f({}, *args, **kwargs)

        print(f"--- DEBUG AUTH HEADER ---")
        print(f"PATH: {request.path}")
        print(f"HEADERS: {dict(request.headers)}")

        auth_header = request.headers.get("Authorization")
        token = None
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            # Fallback para token via query parameter (útil para EventSource/SSE)
            token = request.args.get("token")

        if not token:
            print(f"AUTH MISSING! No header or query token found.")
            return jsonify({"error": "Token de autenticação ausente ou inválido.", "code": "AUTH_MISSING"}), 401
            
        payload = decode_jwt_token(token)
        
        if not payload:
            print(f"AUTH INVALID! Token failed decoding.")
            return jsonify({"error": "Sessão expirada ou token inválido. Faça login novamente.", "code": "AUTH_INVALID"}), 401
            
        # Repassa o payload para a função decorada
        return f(payload, *args, **kwargs)
    return decorated_function

def require_permission(permission_name: str):
    """
    Decorator para RBAC. Verifica se o usuário autenticado possui a permissão especificada.
    Deve ser usado SEMPRE ABAIXO do @require_auth.
    Exemplo:
        @require_auth
        @require_permission('view_dashboard')
        def my_route(payload): ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(payload, *args, **kwargs):
            from app.models import User  # import local para evitar erro cíclico no boot
            
            user = User.query.get(payload['sub'])
            if not user:
                return jsonify({"error": "Usuário não encontrado.", "code": "USER_NOT_FOUND"}), 404
                
            # Verifica se ele é 'Admin Geral' via permission ou nome da role, 
            # ou checa a permissão específica
            has_perm = user.has_permission(permission_name)
            
            # Se ele tiver a super role 'Super Admin', permite tudo
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
    Helper para registrar uma ação no log de auditoria.
    Se user_id não for passado, tenta pegar do request context se disponível.
    """
    from app.models import db, AuditLog
    
    # Se não for passado user_id, podemos tentar inferir do payload se a rota for autenticada
    # Mas o ideal é passar explicitamente quando disponível.
    
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
        print(f"AUDIT_LOG_ERROR: {e}")
        db.session.rollback()

def validate_schema(schema_class):
    """
    Decorator para validar o JSON do request contra um schema (Pydantic ou similar).
    Por simplicidade, implementamos uma lógica básica aqui, mas em apps maiores 
    usaríamos Marshmallow ou Pydantic estruturado.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({"error": "Formato de dados inválido. Esperado JSON.", "code": "JSON_REQUIRED"}), 400
            
            # Nota: Aqui viria a lógica de validação do schema_class
            # Se fosse Pydantic: schema_class(**request.json)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

