from app import db
from datetime import datetime

class ImplementationLogic(db.Model):
    __tablename__ = 'implementation_logic'
    
    # Chave Primária é também chave estrangeira para Project (Associação 1:1)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), primary_key=True)
    
    # Status e Workflow
    status_norm = db.Column(db.String(50), default="IN_PROGRESS") # DONE, IN_PROGRESS, BLOCKED, NOT_STARTED
    manual_finished_at = db.Column(db.DateTime, nullable=True) # Override manual de data de fim
    
    # Dados Financeiros (KPIs)
    valor_mensalidade = db.Column(db.Float, default=0.0) # MRR
    valor_implantacao = db.Column(db.Float, default=0.0) # Setup Fee
    tempo_contrato = db.Column(db.Integer, default=90) # SLA em dias
    
    # Dados de Negócio / Contexto
    implantador_id = db.Column(db.String(50), nullable=True) # ID do usuário ClickUp
    implantador_name = db.Column(db.String(100), nullable=True)
    tipo_loja = db.Column(db.String(50), default='Filial') # Matriz / Filial
    rede = db.Column(db.String(100)) # Rede/Grupo Econômico
    
    # Dados Técnicos
    erp = db.Column(db.String(100))
    cnpj = db.Column(db.String(20)) # [NEW]
    crm = db.Column(db.String(100)) # [NEW]

    # Controle de Qualidade / Flags
    financeiro_status = db.Column(db.String(50), default='Em dia')
    teve_retrabalho = db.Column(db.Boolean, default=False)
    delivered_with_quality = db.Column(db.Boolean, default=True)
    considerar_tempo = db.Column(db.Boolean, default=True)
    justificativa_tempo = db.Column(db.Text, nullable=True)
    observacoes = db.Column(db.Text, nullable=True)

    # Dados de Forecast e Contexto (Legacy Parity) [NEW V3.1]
    deployment_type = db.Column(db.String(50), default='MIGRAÇÃO') # MIGRAÇÃO, NOVA, EXPANSÃO
    state_uf = db.Column(db.String(2), nullable=True) # UF
    manual_go_live_date = db.Column(db.DateTime, nullable=True) # Data Prevista/Real Go-Live
    projected_orders = db.Column(db.Integer, default=0) # Pedidos/mes projetados
    had_ecommerce = db.Column(db.Boolean, default=False)
    previous_platform = db.Column(db.String(100), nullable=True)
    
    # AI Analysis Cache [NEW V3.1]
    ai_summary = db.Column(db.Text, nullable=True) # Resumo quinzenal automático
    ai_analyzed_at = db.Column(db.DateTime, nullable=True)
    
    # Métricas Calculadas (Snapshots do ClickUp)
    start_real_at = db.Column(db.DateTime, nullable=True)
    end_real_at = db.Column(db.DateTime, nullable=True)
    last_interaction_at = db.Column(db.DateTime, nullable=True)
    idle_days = db.Column(db.Integer, default=0)
    
    # Relacionamento Reverso
    project = db.relationship('Project', backref=db.backref('implementation', uselist=False))

    def __repr__(self):
        return f'<Implementation {self.project_id} - {self.status_norm}>'
