export const SUPPORTED_COMPOSIO_TOOLKITS = [
  { slug: "github", label: "GitHub", envKey: "COMPOSIO_AUTH_CONFIG_GITHUB" },
  { slug: "slack", label: "Slack", envKey: "COMPOSIO_AUTH_CONFIG_SLACK" },
  { slug: "notion", label: "Notion", envKey: "COMPOSIO_AUTH_CONFIG_NOTION" },
  { slug: "gmail", label: "Gmail", envKey: "COMPOSIO_AUTH_CONFIG_GMAIL" },
  {
    slug: "googlesheets",
    label: "Google Sheets",
    envKey: "COMPOSIO_AUTH_CONFIG_GOOGLESHEETS",
  },
  {
    slug: "prompmate",
    label: "Prompmate",
    envKey: "COMPOSIO_AUTH_CONFIG_PROMPMATE",
  },
  {
    slug: "coinmarketcap",
    label: "CoinMarketCap",
    envKey: "COMPOSIO_AUTH_CONFIG_COINMARKETCAP",
  },
  {
    slug: "googlecalendar",
    label: "Google Calendar",
    envKey: "COMPOSIO_AUTH_CONFIG_GOOGLECALENDAR",
  },
  {
    slug: "supabase",
    label: "Supabase",
    envKey: "COMPOSIO_AUTH_CONFIG_SUPABASE",
  },
  {
    slug: "vercel",
    label: "Vercel",
    envKey: "COMPOSIO_AUTH_CONFIG_VERCEL",
  },
] as const;

export type ComposioToolkitSlug =
  (typeof SUPPORTED_COMPOSIO_TOOLKITS)[number]["slug"];

export function isComposioToolkitSlug(value: string): value is ComposioToolkitSlug {
  return SUPPORTED_COMPOSIO_TOOLKITS.some((toolkit) => toolkit.slug === value);
}

export function getComposioToolkitMeta(slug: ComposioToolkitSlug) {
  return SUPPORTED_COMPOSIO_TOOLKITS.find((toolkit) => toolkit.slug === slug)!;
}

function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^['"]|['"]$/g, "");
  return normalized.length > 0 ? normalized : null;
}

export function getComposioAuthConfigOverride(
  toolkitSlug: ComposioToolkitSlug
): string | null {
  const toolkit = getComposioToolkitMeta(toolkitSlug);
  return normalizeEnvValue(process.env[toolkit.envKey]);
}

export function getComposioSharedEntityOverride(): string | null {
  return normalizeEnvValue(process.env.COMPOSIO_ENTITY_ID);
}
