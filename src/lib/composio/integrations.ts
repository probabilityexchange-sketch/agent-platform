// ---------------------------------------------------------------------------
// SUPPORTED COMPOSIO TOOLKITS
// This is the curated list of toolkits exposed to users in the Integrations
// page. Each toolkit gets a category, icon emoji, and description for the UI.
// The envKey is an optional override to bypass the Composio auth-config lookup.
// ---------------------------------------------------------------------------

export type ComposioCategory =
  | "Productivity"
  | "Code & Dev"
  | "Communication"
  | "Data & Analytics"
  | "Finance"
  | "AI & Automation"
  | "CRM & Sales"
  | "Cloud & Infra";

export interface ComposioToolkitDef {
  slug: string;
  label: string;
  category: ComposioCategory;
  icon: string; // emoji
  description: string;
  envKey: string;
}

export const SUPPORTED_COMPOSIO_TOOLKITS: readonly ComposioToolkitDef[] = [
  // ── Productivity ──────────────────────────────────────────────────────────
  {
    slug: "googlecalendar",
    label: "Google Calendar",
    category: "Productivity",
    icon: "📅",
    description: "Create events, schedule meetings, and manage availability.",
    envKey: "COMPOSIO_AUTH_CONFIG_GOOGLECALENDAR",
  },
  {
    slug: "googlesheets",
    label: "Google Sheets",
    category: "Productivity",
    icon: "📊",
    description: "Read and write spreadsheet data, run calculations.",
    envKey: "COMPOSIO_AUTH_CONFIG_GOOGLESHEETS",
  },
  {
    slug: "googledocs",
    label: "Google Docs",
    category: "Productivity",
    icon: "📝",
    description: "Create, read, and edit Google Docs documents.",
    envKey: "COMPOSIO_AUTH_CONFIG_GOOGLEDOCS",
  },
  {
    slug: "googledrive",
    label: "Google Drive",
    category: "Productivity",
    icon: "💾",
    description: "List, upload, download, and manage Drive files.",
    envKey: "COMPOSIO_AUTH_CONFIG_GOOGLEDRIVE",
  },
  {
    slug: "notion",
    label: "Notion",
    category: "Productivity",
    icon: "📒",
    description: "Create pages, update databases, and search workspaces.",
    envKey: "COMPOSIO_AUTH_CONFIG_NOTION",
  },
  {
    slug: "airtable",
    label: "Airtable",
    category: "Productivity",
    icon: "🗃️",
    description: "Query and update Airtable bases and records.",
    envKey: "COMPOSIO_AUTH_CONFIG_AIRTABLE",
  },
  {
    slug: "asana",
    label: "Asana",
    category: "Productivity",
    icon: "✅",
    description: "Manage tasks, projects, and team workflows.",
    envKey: "COMPOSIO_AUTH_CONFIG_ASANA",
  },
  {
    slug: "trello",
    label: "Trello",
    category: "Productivity",
    icon: "📋",
    description: "Create cards, move tasks across boards and lists.",
    envKey: "COMPOSIO_AUTH_CONFIG_TRELLO",
  },
  {
    slug: "todoist",
    label: "Todoist",
    category: "Productivity",
    icon: "☑️",
    description: "Add and manage tasks and projects in Todoist.",
    envKey: "COMPOSIO_AUTH_CONFIG_TODOIST",
  },
  {
    slug: "clickup",
    label: "ClickUp",
    category: "Productivity",
    icon: "🎯",
    description: "Create tasks, update statuses, and manage workspaces.",
    envKey: "COMPOSIO_AUTH_CONFIG_CLICKUP",
  },
  {
    slug: "linear",
    label: "Linear",
    category: "Productivity",
    icon: "🔷",
    description: "Manage issues, cycles, and projects in Linear.",
    envKey: "COMPOSIO_AUTH_CONFIG_LINEAR",
  },

  // ── Code & Dev ────────────────────────────────────────────────────────────
  {
    slug: "github",
    label: "GitHub",
    category: "Code & Dev",
    icon: "🐙",
    description: "Create PRs, manage issues, push code, and search repos.",
    envKey: "COMPOSIO_AUTH_CONFIG_GITHUB",
  },
  {
    slug: "gitlab",
    label: "GitLab",
    category: "Code & Dev",
    icon: "🦊",
    description: "Manage merge requests, issues, and CI/CD pipelines.",
    envKey: "COMPOSIO_AUTH_CONFIG_GITLAB",
  },
  {
    slug: "jira",
    label: "Jira",
    category: "Code & Dev",
    icon: "🔵",
    description: "Create and update issues, sprints, and epics.",
    envKey: "COMPOSIO_AUTH_CONFIG_JIRA",
  },
  {
    slug: "vercel",
    label: "Vercel",
    category: "Code & Dev",
    icon: "▲",
    description: "Deploy projects, inspect builds, and manage domains.",
    envKey: "COMPOSIO_AUTH_CONFIG_VERCEL",
  },
  {
    slug: "supabase",
    label: "Supabase",
    category: "Code & Dev",
    icon: "⚡",
    description: "Query databases, manage auth, and trigger Edge Functions.",
    envKey: "COMPOSIO_AUTH_CONFIG_SUPABASE",
  },
  {
    slug: "figma",
    label: "Figma",
    category: "Code & Dev",
    icon: "🎨",
    description: "Access files, components, and comments in Figma.",
    envKey: "COMPOSIO_AUTH_CONFIG_FIGMA",
  },
  {
    slug: "sentry",
    label: "Sentry",
    category: "Code & Dev",
    icon: "🔍",
    description: "Search errors, manage issues, and track releases.",
    envKey: "COMPOSIO_AUTH_CONFIG_SENTRY",
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    slug: "gmail",
    label: "Gmail",
    category: "Communication",
    icon: "📬",
    description: "Read, send, and manage Gmail messages and labels.",
    envKey: "COMPOSIO_AUTH_CONFIG_GMAIL",
  },
  {
    slug: "slack",
    label: "Slack",
    category: "Communication",
    icon: "💬",
    description: "Post messages, search channels, and manage workspace.",
    envKey: "COMPOSIO_AUTH_CONFIG_SLACK",
  },
  {
    slug: "discord",
    label: "Discord",
    category: "Communication",
    icon: "🎮",
    description: "Send messages, manage channels, and read server activity.",
    envKey: "COMPOSIO_AUTH_CONFIG_DISCORD",
  },
  {
    slug: "telegram",
    label: "Telegram",
    category: "Communication",
    icon: "✈️",
    description: "Send and receive Telegram messages through the Bot API.",
    envKey: "COMPOSIO_AUTH_CONFIG_TELEGRAM",
  },
  {
    slug: "googlemeet",
    label: "Google Meet",
    category: "Communication",
    icon: "📹",
    description: "Schedule and manage Google Meet video calls.",
    envKey: "COMPOSIO_AUTH_CONFIG_GOOGLEMEET",
  },
  {
    slug: "zoom",
    label: "Zoom",
    category: "Communication",
    icon: "🎥",
    description: "Schedule meetings, list recordings, and manage webinars.",
    envKey: "COMPOSIO_AUTH_CONFIG_ZOOM",
  },
  {
    slug: "twilio",
    label: "Twilio",
    category: "Communication",
    icon: "📱",
    description: "Send SMS, WhatsApp messages, and make voice calls.",
    envKey: "COMPOSIO_AUTH_CONFIG_TWILIO",
  },
  {
    slug: "intercom",
    label: "Intercom",
    category: "Communication",
    icon: "💭",
    description: "Manage customer conversations and support tickets.",
    envKey: "COMPOSIO_AUTH_CONFIG_INTERCOM",
  },

  // ── Data & Analytics ──────────────────────────────────────────────────────
  {
    slug: "hackernews",
    label: "Hacker News",
    category: "Data & Analytics",
    icon: "🧡",
    description: "Search and retrieve top stories from Hacker News.",
    envKey: "COMPOSIO_AUTH_CONFIG_HACKERNEWS",
  },
  {
    slug: "reddit",
    label: "Reddit",
    category: "Data & Analytics",
    icon: "👾",
    description: "Browse subreddits, search posts, and read comments.",
    envKey: "COMPOSIO_AUTH_CONFIG_REDDIT",
  },
  {
    slug: "googlesearch",
    label: "Google Search",
    category: "Data & Analytics",
    icon: "🔎",
    description: "Perform real-time web searches via Google.",
    envKey: "COMPOSIO_AUTH_CONFIG_GOOGLESEARCH",
  },
  {
    slug: "serpapi",
    label: "SerpAPI",
    category: "Data & Analytics",
    icon: "🌐",
    description: "Query search engine results pages with structured output.",
    envKey: "COMPOSIO_AUTH_CONFIG_SERPAPI",
  },
  {
    slug: "googleanalytics",
    label: "Google Analytics",
    category: "Data & Analytics",
    icon: "📈",
    description: "Pull site traffic, Events, and conversion reports.",
    envKey: "COMPOSIO_AUTH_CONFIG_GOOGLEANALYTICS",
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    slug: "coinmarketcap",
    label: "CoinMarketCap",
    category: "Finance",
    icon: "💰",
    description: "Fetch cryptocurrency prices, market caps, and rankings.",
    envKey: "COMPOSIO_AUTH_CONFIG_COINMARKETCAP",
  },
  {
    slug: "stripe",
    label: "Stripe",
    category: "Finance",
    icon: "💳",
    description: "Manage customers, payments, subscriptions, and invoices.",
    envKey: "COMPOSIO_AUTH_CONFIG_STRIPE",
  },
  {
    slug: "brex",
    label: "Brex",
    category: "Finance",
    icon: "🏦",
    description: "Manage company cards, expenses, and budgets.",
    envKey: "COMPOSIO_AUTH_CONFIG_BREX",
  },
  {
    slug: "quickbooks",
    label: "QuickBooks",
    category: "Finance",
    icon: "📉",
    description: "Access accounting data, invoices, and expense reports.",
    envKey: "COMPOSIO_AUTH_CONFIG_QUICKBOOKS",
  },

  // ── AI & Automation ───────────────────────────────────────────────────────
  {
    slug: "zapier",
    label: "Zapier",
    category: "AI & Automation",
    icon: "⚡",
    description: "Trigger Zaps and automate cross-app workflows.",
    envKey: "COMPOSIO_AUTH_CONFIG_ZAPIER",
  },
  {
    slug: "prompmate",
    label: "Prompmate",
    category: "AI & Automation",
    icon: "🤖",
    description: "Access and run curated AI prompt templates.",
    envKey: "COMPOSIO_AUTH_CONFIG_PROMPMATE",
  },
  {
    slug: "make",
    label: "Make (Integromat)",
    category: "AI & Automation",
    icon: "🔗",
    description: "Trigger scenarios and automate Make.com workflows.",
    envKey: "COMPOSIO_AUTH_CONFIG_MAKE",
  },

  // ── CRM & Sales ───────────────────────────────────────────────────────────
  {
    slug: "hubspot",
    label: "HubSpot",
    category: "CRM & Sales",
    icon: "🧲",
    description: "Manage contacts, deals, companies, and emails.",
    envKey: "COMPOSIO_AUTH_CONFIG_HUBSPOT",
  },
  {
    slug: "salesforce",
    label: "Salesforce",
    category: "CRM & Sales",
    icon: "☁️",
    description: "Query and update Salesforce objects, leads, and cases.",
    envKey: "COMPOSIO_AUTH_CONFIG_SALESFORCE",
  },
  {
    slug: "pipedrive",
    label: "Pipedrive",
    category: "CRM & Sales",
    icon: "📊",
    description: "Manage deals, contacts, and activities in Pipedrive.",
    envKey: "COMPOSIO_AUTH_CONFIG_PIPEDRIVE",
  },
  {
    slug: "calendly",
    label: "Calendly",
    category: "CRM & Sales",
    icon: "🗓️",
    description: "Schedule meetings and manage booking availability.",
    envKey: "COMPOSIO_AUTH_CONFIG_CALENDLY",
  },

  // ── Cloud & Infra ─────────────────────────────────────────────────────────
  {
    slug: "aws",
    label: "AWS",
    category: "Cloud & Infra",
    icon: "☁️",
    description: "Manage EC2, S3, Lambda, and other AWS services.",
    envKey: "COMPOSIO_AUTH_CONFIG_AWS",
  },
  {
    slug: "googledrive",
    label: "Dropbox",
    category: "Cloud & Infra",
    icon: "📦",
    description: "Upload, download, and manage Dropbox files.",
    envKey: "COMPOSIO_AUTH_CONFIG_DROPBOX",
  },
] as const;

// De-duplicate by slug (in case of any accidental duplicates)
const _seen = new Set<string>();
export const COMPOSIO_TOOLKITS_DEDUPED = SUPPORTED_COMPOSIO_TOOLKITS.filter((t) => {
  if (_seen.has(t.slug)) return false;
  _seen.add(t.slug);
  return true;
});

export const COMPOSIO_CATEGORIES: readonly ComposioCategory[] = [
  "Productivity",
  "Code & Dev",
  "Communication",
  "Data & Analytics",
  "Finance",
  "AI & Automation",
  "CRM & Sales",
  "Cloud & Infra",
];

export type ComposioToolkitSlug = (typeof SUPPORTED_COMPOSIO_TOOLKITS)[number]["slug"];

export function isComposioToolkitSlug(value: string): value is ComposioToolkitSlug {
  return COMPOSIO_TOOLKITS_DEDUPED.some((toolkit) => toolkit.slug === value);
}

export function getComposioToolkitMeta(slug: string) {
  return COMPOSIO_TOOLKITS_DEDUPED.find((toolkit) => toolkit.slug === slug) ?? null;
}

function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^['"]|['"]$/g, "");
  return normalized.length > 0 ? normalized : null;
}

export function getComposioAuthConfigOverride(toolkitSlug: string): string | null {
  const toolkit = getComposioToolkitMeta(toolkitSlug);
  if (!toolkit) return null;
  return normalizeEnvValue(process.env[toolkit.envKey]);
}

export function getComposioSharedEntityOverride(): string | null {
  return normalizeEnvValue(process.env.COMPOSIO_ENTITY_ID);
}
