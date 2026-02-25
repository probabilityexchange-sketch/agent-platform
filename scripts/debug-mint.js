const { Connection, PublicKey } = require("@solana/web3.js");

async function checkMint() {
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const mint = new PublicKey("FYAz1bPKJUFRwT4pzhUzdN3UqCN5ppXRL2pfto4zpump");
    const accountInfo = await connection.getParsedAccountInfo(mint);

    if (!accountInfo.value) {
        console.log("Account NOT found on Mainnet.");
        return;
    }

    console.log("Account found!");
    console.log("Owner:", accountInfo.value.owner.toBase58());
    console.log("Decimals:", accountInfo.value.data.parsed.info.decimals);
}

checkMint().catch(console.error);
