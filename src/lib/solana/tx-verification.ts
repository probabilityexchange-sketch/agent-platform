import { PublicKey } from "@solana/web3.js";
import { connection } from "./connection";

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

export async function verifyTransaction(
  txSignature: string,
  expectedMint: string,
  expectedRecipient: string,
  expectedTreasuryAmount: bigint,
  expectedMemo: string,
  expectedBurnAmount: bigint = BigInt(0)
): Promise<VerificationResult> {
  try {
    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx) {
      return { valid: false, error: "Transaction not found" };
    }

    if (tx.meta?.err) {
      return { valid: false, error: "Transaction failed on-chain" };
    }

    const instructions = tx.transaction.message.instructions;

    let transferredToTreasury = BigInt(0);
    let burnedAmount = BigInt(0);
    const treasuryKey = new PublicKey(expectedRecipient);
    const mintKey = new PublicKey(expectedMint);
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");
    const expectedATA = await getAssociatedTokenAddress(mintKey, treasuryKey);

    for (const ix of instructions) {
      if (!("parsed" in ix) || !ix.parsed?.type) continue;

      if (ix.parsed.type === "transferChecked") {
        const info = ix.parsed.info;
        const mintAddress = info.mint;
        const destination = info.destination;
        const tokenAmount = BigInt(info.tokenAmount.amount);

        if (mintAddress !== expectedMint) continue;
        if (destination !== expectedATA.toBase58()) continue;

        transferredToTreasury += tokenAmount;
      }

      if (ix.parsed.type === "burnChecked") {
        const info = ix.parsed.info;
        const mintAddress = info.mint;
        const tokenAmount = BigInt(info.tokenAmount.amount);

        if (mintAddress !== expectedMint) continue;
        burnedAmount += tokenAmount;
      }
    }

    if (transferredToTreasury === BigInt(0)) {
      return { valid: false, error: "No SPL transfer found in transaction" };
    }

    if (transferredToTreasury < expectedTreasuryAmount) {
      return { valid: false, error: "Insufficient transfer amount" };
    }

    if (expectedBurnAmount > BigInt(0) && burnedAmount < expectedBurnAmount) {
      return { valid: false, error: "Insufficient burn amount" };
    }

    // Verify memo
    const logMessages = tx.meta?.logMessages || [];
    const memoFound = logMessages.some(
      (log) =>
        log.includes("Memo") && log.includes(expectedMemo)
    );

    if (!memoFound) {
      return { valid: false, error: "Memo mismatch" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
