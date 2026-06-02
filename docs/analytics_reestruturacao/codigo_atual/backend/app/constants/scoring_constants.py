# Definições Oficiais de Pesos e Limiares para o Sistema de Pontuação (Standardization v1.0)

# ==============================================================================
# 1. SCORE DE RISCO DA LOJA (0-100)
# Quanto maior, PIOR. Mede saúde operacional.
# ==============================================================================

# Pesos dos Pilares (Soma = 1.0)
RISK_WEIGHTS = {
    'PRAZO': 0.45,
    'IDLE': 0.25,
    'FINANCEIRO': 0.20,
    'QUALIDADE': 0.10
}

# Limiares de Prazo (Progress Ratio = Dias Decorridos / Prazo Contrato)
# Ex: 0.80 significa que consumiu 80% do tempo de contrato.
RISK_PRAZO_THRESHOLDS = [
    (0.65, 10),  # Até 65% do tempo: 10 pts (Verde)
    (0.80, 30),  # 65-80%: 30 pts (Verde/Amarelo)
    (1.00, 60),  # 80-100%: 60 pts (Amarelo)
    (1.15, 85),  # 100-115% (Atraso leve): 85 pts (Vermelho)
    (float('inf'), 100) # > 115% (Atraso grave): 100 pts
]

# Limiares de Ociosidade (Dias sem interação no ClickUp)
RISK_IDLE_THRESHOLDS = [
    (2, 0),    # 0-2 dias: 0 pts
    (5, 25),   # 3-5 dias: 25 pts
    (10, 60),  # 6-10 dias: 60 pts
    (20, 85),  # 11-20 dias: 85 pts
    (float('inf'), 100) # > 20 dias: 100 pts
]

# Pontuação Financeira
RISK_FINANCEIRO_SCORES = {
    'EM_DIA': 0,
    'PAGO': 0,
    'PENDENTE': 20, # Não pagou ainda, mas não venceu ou sem dados claros
    'DEVENDO': 70,
    'INADIMPLENTE': 70,
    'DEVENDO_DONE': 90 # Concluiu e ainda deve
}

# Pontuação de Qualidade
RISK_QUALIDADE_SCORES = {
    'SEM_RETRABALHO': 0,
    'COM_RETRABALHO': 60
}

# Classificação Visual do Risco Total
RISK_LEVELS = {
    'SAUDAVEL': (0, 24),    # Green
    'ATENCAO': (25, 49),    # Yellow
    'RISCO': (50, 74),      # Orange
    'CRITICO': (75, 100)    # Red
}

# ==============================================================================
# 2. SCORE DE PERFORMANCE DO IMPLANTADOR (0-100)
# Mede eficiência e entrega. Usado no Ranking.
# ==============================================================================

# Pesos do Ranking (Soma = 100 ou 1.0)
PERFORMANCE_WEIGHTS = {
    'VOLUME': 0.40,
    'OTD': 0.30,      # On Time Delivery
    'QUALIDADE': 0.20,
    'EFICIENCIA': 0.10 # Tempo Médio vs Global
}

# Pesos de Esforço (Volume)
OP_WEIGHTS = {
    'MATRIZ': 1.0,
    'FILIAL': 0.7
}

# Metas e SLAs
SLA_DEFAULT_DAYS = 90
MIN_DELIVERIES_FOR_RANKING = 5 # Se tiver menos, recebe flag "Amostra Baixa"

# ==============================================================================
# 3. SCORE DE CAPACIDADE (TEAM LOAD)
# Mede sobrecarga baseada em lojas ativas (IN_PROGRESS).
# ==============================================================================

# Pontos de Capacidade Máxima (Configurável por senioridade no futuro)
DEFAULT_CAPACITY_POINTS = 30.0 

# Níveis de Utilização (% da Capacidade)
LOAD_LEVELS = {
    'BAIXO': 40,      # < 40%
    'NORMAL': 90,     # 40-90%
    'ALTO': 110,      # 90-110%
    'CRITICO': 110    # > 110%
}
