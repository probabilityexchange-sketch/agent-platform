export const DEFAULT_RETRY_DELAY_MS = 3000;
export const PRIVY_RATE_LIMIT_RETRY_MS = 15000;
export const FINALIZE_TIMEOUT_MS = 12000;
export const SESSION_CONFIRM_TIMEOUT_MS = 15000;
export const SESSION_CONFIRM_POLL_MS = 150;
export const MAX_SYNC_ATTEMPTS = 3;

export type SyncFailureState = {
  attempts: number;
  exhausted: boolean;
  nextRetryAt: number;
};

export function buildSyncFailureState(
  attempts: number,
  now: number,
  retryAfterMs: number | null
): SyncFailureState {
  return {
    attempts,
    exhausted: attempts >= MAX_SYNC_ATTEMPTS,
    nextRetryAt: now + (retryAfterMs ?? DEFAULT_RETRY_DELAY_MS),
  };
}
