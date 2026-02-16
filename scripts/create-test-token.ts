import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function main() {
  // Generate a new keypair for testing
  const payer = Keypair.generate();
  console.log("Test wallet pubkey:", payer.publicKey.toBase58());
  console.log("Test wallet secret:", bs58.encode(payer.secretKey));

  // Request airdrop
  console.log("\nRequesting airdrop...");
  let attempts = 0;
  let balance = 0;
  
  while (attempts < 10 && balance < LAMPORTS_PER_SOL) {
    try {
      const sig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      balance = await connection.getBalance(payer.publicKey);
      console.log(`Airdrop successful! Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (e) {
      attempts++;
      console.log(`Airdrop attempt ${attempts} failed, waiting...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  if (balance < LAMPORTS_PER_SOL) {
    console.error("Failed to get airdrop. Try using the web faucet:");
    console.log(`https://faucet.solana.com/?address=${payer.publicKey.toBase58()}`);
    process.exit(1);
  }

  // Create test token
  console.log("\nCreating test token...");
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
  
  console.log("Token mint created:", mint.toBase58());

  // Create token account for payer
  console.log("\nCreating token account...");
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  console.log("Token account:", tokenAccount.address.toBase58());

  // Mint tokens to payer
  const mintAmount = BigInt(1_000_000_000_000); // 1,000,000 tokens
  console.log("\nMinting 1,000,000 test tokens...");
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    mintAmount
  );
  console.log("Tokens minted!");

  // Summary
  console.log("\n========================================");
  console.log("TEST TOKEN CREATED SUCCESSFULLY!");
  console.log("========================================");
  console.log("Add these to your .env:");
  console.log(`TOKEN_MINT="${mint.toBase58()}"`);
  console.log(`NEXT_PUBLIC_TOKEN_MINT="${mint.toBase58()}"`);
  console.log(`TOKEN_DECIMALS="9"`);
  console.log("\nTest wallet (save this for testing):");
  console.log(`Public key: ${payer.publicKey.toBase58()}`);
  console.log(`Secret key: ${bs58.encode(payer.secretKey)}`);
  console.log("\nImport the secret key into Phantom to test purchases!");
  console.log("Network: devnet");
}

main().catch(console.error);
