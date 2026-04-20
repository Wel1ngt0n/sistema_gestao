import sys
import os
from datetime import datetime

# Set DATABASE_URL to connect to the Docker Postgres instance
os.environ['DATABASE_URL'] = "postgresql://user:password@localhost:5432/metrics_db"

from app import create_app, db
from app.services.analytics_service import AnalyticsService
from app.models import SystemConfig, Store

app = create_app()

def verify_phase2():
    with app.app_context():
        print(">>> Verifying Phase 2: Capacity & Forecast")
        
        # 1. Verificar Configuração de Pesos
        w_matriz = SystemConfig.query.filter_by(key='weight_matriz').first()
        w_filial = SystemConfig.query.filter_by(key='weight_filial').first()
        print(f"Config: Matriz={w_matriz.value if w_matriz else 'Default(1.0)'}, Filial={w_filial.value if w_filial else 'Default(0.7)'}")
        
        # 2. Testar Capacidade (Validar Soma de Pontos)
        print("\n--- Capacity Check ---")
        capacity = AnalyticsService.get_team_capacity()
        for idx, cap in enumerate(capacity[:5]): # Top 5
            print(f"Implantador: {cap['implantador']}")
            print(f"  > Points: {cap['current_points']} (Max: {cap['max_points']})")
            print(f"  > Utilization: {cap['utilization_pct']}% [{cap['risk_level']}]")
            print(f"  > Active Networks: {cap['active_networks']}")
            
            # Validação Manual (Consultar Banco para 1 caso)
            if idx == 0:
                print("  [AUDIT] Checking DB manually for this user...")
                stores = Store.query.filter_by(implantador=cap['implantador'], status_norm='IN_PROGRESS', manual_finished_at=None).all()
                calc_points = 0
                for s in stores:
                    w = 1.0 if s.tipo_loja == 'Matriz' else 0.7
                    calc_points += w
                print(f"  [AUDIT] DB Sum: {calc_points:.1f} vs Service: {cap['current_points']}")
                if abs(calc_points - cap['current_points']) < 0.1:
                    print("  [OK] CALCULO CORRETO")
                else:
                    print("  [ERROR] DIVERGENCIA DE CALCULO")

        # 3. Testar Forecast
        print("\n--- Forecast Check ---")
        forecast = AnalyticsService.get_financial_forecast(months=6)
        print("Month | Realized | Projected | Future?")
        for f in forecast:
            flag = "[FUTURO]" if f['is_future'] else "[PASSADO]"
            print(f"{f['month']} | R$ {f['realized']:10,.2f} | R$ {f['projected']:10,.2f} | {flag}")
             
        # Checar se existe projeção futura
        future_proj = sum(f['projected'] for f in forecast if f['is_future'])
        if future_proj > 0:
             print(f"\n[OK] Forecast gerou projecao futura: R$ {future_proj:,.2f}")
        else:
             print("\n[WARN] Nenhuma projecao futura gerada (Talvez nao haja WIP ou estimativas falharam)")

if __name__ == "__main__":
    verify_phase2()
