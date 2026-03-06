import test from "node:test";
import assert from "node:assert/strict";
import { compileWorkflowPlan } from "./compiler";
import {
  canStartWorkflowRun,
  deriveWorkflowSafety,
  deserializeWorkflowPlan,
  deserializeWorkflowRetryHistory,
  determineRunnableStatus,
  evaluateWorkflowRunPolicy,
  serializeWorkflowPlan,
  serializeWorkflowRetryHistory,
} from "./persistence";

test("serializes and restores workflow plans safely", () => {
  const plan = compileWorkflowPlan("Check GitHub issues daily and summarize them in Slack");
  const serialized = serializeWorkflowPlan(plan);
  const restored = deserializeWorkflowPlan(serialized);

  assert.deepEqual(restored, plan);
});

test("marks financial workflows as blocked for execution", () => {
  const plan = compileWorkflowPlan("Buy SOL when price drops and send a Telegram update");
  const safety = deriveWorkflowSafety(plan);
  const policyDecision = evaluateWorkflowRunPolicy({
    userId: "user_123",
    workflowId: "wf_financial",
    workflowTitle: plan.title,
    workflowStatus: "draft",
    triggerSource: "manual",
    safety,
    crypto: {
      config: {
        defaultDecision: "simulate",
        perTransactionUsdCapCents: 10_00,
        dailyUsdCapCents: 50_00,
        enforceDestinationAllowlist: true,
        blockScheduledCrypto: true,
      },
      destinations: [],
    },
  });
  const decision = canStartWorkflowRun({ workflowStatus: "draft", safety });

  assert.equal(safety.containsFinancialSteps, true);
  assert.equal(safety.requiresTransactionCaps, true);
  assert.equal(safety.simulateOnlyByDefault, true);
  assert.equal(policyDecision.decision, "simulate");
  assert.equal(decision.allowed, false);
  assert.equal(decision.status, "blocked");
  assert.match(decision.blockedReason ?? "", /Workflow requires explicit approval/i);
});

test("marks low-risk workflows as ready when no open questions remain", () => {
  const plan = {
    ...compileWorkflowPlan("Summarize yesterday's GitHub issues in Slack"),
    openQuestions: [],
  };
  const safety = deriveWorkflowSafety(plan);
  const status = determineRunnableStatus(plan, safety);
  const decision = canStartWorkflowRun({ workflowStatus: status, safety });

  assert.equal(status, "ready");
  assert.equal(decision.allowed, true);
  assert.equal(decision.status, "pending");
});

test("round-trips retry history metadata", () => {
  const retryHistory = [
    {
      attempt: 1,
      reason: "Transient network timeout",
      requestedAt: new Date("2026-03-06T00:00:00.000Z").toISOString(),
    },
  ];

  const serialized = serializeWorkflowRetryHistory(retryHistory);
  const restored = deserializeWorkflowRetryHistory(serialized);

  assert.deepEqual(restored, retryHistory);
});

test("routes approval-required workflow runs through policy", () => {
  const plan = compileWorkflowPlan("Post a Slack summary after reviewing GitHub issues and wait for approval before sending");
  const safety = deriveWorkflowSafety(plan);
  const decision = evaluateWorkflowRunPolicy({
    userId: "user_123",
    workflowId: "wf_123",
    workflowTitle: plan.title,
    workflowStatus: "draft",
    triggerSource: "manual",
    safety,
  });

  assert.equal(decision.decision, "approve");
  assert.equal(decision.requiresApproval, true);
});
