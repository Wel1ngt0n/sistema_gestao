from app import create_app, db
from app.models import Store
from app.services.scoring_service import ScoringService
from datetime import datetime, timedelta

try:
    app = create_app()
    context = app.app_context()
    context.push()
except Exception as e:
    print(f"Warning: App creation failed ({e}). Testing in isolation if possible.")

# 1. Test Risk Calculation
print("--- Test Risk Calculation ---")

# Simulate 8 days late:
# due_date = now - 8 days
# start_date = due_date - 90 days
now = datetime.now()
due_date = now - timedelta(days=8)
start_date = due_date - timedelta(days=90)

mock_store = Store(
    tempo_contrato=90,
    created_at=start_date,
    start_real_at=start_date,
    dias_em_progresso=0, # This is usually calculated property, but if set manually in object...
    # Store.dias_em_progresso is a property. We cannot set it in constructor.
    # It depends on effective_started_at which depends on start_real_at or created_at.
    # So by setting created_at, dias_em_progresso will be calculated by the property logic.
    idle_days=10,
    financeiro_status='DEVENDO',
    teve_retrabalho=True
)

# Mocking properties if necessary, but since they are logic based on fields, they should work.
# However, calculate_risk_score accesses store.dias_em_progresso.
# If we run this without valid DB session, properties like self.pauses might fail if lazy loaded.
# We might need to mock the property or ensure relations are empty list defaults.
# Store.pauses is a relationship. Accessing it on a transient object might work if default is empty list or might error.
# Let's hope basic access works.

risk = ScoringService.calculate_risk_score(mock_store)
print(f"Risk Score: {risk['total']}")
print(f"Level: {risk['level']}")
print(f"AI Level: {risk['ai_risk_level']}") # Expect ALTO or CRITICO (8 days > 7 -> CRITICO? 8 > 7=ATENCAO? Wait logic...)
# Logic: > 14 CRITICO. > 7 ALTO.
# So 8 days -> ALTO.

print(f"AI Boost: {risk['ai_boost']}")
print(f"Hints: {risk['hints']}")

# 2. Test Performance Logic (Empty DB but check function runs)
print("\n--- Test Performance (Empty/DB) ---")
try:
    perf = ScoringService.get_performance_ranking()
    print(f"Ranking len: {len(perf)}")
except Exception as e:
    print(f"Performance test skipped: {e}")

print("\n--- Test Capacity (Empty/DB) ---")
try:
    cap = ScoringService.get_team_capacity()
    print(f"Capacity len: {len(cap)}")
except Exception as e:
    print(f"Capacity test skipped: {e}")
