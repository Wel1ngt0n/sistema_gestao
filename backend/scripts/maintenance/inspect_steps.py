from app import create_app, db
from app.models import TaskStep
from sqlalchemy import distinct

app = create_app()

with app.app_context():
    # Listar nomes distintos de listas e steps para identificar "Integração"
    lists = db.session.query(distinct(TaskStep.step_list_name)).all()
    with open('steps_results.txt', 'w', encoding='utf-8') as f:
        f.write("LISTAS ENCONTRADAS:\n")
        for l in lists:
            f.write(f"- {l[0]}\n")
            
        f.write("\nSTEPS COM 'INTEGRA' NO NOME:\n")
        steps = TaskStep.query.filter(TaskStep.step_name.ilike('%integra%')).limit(10).all()
        for s in steps:
            f.write(f"List: {s.step_list_name} | Step: {s.step_name}\n")
            
    print("Salvo em steps_results.txt")
