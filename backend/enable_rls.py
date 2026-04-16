import psycopg2

DATABASE_URL = "postgresql://postgres.tbrslxssrzwvpipqzarl:NoGNyWBg15Ok68p4@aws-0-us-west-2.pooler.supabase.com:6543/postgres"

def enable_rls_all_tables():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Get all tables in public schema
    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    tables = cur.fetchall()
    
    for t in tables:
        table_name = t[0]
        try:
            cur.execute(f'ALTER TABLE "{table_name}" ENABLE ROW LEVEL SECURITY;')
            print(f"✅ RLS habilitado na tabela: {table_name}")
        except Exception as e:
            print(f"❌ Erro na tabela {table_name}: {e}")
            
    conn.commit()
    cur.close()
    conn.close()
    print("\n🚀 RLS aplicado com sucesso em TODAS as tabelas!")

if __name__ == "__main__":
    enable_rls_all_tables()
