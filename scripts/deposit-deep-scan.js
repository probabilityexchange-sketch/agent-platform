const { Connection, PublicKey } = require("@solana/web3.js");

async function verifyDeposits() {
    const treasury = "2Hnkz9D72u7xcoA18tMdFLSRanAkj4eWcGB7iFH296N7";
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const wallet = new PublicKey(treasury);

    console.log("Scanning last 50 transactions...");
    const sigs = await connection.getSignaturesForAddress(wallet, { limit: 50 });
    let confirmedCount = 0;
    let totalRandi = 0;

    for (const s of sigs) {
        const tx = await connection.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
        if (tx && tx.meta) {
            const post = tx.meta.postTokenBalances?.find(b => b.owner === treasury);
            const pre = tx.meta.preTokenBalances?.find(b => b.accountIndex === post?.accountIndex);
            if (post) {
                const amount = (post.uiTokenAmount.uiAmount || 0) - (pre ? (pre.uiTokenAmount.uiAmount || 0) : 0);
                if (amount > 0) {
                    confirmedCount++;
                    totalRandi += amount;
                    console.log(`[DEPOSIT] ${amount} RANDI | Sig: ${s.signature.slice(0, 10)}`);
                }
            }
        }
    }
    console.log(`\nFINAL TOTAL: ${totalRandi} RANDI across ${confirmedCount} transactions.`);
}

verifyDeposits().catch(console.error);
