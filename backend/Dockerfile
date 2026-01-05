FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# gcc required for some python packages compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Environment variables
ENV FLASK_APP=run.py
ENV FLASK_RUN_HOST=0.0.0.0
# Ensure stdout/stderr are flushed immediately
ENV PYTHONUNBUFFERED=1 

# Expose port
EXPOSE 5000

# Run
# Permissions
RUN chmod +x entrypoint.sh

# Entrypoint
ENTRYPOINT ["./entrypoint.sh"]

