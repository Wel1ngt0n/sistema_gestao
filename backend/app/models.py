from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

db = SQLAlchemy()

class SyncState(db.Model):
    """
    Controla o estado global da sincronização (Shallow Sync).
    Padrão Singleton (apenas 1 registro com id=1).
    """
    __tablename__ = 'sync_state'
    id = db.Column(db.Integer, primary_key=True)
    last_shallow_sync_at = db.Column(db.DateTime, nullable=True)
    last_successful_sync_at = db.Column(db.DateTime, nullable=True)
    in_progress = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<SyncState Last: {self.last_shallow_sync_at}>'

class SystemConfig(db.Model):
    """
    Configurações globais do sistema (pesos, metas, etc).
    """
    __tablename__ = 'system_config'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(200))
    category = db.Column(db.String(50), default='general')

class StorePause(db.Model):
    """
    Registra períodos de pausa/congelamento da implantação.
    Estes períodos são descontaos do cálculo de dias em progresso.
    """
    __tablename__ = 'store_pauses'
    
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=True) # None = Pausa em aberto
    reason = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def __repr__(self):
        return f'<Pause {self.start_date} - {self.end_date}>'


class Store(db.Model):
    __tablename__ = 'stores'
    
    id = db.Column(db.Integer, primary_key=True)
    store_name = db.Column(db.String(255), nullable=False)
    custom_store_id = db.Column(db.String(50), unique=True, nullable=True) # Ex: F0H-533
    clickup_task_id = db.Column(db.String(50), unique=True, nullable=False)
    clickup_url = db.Column(db.String(255))
    
    # Status
    status = db.Column(db.String(50)) # Status de Exibição Atual/Legado
    status_raw = db.Column(db.String(50)) # Status Original do ClickUp
    status_norm = db.Column(db.String(50), default="IN_PROGRESS") # Normalizado: IN_PROGRESS, DONE, BLOCKED, NOT_STARTED
    
    # Datas
    created_at = db.Column(db.DateTime)
    finished_at = db.Column(db.DateTime, nullable=True) # Data de Conclusão do ClickUp
    
    start_real_at = db.Column(db.DateTime, nullable=True) # Snapshot: data de início ou criação
    end_real_at = db.Column(db.DateTime, nullable=True) # Último evento de conclusão OU Fim Manual
    
    # Métricas
    total_time_days = db.Column(db.Float, default=0.0) # Calculado
    idle_days = db.Column(db.Integer, default=0) # Dias desde o último evento
    
    # Pessoas
    implantador = db.Column(db.String(100), nullable=True) # Responsável Atual
    implantador_original = db.Column(db.String(100), nullable=True) # Primeiro responsável
    implantador_atual = db.Column(db.String(100), nullable=True) # Atual explícito
    integrador = db.Column(db.String(100), nullable=True) # Responsável Integração (V3)
    
    # Campos de Negócio / Comerciais (Sync ou Manual)
    valor_mensalidade = db.Column(db.Float, default=0.0)
    valor_implantacao = db.Column(db.Float, default=0.0)
    financeiro_status = db.Column(db.String(50), default="Não paga mensalidade")
    erp = db.Column(db.String(100))
    cnpj = db.Column(db.String(50))
    crm = db.Column(db.String(50))
    
    # Novos Campos (Solicitação V3)
    rede = db.Column(db.String(100)) # Nome da Rede (ex: Grupo Pão de Açúcar)
    tipo_loja = db.Column(db.String(50), default='Filial') # Matriz ou Filial
    
    # Relacionamento Matriz-Filial
    parent_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=True)
    filiais = db.relationship('Store', backref=db.backref('matriz', remote_side=[id]), lazy=True)

    # Controle Manual
    observacoes = db.Column(db.Text, nullable=True)
    tempo_contrato = db.Column(db.Integer, default=90)
    manual_finished_at = db.Column(db.DateTime, nullable=True) # Sobrescrita manual
    
    considerar_tempo_implantacao = db.Column(db.Boolean, default=True)
    justificativa_tempo_implantacao = db.Column(db.String(255), nullable=True)
    
    # Retrabalho & Qualidade
    teve_retrabalho = db.Column(db.Boolean, default=False)
    retrabalho_tipo = db.Column(db.String(100), nullable=True)
    delivered_with_quality = db.Column(db.Boolean, default=True)
    
    # Controle de Datas Manual (V4)
    is_manual_start_date = db.Column(db.Boolean, default=False)

    # AI Cache
    ai_summary = db.Column(db.Text, nullable=True)
    ai_analyzed_at = db.Column(db.DateTime, nullable=True)

    # Campos de Previsão & CS (V5)
    address = db.Column(db.Text, nullable=True)
    state_uf = db.Column(db.String(2), nullable=True)
    had_ecommerce = db.Column(db.Boolean, default=False)
    previous_platform = db.Column(db.String(100), nullable=True)
    deployment_type = db.Column(db.String(50), default='MIGRAÇÃO') # NOVA or MIGRAÇÃO
    projected_orders = db.Column(db.Integer, default=0)
    order_rate = db.Column(db.Float, default=0.0) # Taxa %
    manual_go_live_date = db.Column(db.DateTime, nullable=True)
    forecast_obs = db.Column(db.Text, nullable=True)
    include_in_forecast = db.Column(db.Boolean, default=True)

    
    # Relacionamentos
    steps = db.relationship('TaskStep', backref='store', lazy=True, cascade="all, delete-orphan")
    pauses = db.relationship('StorePause', backref='store', lazy=True, cascade="all, delete-orphan")
    deep_sync_state = db.relationship('StoreDeepSyncState', uselist=False, backref='store', cascade="all, delete-orphan")

    status_history = db.relationship('TimeInStatusCache', backref='store', lazy=True, cascade="all, delete-orphan")
    logs = db.relationship('StoreSyncLog', backref='store', lazy=True, cascade="all, delete-orphan")

    @property
    def effective_finished_at(self):
        return self.manual_finished_at or self.end_real_at or self.finished_at

    @property
    def effective_started_at(self):
        return self.start_real_at or self.created_at

    @property
    def dias_em_progresso(self):
        end_date = self.effective_finished_at
        start_date = self.effective_started_at
        
        if not start_date:
            return 0
            
        # Data de referência final (Data de Fim ou Hoje)
        ref_end = end_date or datetime.now()
        
        # Delta Total Bruto
        delta = ref_end - start_date
        total_days = max(0, delta.days)
        
        # Calcular dias pausados
        paused_days = 0
        for pause in self.pauses:
            # Pausa deve estar dentro do intervalo [start_date, ref_end]
            # Se a pausa começou depois de ref_end, ignora
            p_start = pause.start_date
            if p_start > ref_end:
                continue
                
            # Se a pausa terminou antes do start_date, ignora (teoricamente nao deve existir)
            p_end = pause.end_date or datetime.now()
            if p_end < start_date:
                continue
                
            # Interseção
            eff_start = max(p_start, start_date)
            eff_end = min(p_end, ref_end)
            
            if eff_end > eff_start:
                p_delta = eff_end - eff_start
                paused_days += p_delta.days
                
        # Descontar pausas
        return max(0, total_days - paused_days)

    @property
    def dias_totais_implantacao(self):
        return self.dias_em_progresso

    @property
    def data_previsao_implantacao(self):
        start_date = self.effective_started_at
        if start_date:
            days = self.tempo_contrato or 90
            return start_date + timedelta(days=days)
        return None

    def __repr__(self):
        return f'<Store {self.custom_store_id or self.store_name}>'

class StoreSyncLog(db.Model):
    """
    Registra histórico de mudanças em campos específicos da loja.
    """
    __tablename__ = 'store_sync_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    
    field_name = db.Column(db.String(50), nullable=False)
    old_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    
    changed_at = db.Column(db.DateTime, default=datetime.now)
    source = db.Column(db.String(20), default='sync') # 'sync' or 'manual'
    
    def __repr__(self):
        return f'<SyncLog {self.store_id} {self.field_name}: {self.old_value}->{self.new_value}>'

class StoreDeepSyncState(db.Model):
    """
    Controla o estado do Deep Sync (histórico) por loja.
    """
    __tablename__ = 'store_deep_sync_state'
    
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), primary_key=True)
    last_deep_sync_at = db.Column(db.DateTime, nullable=True)
    sync_status = db.Column(db.String(20), default="NEVER") # NEVER, PARTIAL, COMPLETE, FAILED
    last_error = db.Column(db.Text, nullable=True)
    
    # Para evitar chamadas desnecessárias API:
    # Se clickup_updated_at da loja não mudou, não precisamos rodar deep sync de novo
    last_synced_clickup_updated_at = db.Column(db.String(50), nullable=True) 

class TimeInStatusCache(db.Model):
    """
    Cache do histórico de tempo em cada status (Deep Sync).
    Pode vir do endpoint /task/{id}/time_in_status
    """
    __tablename__ = 'time_in_status_cache'
    
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    
    status_name = db.Column(db.String(50), nullable=False)
    total_seconds = db.Column(db.Integer, default=0)
    total_days = db.Column(db.Float, default=0.0)
    
    # Se quisermos detalhe de intervalos depois, criar outra tabela
    # Por enquanto, agregado por status é muito útil para gargalos
    
    updated_at = db.Column(db.DateTime, default=datetime.now)

class TaskStep(db.Model):
    __tablename__ = 'tasks_steps'
    
    id = db.Column(db.Integer, primary_key=True)
    clickup_task_id = db.Column(db.String(50), unique=True, nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    
    step_list_name = db.Column(db.String(100)) # e.g. "TREINAMENTO"
    step_name = db.Column(db.String(150)) # Nome da Tarefa
    assignee = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50))
    
    created_at = db.Column(db.DateTime)
    closed_at = db.Column(db.DateTime, nullable=True)
    
    start_real_at = db.Column(db.DateTime, nullable=True)
    end_real_at = db.Column(db.DateTime, nullable=True)
    total_time_days = db.Column(db.Float, default=0.0)
    idle_days = db.Column(db.Integer, default=0)
    
    reopen_count = db.Column(db.Integer, default=0)

    def __repr__(self):
        return f'<TaskStep {self.step_name} [{self.status}]>'

class StatusEvent(db.Model):
    """
    Histórico Bruto/Legado se necessário.
    """
    __tablename__ = 'status_events'
    
    id = db.Column(db.Integer, primary_key=True)
    clickup_task_id = db.Column(db.String(50), nullable=False, index=True)
    
    old_status = db.Column(db.String(50))
    new_status = db.Column(db.String(50))
    changed_at = db.Column(db.DateTime, nullable=False)
    changed_by = db.Column(db.String(100), nullable=True)
    
    entity_type = db.Column(db.String(20)) # 'store' ou 'step'

    def __repr__(self):
        return f'<Event {self.clickup_task_id}: {self.old_status}->{self.new_status}>'

class MetricsSnapshot(db.Model):
    __tablename__ = 'metrics_snapshot'
    
    id = db.Column(db.Integer, primary_key=True)
    reference_date = db.Column(db.DateTime, default=datetime.now)
    
    total_lojas_em_progresso = db.Column(db.Integer)
    total_lojas_concluidas = db.Column(db.Integer)
    mrr_em_implantacao = db.Column(db.Float)
    pct_no_prazo = db.Column(db.Float)

    def __repr__(self):
        return f'<Snapshot {self.reference_date}>'

class MetricsSnapshotDaily(db.Model):
    """
    Snapshot diário granular por loja.
    Permite reconstruir histórico e alimentar gráficos de tendência com precisão.
    """
    __tablename__ = 'metrics_snapshot_daily'
    
    id = db.Column(db.Integer, primary_key=True)
    snapshot_date = db.Column(db.Date, nullable=False, index=True)
    
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False, index=True)
    
    # Dimensões para Filtro Rápido
    implantador = db.Column(db.String(100), index=True)
    rede = db.Column(db.String(100))
    status_norm = db.Column(db.String(50)) # DONE, IN_PROGRESS, etc
    
    # Métricas Calculadas no Dia
    days_in_stage = db.Column(db.Integer) # Dias na etapa atual
    idle_days = db.Column(db.Integer)      # Dias sem mexer
    wip_points = db.Column(db.Float)       # Pontos de esforço se WIP
    mrr = db.Column(db.Float)              # Valor financeiro
    risk_score = db.Column(db.Float)       # 0-100
    
    # Relacionamento Loja
    store = db.relationship('Store', backref='daily_snapshots')
    
    # Campos de Análise IA
    ai_risk_level = db.Column(db.String(20)) # CRITICAL, HIGH, MEDIUM, LOW
    ai_summary = db.Column(db.Text)
    ai_network_summary = db.Column(db.Text)
    ai_action_plan = db.Column(db.Text) # JSON string
    ai_last_analysis = db.Column(db.DateTime)

    __table_args__ = (
        db.UniqueConstraint('snapshot_date', 'store_id', name='uix_snapshot_date_store'),
    )

    def __repr__(self):
        return f'<SnapshotDaily {self.snapshot_date} Store={self.store_id}>'

# --- V2.5 Models (Governance & Audit) ---

class SyncRun(db.Model):
    __tablename__ = 'sync_runs'
    id = db.Column(db.Integer, primary_key=True)
    started_at = db.Column(db.DateTime, default=datetime.now)
    finished_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default="RUNNING") # RUNNING, SUCCESS, ERROR
    items_processed = db.Column(db.Integer, default=0)
    items_updated = db.Column(db.Integer, default=0)
    error_summary = db.Column(db.Text, nullable=True)

class SyncError(db.Model):
    __tablename__ = 'sync_errors'
    id = db.Column(db.Integer, primary_key=True)
    sync_run_id = db.Column(db.Integer, db.ForeignKey('sync_runs.id'), nullable=False)
    store_id = db.Column(db.Integer, nullable=True)
    task_id = db.Column(db.String(50), nullable=True)
    error_msg = db.Column(db.Text)
    traceback = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

class ForecastAuditLog(db.Model):
    __tablename__ = 'forecast_audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    field_name = db.Column(db.String(50), nullable=False)
    old_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    changed_at = db.Column(db.DateTime, default=datetime.now)
    actor = db.Column(db.String(50), default='local_user')
    
    store = db.relationship('Store', backref='forecast_audits')

# --- V3.0 Models (CRM Evolution) ---
class IntegrationMetric(db.Model):
    """
    Métricas específicas do Módulo de Integração (V3).
    Armazena estado atual e KPIs de cada loja em relação à integração.
    """
    __tablename__ = 'integration_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    snapshot_date = db.Column(db.Date, nullable=False, default=datetime.now) # Data do snapshot
    
    # SLA & Prazos
    start_date = db.Column(db.DateTime, nullable=True) # Início real da integração
    end_date = db.Column(db.DateTime, nullable=True) # Fim real da integração
    sla_days = db.Column(db.Integer, default=0) # Dias corridos (end - start)
    
    # Qualidade (Pós-Go-Live)
    post_go_live_bugs = db.Column(db.Integer, default=0) # Qtd falhas críticas nos primeiros 30 dias
    churn_risk = db.Column(db.Boolean, default=False) # Se gerou risco de churn
    
    # Documentação
    documentation_status = db.Column(db.String(20), default='PENDING') # PENDING, PARTIAL, DONE
    
    # Pontuação (Volume)
    points = db.Column(db.Float, default=0.0) # 1.0 (Matriz) ou 0.7 (Filial)
    
    # Legado/Compatibilidade
    lead_time_days = db.Column(db.Integer, default=0) 
    ticket_count = db.Column(db.Integer, default=0)
    has_blocking_issue = db.Column(db.Boolean, default=False)
    last_blocker_reason = db.Column(db.String(255), nullable=True)
    
    updated_at = db.Column(db.DateTime, default=datetime.now)

    store = db.relationship('Store', backref='integration_metrics')

    # Removendo Constraint de Data única para permitir Múltiplas entradas se necessário,
    # mas por enquanto vamos manter 1 para 1 por loja como "Estado Atual"
    # Se precisarmos de histórico, usaremos snapshots diários.
    
    def __repr__(self):
        return f'<IntegrationMetric {self.store_id} Pts={self.points}>'

class PerformanceReview(db.Model):
    """
    Avaliação de Desempenho Mensal/Semestral (V3).
    Suporta regras 40/40/20.
    """
    __tablename__ = 'performance_reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    cycle = db.Column(db.String(20), nullable=False) # e.g. '2024-02' or '2024-Q1'
    
    # Soft Skills (20%) - Input Manual do Gestor
    soft_communication = db.Column(db.Float, default=0.0) # 0-100
    soft_process = db.Column(db.Float, default=0.0) # 0-100
    soft_responsibility = db.Column(db.Float, default=0.0) # 0-100
    
    # Hard Skills / Metas (80%) - Calculado ou Manual (se standby)
    # Coletivo (40%)
    score_collective = db.Column(db.Float, default=0.0) 
    # Individual (40%)
    score_individual = db.Column(db.Float, default=0.0)
    
    # Penalidades
    churn_count = db.Column(db.Integer, default=0) # Bloqueia 50% do comportamental
    
    # Resultado Final
    final_score = db.Column(db.Float, default=0.0)
    bonus_eligible = db.Column(db.Boolean, default=False)
    
    updated_at = db.Column(db.DateTime, default=datetime.now)
    reviewer_comment = db.Column(db.Text, nullable=True)

    user = db.relationship('User', backref='reviews')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'cycle', name='uix_user_cycle_review'),
    )
    
    def __repr__(self):
        return f'<Review {self.user_id} {self.cycle}>'

# --- AUTH MODELS ---

# Tabela de Associação: Usuários <-> Papéis (Many-to-Many)
user_roles = db.Table('user_roles',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True),
    extend_existing=True
)

# Tabela de Associação: Papéis <-> Permissões (Many-to-Many)
role_permissions = db.Table('role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id'), primary_key=True),
    extend_existing=True
)

class Permission(db.Model):
    __tablename__ = 'permissions'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False) # Ex: 'view_dashboard', 'manage_users'
    description = db.Column(db.String(255), nullable=True)
    module = db.Column(db.String(50), nullable=True) # Para agrupar no painel de admin (ex: 'INTEGRACAO', 'DASHBOARD')

class Role(db.Model):
    __tablename__ = 'roles'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False) # Ex: 'Admin', 'Operador'
    description = db.Column(db.String(255), nullable=True)
    
    # lazy='subquery' garante que ao carregar a role, ele traga as permissões numa tacada só
    permissions = db.relationship('Permission', secondary=role_permissions, lazy='subquery',
                                  backref=db.backref('roles', lazy=True))

class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    profile_picture = db.Column(db.Text, nullable=True) # Pode ser base64 ou URL
    
    is_active = db.Column(db.Boolean, default=True)
    
    # Campos MFA / 2FA (TOTP)
    totp_secret = db.Column(db.String(32), nullable=True)
    totp_enabled = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    roles = db.relationship('Role', secondary=user_roles, lazy='subquery',
                            backref=db.backref('users', lazy=True))

    def has_permission(self, perm_name):
        """Checa se o usuário tem uma permissão específica transitando pelas suas roles."""
        for role in self.roles:
            for perm in role.permissions:
                if perm.name == perm_name:
                    return True
        return False
        
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "profile_picture": self.profile_picture,
            "is_active": self.is_active,
            "totp_enabled": self.totp_enabled,
            "roles": [r.name for r in self.roles]
        }
