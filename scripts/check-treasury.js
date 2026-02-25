const { Connection, PublicKey } = require("@solana/web3.js");

async function checkWallet() {
    const walletAddress = "2Hnkz9D72u7xcoA18tMdFLSRanAkj4eWcGB7iFH296N7";
    const tokenMint = "FYAz1bPKJUFRwT4pzhUzdN3UqCN5ppXRL2pfto4zpump";
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

    console.log("Checking Treasury Wallet:", walletAddress);

    // 1. SOL Balance
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    console.log("SOL Balance:", balance / 1e9, "SOL");

    // 2. RANDI Balance
    try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new PublicKey(walletAddress),
            { mint: new PublicKey(tokenMint) }
        );

        if (tokenAccounts.value.length === 0) {
            console.log("RANDI Balance: 0 (No token account found)");
        } else {
            tokenAccounts.value.forEach((account, i) => {
                const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
                console.log(`RANDI Balance (Account ${i}):`, amount, "$RANDI");
            });
        }
    } catch (e) {
        console.error("Error fetching RANDI balance:", e.message);
    }

    // 3. Recent Transactions
    console.log("\nRecent Transactions (last 10):");
    const signatures = await connection.getSignaturesForAddress(new PublicKey(walletAddress), { limit: 10 });

    for (const sig of signatures) {
        console.log(`- ${sig.signature} | Status: ${sig.err ? "Error" : "Success"} | Memo: ${sig.memo || "None"}`);
    }
}

checkWallet().catch(console.error);
