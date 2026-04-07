FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# Install dependencies with verbose logging and timeouts to prevent silent hanging
RUN npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm install --verbose --legacy-peer-deps

COPY . .

# Vite default port
EXPOSE 5173

# Host 0.0.0.0 is crucial for Docker
CMD ["npm", "run", "dev", "--", "--host"]
