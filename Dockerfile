# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY worker-runtime/package.json ./worker-runtime/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY . .
RUN --mount=type=secret,id=server_actions_key,required=false \
    if [ -s /run/secrets/server_actions_key ]; then \
      export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat /run/secrets/server_actions_key)"; \
    fi; \
    pnpm db:generate && pnpm build

FROM base AS production-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY worker-runtime/package.json ./worker-runtime/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter @hefengqi/worker-runtime --prod --frozen-lockfile
RUN pnpm --filter @hefengqi/worker-runtime deploy --prod /worker
COPY prisma/schema.prisma /worker/prisma/schema.prisma
WORKDIR /worker
RUN ./node_modules/.bin/prisma generate

FROM node:22-alpine AS runtime-base
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

FROM runtime-base AS web
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

FROM runtime-base AS worker
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
COPY --from=production-deps --chown=nextjs:nodejs /worker/node_modules ./node_modules
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs src/worker ./src/worker
COPY --chown=nextjs:nodejs src/lib ./src/lib
COPY --chown=nextjs:nodejs src/types ./src/types
COPY --chown=nextjs:nodejs scripts ./scripts
COPY --chown=nextjs:nodejs tsconfig.json package.json ./
USER nextjs
CMD ["./node_modules/.bin/tsx", "src/worker/index.ts"]

FROM web AS runner
