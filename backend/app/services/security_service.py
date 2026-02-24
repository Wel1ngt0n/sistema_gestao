import os
import jwt
import pyotp
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import request, jsonify

# JWT Configuration
# Em produção, a secret key deve vir de variáveis de ambiente
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default_dev_secret_key_123!@#')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

def hash_password(password: str) -> str:
    """Gera o hash da senha usando werkzeug.security (seguro com pbkdf2:sha256)."""
    return generate_password_hash(password)

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
        if not auth_header or not auth_header.startswith("Bearer "):
            print(f"AUTH MISSING! auth_header={auth_header}")
            return jsonify({"error": "Token de autenticação ausente ou inválido.", "code": "AUTH_MISSING"}), 401
            
        token = auth_header.split(" ")[1]
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

