import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    console.warn("OPENROUTER_API_KEY is not set in environment variables");
}

export const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Randi Agent Platform",
    }
});

export const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

/**
 * Helper to check if a model is in the free tier
 */
export function isFreeModel(modelId: string): boolean {
    return modelId.endsWith(":free") || modelId.includes("/free");
}
