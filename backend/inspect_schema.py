from app import create_app, db
from sqlalchemy import inspect

app = create_app()

def inspect_schema():
    with app.app_context():
        inspector = inspect(db.engine)
        columns = inspector.get_columns('integration_metrics')
        with open("schema_info.txt", "w") as f:
            f.write(f"{'Name':<25} {'Type':<15} {'Nullable'}\n")
            f.write("-" * 50 + "\n")
            for col in columns:
                f.write(f"{col['name']:<25} {str(col['type']):<15} {col['nullable']}\n")
        print("Schema info written to schema_info.txt")

if __name__ == "__main__":
    inspect_schema()
