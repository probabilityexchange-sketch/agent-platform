/**
 * Cleanup expired containers cron job
 * Run via: npx tsx scripts/cleanup-containers.ts
 * Recommended: every 5 minutes via cron
 */

import { prisma } from "@/lib/db/prisma";
import { cleanupExpiredContainers } from "@/lib/docker/cleanup";

console.log(`[${new Date().toISOString()}] Starting cleanup...`);

cleanupExpiredContainers()
  .then(() => console.log(`[${new Date().toISOString()}] Cleanup complete`))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
