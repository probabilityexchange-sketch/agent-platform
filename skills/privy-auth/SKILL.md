---
name: privy-auth
description: "Provides expert guidance for integrating Privy for authentication. Use for tasks involving the Privy React SDK (@privy-io/react-auth), social login (Google, Twitter), embedded wallets, external wallet connections, server-side JWT verification, and Privy + Supabase integration."
---

# Privy Auth Skill

This skill equips Manus with the expertise to integrate and manage user authentication using Privy in a React environment.

## Core Workflow

### 1. Frontend Setup (`PrivyProvider`)
Wrap the entire application in `PrivyProvider`.

```typescript
import { PrivyProvider } from "@privy-io/react-auth";

function MyApp({ Component, pageProps }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email", "wallet", "google", "twitter"],
        embeddedWallets: { createOnLogin: "users-without-wallets" },
      }}
    >
      <Component {...pageProps} />
    </PrivyProvider>
  );
}
```

### 2. Accessing User State (`usePrivy`)
**Always wait for `ready` to be `true` before rendering auth-dependent UI.**

```typescript
const { ready, authenticated, login, logout, user } = usePrivy();
if (!ready) return <Spinner />;
```

### 3. Working with Wallets (`useWallets`)
```typescript
const { wallets } = useWallets();
const embeddedWallet = wallets.find(w => w.walletClientType === "privy");
const externalWallet = wallets.find(w => w.walletClientType !== "privy");
```

### 4. Server-Side Verification
```typescript
import { PrivyClient } from "@privy-io/server-auth";

const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

const claims = await privy.verifyAuthToken(token);
// claims.userId is the user Privy DID: "did:privy:xxx"
```

### 5. Privy + Supabase Integration (JWT Bridging)
1. User logs in with Privy on the frontend.
2. Client calls a Supabase Edge Function with the Privy JWT.
3. Edge Function verifies the Privy JWT using `@privy-io/server-auth`.
4. Edge Function mints a custom Supabase JWT for the user's Privy DID.
5. Client uses the Supabase JWT to initialize a Supabase client with full RLS support.

## Key Resources
- **Reference:** `/home/ubuntu/skills/privy-auth/references/reference.md`
- **Privy Docs:** [https://docs.privy.io](https://docs.privy.io)
