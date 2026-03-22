import { prisma } from '../src/lib/db/prisma';

async function main() {
  const txs = await prisma.tokenTransaction.findMany({
    where: {
      type: 'USAGE',
      tokenAmount: null,
    },
  });

  console.log(`Found ${txs.length} USAGE transactions to backfill.`);

  for (const tx of txs) {
    const tokensNeeded = Math.abs(tx.amount);
    const decimals = 6;
    const tokenAmountBaseUnits = BigInt(tokensNeeded) * BigInt(10 ** decimals);
    const burnBps = 7000;
    const memo = `ap:usage:${Date.now()}:${tx.userId.slice(-6)}:b${burnBps}`;

    await prisma.tokenTransaction.update({
      where: { id: tx.id },
      data: {
        tokenAmount: tokenAmountBaseUnits,
        memo,
      },
    });
    console.log(`Updated tx ${tx.id}`);
  }
}

main().finally(() => prisma.$disconnect());
