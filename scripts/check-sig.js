const { Connection, PublicKey } = require("@solana/web3.js");

async function check() {
    const signature = "wHtG9jX4yzdkVg5om7wiBXEUfFHetocfXaxDjsNbSE2m3Que9EFeqwyeNTHvNv5weDvuEPmHdQXPxZGUHzVCfU2";
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

    console.log("Checking signature:", signature);
    const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed"
    });

    if (!tx) {
        console.log("Transaction NOT FOUND");
        return;
    }

    console.log("Status:", tx.meta.err ? "FAILED" : "SUCCESS");
    console.log("Memo:", tx.meta.logMessages.find(m => m.includes("Memo")));

    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
        if (ix.parsed) {
            console.log("Instruction:", ix.parsed.type, ix.parsed.info);
        }
    }
}

check().catch(console.error);
