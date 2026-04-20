import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:XNLVT3Lm8viPXK6f@db.klnntuqbigegopbmzcly.supabase.co:5432/postgres")
    cur = conn.cursor()
    cur.execute("SELECT id, store_name, created_at, start_real_at, manual_finished_at, end_real_at, finished_at, status_norm FROM stores WHERE store_name ILIKE '%Bem Hortifruti%';")
    stores = cur.fetchall()
    print("STORES:")
    for s in stores:
        print(s)
        cur.execute(f"SELECT * FROM store_pauses WHERE store_id = {s[0]}")
        print("PAUSES:", cur.fetchall())
except Exception as e:
    print("ERROR:", e)
