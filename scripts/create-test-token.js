/* eslint-disable @typescript-eslint/no-require-imports */
const {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
const fs = require("fs");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const keypairFile = process.argv[2];
  if (!keypairFile) {
    console.error("Usage: node scripts/create-test-token.js <keypair.json>");
    console.error("\nGenerate a keypair first:");
    console.error("  solana-keygen new --outfile test-keypair.json");
    process.exit(1);
  }

  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairFile, "utf-8")));
  const payer = Keypair.fromSecretKey(secretKey);

  console.log("Payer wallet:", payer.publicKey.toBase58());

  const balance = await connection.getBalance(payer.publicKey);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log("\nRequesting airdrop...");
    const sig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
    console.log("Airdrop received!");
  }

  console.log("\nCreating RANDI test token...");
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    9,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );

  console.log("Token mint:", mint.toBase58());

  const treasuryWallet = new PublicKey("2Hnkz9D72u7xcoA18tMdFLSRanAkj4eWcGB7iFH296N7");

  console.log("\nCreating token account for treasury...");
  const treasuryATA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    treasuryWallet
  );
  console.log("Treasury ATA:", treasuryATA.address.toBase58());

  const mintAmount = BigInt(1_000_000_000_000);
  console.log("\nMinting 1,000,000,000 RANDI tokens to treasury...");
  await mintTo(
    connection,
    payer,
    mint,
    treasuryATA.address,
    payer,
    mintAmount
  );

  console.log("\n=== UPDATE YOUR .env FILE ===");
  console.log(`TOKEN_MINT="${mint.toBase58()}"`);
  console.log(`NEXT_PUBLIC_TOKEN_MINT="${mint.toBase58()}"`);
  console.log("\nDone! Your test RANDI token is ready.");
}

main().catch(console.error);
