import { PublicKey } from "@solana/web3.js";
import { connection } from "./connection";

export interface VerificationResult {
  valid: boolean;
  error?: string;
  retryable?: boolean;
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
  expectedBurnAmount: bigint = BigInt(0),
  expectedSender?: string
): Promise<VerificationResult> {
  try {
    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx) {
      return { valid: false, error: "Transaction not found", retryable: true };
    }

    if (tx.meta?.err) {
      return { valid: false, error: "Transaction failed on-chain" };
    }

    const instructions = tx.transaction.message.instructions;

    let transferredToTreasury = BigInt(0);
    let burnedAmount = BigInt(0);
    const treasuryKey = new PublicKey(expectedRecipient);
    const mintKey = new PublicKey(expectedMint);
    const {
      getAssociatedTokenAddress,
      TOKEN_PROGRAM_ID,
      TOKEN_2022_PROGRAM_ID,
    } = await import("@solana/spl-token");
    const [expectedATA, expectedATA2022] = await Promise.all([
      getAssociatedTokenAddress(mintKey, treasuryKey, false, TOKEN_PROGRAM_ID),
      getAssociatedTokenAddress(mintKey, treasuryKey, false, TOKEN_2022_PROGRAM_ID),
    ]);

    const expectedSenderNormalized = expectedSender || null;

    for (const ix of instructions) {
      if (!("parsed" in ix) || !ix.parsed?.type) continue;

      if (ix.parsed.type === "transferChecked" || ix.parsed.type === "transfer") {
        const info = ix.parsed.info;
        const mintAddress = info.mint;
        const destination = info.destination;
        const authority =
          info.authority || info.owner || info.multisigAuthority || "";
        const tokenAmountRaw =
          ix.parsed.type === "transferChecked"
            ? info.tokenAmount?.amount
            : info.amount;
        const tokenAmount = BigInt(tokenAmountRaw || "0");

        if (mintAddress !== expectedMint) continue;
        if (
          destination !== expectedATA.toBase58() &&
          destination !== expectedATA2022.toBase58()
        ) {
          continue;
        }
        if (
          expectedSenderNormalized &&
          authority &&
          authority !== expectedSenderNormalized
        ) {
          continue;
        }
        if (expectedSenderNormalized && !authority) {
          continue;
        }

        transferredToTreasury += tokenAmount;
      }

      if (ix.parsed.type === "burnChecked" || ix.parsed.type === "burn") {
        const info = ix.parsed.info;
        const mintAddress = info.mint;
        const authority =
          info.authority || info.owner || info.multisigAuthority || "";
        const tokenAmountRaw =
          ix.parsed.type === "burnChecked"
            ? info.tokenAmount?.amount
            : info.amount;
        const tokenAmount = BigInt(tokenAmountRaw || "0");

        if (mintAddress !== expectedMint) continue;
        if (
          expectedSenderNormalized &&
          authority &&
          authority !== expectedSenderNormalized
        ) {
          continue;
        }
        if (expectedSenderNormalized && !authority) {
          continue;
        }

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
      retryable: true,
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
      return { valid: false, error: "Transaction not found", retryable: true };
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
      retryable: true,
      error: `Verification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
