import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicy } from "@/lib/policy/engine";

const cryptoContext = {
  config: {
    defaultDecision: "simulate" as const,
    perTransactionUsdCapCents: 10_00,
    dailyUsdCapCents: 50_00,
    enforceDestinationAllowlist: true,
    blockScheduledCrypto: true,
  },
  destinations: [{ destination: "0xallow", asset: "USDC", active: true }],
};

test("allows low-risk read-only tool actions", () => {
  const decision = evaluatePolicy({
    subjectType: "tool_call",
    actor: { userId: "user_123" },
    triggerSource: "chat",
    toolName: "GITHUB_LIST_REPOSITORY_ISSUES",
    toolArgs: { owner: "acme", repo: "platform" },
    scopes: [{ tool: "GITHUB_LIST_REPOSITORY_ISSUES", mode: "read", resources: ["repo:acme/platform"], reason: "Read repo issues" }],
  });

  assert.equal(decision.decision, "allow");
  assert.equal(decision.requiresApproval, false);
  assert.equal(decision.simulateOnly, false);
});

test("requires approval for external write tool actions", () => {
  const decision = evaluatePolicy({
    subjectType: "tool_call",
    actor: { userId: "user_123" },
    triggerSource: "chat",
    toolName: "GMAIL_SEND_EMAIL",
    toolArgs: { to: "user@example.com" },
    scopes: [{ tool: "GMAIL_SEND_EMAIL", mode: "write", resources: ["mailbox:primary"], reason: "Send email" }],
  });

  assert.equal(decision.decision, "approve");
  assert.equal(decision.requiresApproval, true);
  assert.equal(decision.approvalRequestRequired, true);
});

test("forces financial tool actions into simulate-only mode", () => {
  const decision = evaluatePolicy({
    subjectType: "tool_call",
    actor: { userId: "user_123" },
    triggerSource: "chat",
    toolName: "WALLET_SEND_TOKEN",
    toolArgs: { amount: 5, estimatedUsd: 5, asset: "USDC", destinationAddress: "0xallow" },
    scopes: [{ tool: "WALLET_SEND_TOKEN", mode: "write", resources: ["wallet"], reason: "Send token" }],
    crypto: cryptoContext,
  });

  assert.equal(decision.decision, "approve");
  assert.equal(decision.simulateOnly, false);
  assert.equal(decision.auditRequired, true);
  assert.equal(decision.crypto?.allowlistStatus, "allowlisted");
});

test("requires approval for workflow runs that still need approval", () => {
  const decision = evaluatePolicy({
    subjectType: "workflow_run",
    actor: { userId: "user_123" },
    triggerSource: "manual",
    workflowId: "wf_123",
    workflowTitle: "GitHub summary",
    workflowStatus: "draft",
    safety: {
      containsFinancialSteps: false,
      requiresApproval: true,
      requiresTransactionCaps: false,
      requiresAuditLog: false,
      simulateOnlyByDefault: false,
      riskLevel: "medium",
      approvalState: "required",
      explicitScopesRequired: true,
      scopes: [{ tool: "GITHUB_LIST_REPOSITORY_ISSUES", mode: "read", resources: [], reason: "Read issues" }],
      schedulePreference: "github_actions_when_possible",
    },
  });

  assert.equal(decision.decision, "approve");
  assert.equal(decision.requiresApproval, true);
});

test("forces financial workflow runs into simulate-only mode", () => {
  const decision = evaluatePolicy({
    subjectType: "workflow_run",
    actor: { userId: "user_123" },
    triggerSource: "manual",
    workflowId: "wf_financial",
    workflowTitle: "Trade token",
    workflowStatus: "draft",
    safety: {
      containsFinancialSteps: true,
      requiresApproval: true,
      requiresTransactionCaps: true,
      requiresAuditLog: true,
      simulateOnlyByDefault: true,
      riskLevel: "high",
      approvalState: "required",
      explicitScopesRequired: true,
      scopes: [{ tool: "unassigned", mode: "write", resources: [], reason: "Financial step" }],
      schedulePreference: "manual_only",
    },
    crypto: cryptoContext,
  });

  assert.equal(decision.decision, "simulate");
  assert.equal(decision.simulateOnly, true);
  assert.equal(decision.auditRequired, true);
});

test("denies over-cap crypto tool actions", () => {
  const decision = evaluatePolicy({
    subjectType: "tool_call",
    actor: { userId: "user_123" },
    triggerSource: "chat",
    toolName: "WALLET_SEND_TOKEN",
    toolArgs: { amount: 25, estimatedUsd: 25, asset: "USDC", destinationAddress: "0xallow" },
    scopes: [{ tool: "WALLET_SEND_TOKEN", mode: "write", resources: ["wallet"], reason: "Transfer funds" }],
    crypto: cryptoContext,
  });

  assert.equal(decision.decision, "deny");
  assert.equal(decision.crypto?.capStatus, "over_cap");
});
