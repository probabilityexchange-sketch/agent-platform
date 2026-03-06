import { type WorkflowPlan } from "./schema";

type WorkflowTrigger = WorkflowPlan["trigger"];
type WorkflowToolRecommendation = WorkflowPlan["toolRecommendations"][number];

interface ToolRecommendationRule {
  id: string;
  matches: (input: { message: string; normalized: string; trigger: WorkflowTrigger }) => boolean;
  build: (input: { normalized: string }) => WorkflowToolRecommendation;
}

const TOOL_RECOMMENDATION_RULES: ToolRecommendationRule[] = [
  {
    id: "scheduled-runner-github-actions",
    matches: ({ normalized, trigger }) => {
      return normalized.includes("cron") || trigger.type === "schedule" || trigger.type === "monitor";
    },
    build: ({ normalized }) => ({
      currentApproach: normalized.includes("cron") ? "Cron job" : "Generic scheduled runner",
      suggestedApproach: "GitHub Actions",
      reason: "GitHub Actions is the preferred scheduling path here because it gives repo-native logs and a safer recurring runner than ad-hoc cron.",
    }),
  },
  {
    id: "manual-repo-check-github",
    matches: ({ normalized }) => {
      const mentionsRepo = /\b(github|repo|repository|issue|pull request|pr)\b/i.test(normalized);
      const manualChecking = /\b(check|review|look up|monitor|watch|track|status|scan|manually)\b/i.test(normalized);
      return mentionsRepo && manualChecking;
    },
    build: () => ({
      currentApproach: "Manual repo checking",
      suggestedApproach: "GitHub integration",
      reason: "A GitHub integration gives structured repository state for issues, pull requests, and commits instead of relying on manual checking or generic summaries.",
    }),
  },
  {
    id: "generic-crypto-lookup-coinmarketcap",
    matches: ({ normalized }) => {
      const mentionsCrypto = /\b(crypto|token|coin|market cap|price|volume|ranking|rankings)\b/i.test(normalized);
      const genericLookup = /\b(lookup|look up|check|monitor|track|research|find|latest|price|prices)\b/i.test(normalized);
      const isFinancialAction = /\b(buy|sell|swap|trade|transfer|send money|payment|pay)\b/i.test(normalized);
      return mentionsCrypto && genericLookup && !isFinancialAction;
    },
    build: () => ({
      currentApproach: "Generic market or crypto lookup",
      suggestedApproach: "CoinMarketCap",
      reason: "CoinMarketCap provides structured crypto prices, rankings, and market metadata, which is more reliable for this kind of lookup than a generic research path.",
    }),
  },
];

export function buildToolRecommendationsFromHeuristics(message: string, trigger: WorkflowTrigger): WorkflowPlan["toolRecommendations"] {
  const normalized = message.toLowerCase();
  const recommendations: WorkflowPlan["toolRecommendations"] = [];
  const seenSuggestions = new Set<string>();

  for (const rule of TOOL_RECOMMENDATION_RULES) {
    if (!rule.matches({ message, normalized, trigger })) continue;

    const recommendation = rule.build({ normalized });
    const key = `${recommendation.currentApproach}->${recommendation.suggestedApproach}`;
    if (seenSuggestions.has(key)) continue;

    seenSuggestions.add(key);
    recommendations.push(recommendation);
  }

  return recommendations;
}
