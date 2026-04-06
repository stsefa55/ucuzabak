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
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules

# @ucuzabak/shared workspace paketi dist + .d.ts üretmeden worker tsc başarısız olur (temiz CI/Docker).
RUN pnpm --filter @ucuzabak/shared build

WORKDIR /app/apps/worker

RUN pnpm install --offline --frozen-lockfile
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/worker/dist ./apps/worker/dist

WORKDIR /app/apps/worker

CMD ["node", "dist/main.js"]