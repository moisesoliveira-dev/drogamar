# Build (contexto = raiz do monorepo)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/

RUN npm ci -w @drogamar/backend

COPY apps/backend ./apps/backend
RUN npm run build -w @drogamar/backend

# Production
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/

RUN npm ci -w @drogamar/backend --omit=dev && npm cache clean --force

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 3000

USER node

CMD ["node", "dist/main.js"]
