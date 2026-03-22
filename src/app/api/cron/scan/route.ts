import { NextRequest, NextResponse } from 'next/server';
import { runScanner } from '@/lib/payments/scanner';
import { runBurnService } from '@/lib/payments/burn-service';
import { isCronAuthorized } from '@/lib/utils/cron-auth';

async function handleScan(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const processed = await runScanner();
    const burnResult = await runBurnService();

    return NextResponse.json({
      success: true,
      processedTransactions: processed,
      burnResult: burnResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scanner cron failed:', error);
    return NextResponse.json({ error: 'Scanner failed' }, { status: 500 });
  }
}

// Vercel Cron Jobs invoke GET requests
export async function GET(request: NextRequest) {
  return handleScan(request);
}

// Keep POST for manual/external invocations
export async function POST(request: NextRequest) {
  return handleScan(request);
}
