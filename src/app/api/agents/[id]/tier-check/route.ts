import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthFromCookies } from '@/lib/auth/middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Get authenticated user (optional - returns null if not authenticated)
  const auth = await getAuthFromCookies();

  // Get the agent
  const agent = await prisma.agentConfig.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      requiredTier: true,
    },
  });

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // If user is not authenticated, they can only access FREE agents
  if (!auth) {
    const canAccess = agent.requiredTier === 'FREE' || agent.requiredTier === 'BOTH';
    return NextResponse.json({
      canAccess,
      requiredTier: agent.requiredTier,
      userTier: null,
      upgradeRequired: !canAccess,
      upgradePrompt: !canAccess ? `Upgrade to Pro to access ${agent.name}` : null,
    });
  }

  // Get user's tier
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { tier: true },
  });

  const userTier = user?.tier || 'FREE';
  const requiredTier = agent.requiredTier || 'FREE';

  // Check if user can access the agent
  const canAccess = requiredTier === 'BOTH' || requiredTier === userTier;

  return NextResponse.json({
    canAccess,
    requiredTier,
    userTier,
    upgradeRequired: !canAccess,
    upgradePrompt: !canAccess ? `Upgrade to Pro to access ${agent.name}` : null,
  });
}
