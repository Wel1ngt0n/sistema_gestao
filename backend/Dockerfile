FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# gcc required for some python packages compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    # Install tzdata for timezone configuration
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Set Timezone to Brazil
ENV TZ=America/Sao_Paulo

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
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# Entrypoint
ENTRYPOINT ["./entrypoint.sh"]

