/**
 * Shared cron job authentication helper.
 *
 * Returns true when the request is authorised to trigger a cron endpoint:
 *  - In production: CRON_SECRET must be set and must match the incoming
 *    `Authorization: Bearer <secret>` header or the `x-cron-secret` header.
 *  - In non-production: allowed without a secret so local testing is easy.
 */
export function isCronAuthorized(request: {
  headers: { get(name: string): string | null };
}): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const legacyHeader = request.headers.get("x-cron-secret");
  if (legacyHeader === cronSecret) return true;

  return false;
}
