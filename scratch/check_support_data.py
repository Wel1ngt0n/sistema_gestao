import os
import sys

# Adiciona o diretório raiz ao path para importar o app
sys.path.append(os.getcwd())

from backend.app import create_app, db
from backend.app.models import SupportAgentPerformance, SupportConversation

app = create_app()
with app.app_context():
    print("--- DIAGNÓSTICO DE DADOS DE SUPORTE ---")
    
    perfs = SupportAgentPerformance.query.all()
    print(f"\nTotal de registros de Performance: {len(perfs)}")
    for p in perfs[:10]:
        print(f"Agente: '{p.agent_name}' | Período: {p.period} | Contatos: {p.total_contacts} | NPS: {p.avg_nps}")
        
    convs = SupportConversation.query.count()
    print(f"\nTotal de Conversas: {convs}")
    
    nps_convs = SupportConversation.query.filter(SupportConversation.nps_score.isnot(None)).count()
    print(f"Conversas com NPS: {nps_convs}")
    
    nps_with_agent = SupportConversation.query.filter(
        SupportConversation.nps_score.isnot(None),
        SupportConversation.agent_name.isnot(None)
    ).count()
    print(f"Conversas com NPS e Agente vinculado: {nps_with_agent}")
    
    if nps_convs > 0 and nps_with_agent == 0:
        print("\n[ALERTA] NPS encontrado, mas não está vinculado a nenhum agente!")
        # Mostrar exemplo de conversa com NPS
        sample = SupportConversation.query.filter(SupportConversation.nps_score.isnot(None)).first()
        if sample:
            print(f"Exemplo Conversa ID: {sample.zenvia_conversation_id} | Agente: {sample.agent_name}")
