from app import create_app, db
from sqlalchemy import text
import re
import sys

app = create_app()
IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

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

            # Valida identificadores antes de montar DDL, que nao aceita parametros bind.
            def validar_identificador(value):
                if not IDENTIFIER_RE.match(value):
                    raise ValueError(f"Identificador SQL invalido: {value}")

            # Auxiliar para checar e adicionar colunas
            def check_and_add_column(table, column, type_def):
                validar_identificador(table)
                validar_identificador(column)

                check_sql = text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name=:table AND column_name=:column"
                )
                result = conn.execute(check_sql, {"table": table, "column": column}).fetchone()
                if not result:
                    print(f" -> Adicionando coluna '{column}' em '{table}'...")
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}"))
                else:
                    print(f" -> Coluna '{column}' já existe.")

            # Adicionando colunas específicas
            check_and_add_column('stores', 'rede', 'VARCHAR(100)')
            check_and_add_column('stores', 'tipo_loja', "VARCHAR(50) DEFAULT 'Filial'")
            check_and_add_column('stores', 'parent_id', 'INTEGER REFERENCES stores(id)')
            check_and_add_column('stores', 'parent_id', 'INTEGER REFERENCES stores(id)')
            check_and_add_column('stores', 'delivered_with_quality', 'BOOLEAN DEFAULT TRUE')
            # Controle de Datas Manual (V4)
            check_and_add_column('stores', 'manual_start_date', 'TIMESTAMP WITHOUT TIME ZONE')
            check_and_add_column('stores', 'is_manual_start_date', 'BOOLEAN DEFAULT FALSE')

            # Colunas para Cache de IA
            check_and_add_column('stores', 'ai_summary', 'TEXT')
            check_and_add_column('stores', 'ai_analyzed_at', 'TIMESTAMP WITHOUT TIME ZONE')

            # Campos de Previsão & CS (V5)
            check_and_add_column('stores', 'address', 'TEXT')
            check_and_add_column('stores', 'state_uf', 'VARCHAR(2)')
            check_and_add_column('stores', 'had_ecommerce', 'BOOLEAN DEFAULT FALSE')
            check_and_add_column('stores', 'previous_platform', 'VARCHAR(100)')
            check_and_add_column('stores', 'deployment_type', "VARCHAR(50) DEFAULT 'MIGRAÇÃO'")
            check_and_add_column('stores', 'projected_orders', 'INTEGER DEFAULT 0')
            check_and_add_column('stores', 'order_rate', 'FLOAT DEFAULT 0.0')
            check_and_add_column('stores', 'manual_go_live_date', 'TIMESTAMP WITHOUT TIME ZONE')
            check_and_add_column('stores', 'forecast_obs', 'TEXT')
            check_and_add_column('stores', 'include_in_forecast', 'BOOLEAN DEFAULT TRUE')

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
