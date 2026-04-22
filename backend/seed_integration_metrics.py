import random
from datetime import datetime, timedelta
from app import create_app, db
from app.models import Store, IntegrationMetric

app = create_app()

def seed_integration_metrics():
    with app.app_context():
        print(">>> Iniciando Seeding de Métricas de Integração...")
        
        stores = Store.query.filter(Store.status_norm != 'CANCELLED').all()
        print(f">>> Encontradas {len(stores)} lojas ativas.")
        
        created_count = 0
        updated_count = 0
        errors = 0
        
        for store in stores:
            try:
                # Check if metric exists
                metric = IntegrationMetric.query.filter_by(store_id=store.id).first()
                
                if not metric:
                    metric = IntegrationMetric(store_id=store.id, snapshot_date=datetime.now().date())

                    created_count += 1
                else:
                    updated_count += 1
                    
                # Populate logic based on store status
                # Se loja concluída (DONE), gerar histórico fictício realista
                if store.status_norm == 'DONE':
                    # Start date random 30-90 days ago
                    days_ago = random.randint(30, 90)
                    start_date = datetime.now() - timedelta(days=days_ago)
                    metric.start_date = start_date
                    
                    # End date random 10-40 days after start
                    duration = random.randint(10, 40)
                    end_date = start_date + timedelta(days=duration)
                    metric.end_date = end_date
                    
                    metric.sla_days = duration
                    
                    # Random Quality
                    metric.post_go_live_bugs = random.choices([0, 1, 2, 3], weights=[70, 20, 5, 5])[0]
                    metric.documentation_status = 'DONE'
                    metric.churn_risk = False
                    
                # Se loja em progresso (IN_PROGRESS)
                elif store.status_norm == 'IN_PROGRESS':
                    # Start date random 5-30 days ago
                    days_ago = random.randint(5, 30)
                    start_date = datetime.now() - timedelta(days=days_ago)
                    metric.start_date = start_date
                    metric.end_date = None
                    
                    metric.documentation_status = random.choice(['PENDING', 'PARTIAL'])
                    metric.churn_risk = random.choice([True, False, False, False]) # 25% risk
                    
                # Points logic
                metric.points = 1.0 if store.tipo_loja == 'Matriz' else 0.7
                
                # Legacy Fields (Explicit population to avoid constraints issues)
                metric.lead_time_days = metric.sla_days if metric.sla_days else 0
                metric.ticket_count = 0
                metric.has_blocking_issue = False
                metric.last_blocker_reason = None
                metric.snapshot_date = datetime.now().date()
                
                db.session.add(metric)
                db.session.commit()
                
            except Exception as e:
                db.session.rollback()
                error_msg = f"Erro na loja {store.id} ({store.store_name}): {e}\n"
                print(error_msg)
                with open("seeding_errors.log", "a", encoding="utf-8") as f:
                    f.write(error_msg)
                errors += 1
            
        print(f">>> Seeding Concluído! Criados: {created_count}, Atualizados: {updated_count}, Erros: {errors}")

if __name__ == "__main__":
    seed_integration_metrics()
