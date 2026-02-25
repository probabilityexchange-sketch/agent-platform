const { PrismaClient } = require("@prisma/client");

// Manually load env since we are in a raw node script
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

async function findUser() {
    const user = await prisma.user.findFirst({
        where: {
            id: {
                endsWith: 'd34mfp'
            }
        }
    });

    if (!user) {
        console.log("USER_NOT_FOUND");
        // List all users to see if we have ANY
        const all = await prisma.user.findMany({ take: 5 });
        console.log("Total users in DB:", all.length);
        all.forEach(u => console.log(`- ${u.id} | ${u.walletAddress}`));
        return;
    }

    console.log(`USER_FOUND: ${user.id} | Current Balance: ${user.tokenBalance}`);
}

findUser()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
