import { requiresApproval } from '@/lib/composio/approval-rules';
import { evaluateCryptoGuardrails } from '@/lib/crypto/guardrails';
import {
  policyDecisionSchema,
  policyInputSchema,
  type PolicyDecision,
  type PolicyInput,
  type PolicyScope,
} from '@/lib/policy/schema';

const READ_ONLY_TOOL_PATTERNS: RegExp[] = [
  /_GET_/i,
  /_FETCH_/i,
  /_LIST_/i,
  /_SEARCH_/i,
  /_FIND_/i,
  /_READ_/i,
];

const CRYPTO_TOOL_PATTERNS: RegExp[] = [
  /^STRIPE_/i,
  /^COINBASE_/i,
  /^BINANCE_/i,
  /^KRAKEN_/i,
  /^BYBIT_/i,
  /^OKX_/i,
  /^UNISWAP_/i,
  /^JUPITER_/i,
  /^SOLANA_/i,
  /^WALLET_/i,
  /^PAYMENT_/i,
  /^TRADING_/i,
];

function normalizeScopes(scopes: PolicyScope[], fallbackTool: string): PolicyScope[] {
  if (scopes.length > 0) return scopes;
  return [
    {
      tool: fallbackTool,
      mode: 'write',
      resources: [],
      reason: `Explicit scope placeholder for ${fallbackTool}`,
    },
  ];
}

function isReadOnlyTool(toolName: string): boolean {
  return (
    READ_ONLY_TOOL_PATTERNS.some(pattern => pattern.test(toolName)) && !requiresApproval(toolName)
  );
}

function isFinancialScope(scope: PolicyScope): boolean {
  return CRYPTO_TOOL_PATTERNS.some(pattern => pattern.test(scope.tool));
}

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const parsed = policyInputSchema.parse(input);

  if (parsed.subjectType === 'tool_call') {
    const scopes = normalizeScopes(parsed.scopes, parsed.toolName);
    const approvalNeeded = requiresApproval(parsed.toolName);
    const readOnly = isReadOnlyTool(parsed.toolName);
    const cryptoDecision = evaluateCryptoGuardrails({
      subjectType: 'tool_call',
      triggerSource: parsed.triggerSource,
      actor: parsed.actor,
      tool: {
        toolName: parsed.toolName,
        toolArgs: parsed.toolArgs,
      },
      config: parsed.crypto?.config ?? null,
      destinations: parsed.crypto?.destinations ?? [],
    });

    if (cryptoDecision.isCryptoRelated) {
      const actionType =
        cryptoDecision.cryptoActionType === 'trading'
          ? 'trading'
          : cryptoDecision.cryptoActionType === 'payment'
            ? 'payment'
            : 'financial';

      return policyDecisionSchema.parse({
        subjectType: 'tool_call',
        actionType,
        riskLevel: cryptoDecision.riskLevel,
        scopes,
        decision: cryptoDecision.decision,
        reason: cryptoDecision.reason,
        requiresApproval: cryptoDecision.requiresApproval,
        simulateOnly: cryptoDecision.simulateOnly,
        auditRequired: true,
        approvalRequestRequired: cryptoDecision.decision === 'approve',
        metadata: {
          toolName: parsed.toolName,
          triggerSource: parsed.triggerSource,
          cryptoRelated: true,
        },
        crypto: cryptoDecision,
      });
    }

    if (approvalNeeded) {
      return policyDecisionSchema.parse({
        subjectType: 'tool_call',
        actionType: 'write',
        riskLevel: 'medium',
        scopes,
        decision: 'approve',
        reason:
          'External write or mutating tool actions require explicit approval before execution.',
        requiresApproval: true,
        simulateOnly: false,
        auditRequired: false,
        approvalRequestRequired: true,
        metadata: { toolName: parsed.toolName, triggerSource: parsed.triggerSource },
        crypto: null,
      });
    }

    if (readOnly) {
      return policyDecisionSchema.parse({
        subjectType: 'tool_call',
        actionType: 'read',
        riskLevel: 'low',
        scopes: scopes.map(scope => ({ ...scope, mode: 'read' })),
        decision: 'allow',
        reason: 'Read-only tool action is low-risk and may proceed automatically.',
        requiresApproval: false,
        simulateOnly: false,
        auditRequired: false,
        approvalRequestRequired: false,
        metadata: { toolName: parsed.toolName, triggerSource: parsed.triggerSource },
        crypto: null,
      });
    }

    return policyDecisionSchema.parse({
      subjectType: 'tool_call',
      actionType: 'dangerous',
      riskLevel: 'high',
      scopes,
      decision: 'approve',
      reason: 'Unsupported or non-read-only tool action defaults to explicit approval for safety.',
      requiresApproval: true,
      simulateOnly: false,
      auditRequired: false,
      approvalRequestRequired: true,
      metadata: { toolName: parsed.toolName, triggerSource: parsed.triggerSource, defaulted: true },
      crypto: null,
    });
  }

  const { safety } = parsed;
  const scopes = parsed.safety.scopes;

  // Closure of Policy Blind Spot:
  // We double-check the scopes here even if containsFinancialSteps is false.
  // This ensures that if the pre-computed metadata is inconsistent, we still
  // treat the workflow as financial for policy evaluation.
  const hasFinancialScope = scopes.some(isFinancialScope);
  const containsFinancialSteps = safety.containsFinancialSteps || hasFinancialScope;

  const cryptoDecision = evaluateCryptoGuardrails({
    subjectType: 'workflow_run',
    triggerSource: parsed.triggerSource,
    actor: parsed.actor,
    workflow: {
      workflowId: parsed.workflowId,
      workflowTitle: parsed.workflowTitle,
      workflowStatus: parsed.workflowStatus,
      safety: {
        containsFinancialSteps, // Use the re-verified value
        requiresTransactionCaps: safety.requiresTransactionCaps,
        requiresAuditLog: safety.requiresAuditLog,
        simulateOnlyByDefault: safety.simulateOnlyByDefault,
        riskLevel: safety.riskLevel,
        approvalState: safety.approvalState,
        schedulePreference: safety.schedulePreference,
      },
    },
    config: parsed.crypto?.config ?? null,
    destinations: parsed.crypto?.destinations ?? [],
  });

  if (cryptoDecision.isCryptoRelated) {
    return policyDecisionSchema.parse({
      subjectType: 'workflow_run',
      actionType: 'financial',
      riskLevel: cryptoDecision.riskLevel,
      scopes,
      decision: cryptoDecision.decision,
      reason: cryptoDecision.reason,
      requiresApproval: cryptoDecision.requiresApproval,
      simulateOnly: cryptoDecision.simulateOnly,
      auditRequired: true,
      approvalRequestRequired: cryptoDecision.decision === 'approve',
      metadata: {
        workflowId: parsed.workflowId,
        workflowTitle: parsed.workflowTitle,
        triggerSource: parsed.triggerSource,
        schedulePreference: safety.schedulePreference,
      },
      crypto: cryptoDecision,
    });
  }

  if (safety.approvalState === 'required' || safety.requiresApproval) {
    return policyDecisionSchema.parse({
      subjectType: 'workflow_run',
      actionType: 'workflow_execute',
      riskLevel: safety.riskLevel === 'high' ? 'high' : 'medium',
      scopes,
      decision: 'approve',
      reason: 'Workflow run requires explicit approval before becoming runnable.',
      requiresApproval: true,
      simulateOnly: false,
      auditRequired: safety.requiresAuditLog,
      approvalRequestRequired: true,
      metadata: {
        workflowId: parsed.workflowId,
        workflowTitle: parsed.workflowTitle,
        triggerSource: parsed.triggerSource,
        schedulePreference: safety.schedulePreference,
      },
      crypto: null,
    });
  }

  return policyDecisionSchema.parse({
    subjectType: 'workflow_run',
    actionType: 'workflow_execute',
    riskLevel: safety.riskLevel,
    scopes,
    decision: 'allow',
    reason: 'Workflow run satisfies current policy checks and may proceed to runnable state.',
    requiresApproval: false,
    simulateOnly: false,
    auditRequired: safety.requiresAuditLog,
    approvalRequestRequired: false,
    metadata: {
      workflowId: parsed.workflowId,
      workflowTitle: parsed.workflowTitle,
      triggerSource: parsed.triggerSource,
      schedulePreference: safety.schedulePreference,
    },
    crypto: null,
  });
}
