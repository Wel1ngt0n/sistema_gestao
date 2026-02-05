from app import db
from datetime import datetime

class IntegrationLogic(db.Model):
    """
    Tabela específica para métricas e dados de Integração.
    Vinculada 1-pra-1 com a tabela (Project).
    """
    __tablename__ = 'integration_logic'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False, unique=True)
    
    # ClickUp Info
    clickup_task_id = db.Column(db.String(50), nullable=False)
    clickup_status = db.Column(db.String(100))
    clickup_url = db.Column(db.String(255))
    
    # Pessoas
    assignee_name = db.Column(db.String(100))
    assignee_id = db.Column(db.String(50))
    
    # Datas (Syncadas ou Calculadas)
    start_date = db.Column(db.DateTime, nullable=True) # Data que entrou em CONTATO/COMUNICACAO
    finish_date = db.Column(db.DateTime, nullable=True) # Data que foi concluído
    due_date = db.Column(db.DateTime, nullable=True)
    
    # Métricas
    days_in_status = db.Column(db.Integer, default=0) # Tempo no status atual
    total_duration_days = db.Column(db.Integer, default=0) # Tempo total de ciclo
    
    # Controle
    last_synced_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamento
    project = db.relationship('Project', backref=db.backref('integration_data', uselist=False))

    def __repr__(self):
        return f'<Integration {self.clickup_task_id}>'
