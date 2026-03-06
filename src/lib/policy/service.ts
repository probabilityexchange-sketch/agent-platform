import { prisma } from "@/lib/db/prisma";
import { loadCryptoGuardrailContext, recordCryptoAuditEvent } from "@/lib/crypto/service";
import { describeToolCall } from "@/lib/composio/approval-rules";
import { evaluatePolicy } from "@/lib/policy/engine";
import { type PolicyDecision, type PolicyInput } from "@/lib/policy/schema";

function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

export async function evaluateAndRecordPolicy(input: PolicyInput): Promise<PolicyDecision> {
  const cryptoContext = await loadCryptoGuardrailContext(input.actor.userId);

  const decision = evaluatePolicy({
    ...input,
    crypto: cryptoContext,
  });

  await prisma.policyDecision.create({
    data: {
      userId: input.actor.userId,
      sessionId: input.actor.sessionId ?? null,
      subjectType: decision.subjectType,
      subjectId: input.subjectType === "tool_call" ? input.toolName : input.workflowId,
      actionType: decision.actionType,
      riskLevel: decision.riskLevel,
      decision: decision.decision,
      reason: decision.reason,
      requiresApproval: decision.requiresApproval,
      simulateOnly: decision.simulateOnly,
      auditRequired: decision.auditRequired,
      scopesJson: stringifyJson(decision.scopes),
      inputJson: stringifyJson(input),
      metadataJson: stringifyJson(decision.metadata),
    },
  });

  if (decision.crypto?.isCryptoRelated) {
    await recordCryptoAuditEvent({
      userId: input.actor.userId,
      sessionId: input.actor.sessionId,
      workflowId: input.subjectType === "workflow_run" ? input.workflowId : undefined,
      subjectId: input.subjectType === "tool_call" ? input.toolName : input.workflowId,
      triggerSource: input.triggerSource,
      decision: decision.crypto,
      input,
    });
  }

  if (decision.auditRequired) {
    await prisma.policyAuditLog.create({
      data: {
        userId: input.actor.userId,
        sessionId: input.actor.sessionId ?? null,
        workflowId: input.subjectType === "workflow_run" ? input.workflowId : null,
        eventType: decision.subjectType === "tool_call" ? "tool_policy_evaluated" : "workflow_policy_evaluated",
        category: decision.actionType,
        outcome: decision.decision,
        reason: decision.reason,
        detailsJson: stringifyJson({ input, decision }),
      },
    });
  }

  return decision;
}

export async function createApprovalRequestFromPolicy(params: {
  userId: string;
  sessionId?: string;
  policyDecision: PolicyDecision;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: unknown;
  workflowId?: string;
  pendingMessages?: string;
}) {
  const summary = params.toolName
    ? params.policyDecision.crypto?.isCryptoRelated
      ? `Approve crypto action: ${params.toolName}${params.policyDecision.crypto.destination ? ` to ${params.policyDecision.crypto.destination}` : ""}`
      : describeToolCall(params.toolName, stringifyJson(params.toolArgs ?? {}))
    : `Approve workflow run for ${params.workflowId ?? "workflow"}`;

  return prisma.approvalRequest.create({
    data: {
      userId: params.userId,
      sessionId: params.sessionId ?? null,
      workflowId: params.workflowId ?? null,
      toolCallId: params.toolCallId ?? null,
      toolName: params.toolName ?? null,
      toolArgsJson: params.toolName ? stringifyJson(params.toolArgs ?? {}) : null,
      summary,
      status: "pending",
      decisionType: params.policyDecision.decision,
      reason: params.policyDecision.reason,
      scopesJson: stringifyJson(params.policyDecision.scopes),
      pendingMessages: params.pendingMessages ?? null,
      metadataJson: stringifyJson(params.policyDecision.metadata),
    },
  });
}

export async function resolveApprovalRequest(params: {
  approvalRequestId: string;
  userId: string;
  resolution: "approved" | "rejected";
}) {
  return prisma.approvalRequest.update({
    where: { id_userId: { id: params.approvalRequestId, userId: params.userId } },
    data: {
      status: params.resolution,
      resolvedAt: new Date(),
    },
  });
}

export async function getApprovalRequestForUser(approvalRequestId: string, userId: string) {
  return prisma.approvalRequest.findUnique({
    where: { id_userId: { id: approvalRequestId, userId } },
  });
}
