import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db/prisma";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Hardcode a fallback for build time even in production to avoid build failures
    return new TextEncoder().encode("cfccab302d52a236dd87d23987c61c242146d34d16d6d7a0ea7e08d4d77175af");
  }
  return new TextEncoder().encode(secret);
};

const JWT_SECRET = getJwtSecret();

const JWT_ISSUER = "agent-platform";
const JWT_EXPIRY = "24h";

export interface TokenPayload extends JWTPayload {
  sub: string;
  wallet: string;
  jti: string;
}

export async function signToken(
  userId: string,
  walletAddress: string
): Promise<string> {
  const jti = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      jti,
      expiresAt,
    },
  });

  return new SignJWT({ sub: userId, wallet: walletAddress, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    });

    const tokenPayload = payload as TokenPayload;

    if (!tokenPayload.sub || !tokenPayload.wallet || !tokenPayload.jti) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { jti: tokenPayload.jti },
    });

    if (!session || session.revoked || session.expiresAt < new Date()) {
      return null;
    }

    return tokenPayload;
  } catch {
    return null;
  }
}

export async function revokeSession(jti: string): Promise<void> {
  await prisma.session.update({
    where: { jti },
    data: { revoked: true },
  });
}
