import os
from flask import Flask
from flask_migrate import Migrate
from flask_cors import CORS
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import Config
from app.models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for frontend domains (Security Fix - A02)
    frontend_url_env = os.environ.get('FRONTEND_URL', 'http://localhost:3000,http://localhost:5173,http://localhost:5177')
    allowed_origins = [origin.strip() for origin in frontend_url_env.split(',')]
    CORS(app, resources={r"/*": {"origins": allowed_origins}}, allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"])
    
    # Security Headers (A05 - Security Headers)
    csp = {
        'default-src': [
            '\'self\'',
            'localhost:5003',
            '*.google.com',
            '*.gstatic.com'
        ],
        'img-src': ['*', 'data:'],
        'script-src': ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\''],
        'style-src': ['\'self\'', '\'unsafe-inline\''],
        'connect-src': ['\'self\'', '*', 'ws://localhost:*', 'http://localhost:*']
    }
    # Em desenvolvimento desabilitamos force_https pois localhost não é HTTPS por padrão
    Talisman(app, content_security_policy=csp, force_https=(os.environ.get('FLASK_ENV') == 'production'))

    # Rate Limiting (A04 - Brute Force Protection)
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://",
    )
    app.limiter = limiter # Expor para uso em Blueprints
    
    db.init_app(app)
    migrate = Migrate(app, db)
    
    # Init DB tables if they don't exist
    with app.app_context():
        try:
            db.create_all()
        except:
            pass
        
    # Register Blueprints
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
    

    from app.routes_forecast import forecast_bp
    app.register_blueprint(forecast_bp)
    
    from app.routes_governance import gov_bp
    app.register_blueprint(gov_bp)

    from app.routes_performance import performance_bp
    app.register_blueprint(performance_bp)

    from app.routes_notifications import notifications_bp
    app.register_blueprint(notifications_bp)
    return app
