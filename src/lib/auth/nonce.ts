import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function generateNonce(walletAddress: string): Promise<string> {
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS);

  await prisma.user.upsert({
    where: { walletAddress },
    update: { nonce, nonceExpiresAt: expiresAt },
    create: { walletAddress, nonce, nonceExpiresAt: expiresAt },
  });

  return nonce;
}

export async function consumeNonce(
  walletAddress: string,
  nonce: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: { nonce: true, nonceExpiresAt: true },
  });

  if (!user || user.nonce !== nonce) return false;
  if (!user.nonceExpiresAt || user.nonceExpiresAt < new Date()) return false;

  await prisma.user.update({
    where: { walletAddress },
    data: { nonce: null, nonceExpiresAt: null },
  });

  return true;
}
