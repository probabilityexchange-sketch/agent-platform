"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ChatWindow, type Message } from "@/components/chat/ChatWindow";

export default function ChatSessionPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const sessionId = params.sessionId === "new" ? undefined : (params.sessionId as string);
    const agentId = searchParams.get("agentId");

    const [loading, setLoading] = useState(sessionId ? true : false);
    const [initialMessages, setInitialMessages] = useState<Message[]>([]);
    const [agentName, setAgentName] = useState("Agent");

    useEffect(() => {
        if (sessionId) {
            // Fetch session messages
            fetch(`/api/chat/sessions/${sessionId}`)
                .then((res) => res.json())
                .then((data) => {
                    setInitialMessages(data.messages || []);
                    setAgentName(data.agent.name);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("Error fetching session:", err);
                    setLoading(false);
                });
        } else if (agentId) {
            // Fetch agent name for the header
            fetch(`/api/agents/${agentId}`)
                .then((res) => res.json())
                .then((data) => setAgentName(data.agent.name))
                .catch((err) => console.error("Error fetching agent:", err));
        }
    }, [sessionId, agentId]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!agentId && !sessionId) {
        return (
            <div className="h-full flex items-center justify-center text-center p-8">
                <div>
                    <h2 className="text-2xl font-bold mb-4">No Agent Selected</h2>
                    <button
                        onClick={() => router.push("/chat")}
                        className="bg-primary text-white px-6 py-2 rounded-lg"
                    >
                        Go to Chat Hub
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-5xl mx-auto p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/chat")}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="font-bold text-xl">{agentName}</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Active Chat</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ChatWindow
                    agentId={agentId || ""}
                    sessionId={sessionId}
                    initialMessages={initialMessages}
                />
            </div>
        </div>
    );
}
