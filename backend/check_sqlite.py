import sqlite3
import os

db_path = r'c:\Users\welin\OneDrive\Documentos\clickup2.5\sistema_gestão2.5\backend\instance\gestao.db'

print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Query to get all integrations that are active
# We want stores where status_norm != 'ARCHIVED' and status != 'Concluído'
# And we check their TaskStep for INTEGRACAO
query = """
SELECT s.store_name, s.status_norm, s.status as store_status, ts.status as step_status, m.current_status
FROM store s
LEFT JOIN task_step ts ON ts.store_id = s.id AND ts.step_list_name = 'INTEGRACAO'
LEFT JOIN integration_metric m ON m.store_id = s.id
WHERE s.status_norm != 'ARCHIVED' 
  AND (s.status != 'Concluído' OR s.status IS NULL)
  AND (ts.status LIKE '%contato%' OR ts.status LIKE '%comunica%' OR ts.status LIKE '%contact%')
"""

cursor.execute(query)
rows = cursor.fetchall()
print(f"Total stores stuck in contato: {len(rows)}")
for r in rows:
    print(f"Store: {r[0]}, status_norm: {r[1]}, store_status: {r[2]}, step_status: {r[3]}, metric_status: {r[4]}")

conn.close()
