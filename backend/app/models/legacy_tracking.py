from app import db
from datetime import datetime

class TaskStep(db.Model):
    """
    Rastreamento granular de sub-tarefas (Checklist Items do ClickUp).
    Essencial para análise de gargalos.
    """
    __tablename__ = 'task_steps'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    # Identificação ClickUp
    clickup_task_id = db.Column(db.String(50), unique=True, nullable=True) 
    step_name = db.Column(db.String(255)) # Nome da tarefa filha (ex: "Configurar DNS")
    step_group = db.Column(db.String(100)) # Agrupador (ex: "INFRAESTRUTURA")
    
    status = db.Column(db.String(50)) # DONE, IN_PROGRESS...
    assignee = db.Column(db.String(100), nullable=True)
    
    # Métricas de Tempo
    created_at = db.Column(db.DateTime)
    started_at = db.Column(db.DateTime, nullable=True)
    closed_at = db.Column(db.DateTime, nullable=True)
    idle_days = db.Column(db.Integer, default=0)
    
    project = db.relationship('Project', backref=db.backref('steps', lazy=True, cascade="all, delete-orphan"))

class ProjectPause(db.Model):
    """
    Registra congelamentos de projeto para descontar do SLA.
    """
    __tablename__ = 'project_pauses'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=True) # None = Pausa ativa
    reason = db.Column(db.String(255), nullable=True)
    
    project = db.relationship('Project', backref=db.backref('pauses', lazy=True, cascade="all, delete-orphan"))
