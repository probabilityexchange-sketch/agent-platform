const { Connection } = require("@solana/web3.js");

async function check() {
    const signature = "2Djb6oZTGV1rEY1oAscZn8xS6W2aAGS2wXmrukKf6jRB2FDftmZ9f9iZSer5fsrSwRTw7xk8kAdHigiyrQZVKgSM";
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

    const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed"
    });

    if (!tx) {
        console.log("TX_NOT_FOUND");
        return;
    }

    console.log("--- TX SUMMARY ---");
    console.log("Status:", tx.meta.err ? "FAILED" : "SUCCESS");
    console.log("Log Messages:", JSON.stringify(tx.meta.logMessages, null, 2));

    const innerInstructions = tx.meta.innerInstructions || [];
    console.log("Instructions Count:", tx.transaction.message.instructions.length);

    tx.transaction.message.instructions.forEach((ix, i) => {
        console.log(`Instruction ${i}:`, JSON.stringify(ix, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    });
}

check().catch(console.error);
