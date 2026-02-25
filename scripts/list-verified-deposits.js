const { Connection, PublicKey } = require("@solana/web3.js");

async function verifyDeposits() {
    const treasury = "2Hnkz9D72u7xcoA18tMdFLSRanAkj4eWcGB7iFH296N7";
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const wallet = new PublicKey(treasury);

    console.log("Checking last 10 transactions for treasury:", treasury);
    const sigs = await connection.getSignaturesForAddress(wallet, { limit: 10 });

    for (const s of sigs) {
        const tx = await connection.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
        let depositAmount = 0;

        if (tx && tx.meta) {
            // Find the balance change for the treasury
            const post = tx.meta.postTokenBalances?.find(b => b.owner === treasury);
            const pre = tx.meta.preTokenBalances?.find(b => b.accountIndex === post?.accountIndex);

            if (post) {
                const postVal = post.uiTokenAmount.uiAmount || 0;
                const preVal = pre ? (pre.uiTokenAmount.uiAmount || 0) : 0;
                depositAmount = postVal - preVal;
            }
        }

        if (depositAmount > 0) {
            console.log(`CONFIRMED DEPOSIT: ${depositAmount.toLocaleString()} RANDI | Memo: ${s.memo} | Sig: ${s.signature}`);
        }
    }
}

verifyDeposits().catch(console.error);
