import re

file_path = "migration_final_local.sql"
with open(file_path, "r", encoding="utf-8") as f:
    sql_content = f.read()

# Replace known bad SQLite strings in Float fields with 0.0
sql_content = sql_content.replace("'Não paga mensalidade'", "0.0")
sql_content = sql_content.replace("'Não pago mensalidade'", "0.0")

# Write back cleansed file
with open("migration_final_clean.sql", "w", encoding="utf-8") as f:
    f.write(sql_content)

print("SQL Cleansed!")
