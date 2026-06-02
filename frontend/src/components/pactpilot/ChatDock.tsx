import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, X, MessageCircle } from "lucide-react";
import { chat } from "@/lib/api";
import type { ChatResponse } from "@/lib/types";

interface Props {
  analysisId: string;
  prefillClauseId: string | null;
  onClearPrefill: () => void;
  onCitationClick: (clauseId: string) => void;
  clauseLabel?: string;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
  citations?: ChatResponse["citations"];
}

export function ChatDock({ analysisId, prefillClauseId, onClearPrefill, onCitationClick, clauseLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefillClauseId) {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [prefillClauseId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, busy]);

  async function send() {
    const msg = input.trim();
    if (!msg || busy) return;
    const userTurn: Turn = { role: "user", text: prefillClauseId ? `[About ${clauseLabel ?? "selected clause"}] ${msg}` : msg };
    setTurns((t) => [...t, userTurn]);
    setInput("");
    setBusy(true);
    try {
      const r = await chat(analysisId, msg, prefillClauseId ?? undefined);
      setTurns((t) => [...t, { role: "assistant", text: r.answer, citations: r.citations }]);
    } catch {
      setTurns((t) => [...t, { role: "assistant", text: "Sorry — that didn't go through. Please try again." }]);
    } finally {
      setBusy(false);
      onClearPrefill();
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
      <div className="max-w-3xl mx-auto px-4 pb-4 pointer-events-auto">
        {open && (
          <div className="mb-2 bg-white/95 backdrop-blur-md border border-border rounded-2xl shadow-pop overflow-hidden rise-in">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles size={15} className="text-primary" /> Ask PactPilot
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-tertiary hover:text-foreground" aria-label="Close chat">
                <X size={16} />
              </button>
            </div>
            <div ref={scrollRef} className="max-h-[320px] overflow-y-auto px-4 py-3 space-y-3">
              {turns.length === 0 && (
                <div className="text-sm text-muted-foreground">Try: "Can I get out after 12 months?" or "Is the indemnity normal?"</div>
              )}
              {turns.map((t, i) => (
                <div key={i} className={t.role === "user" ? "flex justify-end" : ""}>
                  <div className={t.role === "user"
                    ? "inline-block max-w-[85%] bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-tr-sm text-sm"
                    : "max-w-full text-sm text-foreground"
                  }>
                    {t.text}
                    {t.citations?.length ? (
                      <div className="mt-2 space-y-1.5">
                        {t.citations.map((c, j) => (
                          <button
                            key={j}
                            type="button"
                            onClick={() => onCitationClick(c.clause_id)}
                            className="block w-full text-left text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/60 hover:border-primary/50 transition-colors italic text-muted-foreground"
                          >
                            "{c.quote.length > 140 ? c.quote.slice(0, 140) + "…" : c.quote}"
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-1.5 text-tertiary">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          </div>
        )}
        <div className="bg-white/85 backdrop-blur-md border border-border rounded-2xl shadow-card flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-tertiary hover:text-foreground p-1.5 rounded-md"
            aria-label="Toggle chat"
          >
            <MessageCircle size={18} />
          </button>
          {prefillClauseId && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-primary bg-accent px-2 py-1 rounded-full">
              About: {clauseLabel}
              <button type="button" onClick={onClearPrefill} aria-label="Clear clause context"><X size={12} /></button>
            </span>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            onFocus={() => setOpen(true)}
            placeholder="Ask about this contract…"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-tertiary py-2"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || busy}
            aria-label="Send message"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 transition-colors"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
