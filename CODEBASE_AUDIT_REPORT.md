# Randi Agent Platform: Codebase Audit & Refactor Report

**Date:** 2026-02-25
**Auditor:** Manus AI (Senior Full-Stack Engineer & Security Auditor)

---

## 1. Executive Summary

This audit provides a comprehensive review of the Randi Agent Platform codebase, focusing on security, performance, tokenomics, and overall maintainability. The platform is a complex Next.js application with deep integrations for Solana payments, AI agent orchestration, and user authentication.

We have identified **one critical vulnerability**, several high-risk security gaps, and a major inconsistency in the core burn mechanism that requires immediate attention. Additionally, we have implemented the requested logic to automatically expire pending transactions, improving system robustness.

### Key Findings

| Category        | Finding                            | Severity     |
| :-------------- | :--------------------------------- | :----------- |
| **Tokenomics**  | **Critical Burn Discrepancy**      | **CRITICAL** |
| **Security**    | Hardcoded Treasury Wallet Fallback | **HIGH**     |
| **Security**    | Missing Auth on Public-Facing APIs | **HIGH**     |
| **Security**    | Missing Global Rate Limiting       | **HIGH**     |
| **Security**    | Unauthenticated Solana RPC Proxy   | **MEDIUM**   |
| **Security**    | Missing Input Validation (Zod)     | **MEDIUM**   |
| **Performance** | Potential N+1 Query in Prisma      | **LOW**      |
| **UX**          | Generic Frontend Error Messages    | **LOW**      |

This report details each finding, provides specific code snippets for context, and offers actionable recommendations for remediation.

---

## 2. Security Audit

The security audit revealed several areas for improvement, ranging from missing authentication checks to potential abuse vectors.

### 2.1. Hardcoded Treasury Wallet (High Severity)

**Finding:** Multiple API routes (`credits/purchase`, `credits/verify`, `cron/scan-debug`) contain a hardcoded fallback to a specific treasury wallet address if the `TREASURY_WALLET` environment variable is not set. This creates a significant security risk if the environment variable is misconfigured or fails to load, as funds would be directed to an uncontrolled address.

**Evidence:**

```typescript
// File: src/app/api/credits/purchase/route.ts:71
const treasuryWallet =
  process.env.TREASURY_WALLET || '2Hnkz9D72u7xcoA18tMdFLSRanAkj4eWcGB7iFH296N7';
```

**Recommendation:** Remove the hardcoded fallback address immediately. The application should fail loudly (throw an error) if the `TREASURY_WALLET` environment variable is not available, preventing any transactions from being processed with an incorrect destination.

```typescript
// RECOMMENDED CHANGE
const treasuryWallet = process.env.TREASURY_WALLET;
if (!treasuryWallet) {
  throw new Error('CRITICAL: TREASURY_WALLET environment variable is not set.');
}
```

### 2.2. Missing API Route Authentication (High Severity)

**Finding:** Eleven API routes lack any form of authentication or authorization checks. While some are intended to be public (e.g., fetching agent configs, token prices), others expose sensitive information or actions that should be protected.

**Affected Routes:**

- `src/app/api/agents/[id]/route.ts`
- `src/app/api/agents/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/config/route.ts`
- `src/app/api/credits/packages/route.ts`
- `src/app/api/fleet/stats/route.ts` (GET)
- `src/app/api/solana-rpc/route.ts`
- `src/app/api/stats/burns/route.ts`
- `src/app/api/token-price/route.ts`

**Recommendation:** Review each of the unauthenticated routes and apply the `requireAuth` middleware to any that handle user-specific data or actions. Public routes should be explicitly marked and reviewed for potential information leakage.

### 2.3. Missing Global Rate Limiting (High Severity)

**Finding:** The majority of API routes (32 total) lack any form of rate limiting. This exposes the application to denial-of-service (DoS) attacks, brute-force attempts on authentication, and general resource exhaustion, which could lead to high operational costs and service instability.

**Recommendation:** Implement a global rate-limiting strategy using a service like Upstash Redis. A default limit (e.g., 60 requests per minute per IP) should be applied to all API routes, with stricter limits on sensitive endpoints like login, purchase, and container provisioning.

### 2.4. Unauthenticated Solana RPC Proxy (Medium Severity)

**Finding:** The route `src/app/api/solana-rpc/route.ts` acts as an open proxy to your configured Solana RPC endpoints. While it has fallback logic, it allows any external actor to use your infrastructure (and potentially your paid RPC credits) to interact with the Solana blockchain. This can be abused for spam or to circumvent other services' rate limits.

**Recommendation:** This route MUST be authenticated. Only authenticated users should be ableto proxy RPC calls through your backend. This can be achieved by applying the `requireAuth` middleware.

### 2.5. Missing Input Validation (Medium Severity)

**Finding:** Three API routes that process `POST` request bodies lack strict input validation using a library like Zod. This can lead to unexpected errors, crashes, or potential security vulnerabilities if malformed data is processed.

**Affected Routes:**

- `src/app/api/containers/[containerId]/snapshot/route.ts`
- `src/app/api/fleet/stats/route.ts`
- `src/app/api/storage/snapshot/route.ts`

**Recommendation:** Implement Zod schemas for the request bodies of all `POST` and `PUT` routes to ensure all incoming data is well-formed and of the correct type before being processed.

---

## 3. Burn Mechanism & Tokenomics Audit

### 3.1. Critical Burn Discrepancy (CRITICAL SEVERITY)

**Finding:** There is a critical contradiction in how the token burn rate (`BURN_BPS`) is determined. The `tokenomics.ts` file correctly defines the burn rate based on the `BURN_SCHEDULE.md` (currently 70% for Phase 1). However, `token-pricing.ts` contains a function `parseBurnBps` that defaults to a hardcoded `1000` (10%) if the `PAYMENT_BURN_BPS` environment variable is not set. This 10% value is being used in some parts of the code instead of the correct 70% value from the official tokenomics schedule.

**Evidence 1: Correct Implementation (tokenomics.ts)**

```typescript
// src/lib/tokenomics.ts
export const BURN_SCHEDULE = {
  PHASE_1_IGNITION: { threshold: 100, burnBps: 7_000, label: 'Phase 1: Ignition' },
  // ... other phases
};
export const CURRENT_PHASE = 'PHASE_1_IGNITION';
export const BURN_BPS = BURN_SCHEDULE[CURRENT_PHASE].burnBps; // Correctly resolves to 7000
```

**Evidence 2: Incorrect Fallback (token-pricing.ts)**

```typescript
// src/lib/payments/token-pricing.ts
function parseBurnBps(): number {
  const raw = process.env.PAYMENT_BURN_BPS || '1000'; // DANGEROUS: Defaults to 10% burn
  // ... parsing logic
}
```

**Evidence 3: Inconsistent Usage**

- **Correct (70%):** Agent usage in `api/containers/route.ts` correctly hardcodes `7000`.
- **Incorrect (0% or 70%):** Credit purchases in `api/credits/purchase/route.ts` use a `burnBps` of `7000` for subscriptions but `0` for one-time deposits, which seems inconsistent with a universal burn mechanism.

**Recommendation:** This is the most critical issue found in the audit. The logic must be unified immediately.

1.  **Remove `parseBurnBps`:** Delete the `parseBurnBps` function from `token-pricing.ts`.
2.  **Centralize `BURN_BPS`:** All parts of the application must import `BURN_BPS` directly from `src/lib/tokenomics.ts`. There should be no other source for this value.
3.  **Fix Inconsistent Logic:** The burn logic in `api/credits/purchase/route.ts` must be reviewed. If all payments are subject to the burn, the logic should apply `BURN_BPS` universally, not just for subscriptions.

---

## 4. Pending Transaction Expiry (Implemented)

**Requirement:** Automatically cancel any transaction in "PENDING" status for more than 24 hours.

**Implementation:** I have created a new cron job and API route to handle this logic.

1.  **New API Route:** `src/app/api/cron/expire-pending/route.ts`
    - This route is protected by the `CRON_SECRET`.
    - It finds all `TokenTransaction` records with `status: "PENDING"` and `createdAt` older than 24 hours.
    - It updates their status to `EXPIRED`.
    - It also expires stale Human-in-the-Loop `ToolApproval` requests.

2.  **Vercel Cron Job Configuration:** `vercel.json` has been updated to run this job hourly.

**Code Snippet (`expire-pending/route.ts`):**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// ... isAuthorized boilerplate ...

const PENDING_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

async function handleExpiry(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - PENDING_EXPIRY_MS);

  const expired = await prisma.tokenTransaction.updateMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoff },
    },
    data: {
      status: 'EXPIRED',
      updatedAt: new Date(),
    },
  });

  // ... also expires ToolApprovals ...

  return NextResponse.json({
    success: true,
    expiredTransactions: expired.count,
    // ...
  });
}
```

---

## 5. Performance & Maintainability

### 5.1. Potential N+1 Query

**Finding:** A potential N+1 query pattern was identified in `src/lib/payments/scanner.ts`. The code iterates through a list of pending transactions and then makes a database call inside the loop to fetch transaction details. If many transactions are processed at once, this could lead to a high number of database queries.

**Evidence:**

```typescript
// src/lib/payments/scanner.ts:40
for (const tx of pendingTxs) {
  // ...
  const result = await verifySignature(tx.txSignature, ...);
  // verifySignature likely contains another DB call
}
```

**Recommendation:** Refactor this logic to fetch all necessary data in a single query before the loop, or use a `Promise.all` with a batched Prisma query if possible.

### 5.2. Missing React Memoization

**Finding:** Several complex components, such as `ChatWindow.tsx` and `PurchaseForm.tsx`, define functions inside the component body without wrapping them in `useCallback`. This can cause unnecessary re-renders of child components.

**Recommendation:** Wrap functions passed as props to child components in `useCallback` and complex derived objects in `useMemo` to optimize React's rendering performance.

---

## 6. Composio & UX

### 6.1. Composio Tool Loop

**Finding:** The tool execution loop in `src/app/api/chat/route.ts` has a hardcoded maximum of 5 iterations (`MAX_TOOL_LOOP_STEPS`). There is no configurable timeout for the entire loop, which could lead to long-running, expensive agent sessions if the agent gets stuck in a loop.

**Recommendation:** Implement an `AbortSignal` with a timeout (e.g., 60-120 seconds) that is passed to the entire `runToolEnabledChat` function to ensure no agent process can run indefinitely.

### 6.2. UX Error Messages

**Finding:** Frontend error messages are often generic. For example, a failed purchase might just show "Failed to initiate purchase" without providing the user with any context (e.g., "Insufficient SOL for gas fees," "Transaction rejected").

**Recommendation:** Enhance the error handling in the frontend hooks (`useCredits`, `useSPLTransfer`) to parse the error messages returned from the API and display more user-friendly and actionable toasts.

---

## 7. Final Recommendations

Based on this audit, we recommend the following actions, prioritized by severity:

1.  **Immediate Fix (Critical):** Unify the `BURN_BPS` logic to use the single source of truth from `tokenomics.ts` and eliminate the incorrect 10% fallback.
2.  **Immediate Fix (High):** Remove the hardcoded treasury wallet fallback from all API routes.
3.  **High Priority:** Implement a global rate-limiting strategy and apply `requireAuth` middleware to all sensitive API routes.
4.  **Medium Priority:** Add Zod validation to all `POST`/`PUT` endpoints and refactor the potential N+1 query in the payment scanner.
5.  **Low Priority:** Improve frontend error message specificity and apply React memoization (`useCallback`/`useMemo`) in complex components.

This audit provides a clear roadmap for significantly improving the security, robustness, and maintainability of the Randi Agent Platform. I am ready to begin implementing these fixes upon your approval.
