import { NextRequest, NextResponse } from 'next/server';
import { connection } from '@/lib/solana/connection';
import { PublicKey } from '@solana/web3.js';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const headerSecret = request.headers.get('x-cron-secret');
    if (authHeader !== `Bearer ${cronSecret}` && headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // FIX (HIGH): Removed hardcoded fallback addresses.
  const treasury = process.env.TREASURY_WALLET;
  const mint = process.env.TOKEN_MINT || process.env.NEXT_PUBLIC_TOKEN_MINT;

  if (!treasury || !mint) {
    return NextResponse.json(
      { error: 'TREASURY_WALLET or TOKEN_MINT environment variables are not configured.' },
      { status: 500 }
    );
  }

  // 1. Get pending intents from DB
  const pendingIntents = await prisma.tokenTransaction.findMany({
    where: { status: 'PENDING' },
    select: {
      id: true,
      memo: true,
      txSignature: true,
      amount: true,
      tokenAmount: true,
      type: true,
      createdAt: true,
      userId: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // 2. Get recent on-chain signatures for treasury
  let onChainSignatures: { signature: string; memo: string | null; hasError: boolean }[] = [];
  try {
    const treasuryPubKey = new PublicKey(treasury);
    const sigs = await connection.getSignaturesForAddress(treasuryPubKey, { limit: 25 });

    for (const sig of sigs.slice(0, 10)) {
      let memo: string | null = null;
      if (!sig.err) {
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed',
          });
          const logMessages = tx?.meta?.logMessages || [];
          for (const log of logMessages) {
            const quotedMatch = log.match(/Memo \(len \d+\): "(.+)"/);
            if (quotedMatch) {
              memo = quotedMatch[1];
              break;
            }
            const unquotedMatch = log.match(/Memo \(len \d+\): (.+)/);
            if (unquotedMatch) {
              memo = unquotedMatch[1];
              break;
            }
          }
          if (!memo) {
            const rawMemoLog = logMessages.find(log => log.includes('Memo'));
            if (rawMemoLog) memo = `RAW: ${rawMemoLog.slice(0, 150)}`;
          }
        } catch {}
      }
      onChainSignatures.push({
        signature: sig.signature,
        memo,
        hasError: !!sig.err,
      });
    }
  } catch (e) {
    onChainSignatures = [{ signature: 'ERROR', memo: String(e), hasError: true }];
  }

  return NextResponse.json({
    treasuryWallet: treasury,
    tokenMint: mint,
    pendingIntents: pendingIntents.map((i: any) => ({
      id: i.id,
      memo: i.memo,
      txSignature: i.txSignature,
      amount: i.amount,
      tokenAmount: i.tokenAmount?.toString(),
      type: i.type,
      userId: i.userId?.slice(-6),
      createdAt: i.createdAt.toISOString(),
    })),
    onChainSignatures,
  });
}
