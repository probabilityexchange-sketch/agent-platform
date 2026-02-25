const { Connection, PublicKey } = require("@solana/web3.js");

async function verifyDeposits() {
    const treasury = "2Hnkz9D72u7xcoA18tMdFLSRanAkj4eWcGB7iFH296N7";
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const wallet = new PublicKey(treasury);

    const sigs = await connection.getSignaturesForAddress(wallet, { limit: 10 });
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
                    console.log(`[OK] ${amount} RANDI | Memo: ${s.memo}`);
                }
            }
        }
    }
    console.log(`SUMMARY: Total ${confirmedCount} deposits found, summing to ${totalRandi} RANDI.`);
}

verifyDeposits().catch(console.error);
