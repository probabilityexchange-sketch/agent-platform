import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCryptoGuardrails } from "@/lib/crypto/guardrails";

const cryptoConfig = {
  defaultDecision: "simulate" as const,
  perTransactionUsdCapCents: 10_00,
  dailyUsdCapCents: 50_00,
  enforceDestinationAllowlist: true,
  blockScheduledCrypto: true,
};

test("allows read-only crypto actions", () => {
  const decision = evaluateCryptoGuardrails({
    subjectType: "tool_call",
    triggerSource: "chat",
    actor: { userId: "user_123" },
    tool: {
      toolName: "WALLET_GET_BALANCE",
      toolArgs: { walletAddress: "0xabc" },
    },
    config: cryptoConfig,
    destinations: [],
  });

  assert.equal(decision.decision, "allow");
  assert.equal(decision.simulateOnly, false);
  assert.equal(decision.requiresApproval, false);
});

test("requires approval for within-cap allowlisted crypto writes", () => {
  const decision = evaluateCryptoGuardrails({
    subjectType: "tool_call",
    triggerSource: "chat",
    actor: { userId: "user_123" },
    tool: {
      toolName: "WALLET_SEND_TOKEN",
      toolArgs: {
        amount: "5",
        estimatedUsd: 5,
        asset: "USDC",
        destinationAddress: "0xallow",
      },
    },
    config: cryptoConfig,
    destinations: [{ destination: "0xallow", asset: "USDC", active: true }],
  });

  assert.equal(decision.decision, "approve");
  assert.equal(decision.capStatus, "within_cap");
  assert.equal(decision.allowlistStatus, "allowlisted");
});

test("denies over-cap crypto writes", () => {
  const decision = evaluateCryptoGuardrails({
    subjectType: "tool_call",
    triggerSource: "chat",
    actor: { userId: "user_123" },
    tool: {
      toolName: "WALLET_SEND_TOKEN",
      toolArgs: {
        amount: "25",
        estimatedUsd: 25,
        asset: "USDC",
        destinationAddress: "0xallow",
      },
    },
    config: cryptoConfig,
    destinations: [{ destination: "0xallow", asset: "USDC", active: true }],
  });

  assert.equal(decision.decision, "deny");
  assert.equal(decision.capStatus, "over_cap");
});

test("simulates crypto writes when amount is missing", () => {
  const decision = evaluateCryptoGuardrails({
    subjectType: "tool_call",
    triggerSource: "chat",
    actor: { userId: "user_123" },
    tool: {
      toolName: "TRADING_CREATE_ORDER",
      toolArgs: {
        symbol: "SOL",
        destinationAddress: "exchange-account",
      },
    },
    config: cryptoConfig,
    destinations: [{ destination: "exchange-account", active: true }],
  });

  assert.equal(decision.decision, "simulate");
  assert.equal(decision.simulateOnly, true);
  assert.equal(decision.capStatus, "missing_amount");
});

test("denies scheduled crypto writes even when capped and allowlisted", () => {
  const decision = evaluateCryptoGuardrails({
    subjectType: "tool_call",
    triggerSource: "schedule",
    actor: { userId: "user_123" },
    tool: {
      toolName: "WALLET_SEND_TOKEN",
      toolArgs: {
        amount: "5",
        estimatedUsd: 5,
        asset: "USDC",
        destinationAddress: "0xallow",
      },
    },
    config: cryptoConfig,
    destinations: [{ destination: "0xallow", asset: "USDC", active: true }],
  });

  assert.equal(decision.decision, "deny");
});
