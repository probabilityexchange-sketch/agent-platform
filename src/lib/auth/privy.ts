import { decodeJwt } from "jose";
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

function normalizeAccessToken(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Missing Privy access token");
  }

  const lowered = normalized.toLowerCase();
  if (lowered === "undefined" || lowered === "null") {
    throw new Error("Missing Privy access token");
  }

  return normalized;
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
    asString(account.publicAddress) ||
    asString(account.public_key) ||
    asString(account.publicKey);
  if (direct) return direct;

  const nestedWallet = asRecord(account.wallet);
  if (nestedWallet) {
    return (
      asString(nestedWallet.address) ||
      asString(nestedWallet.public_key) ||
      asString(nestedWallet.publicKey)
    );
  }

  return null;
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
    const accountType = asString(account.type)?.toLowerCase() || null;
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
    const isWalletLike =
      accountType === "wallet" ||
      accountType === "smart_wallet" ||
      (accountType ? accountType.includes("wallet") : false);

    const address = extractAddress(account);

    // Some Privy payload variants omit chain_type for linked wallet records.
    // If the account is wallet-like and the address is a valid Solana public key,
    // treat it as a valid Solana wallet.
    if (address && isValidSolanaAddress(address) && (looksSolana || isWalletLike)) {
      wallets.add(address);
    }
  }

  // Handle user.wallet as object or string
  const walletValue = user.wallet;
  if (typeof walletValue === "string" && isValidSolanaAddress(walletValue)) {
    wallets.add(walletValue);
  } else {
    const walletObject = asRecord(walletValue);
    const fallbackWallet = walletObject ? extractAddress(walletObject) : null;
    if (fallbackWallet && isValidSolanaAddress(fallbackWallet)) {
      wallets.add(fallbackWallet);
    }
  }

  // Handle user.wallets as array of objects or strings
  const walletList = user.wallets;
  if (Array.isArray(walletList)) {
    for (const candidate of walletList) {
      if (typeof candidate === "string" && isValidSolanaAddress(candidate)) {
        wallets.add(candidate);
        continue;
      }

      const wallet = asRecord(candidate);
      if (!wallet) continue;

      const chainType = asString(wallet.chain_type) || asString(wallet.chainType);
      const address = extractAddress(wallet);
      if (!address || !isValidSolanaAddress(address)) {
        continue;
      }

      if (!chainType || isSolanaChain(chainType)) {
        wallets.add(address);
      }
    }
  }

  return [...wallets];
}

function getPrivyAppIds(): string[] {
  const preferred = normalizeEnvString(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  const server = normalizeEnvString(process.env.PRIVY_APP_ID);
  const ordered = [preferred, server].filter((value): value is string => Boolean(value));
  return [...new Set(ordered)];
}

async function fetchPrivyUserPayload(
  accessToken: string,
  appId: string,
  originHint?: string
): Promise<UnknownRecord> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "privy-app-id": appId,
    // Mirror the client SDK header shape to avoid stricter API routing behavior.
    "privy-client": "agent-platform-server",
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const origin =
    originHint ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_DOMAIN}`
      : undefined);
  if (origin) {
    headers["Origin"] = origin.replace(/\/+$/, "");
    headers["Referer"] = `${headers["Origin"]}/`;
  }

  const response = await fetch(`${PRIVY_BASE_URL}/api/v1/users/me`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const compactDetails = details.trim().slice(0, 200);
    const suffix = compactDetails ? `: ${compactDetails}` : "";
    throw new Error(
      `Unable to validate Privy access token (status ${response.status}, app ${appId})${suffix}`
    );
  }

  const rawPayload = asRecord(await response.json());
  if (!rawPayload) {
    throw new Error("Invalid Privy user payload");
  }

  return rawPayload;
}

export async function resolvePrivyWallet(
  accessToken: string,
  requestedWallet?: string,
  originHint?: string
): Promise<string> {
  const normalizedAccessToken = normalizeAccessToken(accessToken);
  const appIds = getPrivyAppIds();
  if (appIds.length === 0) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not configured");
  }

  let rawPayload: UnknownRecord | null = null;
  const attempts: string[] = [];
  for (const appId of appIds) {
    try {
      rawPayload = await fetchPrivyUserPayload(normalizedAccessToken, appId, originHint);
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Privy verification error";
      attempts.push(message);
    }
  }

  if (!rawPayload) {
    // Fallback: If identity token verification failed (e.g. due to origin restrictions),
    // try to fetch the user object directly using the App Secret if available.
    const appSecret = normalizeEnvString(process.env.PRIVY_APP_SECRET);
    if (appSecret && appIds.length > 0) {
      try {
        const decoded = decodeJwt(normalizedAccessToken);
        const did = asString(decoded.sub);
        if (did) {
          const appId = appIds[0];
          const auth = Buffer.from(`${appId}:${appSecret}`).toString("base64");
          const response = await fetch(`${PRIVY_BASE_URL}/api/v1/users/${did}`, {
            method: "GET",
            headers: {
              Authorization: `Basic ${auth}`,
              "privy-app-id": appId,
              Accept: "application/json",
            },
            cache: "no-store",
          });

          if (response.ok) {
            rawPayload = asRecord(await response.json());
          }
        }
      } catch (fallbackError) {
        console.warn("Privy App Secret fallback failed", fallbackError);
      }
    }
  }

  if (!rawPayload) {
    throw new Error(attempts.join(" | "));
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
