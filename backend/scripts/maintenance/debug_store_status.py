from app import create_app
from app.models import db, Store
from app.services.metrics import MetricsService

app = create_app()

with app.app_context():
    # 1. Localizar a loja
    search = "Mix Bahia Vilas"
    store = Store.query.filter(Store.store_name.ilike(f"%{search}%")).first()
    
    if not store:
        print(f"Loja '{search}' nao encontrada!")
    else:
        print("--- LOJA ANTES ---")
        print(f"Nome: {store.store_name}")
        print(f"Status: {store.status}")
        print(f"Status normalizado: {store.status_norm}")
        print(f"Finalizacao manual em: {store.manual_finished_at}")
        print(f"Finalizacao em: {store.finished_at}")
        
        # Verifica a etapa de treinamento.
        print("--- ETAPA DE TREINAMENTO ---")
        training_step = None
        for s in store.steps:
            if "TREINAMENTO" in s.step_list_name:
                training_step = s
                print(f"Etapa: {s.step_name} | Status: {s.status} | Fim: {s.end_real_at}")
        
        # 2. Aplicar regra de conclusao.
        print("--- APLICANDO REGRA ---")
        metrics = MetricsService()
        metrics.apply_training_completion_rule(store)
        
        if db.session.dirty:
            print("Alteracoes detectadas!")
            db.session.commit()
            print("Salvo.")
        else:
            print("Nenhuma alteracao detectada pelo SQLAlchemy.")
            
        print("--- LOJA DEPOIS ---")
        print(f"Status: {store.status}")
        print(f"Status normalizado: {store.status_norm}")
        print(f"Finalizacao em: {store.finished_at}")
