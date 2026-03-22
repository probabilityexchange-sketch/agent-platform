import { createOpenAI } from '@ai-sdk/openai';

const kiloKey = process.env.KILO_API_KEY?.trim();
const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
const apiKey = kiloKey || openRouterKey || 'sk-no-key-set';

export const aiOpenRouter = createOpenAI({
  baseURL: kiloKey ? 'https://api.kilo.ai/api/gateway' : 'https://openrouter.ai/api/v1',
  apiKey: apiKey,
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Randi Agent Platform',
  },
});
