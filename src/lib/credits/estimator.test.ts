import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateWorkflowCost,
  estimateWorkflowRunCost,
  getDefaultModelCost,
} from "./estimator";

test("estimates workflow cost with steps", () => {
  const result = estimateWorkflowCost({
    steps: [
      { id: "1", description: "Research task", kind: "research", toolHints: [] },
      { id: "2", description: "Execute action", kind: "action", toolHints: ["TOOL_A"] },
      { id: "3", description: "Send notification", kind: "notify", toolHints: [] },
    ],
  });

  assert.ok(result.totalEstimate > 0);
  assert.ok(result.breakdown.length === 3);
  assert.strictEqual(result.isMinimum, true);
  assert.ok(result.disclaimer.includes("external") || result.disclaimer.includes("minimum"));
});

test("estimates workflow cost from plan JSON", () => {
  const planJson = JSON.stringify({
    steps: [
      { id: "1", description: "Research", kind: "research", toolHints: [] },
    ],
  });

  const result = estimateWorkflowRunCost({ workflowPlanJson: planJson });

  assert.ok(result.totalEstimate > 0);
  assert.strictEqual(result.breakdown.length, 1);
});

test("handles invalid plan JSON gracefully", () => {
  const result = estimateWorkflowRunCost({ workflowPlanJson: "invalid json" });

  assert.ok(result.totalEstimate > 0);
  assert.ok(result.disclaimer.includes("fallback"));
});

test("returns default model cost", () => {
  const cost = getDefaultModelCost();
  assert.ok(cost > 0);
});

test("estimates different costs for different step kinds", () => {
  const researchResult = estimateWorkflowCost({
    steps: [{ id: "1", description: "Research", kind: "research", toolHints: [] }],
  });

  const notifyResult = estimateWorkflowCost({
    steps: [{ id: "1", description: "Notify", kind: "notify", toolHints: [] }],
  });

  assert.notStrictEqual(researchResult.totalEstimate, notifyResult.totalEstimate);
});
