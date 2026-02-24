import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { connection } from "./connection";

export interface SPLTransferParams {
  fromWallet: PublicKey;
  toWallet: PublicKey;
  mint: PublicKey;
  amount: bigint;
  decimals: number;
  memo: string;
}

export async function buildSPLTransferTransaction(
  params: SPLTransferParams
): Promise<VersionedTransaction> {
  const { fromWallet, toWallet, mint, amount, decimals, memo } = params;

  const fromATA = await getAssociatedTokenAddress(mint, fromWallet);
  const toATA = await getAssociatedTokenAddress(mint, toWallet);

  const transferIx = createTransferCheckedInstruction(
    fromATA,
    mint,
    toATA,
    fromWallet,
    amount,
    decimals,
    [],
    TOKEN_PROGRAM_ID
  );

  const memoIx = new TransactionInstruction({
    keys: [{ pubkey: fromWallet, isSigner: true, isWritable: false }],
    programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
    data: Buffer.from(memo, "utf-8"),
  });

  const { blockhash } = await connection.getLatestBlockhash();

  const message = new TransactionMessage({
    payerKey: fromWallet,
    recentBlockhash: blockhash,
    instructions: [transferIx, memoIx],
  }).compileToV0Message();

  return new VersionedTransaction(message);
}
