import sqlalchemy
from sqlalchemy import text

db_url = "postgresql://user:password@localhost:5435/metrics_db"
engine = sqlalchemy.create_engine(db_url)

query = """
SELECT s.store_name, s.status_norm, s.status as store_status, ts.status as step_status
FROM stores s
LEFT JOIN tasks_steps ts ON ts.store_id = s.id AND ts.step_list_name = 'INTEGRACAO'
WHERE s.status_norm != 'ARCHIVED' 
  AND (s.status != 'Concluído' OR s.status IS NULL)
  AND (ts.status ILIKE '%contato%' OR ts.status ILIKE '%comunica%' OR ts.status ILIKE '%contact%')
"""

with engine.connect() as conn:
    result = conn.execute(text(query))
    rows = result.fetchall()
    
    print(f"Total stores stuck in contato: {len(rows)}")
    for r in rows:
        print(f"Store: {r[0]}, status_norm: {r[1]}, store_status: {r[2]}, step_status: {r[3]}")
