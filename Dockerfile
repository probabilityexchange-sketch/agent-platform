FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS builder
ARG JWT_SECRET
ARG OPENROUTER_API_KEY
ARG NEXT_PUBLIC_PRIVY_APP_ID
ARG NEXT_PUBLIC_DEV_AUTH_BYPASS
ENV JWT_SECRET=$JWT_SECRET
ENV OPENROUTER_API_KEY=$OPENROUTER_API_KEY
ENV OPENAI_API_KEY="sk-placeholder"
ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_DEV_AUTH_BYPASS=$NEXT_PUBLIC_DEV_AUTH_BYPASS
ENV DATABASE_URL="postgresql://localhost:5432/db?schema=public"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && \
    groupadd --gid 992 docker-host && \
    useradd --system --uid 1001 --groups docker-host nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

RUN mkdir -p .next/cache && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
