const { Connection, PublicKey } = require("@solana/web3.js");

async function check() {
    const signature = "2Djb6oZTGV1rEY1oAscZn8xS6W2aAGS2wXmrukKf6jRB2FDftmZ9f9iZSer5fsrSwRTw7xk8kAdHigiyrQZVKgSM";
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

    const memo = tx.meta.logMessages.find(m => m.includes("Memo"));
    console.log("Memo:", memo);

    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
        if (ix.parsed) {
            console.log("Instruction Type:", ix.parsed.type);
            console.log("Instruction Info:", JSON.stringify(ix.parsed.info, null, 2));
        }
    }
}

check().catch(console.error);
