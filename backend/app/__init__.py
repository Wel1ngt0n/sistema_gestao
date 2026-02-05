from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    
    # Config
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5436/sistema_gestao3')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Init Plugins
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Register Blueprints
    from app.modules.implantacao import implantacao_bp
    from app.modules.integracao import integracao_bp
    from app.modules.suporte import suporte_bp

    # Import Models for Migration Detection
    from app.models.project import Project
    from app.models.implementation_logic import ImplementationLogic
    from app.models.legacy_tracking import TaskStep, ProjectPause
    
    app.register_blueprint(implantacao_bp, url_prefix='/api/implantacao')
    app.register_blueprint(integracao_bp, url_prefix='/api/integracao')
    app.register_blueprint(suporte_bp, url_prefix='/api/suporte')

    @app.route('/health')
    def health():
        return {'status': 'ok', 'version': '3.0'}

    return app
