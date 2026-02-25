const { PrismaClient } = require("@prisma/client");
const fs = require('fs');

// Simple parser for .env files
function loadEnv(path) {
    if (!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value.length > 0) {
            process.env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
        }
    });
}

loadEnv('.env.local');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

async function findUser() {
    console.log("Using URL:", process.env.DATABASE_URL?.slice(0, 20) + "...");
    const user = await prisma.user.findFirst({
        where: {
            id: {
                endsWith: 'd34mfp'
            }
        }
    });

    if (!user) {
        console.log("USER_NOT_FOUND");
        return;
    }

    console.log(`USER_FOUND: ${user.id} | Balance: ${user.tokenBalance}`);

    // Check pending transactions
    const txs = await prisma.tokenTransaction.findMany({
        where: { userId: user.id, status: 'PENDING' }
    });
    console.log(`Pending Transactions: ${txs.length}`);
    txs.forEach(t => console.log(`- ${t.id} | ${t.description}`));
}

findUser()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
