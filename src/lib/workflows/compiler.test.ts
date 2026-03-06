import test from "node:test";
import assert from "node:assert/strict";
import { compileWorkflowPlan, looksLikeWorkflowRequest } from "./compiler";
import { buildToolRecommendationsFromHeuristics } from "./tool-recommendations";

test("detects recurring monitoring requests as workflow intent", () => {
  assert.equal(
    looksLikeWorkflowRequest("Monitor pump.fun opportunities every hour and alert me in Telegram"),
    true,
  );
});

test("compiles a scheduled monitoring workflow with GitHub Actions preference", () => {
  const plan = compileWorkflowPlan("Monitor pump.fun opportunities every hour and alert me in Telegram");

  assert.equal(plan.trigger.type, "schedule");
  assert.equal(plan.trigger.preferredRunner, "github_actions");
  assert.match(plan.trigger.schedule ?? "", /every hour/i);
  assert.ok(plan.steps.length >= 1);
  assert.ok(plan.toolRecommendations.some((item) => item.suggestedApproach === "GitHub Actions"));
});

test("marks financial workflows as needing policy confirmation", () => {
  const plan = compileWorkflowPlan("When a token breaks out, buy it and send the fill summary to Telegram");

  assert.equal(plan.readiness, "needs_policy_confirmation");
  assert.equal(plan.guardrails.requiresTransactionCaps, true);
  assert.equal(plan.guardrails.simulateOnlyByDefault, true);
  assert.ok(plan.approvals.some((approval) => approval.reason.toLowerCase().includes("financial")));
});

test("recommends GitHub Actions instead of cron jobs", () => {
  const plan = compileWorkflowPlan("Replace my cron job with a workflow that checks new GitHub issues daily and posts a summary");

  assert.ok(plan.toolRecommendations.some((item) => item.currentApproach.includes("Cron") || item.currentApproach.includes("scheduled")));
  assert.ok(plan.toolRecommendations.some((item) => item.suggestedApproach === "GitHub Actions"));
});

test("builds GitHub integration recommendation for manual repo checking", () => {
  const recommendations = buildToolRecommendationsFromHeuristics(
    "Check GitHub issues manually and review pull request status for my repo",
    {
      type: "manual",
      description: "Manual trigger",
      preferredRunner: "manual",
    },
  );

  assert.ok(recommendations.some((item) => item.suggestedApproach === "GitHub integration"));
  assert.ok(recommendations.some((item) => item.reason.includes("structured repository state")));
});

test("builds CoinMarketCap recommendation for generic crypto lookups", () => {
  const recommendations = buildToolRecommendationsFromHeuristics(
    "Check the latest crypto prices and market cap rankings for major tokens",
    {
      type: "manual",
      description: "Manual trigger",
      preferredRunner: "manual",
    },
  );

  assert.ok(recommendations.some((item) => item.suggestedApproach === "CoinMarketCap"));
  assert.ok(recommendations.some((item) => item.reason.includes("structured crypto prices")));
});

test("compiler includes multiple truthful substitution patterns when applicable", () => {
  const plan = compileWorkflowPlan(
    "Every day, check GitHub issues manually for my repo and compare that with the latest crypto prices before sending a summary",
  );

  assert.ok(plan.toolRecommendations.some((item) => item.suggestedApproach === "GitHub Actions"));
  assert.ok(plan.toolRecommendations.some((item) => item.suggestedApproach === "GitHub integration"));
  assert.ok(plan.toolRecommendations.some((item) => item.suggestedApproach === "CoinMarketCap"));
});
