from datetime import datetime
from app import create_app, db

from app.models import Store

app = create_app()

with app.app_context():
    from app.models import TaskStep

    # Buscar apenas lojas do Derik
    stores = Store.query.filter(Store.implantador.ilike('%Derik%')).all()
    
    with open('results.txt', 'w', encoding='utf-8') as f:
        f.write(f"{'LOJA':<50} | {'ETAPA ATUAL':<20} | {'DIAS NA INTEGRAÇÃO':<10}\n")
        f.write("-" * 90 + "\n")
        
        found = False
        for s in stores:
            # Buscar steps de Integração dessa loja
            # Pode haver mais de um step de integração? Normalmente é um por loja ou uma lista.
            # Vamos buscar se existe algum step ATIVO (não fechado) na lista 'INTEGRACAO'
            
            integration_step = TaskStep.query.filter_by(store_id=s.id, step_list_name='INTEGRACAO').first()
            
            if integration_step and not integration_step.closed_at:
                found = True
                
                # Calcular dias nesse step específico
                # Usar start_real_at do step ou created_at
                start_date = integration_step.start_real_at or integration_step.created_at
                
                days = 0
                if start_date:
                    delta = datetime.now() - start_date
                    days = delta.days
                
                f.write(f"{s.store_name:<50} | {integration_step.step_list_name:<20} | {days:.1f}\n")

        if not found:
            f.write("\nNenhuma loja do Derik encontrada na etapa de INTEGRAÇÃO.\n")
            
    print("Resultados salvos em results.txt")
