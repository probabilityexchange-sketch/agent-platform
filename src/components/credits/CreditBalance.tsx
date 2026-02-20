"use client";

interface CreditBalanceProps {
  balance: number;
  isSubscribed?: boolean;
  expiresAt?: string | null;
}

export function CreditBalance({ balance, isSubscribed, expiresAt }: CreditBalanceProps) {
  if (isSubscribed) {
    const daysLeft = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">Subscription</p>
          <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">Active</span>
        </div>
        <p className="text-2xl font-bold mt-1">Randi Pro</p>
        {daysLeft !== null && (
          <p className="text-xs text-muted-foreground mt-2">
            {daysLeft} days remaining
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <p className="text-sm text-muted-foreground">Credit Balance</p>
      <p className="text-3xl font-bold mt-1">{balance.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-2">
        Subscribe to Randi Pro for unlimited access
      </p>
    </div>
  );
}
