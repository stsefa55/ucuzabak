FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install
RUN pnpm --filter @ucuzabak/api exec prisma generate --schema=prisma/schema.prisma

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# @ucuzabak/shared workspace paketi dist + .d.ts üretmeden api tsc başarısız olur (temiz CI/Docker).
RUN pnpm --filter @ucuzabak/shared build

WORKDIR /app/apps/api

RUN pnpm install --offline --frozen-lockfile
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

# pg_dump / psql — yedek oluşturma ve geri yükleme (BACKUP_DIR, DATABASE_URL)
# Kurulum doğrulaması: imajda ikili yoksa build burada düşer.
RUN apk add --no-cache openssl postgresql-client \
  && pg_dump --version \
  && psql --version
RUN corepack enable
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/main.js"]