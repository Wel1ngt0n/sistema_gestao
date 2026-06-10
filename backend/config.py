
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Chave usada pelo Flask para sessoes/cookies.
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev_fallback_key_dont_use_in_prod")
    DEBUG = os.getenv("FLASK_ENV") == "development"
    IS_PRODUCTION = os.getenv("FLASK_ENV") == "production"
    
    CLICKUP_API_KEY = os.getenv("CLICKUP_API_KEY", "").strip()
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # Origens permitidas no CORS. Mantem defaults de producao/desenvolvimento e
    # permite complementar por CORS_ALLOWED_ORIGINS e FRONTEND_URL no ambiente.
    _DEFAULT_CORS_ORIGINS = [
        "https://sistema-gestao-one.vercel.app",
        "http://localhost:5173",
        "http://localhost:5177",
        "http://localhost:5003",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5177",
    ]
    _ENV_CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]
    _FRONTEND_URLS = [
        origin.strip()
        for origin in os.getenv("FRONTEND_URL", "").split(",")
        if origin.strip()
    ]
    CORS_ALLOWED_ORIGINS = sorted({
        origin.rstrip("/")
        for origin in (_DEFAULT_CORS_ORIGINS + _ENV_CORS_ORIGINS + _FRONTEND_URLS)
        if origin.strip()
    })

    FRONTEND_ORIGIN = os.getenv("FRONTEND_URL", "https://sistema-gestao-one.vercel.app").split(",")[0].rstrip("/")
    BACKEND_ORIGIN = os.getenv("BACKEND_URL", "https://clickup-crm-backend.onrender.com").rstrip("/")

    AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "ib_auth")
    AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "true" if IS_PRODUCTION else "false").lower() == "true"
    # Front e back estao em sites diferentes (vercel.app -> onrender.com), entao producao precisa SameSite=None.
    AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "None" if IS_PRODUCTION else "Lax")
    AUTH_COOKIE_DOMAIN = os.getenv("AUTH_COOKIE_DOMAIN") or None
    TOTP_VALID_WINDOW = int(os.getenv("TOTP_VALID_WINDOW", "2"))
    TWO_FACTOR_CHALLENGE_MINUTES = int(os.getenv("TWO_FACTOR_CHALLENGE_MINUTES", "5"))
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(30 * 1024 * 1024)))
    SUPPORT_MAX_IMPORT_FILES = int(os.getenv("SUPPORT_MAX_IMPORT_FILES", "20"))
    SUPPORT_MAX_IMPORT_FILE_MB = int(os.getenv("SUPPORT_MAX_IMPORT_FILE_MB", "10"))

    # IDs das listas extraidos das URLs do ClickUp.
    LIST_ID_PRINCIPAL = "211186088"
    
    # Listas de etapas, mantidas com chaves do dominio externo.
    LIST_IDS_STEPS = {
        "SUBIR_APPS": "216936208",
        "INTEGRACAO": "211110999",
        "CADASTRO_OMIE": "216933916",
        "ONBOARDING": "216936196",
        "CRIAR_LOJAS": "216936198",
        "ATIVAR_RECORRENCIA": "216935323",
        "TREINAMENTO": "216936221",
        "CADASTRO_PRODUTOS": "216936188",
        "QUALIDADE": "216936200",
        "POS_IMPLANTACAO": "901306837383"
    }

    # Ajusta URLs antigas de Postgres e usa SQLite apenas como fallback de desenvolvimento.
    db_url = os.getenv('DATABASE_URL', 'sqlite:///metrics.db')
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Estabilidade para sincronismos longos em Render/Postgres.
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 5
    }
