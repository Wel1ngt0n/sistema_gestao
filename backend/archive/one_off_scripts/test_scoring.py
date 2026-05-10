from app import create_app, db
from app.models import Store
from app.services.scoring_service import ScoringService
from datetime import datetime, timedelta

try:
    app = create_app()
    context = app.app_context()
    context.push()
except Exception as e:
    print(f"Aviso: falha ao criar app ({e}). Testando em isolamento quando possivel.")

# 1. Testar calculo de risco
print("--- Teste de calculo de risco ---")

# Simula 8 dias de atraso:
# due_date = agora - 8 dias
# start_date = due_date - 90 dias
now = datetime.now()
due_date = now - timedelta(days=8)
start_date = due_date - timedelta(days=90)

mock_store = Store(
    tempo_contrato=90,
    created_at=start_date,
    start_real_at=start_date,
    dias_em_progresso=0, # Normalmente e calculado, mas aqui mantemos o valor no objeto.
    # Store.dias_em_progresso e uma propriedade e nao deve ser definida no construtor.
    # Ela depende de effective_started_at, que usa start_real_at ou created_at.
    # Ao preencher created_at, a propriedade calcula dias_em_progresso pela regra interna.
    idle_days=10,
    financeiro_status='DEVENDO',
    teve_retrabalho=True
)

# As propriedades dependem de campos simples, entao devem funcionar sem mock adicional.
# calculate_risk_score acessa store.dias_em_progresso.
# Sem sessao valida, relacoes lazy como pauses podem falhar.
# Se necessario, simular a propriedade ou garantir relacoes vazias.
# Store.pauses e uma relacao; em objeto transiente pode funcionar ou exigir mock.

risk = ScoringService.calculate_risk_score(mock_store)
print(f"Pontuacao de risco: {risk['total']}")
print(f"Nivel: {risk['level']}")
print(f"Nivel de IA: {risk['ai_risk_level']}") # Esperado: ALTO para 8 dias de atraso.
# Regra atual: > 14 CRITICO; > 7 ALTO.

print(f"Incremento de IA: {risk['ai_boost']}")
print(f"Dicas: {risk['hints']}")

# 2. Testar ranking de performance com banco vazio.
print("\n--- Teste de performance (vazio/banco) ---")
try:
    perf = ScoringService.get_performance_ranking()
    print(f"Tamanho do ranking: {len(perf)}")
except Exception as e:
    print(f"Teste de performance ignorado: {e}")

print("\n--- Teste de capacidade (vazio/banco) ---")
try:
    cap = ScoringService.get_team_capacity()
    print(f"Tamanho da capacidade: {len(cap)}")
except Exception as e:
    print(f"Teste de capacidade ignorado: {e}")
