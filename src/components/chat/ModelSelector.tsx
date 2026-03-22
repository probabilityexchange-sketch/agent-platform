'use client';

import { useState, useEffect } from 'react';

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
    fetch(`/api/models?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.models) {
          setModels(data.models);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load models:', err);
        setIsLoading(false);
      });
  }, []);

  const selectedModelName = selectedModel.split('/').pop() || selectedModel;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-card/60 backdrop-blur-md border border-white/10 rounded-xl text-xs font-bold hover:bg-muted transition-all active:scale-95 shadow-lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="animate-pulse text-muted-foreground uppercase tracking-widest px-2">
            Syncing Models...
          </span>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(109,40,217,0.8)]"></span>
            <span className="max-w-[120px] truncate uppercase tracking-tighter opacity-80">
              {selectedModelName.split(':')[0]}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 max-h-[70vh] overflow-y-auto bg-card/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 p-2 no-scrollbar animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between px-3 pt-2 pb-3 border-b border-white/5 mb-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Model Arsenal
              </span>
              <span className="text-[9px] text-primary font-black italic">By Kilo Code</span>
            </div>
            {models.length === 0 && !isLoading && (
              <div className="p-4 text-xs text-center text-muted-foreground italic">
                No models available in the vault
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {models.map(model => {
                const isFree = model.id.includes(':free');
                const isSelected = model.id === selectedModel;
                const displayName = model.id.split('/').pop()?.split(':')[0] || model.id;
                const provider = model.id.split('/')[0] || 'unknown';

                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      onChange(model.id);
                      setIsOpen(false);
                    }}
                    className={`flex flex-col text-left px-4 py-3 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-primary/20 border border-primary/30 ring-1 ring-primary/20 shadow-lg shadow-primary/5'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <span
                        className={`text-sm font-black tracking-tight truncate ${isSelected ? 'text-primary' : 'text-white/80'}`}
                      >
                        {displayName.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2">
                        {isFree && (
                          <span className="text-[8px] font-black text-success bg-success/10 px-1.5 py-0.5 rounded-full uppercase tracking-tighter ring-1 ring-success/20">
                            Free
                          </span>
                        )}
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-40">
                        {provider}
                      </span>
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
