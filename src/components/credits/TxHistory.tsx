"use client";

import type { TokenTransaction } from "@/types/credits";

interface TxHistoryProps {
  transactions: TokenTransaction[];
}

export function TxHistory({ transactions }: TxHistoryProps) {
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
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div>
              <p className="text-sm font-medium">
                {tx.description || tx.type}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(tx.createdAt).toLocaleDateString()}{" "}
                {new Date(tx.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-medium ${
                  tx.amount > 0 ? "text-success" : "text-foreground"
                }`}
              >
                {tx.amount > 0 ? "+" : ""}
                {tx.amount}
              </p>
              <p className="text-xs text-muted-foreground">{tx.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
