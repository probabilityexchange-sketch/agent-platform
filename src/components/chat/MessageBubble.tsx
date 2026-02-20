"use client";

import { useMemo, useState } from "react";
import { Message } from "./ChatWindow";

interface MessageBubbleProps {
    message: Message;
}

/** Lightweight markdown-ish rendering for assistant messages */
function renderMarkdown(text: string): string {
    let html = text
        // Escape HTML
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Code blocks ```...```
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
        return `<pre class="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono"><code>${code.trim()}</code></pre>`;
    });

    // Inline code `...`
    html = html.replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

    // Bold **...**
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Italic *...*
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

    // Links [text](url)
    html = html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">$1</a>'
    );

    // Line breaks
    html = html.replace(/\n/g, "<br>");

    return html;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === "user";
    const [copied, setCopied] = useState(false);

    const messageDate =
        message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt);
    const timestamp = Number.isNaN(messageDate.getTime())
        ? null
        : messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const renderedContent = useMemo(() => {
        if (isUser) return null;
        return renderMarkdown(message.content);
    }, [isUser, message.content]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard API may not be available
        }
    };

    return (
        <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[85%] lg:max-w-[70%] px-4 py-2.5 rounded-2xl ${isUser
                    ? `bg-primary text-white rounded-br-none ${message.error ? "ring-2 ring-red-500/50" : ""}`
                    : "bg-muted text-foreground rounded-bl-none border border-border"
                    }`}
            >
                {isUser ? (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                    </div>
                ) : (
                    <div
                        className="text-sm leading-relaxed prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderedContent! }}
                    />
                )}

                <div className={`flex items-center gap-2 mt-1 ${isUser ? "justify-end" : "justify-between"}`}>
                    {timestamp && (
                        <span className="text-[10px] opacity-50">
                            {timestamp}
                        </span>
                    )}
                    {!isUser && (
                        <button
                            onClick={handleCopy}
                            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-[10px] flex items-center gap-1"
                            title="Copy message"
                        >
                            {copied ? (
                                <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied
                                </>
                            ) : (
                                <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
