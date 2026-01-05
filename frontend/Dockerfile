FROM node:20-alpine

WORKDIR /app

COPY package.json .
# Install dependencies including devDependencies
RUN npm install

COPY . .

# Vite default port
EXPOSE 5173

# Host 0.0.0.0 is crucial for Docker
CMD ["npm", "run", "dev", "--", "--host"]
