from app import create_app, db
from sqlalchemy import text
import sys

app = create_app()

def patch_database():
    """
    Atualiza o esquema do banco de dados sem apagar os dados existentes.
    Adiciona colunas novas se não existirem e cria a tabela SystemConfig.
    """
    print("Iniciando atualização segura do banco de dados...")
    
    with app.app_context():
        # 1. Criar tabelas novas (SystemConfig) se não existirem
        print("Verificando novas tabelas...")
        db.create_all()
        
        # 2. Adicionar colunas novas na tabela 'stores'
        conn = db.engine.connect()
        ctx = conn.begin()
        
        try:
            print("Verificando colunas na tabela 'stores'...")
            
            # Helper para checar e adicionar colunas
            def check_and_add_column(table, column, type_def):
                check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='{column}'")
                result = conn.execute(check_sql).fetchone()
                if not result:
                    print(f" -> Adicionando coluna '{column}' em '{table}'...")
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}"))
                else:
                    print(f" -> Coluna '{column}' já existe.")

            # Adicionando colunas específicas
            check_and_add_column('stores', 'rede', 'VARCHAR(100)')
            check_and_add_column('stores', 'tipo_loja', "VARCHAR(50) DEFAULT 'Filial'")
            check_and_add_column('stores', 'parent_id', 'INTEGER REFERENCES stores(id)')
            check_and_add_column('stores', 'delivered_with_quality', 'BOOLEAN DEFAULT TRUE')
            
            ctx.commit()
            print("\n✅ Banco de dados atualizado com sucesso! Nenhum dado foi perdido.")
            
        except Exception as e:
            ctx.rollback()
            print(f"\n❌ Erro ao atualizar banco: {str(e)}")
            sys.exit(1)
        finally:
            conn.close()

if __name__ == "__main__":
    patch_database()
