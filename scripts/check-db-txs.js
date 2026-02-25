const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const txs = await prisma.tokenTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    console.log("LAST 10 DB TRANSACTIONS:");
    txs.forEach(tx => {
        console.log(`ID: ${tx.id} | Status: ${tx.status} | Signature: ${tx.txSignature || 'NULL'} | Memo: ${tx.memo}`);
    });
}

main().finally(() => prisma.$disconnect());
