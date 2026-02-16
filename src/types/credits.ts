export type TransactionType = "PURCHASE" | "USAGE" | "REFUND";
export type TransactionStatus = "PENDING" | "CONFIRMED" | "FAILED" | "EXPIRED";

export interface CreditPackage {
  id: string;
  code: string;
  name: string;
  credits: number;
  tokenAmountDisplay: string;
}

export interface PurchaseIntentResponse {
  intentId: string;
  expectedAmount: string;
  mint: string;
  treasury: string;
  expiresAt: string;
}

export interface CreditTransaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  txSignature: string | null;
  description: string | null;
  createdAt: string;
}
