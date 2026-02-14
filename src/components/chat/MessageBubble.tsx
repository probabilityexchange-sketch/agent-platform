"use client";

import { Message } from "./ChatWindow";

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div
                className={`max-w-[85%] lg:max-w-[70%] px-4 py-2.5 rounded-2xl ${isUser
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none border border-border"
                    }`}
            >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                </div>
                <div
                    className={`text-[10px] mt-1 opacity-50 ${isUser ? "text-right" : "text-left"}`}
                >
                    {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}
