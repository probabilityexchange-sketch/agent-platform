---
description: Auth architecture — Privy is the ONLY sign-in system
---

# Auth Architecture

## ⚠️ CRITICAL: Only ONE auth system exists

This app uses **Privy** as the sole authentication provider. There is NO
secondary Solana wallet-adapter sign-in flow. Do NOT introduce one.

---

## How It Works

### 1. Privy handles the user-facing login
- `src/contexts/PrivyContext.tsx` wraps the entire app with `<PrivyProvider>`
- Users log in via Privy's modal (wallet or email)
- Privy issues an **access token** (short-lived JWT)

### 2. `useAuth` hook (src/hooks/useAuth.ts) syncs to a server session
- Calls `POST /api/auth/privy-session` with the Privy access token as `Authorization: Bearer <token>`
- The server verifies the token with Privy, upserts the user in Postgres, and sets an **httpOnly `auth-token` cookie** (24h)
- The cookie is what Next.js middleware reads to protect routes

### 3. Middleware gate (src/middleware.ts)
- Reads the `auth-token` cookie
- Validates it via `isValidEdgeAuthToken` (Edge-compatible JWT verify)
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from `/login` → `/dashboard`

---

## Canonical Files

| Role | File |
|---|---|
| Privy provider | `src/contexts/PrivyContext.tsx` |
| Auth hook (use this) | `src/hooks/useAuth.ts` |
| Session API | `src/app/api/auth/privy-session/route.ts` |
| Auth middleware | `src/middleware.ts` |
| Server-side auth guard | `src/lib/auth/middleware.ts` |
| JWT sign / verify | `src/lib/auth/jwt.ts` |
| Logout | `src/app/api/auth/logout/route.ts` |
| Current user | `src/app/api/auth/me/route.ts` |

---

## ❌ Legacy Files — DELETED, Do Not Recreate

These files were part of the OLD nonce-based Solana wallet-adapter auth flow
that caused the **double sign-in bug**. They have been removed.

| File | Why removed |
|---|---|
| `src/contexts/WalletContext.tsx` | Parallel auth system; orphaned after Privy migration |
| `src/app/api/auth/verify/route.ts` | Only used by WalletContext (nonce signature verify) |
| `src/app/api/auth/nonce/route.ts` | Only used by WalletContext |
| `@solana/wallet-adapter-react` provider | Replaced by Privy's native Solana support |

**Root cause of the double sign-in**: `WalletContext.tsx` exported a `useAuth`
hook with the same name as `src/hooks/useAuth.ts`. When mounted, its
`useEffect` auto-triggered a second sign-message prompt immediately after
Privy's own login completed.

---

## Checklist When Touching Auth

- [ ] `useAuth` import → always from `@/hooks/useAuth`, never from a context
- [ ] Never add a second `<WalletProvider>` or `<ConnectionProvider>` to the layout
- [ ] Cookie domain is `.randi.chat` in production — ensure this matches the deployed domain
- [ ] `dev-session` route (`/api/auth/dev-session`) is for development only — guarded by `NODE_ENV`
- [ ] `DEMO_AUTH_BYPASS` env var bypasses Privy verification — never set this in production
