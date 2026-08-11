# Build (contexto = raiz do monorepo)
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
COPY packages ./packages

RUN npm ci

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN npx prisma generate
RUN rm -f *.tsbuildinfo \
  && npx tsc -p tsconfig.build.json \
  && test -f dist/main.js \
  && ls -la dist/main.js

# Production
FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
COPY packages ./packages

# Dependências de runtime (prisma está em dependencies para migrate/generate)
RUN npm ci -w @drogamar/backend --omit=dev && npm cache clean --force

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

# Gera o client na imagem final (evita COPY frágil de node_modules/@prisma)
RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.cjs && node dist/main.js"]
