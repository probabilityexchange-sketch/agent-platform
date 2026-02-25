const { Connection, PublicKey } = require("@solana/web3.js");

async function findSigs() {
    const userWallet = "GmnoShpt5vyGwZLyPYsBah2vxPUAfvw6fKSLbBa2XpFy";
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const wallet = new PublicKey(userWallet);

    console.log("Searching user history for ap:deposit...");
    const sigs = await connection.getSignaturesForAddress(wallet, { limit: 100 });

    let count = 0;
    for (const s of sigs) {
        if (s.memo && s.memo.includes("ap:deposit")) {
            count++;
            console.log(`[MATCH ${count}] ${s.signature} | Memo: ${s.memo}`);
        }
    }
    console.log(`\nFinished. Found ${count} matching transactions.`);
}

findSigs().catch(console.error);
