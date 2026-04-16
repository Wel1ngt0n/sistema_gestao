import psycopg2
conn = psycopg2.connect('postgresql://user:password@localhost:5435/metrics_db')
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = cur.fetchall()
print('Local DB Tables:')
for t in tables:
    cur.execute(f'SELECT count(*) FROM "{t[0]}"')
    count = cur.fetchone()[0]
    print(f'{t[0]}: {count}')
