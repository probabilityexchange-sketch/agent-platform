import { isValidSolanaAddress } from "@/lib/solana/validation";

const PRIVY_BASE_URL = process.env.PRIVY_BASE_URL || "https://auth.privy.io";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeEnvString(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^['"]|['"]$/g, "");
  return normalized.length > 0 ? normalized : null;
}

function isSolanaChain(chainType: string | null): boolean {
  if (!chainType) return false;
  const normalized = chainType.toLowerCase();
  return normalized === "solana" || normalized.startsWith("solana:");
}

function extractAddress(account: UnknownRecord): string | null {
  const direct =
    asString(account.address) ||
    asString(account.wallet_address) ||
    asString(account.walletAddress) ||
    asString(account.public_address) ||
    asString(account.publicAddress);
  if (direct) return direct;

  const nestedWallet = asRecord(account.wallet);
  return nestedWallet ? asString(nestedWallet.address) : null;
}

function extractLinkedAccounts(user: UnknownRecord): UnknownRecord[] {
  const snakeCase = user.linked_accounts;
  if (Array.isArray(snakeCase)) {
    return snakeCase.map(asRecord).filter((item): item is UnknownRecord => item !== null);
  }

  const camelCase = user.linkedAccounts;
  if (Array.isArray(camelCase)) {
    return camelCase.map(asRecord).filter((item): item is UnknownRecord => item !== null);
  }

  return [];
}

function collectSolanaWallets(user: UnknownRecord): string[] {
  const wallets = new Set<string>();

  for (const account of extractLinkedAccounts(user)) {
    const chainType =
      asString(account.chain_type) ||
      asString(account.chainType) ||
      asString(account.chain);

    const walletClientType =
      asString(account.wallet_client_type) ||
      asString(account.walletClientType) ||
      asString(account.wallet_type) ||
      asString(account.walletType);

    const looksSolana =
      isSolanaChain(chainType) ||
      (walletClientType ? walletClientType.toLowerCase().includes("solana") : false);

    if (!looksSolana) {
      continue;
    }

    const address = extractAddress(account);

    if (address && isValidSolanaAddress(address)) {
      wallets.add(address);
    }
  }

  const walletObject = asRecord(user.wallet);
  const fallbackWallet = walletObject ? asString(walletObject.address) : null;
  if (fallbackWallet && isValidSolanaAddress(fallbackWallet)) {
    wallets.add(fallbackWallet);
  }

  return [...wallets];
}

export async function resolvePrivyWallet(
  accessToken: string,
  requestedWallet?: string
): Promise<string> {
  const appId =
    normalizeEnvString(process.env.PRIVY_APP_ID) ||
    normalizeEnvString(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  if (!appId) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not configured");
  }

  const response = await fetch(`${PRIVY_BASE_URL}/api/v1/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "privy-app-id": appId,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const compactDetails = details.trim().slice(0, 200);
    const suffix = compactDetails ? `: ${compactDetails}` : "";
    throw new Error(
      `Unable to validate Privy access token (status ${response.status})${suffix}`
    );
  }

  const rawPayload = asRecord(await response.json());
  if (!rawPayload) {
    throw new Error("Invalid Privy user payload");
  }

  const payload = asRecord(rawPayload.user) || rawPayload;

  const solanaWallets = collectSolanaWallets(payload);
  if (solanaWallets.length === 0) {
    throw new Error("No linked Solana wallet found on Privy user");
  }

  if (!requestedWallet) {
    return solanaWallets[0];
  }

  if (!isValidSolanaAddress(requestedWallet)) {
    throw new Error("Invalid requested wallet");
  }

  if (!solanaWallets.includes(requestedWallet)) {
    throw new Error("Requested wallet is not linked to authenticated Privy user");
  }

  return requestedWallet;
}
