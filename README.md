# Agent Platform

Solana-enabled hosted agent platform with token-based credit purchases and containerized agent sessions.

## Local setup

1. Copy envs:
   ```bash
   cp .env.example .env
   ```
2. Start dependencies:
   ```bash
   docker compose up -d db
   ```
3. Run migrations and seed:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Run app:
   ```bash
   npm run dev
   ```

## Payment API (new)

- `POST /api/purchase-intents`
- `POST /api/purchase-intents/:id/verify`

See `PAYMENTS.md` for invariants and operating guidance.

## Deployment

- CI builds/pushes image to GHCR.
- Runtime secrets must be provided on EC2 (`.env` consumed by compose), not Docker build args.
- Traefik routing uses `APP_HOST` (host only, no port).

See `DEPLOYMENT.md` for deployment details and `SECURITY_AUDIT.md` for risk posture.
