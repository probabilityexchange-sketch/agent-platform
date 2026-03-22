const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Starting DB Probe...');
  // Force DATABASE_URL from .env.local if not picked up
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
      }
    });
  }

  const prisma = new PrismaClient();

  try {
    const count = await prisma.tokenTransaction.count();
    console.log(`TOTAL TRANSACTIONS: ${count}`);

    const confirmed = await prisma.tokenTransaction.count({ where: { status: 'CONFIRMED' } });
    console.log(`CONFIRMED TRANSACTIONS: ${confirmed}`);

    const samples = await prisma.tokenTransaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, amount: true, type: true, createdAt: true },
    });

    console.log('SAMPLES:');
    samples.forEach(s =>
      console.log(`- ${s.createdAt.toISOString()} | ${s.status} | ${s.type} | ${s.amount}`)
    );
  } catch (err) {
    console.error('DB_ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
