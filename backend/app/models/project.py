from app import db
from datetime import datetime

class Project(db.Model):
    """
    Entidade Central do Sistema 3.0.
    Representa uma Loja / Cliente / Projeto Unificado.
    """
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    clickup_task_id = db.Column(db.String(50), unique=True, index=True)
    
    # Status Geral
    status = db.Column(db.String(50), default='ACTIVE')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Flags de Módulos (Se o projeto existe nesse contexto)
    has_implementation = db.Column(db.Boolean, default=False)
    has_integration = db.Column(db.Boolean, default=False)
    has_support = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<Project {self.name}>'
