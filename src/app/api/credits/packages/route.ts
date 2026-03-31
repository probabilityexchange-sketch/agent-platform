import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { getLiveUsagePackages } from '@/lib/credits/usage-packages';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anon';
  const { allowed } = await checkRateLimit(`credits-packages:${ip}`, RATE_LIMITS.general);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  return NextResponse.json({
    plan: { id: 'free', name: 'Free Tier', price: 0 },
    packages: await getLiveUsagePackages(),
  });
}
