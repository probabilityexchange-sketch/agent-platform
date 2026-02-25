const { Connection, PublicKey } = require("@solana/web3.js");

async function checkMint() {
    const tokenMint = "FYAz1bPKJUFRwT4pzhUzdN3UqCN5ppXRL2pfto4zpump";
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

    try {
        const info = await connection.getParsedAccountInfo(new PublicKey(tokenMint));
        console.log("DECIMALS:", info.value.data.parsed.info.decimals);
    } catch (e) {
        console.error(e);
    }
}

checkMint();
