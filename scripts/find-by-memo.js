const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function find() {
    const memoSnippet = "17719";
    console.log("Searching for memo snippet:", memoSnippet);

    const tx = await prisma.tokenTransaction.findFirst({
        where: {
            memo: {
                contains: memoSnippet
            }
        },
        include: {
            user: true
        }
    });

    if (!tx) {
        console.log("No transaction found in database for that memo.");
        // Try searching all pending transactions
        const pending = await prisma.tokenTransaction.findMany({
            where: { status: "PENDING" },
            take: 5
        });
        console.log("Recently pending transactions:");
        pending.forEach(p => console.log(`- ID: ${p.id}, Memo: ${p.memo}, User: ${p.userId}`));
        return;
    }

    console.log("MATCH FOUND:");
    console.log(JSON.stringify(tx, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}

find().catch(console.error).finally(() => prisma.$disconnect());
