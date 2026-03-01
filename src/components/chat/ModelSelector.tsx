"use client";

import { useState, useEffect } from "react";

interface Model {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

interface ModelSelectorProps {
    selectedModel: string;
    onChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onChange }: ModelSelectorProps) {
    const [models, setModels] = useState<Model[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        fetch('/api/models')
            .then(res => res.json())
            .then(data => {
                if (data.models) {
                    setModels(data.models);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load models:", err);
                setIsLoading(false);
            });
    }, []);

    const selectedModelName = selectedModel.split("/").pop() || selectedModel;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                disabled={isLoading}
            >
                {isLoading ? (
                    <span className="animate-pulse">Loading models...</span>
                ) : (
                    <>
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        <span className="max-w-[150px] truncate">{selectedModelName}</span>
                        <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 max-h-[60vh] overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50 p-2 custom-scrollbar animate-in fade-in slide-in-from-top-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 pt-1">
                            Available Models
                        </div>
                        {models.length === 0 && !isLoading && (
                            <div className="p-3 text-sm text-center text-muted-foreground">
                                No models found
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            {models.map(model => {
                                const isFree = model.id.includes(":free");
                                const isSelected = model.id === selectedModel;
                                const displayName = model.id.split("/").pop() || model.id;
                                const provider = model.id.split("/")[0] || "unknown";

                                return (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            if (isFree) {
                                                onChange(model.id);
                                                setIsOpen(false);
                                            }
                                        }}
                                        disabled={!isFree}
                                        className={`flex flex-col text-left px-3 py-2 rounded-lg transition-colors ${!isFree
                                                ? 'opacity-40 cursor-not-allowed bg-card'
                                                : isSelected
                                                    ? 'bg-primary/10 border border-primary/20'
                                                    : 'hover:bg-muted'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : ''}`}>
                                                {displayName}
                                            </span>
                                            {isSelected && (
                                                <svg className="w-4 h-4 text-primary shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {provider}
                                            </span>
                                            {isFree ? (
                                                <span className="text-[10px] text-green-500 font-medium">Free</span>
                                            ) : (
                                                <span className="text-[10px] text-red-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">PRO (Disabled)</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
