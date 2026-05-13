import os
from flask import Flask, request
from flask_migrate import Migrate
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import Config
from app.models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # CORS via after_request para cobrir tambem respostas geradas por decorators.
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        normalized_origin = origin.rstrip("/") if origin else None
        allowed_origins = app.config.get('CORS_ALLOWED_ORIGINS', [])
        if normalized_origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = normalized_origin
            response.headers['Vary'] = 'Origin'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        elif not origin:
            response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Origin'
        )
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response.headers['Access-Control-Max-Age'] = '86400'
        return response
    
    # Cabecalhos de seguranca: mantem CSP explicita para o Flask-Talisman.
    csp = {
        'default-src': ['\'self\''],
        'base-uri': ['\'self\''],
        'frame-ancestors': ['\'none\''],
        'img-src': ['\'self\'', 'data:', 'https:'],
        'script-src': ['\'self\''],
        'style-src': ['\'self\''],
        'connect-src': [
            '\'self\'',
            Config.FRONTEND_ORIGIN,
            Config.BACKEND_ORIGIN,
            'http://localhost:*',
            'http://127.0.0.1:*',
            'ws://localhost:*',
            'ws://127.0.0.1:*',
        ],
    }
    # Em desenvolvimento desabilitamos force_https porque localhost nao usa HTTPS por padrao.
    Talisman(app, content_security_policy=csp, force_https=(os.environ.get('FLASK_ENV') == 'production'))

    # Rate limit padrao para reduzir abuso sem bloquear preflight CORS.
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=["2000 per day", "500 per hour"],
        storage_uri="memory://"
    )
    
    @limiter.request_filter
    def header_whitelist():
        return request.method == "OPTIONS"
        
    app.limiter = limiter # Exposto para uso pontual em blueprints.
    
    db.init_app(app)
    Migrate(app, db)
    
    # Inicializa o agendador de sincronismo.
    from app.scheduler import init_scheduler
    # No Render, evita multiplas instancias do scheduler quando houver varios workers.
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or os.environ.get('FLASK_ENV') == 'production':
        init_scheduler(app)
    
    # Garante tabelas em execucao local/CLI e aplica reparos leves de schema.
    with app.app_context():
        try:
            db.create_all()
            
            # Reparo automatico de schema usado em ambientes legados.
            try:
                from app.services.schema_repair import repair_database_schema
                repair_database_schema()
            except Exception as repair_e:
                app.logger.error(f"Falha ao reparar schema automaticamente: {repair_e}")
        except Exception as e:
            app.logger.error(f"Erro durante inicializacao do banco: {e}")
        
    app.logger.info("Banco de dados inicializado.")
        
    # Registro dos blueprints da aplicacao.
    from app.routes import main_bp, api_bp
    from app.routes_analytics import analytics_bp
    from app.routes_ai import ai_bp
    from app.routes_scoring import scoring_bp
    from app.routes_admin import admin_bp
    from app.routes_integration import integration_bp
    from app.routes_auth import auth_bp
    from app.routes_profile import profile_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(scoring_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(integration_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    
    from app.routes_jarvis import jarvis_bp
    app.register_blueprint(jarvis_bp)
    

    from app.routes_forecast import forecast_bp
    app.register_blueprint(forecast_bp)
    
    from app.routes_governance import gov_bp
    app.register_blueprint(gov_bp)

    from app.routes_performance import performance_bp
    app.register_blueprint(performance_bp)

    from app.routes_notifications import notifications_bp
    app.register_blueprint(notifications_bp)
    
    from app.routes_analysts_reports import analysts_reports_bp
    app.register_blueprint(analysts_reports_bp)
    
    from app.routes_webhooks import webhook_bp
    app.register_blueprint(webhook_bp)
    limiter.exempt(webhook_bp)
    
    from app.routes_support import support_bp
    app.register_blueprint(support_bp)
    
    return app
