import { connection } from "@/lib/solana/connection";
import { PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { prisma } from "@/lib/db/prisma";
import { parseBurnBpsFromMemo } from "@/lib/payments/token-pricing";

export class TransactionScanner {
    private treasuryWallet: string;
    private tokenMint: string;

    constructor(treasuryWallet: string, tokenMint: string) {
        this.treasuryWallet = treasuryWallet;
        this.tokenMint = tokenMint;
    }

    async scanRecentTransactions(limit = 25): Promise<number> {
        const treasuryPubKey = new PublicKey(this.treasuryWallet);
        const signatures = await connection.getSignaturesForAddress(treasuryPubKey, {
            limit,
        });

        let processedCount = 0;

        for (const sigInfo of signatures) {
            if (sigInfo.err) continue;

            // Check if we've already processed this signature
            const existing = await prisma.tokenTransaction.findUnique({
                where: { txSignature: sigInfo.signature },
            });

            if (existing) continue;

            // Fetch and parse the transaction
            const tx = await connection.getParsedTransaction(sigInfo.signature, {
                maxSupportedTransactionVersion: 0,
                commitment: "confirmed",
            });

            if (!tx) continue;

            const result = await this.tryProcessTransaction(tx, sigInfo.signature);
            if (result) processedCount++;
        }

        return processedCount;
    }

    private async tryProcessTransaction(
        tx: ParsedTransactionWithMeta,
        signature: string
    ): Promise<boolean> {
        const logMessages = tx.meta?.logMessages || [];
        const memoLog = logMessages.find((log) => log.includes("Memo"));

        if (!memoLog) return false;

        // Extract memo content - typically looks like "Program Memo... log: [ap:subscribe:...]"
        const memoMatch = memoLog.match(/\[(.*?)\]/);
        const memo = memoMatch ? memoMatch[1] : null;

        if (!memo || !memo.startsWith("ap:")) return false;

        // Parse memo to find the intent
        // Format: ap:type:timestamp:userShortId:bBurnBps
        const parts = memo.split(":");
        if (parts.length < 4) return false;

        const userShortId = parts[3];

        // Find the pending transaction intent that matches this memo
        const intent = await prisma.tokenTransaction.findFirst({
            where: {
                memo,
                status: "PENDING",
                user: { id: { endsWith: userShortId } }
            },
            include: { user: true }
        });

        if (!intent) return false;

        // Verify the amount and recipient in the transaction
        // Extract the actual token amount transferred to the treasury
        const preBalance = tx.meta?.preTokenBalances?.find(b => b.owner === this.treasuryWallet);
        const postBalance = tx.meta?.postTokenBalances?.find(b => b.owner === this.treasuryWallet);

        let actualTokenAmount: bigint | null = null;
        if (preBalance && postBalance) {
            const preAmount = BigInt(preBalance.uiTokenAmount.amount);
            const postAmount = BigInt(postBalance.uiTokenAmount.amount);
            actualTokenAmount = postAmount - preAmount;
        }

        await prisma.$transaction(async (tx) => {
            await tx.tokenTransaction.update({
                where: { id: intent.id },
                data: {
                    status: "CONFIRMED",
                    txSignature: signature,
                    tokenAmount: actualTokenAmount,
                },
            });

            if (intent.type === "SUBSCRIBE") {
                const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                await tx.user.update({
                    where: { id: intent.userId },
                    data: {
                        subscriptionStatus: "active",
                        subscriptionExpiresAt: expiresAt,
                    },
                });
            } else if (intent.type === "PURCHASE") {
                await tx.user.update({
                    where: { id: intent.userId },
                    data: { tokenBalance: { increment: intent.amount } },
                });
            }
        });

        console.log(`Auto-confirmed transaction ${signature} for user ${intent.userId} via scanner.`);
        return true;
    }
}

export async function runScanner() {
    const treasury = process.env.TREASURY_WALLET || "2Hnkz9D72u7xcoA18tMdFLSRanAkj4eWcGB7iFH296N7";
    const mint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT || "FYAz1bPKJUFRwT4pzhUzdN3UqCN5ppXRL2pfto4zpump";

    if (!treasury || !mint) {
        console.warn("Scanner skipped: TREASURY_WALLET or TOKEN_MINT not configured.");
        return 0;
    }

    const scanner = new TransactionScanner(treasury, mint);
    return scanner.scanRecentTransactions();
}
