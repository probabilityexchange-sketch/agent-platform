import { describe, expect, it } from 'vitest';
import {
  MAX_SYNC_ATTEMPTS,
  buildSyncFailureState,
} from './auth-sync';

describe('buildSyncFailureState', () => {
  it('keeps the current attempt count unchanged when a sync fails', () => {
    const state = buildSyncFailureState(1, 1000, null);

    expect(state.attempts).toBe(1);
    expect(state.exhausted).toBe(false);
    expect(state.nextRetryAt).toBe(4000);
  });

  it('only exhausts retries when the current attempt count reaches the max', () => {
    const state = buildSyncFailureState(MAX_SYNC_ATTEMPTS, 1000, 5000);

    expect(state.attempts).toBe(MAX_SYNC_ATTEMPTS);
    expect(state.exhausted).toBe(true);
    expect(state.nextRetryAt).toBe(6000);
  });
});
