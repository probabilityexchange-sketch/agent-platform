import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { isCronAuthorized } from '@/lib/utils/cron-auth';

/**
 * POST /api/cron/expire-pending
 *
 * Automatically expires any TokenTransaction that has been in PENDING status
 * for more than 24 hours. This prevents ghost transactions from clogging the
 * ledger and ensures users are not left in an ambiguous payment state.
 *
 * Should be called by a Vercel Cron Job every hour:
 *   vercel.json: { "crons": [{ "path": "/api/cron/expire-pending", "schedule": "0 * * * *" }] }
 *
 * Protected by CRON_SECRET (same pattern as /api/cron/scan).
 */

const PENDING_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  return handleExpiry(request);
}

export async function POST(request: NextRequest) {
  return handleExpiry(request);
}

async function handleExpiry(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - PENDING_EXPIRY_MS);

    // Find all PENDING transactions older than 24 hours
    const expired = await prisma.tokenTransaction.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
      data: {
        status: 'EXPIRED',
        updatedAt: new Date(),
      },
    });

    // Also expire stale ToolApprovals (HITL approvals pending > 24h)
    const expiredApprovals = await prisma.toolApproval.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
      data: {
        status: 'REJECTED', // Treat expired HITL approvals as auto-rejected
        updatedAt: new Date(),
      },
    });

    console.log(
      `[expire-pending] Expired ${expired.count} transactions, ${expiredApprovals.count} tool approvals (cutoff: ${cutoff.toISOString()})`
    );

    return NextResponse.json({
      success: true,
      expiredTransactions: expired.count,
      expiredApprovals: expiredApprovals.count,
      cutoff: cutoff.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[expire-pending] Cron failed:', error);
    return NextResponse.json(
      { error: 'Expiry cron failed', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
