import OpenAI from "openai";

const kiloKey = process.env.KILO_API_KEY?.trim();
const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
const apiKey = kiloKey || openRouterKey || "sk-no-key-set";

console.log(`[AI] Initializing gateway client using ${kiloKey ? "Kilo AI" : "OpenRouter"}`);
if (apiKey !== "sk-no-key-set") {
    console.log(`[AI] Using API Key starting with: ${apiKey.substring(0, 7)}...`);
} else {
    console.warn("[AI] No API key found in environment variables!");
}

export const openrouter = new OpenAI({
    baseURL: kiloKey ? "https://api.kilo.ai/api/gateway" : "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Randi Agent Platform",
        "X-OpenRouter-Retries": "3",
    },
    maxRetries: 3,
});

export const DEFAULT_MODEL =
    process.env.KILO_DEFAULT_MODEL || process.env.OPENROUTER_DEFAULT_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

export function isUnmeteredModel(modelId: string): boolean {
    return modelId.endsWith(":free") || modelId.includes("/free");
}

export async function createChatCompletion(options: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) {
    let lastError: any;

    // Sanitize model ID for Kilo: some gateways don't like the OpenRouter ':free' suffix
    const isKilo = !!process.env.KILO_API_KEY;
    const sanitizedModel = isKilo ? options.model.replace(":free", "") : options.model;

    console.log(`[AI] Requesting completion with model: ${sanitizedModel} (original: ${options.model})`);

    for (let i = 0; i < 3; i++) {
        try {
            return await openrouter.chat.completions.create({
                ...options,
                model: sanitizedModel
            });
        } catch (error: any) {
            lastError = error;
            console.error(`[AI] Completion attempt ${i + 1} failed:`, error.message || error);
            if (error.response?.data) {
                console.error(`[AI] Error details:`, JSON.stringify(error.response.data));
            }
            // Retry on 503, 429, 502, 504
            const status = error.status || error.statusCode;
            if (status === 503 || status === 429 || status === 502 || status === 504) {
                const wait = Math.pow(2, i) * 1000;
                await new Promise((r) => setTimeout(r, wait));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}
