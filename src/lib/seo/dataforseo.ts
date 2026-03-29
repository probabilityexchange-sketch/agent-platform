// ---------------------------------------------------------------------------
// DataForSEO API Integration
// Provides keyword data, backlink analysis, and SERP features.
// Sign up at: https://dataforseo.com (pay-per-use, ~$0.001 per request)
// Docs: https://docs.dataforseo.com
// ---------------------------------------------------------------------------

const BASE_URL = 'https://api.dataforseo.com/v3';

function getAuth(): string | null {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) return null;
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
}

export function isDataForSEOConfigured(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

async function dfsPost(endpoint: string, body: unknown): Promise<unknown> {
  const auth = getAuth();
  if (!auth) throw new Error('DataForSEO credentials not configured (DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD)');

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataForSEO API error ${res.status}: ${text}`);
  }

  const json = await res.json() as any;
  if (json.status_code !== 20000) {
    throw new Error(`DataForSEO error: ${json.status_message}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Tool: seo_keyword_data
// Returns search volume, CPC, and competition for a list of keywords.
// ---------------------------------------------------------------------------

export async function getKeywordData(
  keywords: string[],
  locationCode: number = 2840, // 2840 = United States
  languageCode: string = 'en'
): Promise<unknown> {
  const tasks = keywords.slice(0, 100).map(kw => ({
    keywords: [kw],
    location_code: locationCode,
    language_code: languageCode,
  }));

  const data = await dfsPost('/keywords_data/google_ads/search_volume/live', tasks) as any;
  const results = data.tasks?.[0]?.result ?? [];

  return results.map((r: any) => ({
    keyword: r.keyword,
    search_volume: r.search_volume,
    cpc: r.cpc,
    competition: r.competition,
    competition_level: r.competition_level,
    monthly_searches: r.monthly_searches?.slice(0, 3) ?? [], // last 3 months
  }));
}

// ---------------------------------------------------------------------------
// Tool: seo_backlinks_summary
// Returns a domain's backlink overview.
// ---------------------------------------------------------------------------

export async function getBacklinksSummary(target: string): Promise<unknown> {
  const data = await dfsPost('/backlinks/summary/live', [{ target }]) as any;
  const result = data.tasks?.[0]?.result?.[0];
  if (!result) return { error: 'No backlink data found for this target' };

  return {
    target: result.target,
    referring_domains: result.referring_domains,
    referring_ips: result.referring_ips,
    backlinks: result.backlinks,
    dofollow_backlinks: result.dofollow,
    nofollow_backlinks: result.nofollow,
    rank: result.rank,
    spam_score: result.spam_score,
    top_anchors: result.anchor?.slice(0, 10) ?? [],
    top_referring_domains: result.referring_domains_noindex?.slice(0, 10) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Tool: seo_serp_features
// Returns SERP features present for a keyword (snippets, PAA, local pack, etc.)
// ---------------------------------------------------------------------------

export async function getSerpFeatures(
  keyword: string,
  locationCode: number = 2840,
  languageCode: string = 'en'
): Promise<unknown> {
  const data = await dfsPost('/serp/google/organic/live/advanced', [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      depth: 10,
    },
  ]) as any;

  const result = data.tasks?.[0]?.result?.[0];
  if (!result) return { error: 'No SERP data found' };

  const items = result.items ?? [];
  const organicResults = items
    .filter((i: any) => i.type === 'organic')
    .slice(0, 10)
    .map((i: any) => ({
      position: i.rank_absolute,
      url: i.url,
      title: i.title,
      description: i.description,
      domain: i.domain,
    }));

  const features = [...new Set(items.map((i: any) => i.type))].filter(
    (t: any) => t !== 'organic'
  );

  return {
    keyword,
    total_results: result.se_results_count,
    serp_features: features,
    top_10: organicResults,
  };
}

// ---------------------------------------------------------------------------
// Tool definitions (OpenAI function-call format for use in chat route)
// ---------------------------------------------------------------------------

export const SEO_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'seo_keyword_data',
      description:
        'Get search volume, CPC, and competition data for a list of keywords using DataForSEO. Use this for keyword research, finding opportunities, and estimating traffic potential. Returns monthly search volume, cost-per-click, and competition level.',
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of keywords to research (max 100)',
          },
          location_code: {
            type: 'number',
            description: 'DataForSEO location code. 2840 = USA (default), 2826 = UK, 2036 = Australia, 2124 = Canada',
          },
          language_code: {
            type: 'string',
            description: 'Language code, e.g. "en" (default)',
          },
        },
        required: ['keywords'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'seo_backlinks_summary',
      description:
        'Get a domain\'s backlink profile summary using DataForSEO. Returns referring domains count, total backlinks, dofollow/nofollow split, spam score, and top anchor texts. Use this for backlink audits and competitor analysis.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Domain or URL to analyze (e.g. "randi.agency" or "https://randi.agency")',
          },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'seo_serp_features',
      description:
        'Analyze the Google SERP for a keyword using DataForSEO. Returns the top 10 organic results with URLs, titles, and descriptions, plus which SERP features are present (featured snippet, PAA box, local pack, image pack, etc.). Use this for keyword opportunity assessment and competitor research.',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'The keyword to analyze',
          },
          location_code: {
            type: 'number',
            description: 'DataForSEO location code. 2840 = USA (default)',
          },
          language_code: {
            type: 'string',
            description: 'Language code, e.g. "en" (default)',
          },
        },
        required: ['keyword'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

export function isSEOTool(name: string): boolean {
  return ['seo_keyword_data', 'seo_backlinks_summary', 'seo_serp_features'].includes(name);
}

export async function executeSEOTool(name: string, args: any): Promise<string> {
  if (!isDataForSEOConfigured()) {
    return JSON.stringify({
      error: 'DataForSEO not configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to your environment variables. Sign up at https://dataforseo.com',
    });
  }

  try {
    let result: unknown;
    switch (name) {
      case 'seo_keyword_data':
        result = await getKeywordData(args.keywords, args.location_code, args.language_code);
        break;
      case 'seo_backlinks_summary':
        result = await getBacklinksSummary(args.target);
        break;
      case 'seo_serp_features':
        result = await getSerpFeatures(args.keyword, args.location_code, args.language_code);
        break;
      default:
        return JSON.stringify({ error: `Unknown SEO tool: ${name}` });
    }
    return JSON.stringify(result);
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}
