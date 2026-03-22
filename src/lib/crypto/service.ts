import { prisma } from '@/lib/db/prisma';
import { evaluateCryptoGuardrails } from '@/lib/crypto/guardrails';
import {
  cryptoDestinationAllowlistEntrySchema,
  cryptoGuardrailConfigSchema,
  type CryptoDestinationAllowlistEntry,
  type CryptoGuardrailConfig,
  type CryptoGuardrailDecision,
  type CryptoGuardrailEvaluationInput,
} from '@/lib/crypto/schema';

export async function getOrCreateCryptoGuardrailConfig(
  userId: string
): Promise<CryptoGuardrailConfig> {
  const record = await prisma.cryptoGuardrailConfig.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      defaultDecision: 'simulate',
      perTransactionUsdCapCents: 1000,
      dailyUsdCapCents: 5000,
      enforceDestinationAllowlist: true,
      blockScheduledCrypto: true,
    },
  });

  return cryptoGuardrailConfigSchema.parse(record);
}

export async function listActiveCryptoDestinations(
  userId: string
): Promise<CryptoDestinationAllowlistEntry[]> {
  const records = await prisma.cryptoDestinationAllowlistEntry.findMany({
    where: {
      userId,
      active: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return records.map(record =>
    cryptoDestinationAllowlistEntrySchema.parse({
      destination: record.destination,
      asset: record.asset ?? undefined,
      chain: record.chain ?? undefined,
      label: record.label,
      active: record.active,
    })
  );
}

export async function loadCryptoGuardrailContext(userId: string) {
  const [config, destinations] = await Promise.all([
    getOrCreateCryptoGuardrailConfig(userId),
    listActiveCryptoDestinations(userId),
  ]);

  return { config, destinations };
}

export async function evaluateCryptoGuardrailsForUser(
  input: Omit<CryptoGuardrailEvaluationInput, 'config' | 'destinations'>
): Promise<CryptoGuardrailDecision> {
  const { config, destinations } = await loadCryptoGuardrailContext(input.actor.userId);

  return evaluateCryptoGuardrails({
    ...input,
    config,
    destinations,
  });
}

export async function recordCryptoAuditEvent(params: {
  userId: string;
  sessionId?: string;
  workflowId?: string;
  subjectId: string;
  triggerSource: CryptoGuardrailEvaluationInput['triggerSource'];
  decision: CryptoGuardrailDecision;
  input: unknown;
}) {
  if (!params.decision.isCryptoRelated) return;

  await prisma.cryptoAuditLog.create({
    data: {
      userId: params.userId,
      sessionId: params.sessionId ?? null,
      workflowId: params.workflowId ?? null,
      subjectType: params.decision.subjectType,
      subjectId: params.subjectId,
      triggerSource: params.triggerSource,
      cryptoActionType: params.decision.cryptoActionType,
      asset: params.decision.asset,
      amount: params.decision.amount,
      amountUsdCents: params.decision.estimatedUsdCents,
      destination: params.decision.destination,
      riskLevel: params.decision.riskLevel,
      decision: params.decision.decision,
      reason: params.decision.reason,
      capStatus: params.decision.capStatus,
      allowlistStatus: params.decision.allowlistStatus,
      simulateOnly: params.decision.simulateOnly,
      requiresApproval: params.decision.requiresApproval,
      detailsJson: JSON.stringify({
        input: params.input,
        decision: params.decision,
      }),
    },
  });
}
