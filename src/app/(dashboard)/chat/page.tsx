"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { RandiLogo } from "@/components/branding/RandiLogo";

interface Agent {
    id: string;
    slug: string;
    name: string;
    description: string;
    defaultModel: string;
}

interface ChatSession {
    id: string;
    title: string;
    agentId: string;
    agent: {
        name: string;
    };
    createdAt: string;
}

export default function ChatHubPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeTab, setActiveTab] = useState<"new" | "recent">("new");
    const { user } = useAuth();

    useEffect(() => {
        // Fetch agents
        fetch("/api/agents")
            .then((res) => res.json())
            .then((data) => setAgents(data.agents || []))
            .catch((err) => console.error("Error fetching agents:", err));

        // Fetch recent sessions
        fetch("/api/chat/sessions")
            .then((res) => res.json())
            .then((data) => setSessions(data.sessions || []))
            .catch((err) => console.error("Error fetching sessions:", err));
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">AI Chat Hub</h1>
                    <p className="text-muted-foreground">Select an agent or continue a previous conversation.</p>
                </div>
            </div>

            <div className="flex gap-2 mb-8 bg-card/50 p-1 rounded-lg w-fit border border-border">
                <button
                    onClick={() => setActiveTab("new")}
                    className={`px-4 py-2 rounded-md text-sm transition-all ${activeTab === "new" ? "bg-primary text-white shadow-lg" : "hover:bg-muted"
                        }`}
                >
                    New Chat
                </button>
                <button
                    onClick={() => setActiveTab("recent")}
                    className={`px-4 py-2 rounded-md text-sm transition-all ${activeTab === "recent" ? "bg-primary text-white shadow-lg" : "hover:bg-muted"
                        }`}
                >
                    Recent Chats ({sessions.length})
                </button>
            </div>

            {activeTab === "new" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className="bg-card border border-border rounded-xl p-6 flex flex-col hover:border-primary/50 transition-all group"
                        >
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <RandiLogo size="sm" variant="icon-only" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{agent.name}</h3>
                            <p className="text-sm text-muted-foreground mb-6 flex-1">
                                {agent.description}
                            </p>
                            <Link
                                href={`/chat/new?agentId=${agent.id}`}
                                className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-white text-center py-2.5 rounded-lg text-sm font-semibold transition-all"
                            >
                                Start Chat
                            </Link>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.length === 0 ? (
                        <div className="bg-card/30 border border-dashed border-border rounded-xl p-12 text-center">
                            <p className="text-muted-foreground">No recent chats found.</p>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <Link
                                key={session.id}
                                href={`/chat/${session.id}`}
                                className="block bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-lg">{session.title}</h4>
                                        <p className="text-xs text-muted-foreground mt-1 text-primary/80">
                                            Agent: {session.agent.name}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(session.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
