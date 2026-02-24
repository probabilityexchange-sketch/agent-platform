"use client";

interface TokenBalanceProps {
  balance: number;
  stakedAmount?: number;
}

export function TokenBalance({ balance, stakedAmount = 0 }: TokenBalanceProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground">$RANDI Balance</p>
          <p className="text-3xl font-bold mt-1 text-primary">{balance.toLocaleString()}</p>
        </div>
        {stakedAmount > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Staked</p>
            <p className="text-sm font-bold text-success">+{stakedAmount.toLocaleString()}</p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-tighter">
        Burn-to-Use Active 🔥
      </p>
    </div>
  );
}
