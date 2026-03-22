const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('QUERIES:');
  try {
    const txCount = await prisma.tokenTransaction.count();
    console.log(`TOTAL TX COUNT: ${txCount}`);

    const txs = await prisma.tokenTransaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    console.log('LAST 10 DB TRANSACTIONS:');
    txs.forEach(tx => {
      console.log(
        `ID: ${tx.id} | Status: ${tx.status} | Signature: ${tx.txSignature || 'NULL'} | Memo: ${tx.memo}`
      );
    });

    const users = await prisma.user.count();
    console.log(`TOTAL USERS: ${users}`);
  } catch (err) {
    console.error('error:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
