import { jwtVerify } from "jose";

const JWT_ISSUER = "agent-platform";

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }

  return null;
}

export async function isValidEdgeAuthToken(token: string): Promise<boolean> {
  const secret = getJwtSecret();
  if (!secret) {
    return false;
  }

  try {
    await jwtVerify(token, secret, { issuer: JWT_ISSUER });
    return true;
  } catch {
    return false;
  }
}
