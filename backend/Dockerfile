FROM python:3.9-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Instalar dependências python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código (embora seja montado via volume em dev)
COPY . .

# Comando de start (Development)
CMD ["python", "run.py"]
