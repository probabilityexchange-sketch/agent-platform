import { NextRequest, NextResponse } from "next/server";
import { openrouter, isFreeModel, DEFAULT_MODEL } from "@/lib/openrouter/client";
import { composio } from "@/lib/composio/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/middleware";

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate (Update: Need to adapt requireAuth for Privy)
        // For now, let's assume requireAuth is updated or we use a temporary bypass/alternative
        // const auth = await requireAuth();

        // TEMPORARY: Get userId from headers or cookies if Privy SDK is not fully ready for middleware
        // In a real app, you'd use the Privy server SDK to verify the JWT
        const { userId, agentId, sessionId, message, model = DEFAULT_MODEL } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // 2. Check Model Tier & Credits/x402
        const freeTier = isFreeModel(model);

        if (!freeTier) {
            // If it's a paid model, check if user has credits or trigger x402
            // For now, we'll focus on the Free tier implementation first as per user priority
            // Return 402 if we want to enforce x402 protocol
            /*
            return new Response(JSON.stringify({
              error: "Payment Required",
              instructions: "Please pay with USDC to use premium models."
            }), {
              status: 402,
              headers: { "Content-Type": "application/json" }
            });
            */
        }

        // 3. Get Agent Config
        const agent = await prisma.agentConfig.findUnique({
            where: { id: agentId || (sessionId ? (await prisma.chatSession.findUnique({ where: { id: sessionId }, select: { agentId: true } }))?.agentId : undefined) },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // 4. Call OpenRouter
        const chatResponse = await openrouter.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: agent.systemPrompt },
                { role: "user", content: message }
            ],
            // tools: agent.tools, // Composio tools would go here
        });

        const responseText = chatResponse.choices[0].message.content;

        // 5. Save To DB (Session & Message)
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            const newSession = await prisma.chatSession.create({
                data: {
                    userId: userId || "anonymous", // Fallback for dev
                    agentId: agent.id,
                    title: message.substring(0, 50),
                }
            });
            currentSessionId = newSession.id;
        }

        await prisma.chatMessage.createMany({
            data: [
                { sessionId: currentSessionId, role: "user", content: message },
                { sessionId: currentSessionId, role: "assistant", content: responseText || "" }
            ]
        });

        return NextResponse.json({
            response: responseText,
            sessionId: currentSessionId
        });

    } catch (error) {
        return handleAuthError(error);
    }
}
