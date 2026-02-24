from flask import Flask
from flask_migrate import Migrate
from flask_cors import CORS
from config import Config
from app.models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for all routes (Development)
    CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"])
    
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

    return app
