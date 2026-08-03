# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app

# Copy server package & install prod dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy server files
COPY server/ /app/server/

# Copy built frontend assets to server static folder
COPY --from=frontend-builder /app/client/dist /app/server/public

WORKDIR /app/server
EXPOSE 3001

CMD ["node", "index.js"]
