import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSpecialistDelegationPrompt,
  parseSpecialistResponseEnvelope,
  formatSpecialistResponse,
  type DelegateToSpecialistArgs,
  type SpecialistResponseEnvelope,
} from "@/lib/orchestration/tools";

const baseArgs: DelegateToSpecialistArgs = {
  specialistSlug: "research-assistant",
  taskSummary: "Check two market data sources for BTC headline moves",
  subQuery: "Inspect the latest BTC headlines and summarize catalysts from two sources.",
  expectedOutput: {
    format: "structured_findings",
    sections: ["completedWork", "output", "evidence", "blockedBy", "unresolved"],
  },
  scopeNotes: ["Use only the assigned research tools.", "Do not give trading advice."],
  completionCriteria: ["Stop after two sources are checked.", "Report if a source is unavailable."],
};

test("buildSpecialistDelegationPrompt includes bounded contract details", () => {
  const prompt = buildSpecialistDelegationPrompt(baseArgs);

  assert.match(prompt, /Delegated task summary: Check two market data sources/);
  assert.match(prompt, /Expected output format: structured_findings/);
  assert.match(prompt, /Scope notes:/);
  assert.match(prompt, /Completion criteria:/);
  assert.match(prompt, /Return only valid JSON matching this shape:/);
  assert.match(prompt, /Do not simulate tool results/);
});

test("parseSpecialistResponseEnvelope preserves structured completion details", () => {
  const envelope = parseSpecialistResponseEnvelope(
    JSON.stringify({
      status: "partial",
      completedWork: ["Checked CoinMarketCap headlines", "Reviewed one browser snapshot"],
      output: "BTC moved after ETF flow commentary, but the second source timed out.",
      evidence: [
        { kind: "tool_call", detail: "COINMARKETCAP_GET_CRYPTO_NEWS" },
        { kind: "url", detail: "https://example.com/btc-news" },
      ],
      blockedBy: ["Second source returned a timeout"],
      unresolved: ["Need confirmation from another independent source"],
    }),
    baseArgs
  );

  assert.equal(envelope.specialistSlug, "research-assistant");
  assert.equal(envelope.status, "partial");
  assert.deepEqual(envelope.completedWork, ["Checked CoinMarketCap headlines", "Reviewed one browser snapshot"]);
  assert.equal(envelope.evidence.length, 2);
  assert.deepEqual(envelope.blockedBy, ["Second source returned a timeout"]);
  assert.deepEqual(envelope.unresolved, ["Need confirmation from another independent source"]);
});

test("parseSpecialistResponseEnvelope marks unstructured text as unresolved raw handoff", () => {
  const envelope = parseSpecialistResponseEnvelope("Looked around and found some things.", baseArgs);

  assert.equal(envelope.status, "failed");
  assert.equal(envelope.output, "Looked around and found some things.");
  assert.deepEqual(envelope.completedWork, []);
  assert.match(envelope.unresolved[0], /unstructured/i);
});

test("formatSpecialistResponse returns human readable markdown", () => {
  const envelope: SpecialistResponseEnvelope = {
    specialistSlug: "token-launcher",
    status: "completed",
    role: "token launch specialist",
    delegatedTask: "Launch $RANDI token on Base",
    completedWork: ["Validated parameters", "Generated !clawnch post"],
    output: "The token launch post is ready. Please post it to Moltbook.",
    evidence: [],
    blockedBy: [],
    unresolved: [],
  };

  const formatted = formatSpecialistResponse(envelope);

  assert.match(formatted, /✅ \*TOKEN LAUNCH SPECIALIST REPORT\*/);
  assert.match(formatted, /Launch \$RANDI token on Base/);
  assert.match(formatted, /The token launch post is ready/);
  assert.match(formatted, /- Validated parameters/);
  assert.match(formatted, /- Generated !clawnch post/);
});

test("formatSpecialistResponse handles blocked status with emoji", () => {
  const envelope: SpecialistResponseEnvelope = {
    specialistSlug: "research-assistant",
    status: "blocked",
    role: "research specialist",
    delegatedTask: "Find price of $RANDI",
    completedWork: [],
    output: "I could not find the price.",
    evidence: [],
    blockedBy: ["API is down"],
    unresolved: ["Price remains unknown"],
  };

  const formatted = formatSpecialistResponse(envelope);

  assert.match(formatted, /🛑 \*RESEARCH SPECIALIST REPORT\*/);
  assert.match(formatted, /\*Blocked By:\*/);
  assert.match(formatted, /- API is down/);
  assert.match(formatted, /\*Unresolved Issues:\*/);
  assert.match(formatted, /- Price remains unknown/);
});

