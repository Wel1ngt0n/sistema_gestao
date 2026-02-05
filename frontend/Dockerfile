FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Em desenvolvimento, usamos o servidor do Vite (npm run dev)
CMD ["npm", "run", "dev", "--", "--host"]
