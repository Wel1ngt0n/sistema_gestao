import sqlalchemy
from sqlalchemy import text

db_url = "postgresql://user:password@localhost:5435/metrics_db"
engine = sqlalchemy.create_engine(db_url)

query = """
SELECT s.store_name, ts.clickup_task_id, ts.status
FROM stores s
JOIN tasks_steps ts ON ts.store_id = s.id AND ts.step_list_name = 'INTEGRACAO'
WHERE s.store_name ILIKE '%medeiros%'
"""

with engine.connect() as conn:
    result = conn.execute(text(query))
    rows = result.fetchall()
    
    for r in rows:
        print(f"Store: {r[0]}, clickup_task_id: {r[1]}, local step_status: {r[2]}")
