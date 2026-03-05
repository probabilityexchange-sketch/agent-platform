# Payments Runbook

This document is the operator guide for token purchase-intent and credits-ledger flows in production. For a high-level conceptual overview of how Randi handles different types of payments, see the **[Payments Explainer](docs/PAYMENTS_EXPLAINER.md)**.

## Scope

Applies to:
- Purchase intent creation and verification
- Credit grants and balance updates
- Ledger reconciliation and incident handling

## Normal Flow

1. Client creates purchase intent.
2. Client submits on-chain transfer.
3. Client calls verify endpoint with intent and tx.
4. Server verifies transaction and records ledger mutation.
5. Credits balance reflects confirmed transaction.

## Operator Checklist (Deploy Day)

Before deploy:
- [ ] Confirm production token mint and treasury wallet are correct.
- [ ] Confirm DB migration and seed are included in rollout sequence.
- [ ] Take DB snapshot.

After deploy:
- [ ] Create a test purchase intent.
- [ ] Verify with a known valid tx path.
- [ ] Confirm expected credit increment.
- [ ] Confirm duplicate verify requests do not double-credit.
- [ ] Check route logs for `purchase-intents` and `credits`.

## Incident Response Quick Path

Use this when users report missing or duplicated credits.

1. Triage
- Identify affected user(s), wallet(s), tx signature(s), intent id(s), and timestamp window.
- Confirm whether issue is single-user or widespread.

2. Contain
- If duplication is active, temporarily gate verify traffic path.
- If verification is failing globally, pause frontend verification retries.

3. Diagnose
- Check app logs around:
  - purchase intent create
  - purchase intent verify
  - credits ledger writes
- Determine one of:
  - tx invalid/rejected
  - tx valid but ledger write failed
  - duplicate verify race/idempotency failure
  - stale pending intent

4. Recover
- For missing credits with valid tx: perform controlled manual reconciliation adjustment.
- For duplicate credits: reverse excess credits with audit note.
- Re-enable normal traffic only after smoke test passes.

5. Closeout
- Record root cause, affected users, corrective action, and prevention action.

## Reconciliation Workflow

Run this after each production rollout and during payment incidents.

1. Compare totals:
- Verified purchase intents vs confirmed credit transactions
- Sum of expected credits vs applied credits

2. Check anomalies:
- Duplicate tx signatures
- Intents stuck in `PENDING` beyond SLA
- Failed verifications with eventually successful tx
- Unexpected negative user balances

3. Resolve:
- Open reconciliation ticket with user ids + tx signatures + intent ids.
- Apply manual corrections with explicit audit notes.
- Re-run checks to confirm zero drift.

## Rollback Safety

If credits integrity is uncertain:
1. Pause verification path.
2. Roll application back to known-good image.
3. Restore DB snapshot if mismatch cannot be safely repaired forward.
4. Reconcile and verify before re-opening payment flow.
