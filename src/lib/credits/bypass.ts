const BYPASS_WALLETS = [
  "0xd7ba546746860e8a8347d4c63e02131f0d0683cf",
  "dzejejwherrr8gtpyrdq4mgfw1lhuk5getvfwt6rqdzs",
  "dev-bypass-wallet",
];

const BYPASS_CREDITS = 1000000;

export function isBypassWallet(wallet: string): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return BYPASS_WALLETS.includes(wallet.toLowerCase());
}

export function getBypassCredits(): number {
  return BYPASS_CREDITS;
}

export function getCreditsWithBypass(wallet: string, actualBalance: number): number {
  if (isBypassWallet(wallet)) {
    return BYPASS_CREDITS;
  }
  return actualBalance;
}
