const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const client = new Client({
        connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log("Connected to PostgreSQL");

    const res = await client.query("SELECT id, \"walletAddress\", \"tokenBalance\" FROM \"User\" WHERE id LIKE '%d34mfp'");
    console.log("USER:", res.rows[0]);

    await client.end();
}

check().catch(console.error);
