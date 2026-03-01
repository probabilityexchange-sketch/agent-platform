"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import type { ApprovalRequest, ApprovalDecision } from "./ApprovalCard";

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: Date | string;
    error?: boolean;
    type?: "text" | "approval_request";
    approvalRequest?: ApprovalRequest;
    approvalDecision?: ApprovalDecision;
}

interface ChatWindowProps {
    agentId: string;
    sessionId?: string;
    model: string;
    initialMessages?: Message[];
    onSessionCreated?: (sessionId: string) => void;
}

export function ChatWindow({
    agentId,
    sessionId,
    model,
    initialMessages = [],
    onSessionCreated,
}: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isTyping, setIsTyping] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastFailedMessage = useRef<string | null>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        setCurrentSessionId(sessionId);
    }, [sessionId]);

    const sendMessage = useCallback(async (content: string, resumeApprovalId?: string) => {
        if (!content.trim()) return;
        setError(null);
        if (!resumeApprovalId) lastFailedMessage.current = null;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content,
            createdAt: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsTyping(true);

        try {
            const payload: {
                message: string;
                agentId?: string;
                sessionId?: string;
                resumeApprovalId?: string;
                model?: string;
            } = {
                message: content,
                model: model,
            };
            if (currentSessionId) {
                payload.sessionId = currentSessionId;
            }
            if (agentId && agentId.trim().length > 0) {
                payload.agentId = agentId;
            }
            if (resumeApprovalId) {
                payload.resumeApprovalId = resumeApprovalId;
            }

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const details = await response.json().catch(() => null) as { error?: string } | null;
                throw new Error(details?.error || `Request failed (${response.status})`);
            }

            if (!response.body) {
                throw new Error("Response body is empty");
            }

            // Create placeholder assistant message
            const assistantId = `asst-${Date.now()}`;
            const assistantMessage: Message = {
                id: assistantId,
                role: "assistant",
                content: "",
                createdAt: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsTyping(false); // Stop typing indicator since we're streaming
            setStreamingMessageId(assistantId);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                // Handle Human-in-the-Loop (HITL) markers
                if (chunk.includes("__APPROVAL_REQUEST__")) {
                    const markerStart = chunk.indexOf("__APPROVAL_REQUEST__");
                    const markerEnd = chunk.indexOf("__END__", markerStart);

                    if (markerEnd !== -1) {
                        const jsonStr = chunk.substring(markerStart + "__APPROVAL_REQUEST__".length, markerEnd);
                        try {
                            const approvalData = JSON.parse(jsonStr);
                            setMessages((prev) => {
                                // If the assistant hasn't sent any real text yet, replace the placeholder
                                // Otherwise, we'd need to append. For now, our API pauses and replaces.
                                const filtered = prev.filter(m => m.id !== assistantId);
                                return [...filtered, {
                                    id: `approval-${approvalData.approvalId}`,
                                    role: "assistant",
                                    content: "",
                                    type: "approval_request",
                                    approvalRequest: approvalData,
                                    approvalDecision: "PENDING",
                                    createdAt: new Date(),
                                }];
                            });
                            setIsTyping(false);
                            setStreamingMessageId(null);
                            return; // Stop reading this stream
                        } catch (e) {
                            console.error("Failed to parse HITL event", e);
                        }
                    }
                }

                accumulatedContent += chunk;

                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantId
                            ? { ...msg, content: accumulatedContent }
                            : msg
                    )
                );
            }
            setStreamingMessageId(null);
        } catch (err) {
            console.error("Chat error:", err);
            const errorMsg = err instanceof Error ? err.message : "Failed to send message";
            setError(errorMsg);
            lastFailedMessage.current = content;

            setMessages((prev) =>
                prev.map((msg, i) =>
                    i === prev.length - 1 && msg.role === "user"
                        ? { ...msg, error: true }
                        : msg
                )
            );
        } finally {
            setIsTyping(false);
            setStreamingMessageId(null);
        }
    }, [agentId, currentSessionId]);

    const handleDecision = useCallback((approvalId: string, decision: ApprovalDecision) => {
        // Find the user message associated with this flow to resume it
        // For simplicity, we'll use the last user message
        const lastUserMessage = [...messages].reverse().find(m => m.role === "user");

        setMessages((prev) =>
            prev.map((msg) =>
                msg.approvalRequest?.approvalId === approvalId
                    ? { ...msg, approvalDecision: decision }
                    : msg
            )
        );

        if (decision === "APPROVED" || decision === "REJECTED") {
            if (lastUserMessage) {
                sendMessage(lastUserMessage.content, approvalId);
            }
        }
    }, [messages, sendMessage]);

    const handleRetry = useCallback(() => {
        if (lastFailedMessage.current) {
            setMessages((prev) => prev.filter((msg) => !msg.error));
            const msg = lastFailedMessage.current;
            lastFailedMessage.current = null;
            setError(null);
            sendMessage(msg);
        }
    }, [sendMessage]);

    return (
        <div className="flex flex-col h-full bg-card/30 rounded-xl border border-border overflow-hidden">
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                        <p className="text-muted-foreground max-w-xs">
                            Send a message to begin interacting with the agent.
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        isStreaming={isTyping === false && msg.id === streamingMessageId && msg.role === "assistant" && msg.content.length > 0
                            ? false // done streaming
                            : msg.id === streamingMessageId && msg.role === "assistant"}
                        onApprovalDecision={handleDecision}
                    />
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-muted px-4 py-2 rounded-2xl rounded-bl-none">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-border bg-card/50">
                {error && (
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                        <p className="text-sm text-rose-400">{error}</p>
                        {lastFailedMessage.current && (
                            <button
                                onClick={handleRetry}
                                className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-200 px-2 py-1 rounded transition-colors whitespace-nowrap"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                )}
                <ChatInput onSend={sendMessage} disabled={isTyping} />
            </div>
        </div>
    );
}
