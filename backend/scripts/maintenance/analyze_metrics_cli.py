import sys
import os
from app import create_app, db
from app.models import Store
from sqlalchemy import or_, and_
from datetime import datetime
import statistics

def analyze():
    app = create_app()
    with app.app_context():
        print("--- ANÁLISE DE CALIBRAÇÃO (METRICS DB) ---\n")

        # 1. Distribuição de Ciclo (Concluídas)
        done_stores = Store.query.filter(
            or_(Store.status_norm == 'DONE', Store.manual_finished_at.isnot(None))
        ).all()

        durations = []
        for s in done_stores:
            end = s.manual_finished_at or s.end_real_at or s.finished_at
            start = s.start_real_at or s.created_at
            if start and end:
                days = (end - start).days
                if days >= 0: durations.append(days)
        
        print(f"[1] CICLO DE VIDA (N={len(durations)} lojas concluídas)")
        if durations:
            durations.sort()
            
            mean_val = statistics.mean(durations)
            p50 = statistics.median(durations)
            
            def percentile(data, p):
                k = (len(data)-1) * (p/100.0)
                f = int(k)
                c = int(k) + 1
                if c < len(data):
                    return data[f] + (data[c] - data[f]) * (k - f)
                return data[f]

            p75 = percentile(durations, 75)
            p90 = percentile(durations, 90)
            
            print(f"    Média: {mean_val:.1f} dias")
            print(f"    P50 (Mediana): {p50:.1f} dias")
            print(f"    P75 (Maioria): {p75:.1f} dias")
            print(f"    P90 (Cauda Longa): {p90:.1f} dias")
            print(f"    Max: {max(durations)} dias")
        else:
            print("    Sem dados suficientes.")
        print("-" * 30)

        # 2. Idle / Ociosidade (Lojas em Andamento)
        active_stores = Store.query.filter(
            Store.status_norm == 'IN_PROGRESS',
            Store.manual_finished_at.is_(None)
        ).all()
        
        total_active = len(active_stores)
        if total_active > 0:
            idle_10 = sum(1 for s in active_stores if (s.idle_days or 0) > 10)
            idle_20 = sum(1 for s in active_stores if (s.idle_days or 0) > 20)
        else:
            idle_10 = 0
            idle_20 = 0

        print(f"[2] OCIOSIDADE (N={total_active} lojas ativas)")
        if total_active > 0:
            print(f"    Idle > 10 dias: {idle_10} lojas ({idle_10/total_active*100:.1f}%)")
            print(f"    Idle > 20 dias: {idle_20} lojas ({idle_20/total_active*100:.1f}%)")
        else:
            print("    Sem lojas ativas.")
        print("-" * 30)

        # 3. Inadimplência (Financeiro)
        all_stores_fin = Store.query.filter(Store.financeiro_status.isnot(None), Store.financeiro_status != '').all()
        total_fin = len(all_stores_fin)
        devendo = sum(1 for s in all_stores_fin if 'Devendo' in s.financeiro_status or 'Inadimplente' in s.financeiro_status)

        print(f"[3] FINANCEIRO (N={total_fin} com status)")
        if total_fin > 0:
            print(f"    Inadimplentes/Devendo: {devendo} lojas ({devendo/total_fin*100:.1f}%)")
        else:
            print("    Sem dados financeiros.")
        print("-" * 30)

        # 4. Retrabalho (Qualidade)
        # Considerar Apenas Lojas Concluídas para taxa de qualidade real? 
        # Ou todas? O user pediu "% retrabalho". Geralmente é sobre o entregue ou total.
        # Vou pegar do Total para ver incidencia geral, mas destacar Concluídas
        
        total_qual = len(done_stores)
        if total_qual > 0:
            retrabalho = sum(1 for s in done_stores if s.teve_retrabalho)
            print(f"[4] QUALIDADE (N={total_qual} concluídas)")
            print(f"    Com Retrabalho: {retrabalho} lojas ({retrabalho/total_qual*100:.1f}%)")
        else:
            print("[4] QUALIDADE: Sem lojas concluídas para medir.")
        print("-" * 30)

if __name__ == "__main__":
    analyze()
