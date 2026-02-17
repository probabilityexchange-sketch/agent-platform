import { PublicKey } from "@solana/web3.js";
import { connection } from "./connection";

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

function hasExpectedMemo(
  logMessages: string[] | null | undefined,
  expectedMemo: string
): boolean {
  if (!logMessages || logMessages.length === 0) return false;
  return logMessages.some(
    (log) => log.includes("Memo") && log.includes(expectedMemo)
  );
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

    if (!hasExpectedMemo(tx.meta?.logMessages, expectedMemo)) {
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

interface NativeSolVerificationParams {
  txSignature: string;
  expectedRecipient: string;
  expectedTreasuryAmountLamports: bigint;
  expectedMemo: string;
  expectedBurnAmountLamports?: bigint;
  expectedBurnRecipient?: string;
  expectedSender?: string;
}

export async function verifyNativeSolTransaction(
  params: NativeSolVerificationParams
): Promise<VerificationResult> {
  try {
    const tx = await connection.getParsedTransaction(params.txSignature, {
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
    let transferredToBurn = BigInt(0);
    const expectedBurnAmount = params.expectedBurnAmountLamports ?? BigInt(0);

    for (const ix of instructions) {
      if (!("parsed" in ix) || ix.program !== "system") continue;
      if (!ix.parsed || ix.parsed.type !== "transfer") continue;

      const info = ix.parsed.info as {
        source?: string;
        destination?: string;
        lamports?: number | string;
      };

      const source = info.source || "";
      const destination = info.destination || "";
      const lamportsRaw = info.lamports;
      const lamports = BigInt(
        typeof lamportsRaw === "number"
          ? Math.trunc(lamportsRaw)
          : lamportsRaw || "0"
      );

      if (params.expectedSender && source !== params.expectedSender) {
        continue;
      }

      if (destination === params.expectedRecipient) {
        transferredToTreasury += lamports;
      }

      if (
        expectedBurnAmount > BigInt(0) &&
        params.expectedBurnRecipient &&
        destination === params.expectedBurnRecipient
      ) {
        transferredToBurn += lamports;
      }
    }

    if (transferredToTreasury < params.expectedTreasuryAmountLamports) {
      return { valid: false, error: "Insufficient SOL transfer amount" };
    }

    if (expectedBurnAmount > BigInt(0) && transferredToBurn < expectedBurnAmount) {
      return { valid: false, error: "Insufficient SOL burn amount" };
    }

    if (!hasExpectedMemo(tx.meta?.logMessages, params.expectedMemo)) {
      return { valid: false, error: "Memo mismatch" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Verification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
