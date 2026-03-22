'use client';

import { useState, useEffect, useCallback } from 'react';

export interface StakingInfo {
  walletAddress: string | null;
  stakedAmount: string;
  stakedAmountFormatted: string;
  stakingLevel: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
  tierProgress: number;
  nextTier: {
    level: 'BRONZE' | 'SILVER' | 'GOLD';
    requiredAmount: string;
    requiredAmountFormatted: string;
    amountNeeded: string;
    amountNeededFormatted: string;
  } | null;
  unstakedAt: string | null;
  tiers: {
    NONE: { amount: string; label: string };
    BRONZE: { amount: string; label: string };
    SILVER: { amount: string; label: string };
    GOLD: { amount: string; label: string };
  };
}

export function useStaking() {
  const [staking, setStaking] = useState<StakingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchStaking = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/staking/status');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to fetch staking status');
        return;
      }
      const data = await res.json();
      setStaking(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaking();
  }, [fetchStaking]);

  const verifyStaking = async () => {
    try {
      setVerifying(true);
      setError(null);
      const res = await fetch('/api/staking/verify', {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to verify staking');
        return;
      }
      const data = await res.json();
      // Refresh staking data after verification
      await fetchStaking();
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setVerifying(false);
    }
  };

  const unstake = async () => {
    try {
      setError(null);
      const res = await fetch('/api/staking/status', {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to initiate unstake');
        return;
      }
      const data = await res.json();
      // Refresh staking data after unstake
      await fetchStaking();
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
    }
  };

  const hasStaking = staking && staking.stakingLevel !== 'NONE' && staking.stakedAmount !== '0';

  return {
    staking,
    loading,
    error,
    verifying,
    hasStaking,
    verifyStaking,
    unstake,
    refresh: fetchStaking,
  };
}
