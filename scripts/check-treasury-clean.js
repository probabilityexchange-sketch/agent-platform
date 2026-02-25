const { Connection, PublicKey } = require("@solana/web3.js");

async function checkWallet() {
    const walletAddress = "2Hnkz9D72u7xcoA18tMdFLSRanAkj4eWcGB7iFH296N7";
    const tokenMint = "FYAz1bPKJUFRwT4pzhUzdN3UqCN5ppXRL2pfto4zpump";
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

    // SOL Balance
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    const sol = balance / 1e9;

    // RANDI Balance
    let randi = 0;
    try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new PublicKey(walletAddress),
            { mint: new PublicKey(tokenMint) }
        );
        if (tokenAccounts.value.length > 0) {
            randi = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        }
    } catch (e) { }

    console.log(`WALLET_REPORT: SOL=${sol} | RANDI=${randi}`);

    // Get last few signatures with memos
    const signatures = await connection.getSignaturesForAddress(new PublicKey(walletAddress), { limit: 5 });
    signatures.forEach(s => {
        console.log(`SIG: ${s.signature} | MEMO: ${s.memo || "None"}`);
    });
}

checkWallet().catch(console.error);
