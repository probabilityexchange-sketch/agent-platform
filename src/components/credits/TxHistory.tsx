'use client';

import { useCredits } from '@/hooks/useCredits';
import type { TokenTransaction } from '@/types/credits';
import { useState } from 'react';

interface TxHistoryProps {
  transactions: TokenTransaction[];
}

export function TxHistory({ transactions }: TxHistoryProps) {
  const { refresh } = useCredits();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleReverify = async (tx: TokenTransaction) => {
    let signature = tx.txSignature;
    if (!signature) {
      signature = prompt('Please enter the Solana transaction signature for this deposit:');
      if (!signature) return;
    }

    try {
      setVerifyingId(tx.id);
      const res = await fetch('/api/credits/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txSignature: signature,
          transactionId: tx.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Verification failed' }));
        throw new Error(errData.error || 'Verification failed');
      }

      await refresh();
    } catch (err) {
      console.error('Re-verify failed:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Verification failed. Make sure the transaction is confirmed on-chain.'
      );
    } finally {
      setVerifyingId(null);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
        <p className="text-sm text-muted-foreground">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
      <div className="space-y-3">
        {transactions.map(tx => (
          <div
            key={tx.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{tx.description || tx.type}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(tx.createdAt).toLocaleDateString()}{' '}
                {new Date(tx.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="text-right flex items-center gap-4">
              <div className="hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    tx.amount > 0 ? 'text-success' : 'text-foreground'
                  }`}
                >
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground uppercase">{tx.status}</p>
              </div>

              {tx.status === 'PENDING' && tx.type === 'PURCHASE' && (
                <button
                  disabled={verifyingId === tx.id}
                  onClick={() => handleReverify(tx)}
                  className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold rounded uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {verifyingId === tx.id ? 'Working...' : 'Verify'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
