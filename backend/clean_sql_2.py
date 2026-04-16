import re

with open("migration_2_local.sql", "r", encoding="utf-8") as f:
    sql_content = f.read()

# Replace bad string artifacts for Float columns
sql_content = sql_content.replace("'Não paga mensalidade'", "0.0")
sql_content = sql_content.replace("'Não pagou a entrada'", "0.0")
sql_content = sql_content.replace("'Cancelou'", "0.0")

# Write back with Disable FK Constraints header and footer
with open("migration_2_clean.sql", "w", encoding="utf-8") as f:
    f.write("SET session_replication_role = replica;\n")
    f.write(sql_content)
    f.write("\nSET session_replication_role = 'origin';\n")

print("SQL 2 Cleansed!")
