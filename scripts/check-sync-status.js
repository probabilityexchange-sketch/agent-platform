const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUser() {
    const userIdSuffix = "d34mfp";
    console.log("Searching for user with suffix:", userIdSuffix);

    const users = await prisma.user.findMany({
        take: 10,
        select: { id: true, walletAddress: true, tokenBalance: true }
    });

    console.log("Existing Users (last 10):");
    users.forEach(u => {
        console.log(`- ID: ${u.id} (Match: ${u.id.endsWith(userIdSuffix)}) | Wallet: ${u.walletAddress} | Balance: ${u.tokenBalance}`);
    });

    const txs = await prisma.tokenTransaction.findMany({
        where: { memo: { contains: "1771979637971" } }
    });
    console.log("\nMatching Transactions in DB:", txs.length);
    txs.forEach(t => console.log(`- ID: ${t.id} | Status: ${t.status} | Signature: ${t.txSignature}`));
}

checkUser().catch(console.error).finally(() => prisma.$disconnect());
