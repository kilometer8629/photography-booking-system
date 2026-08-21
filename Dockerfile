FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build:frontend

# Production image
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/public /app/public
COPY server ./server

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
