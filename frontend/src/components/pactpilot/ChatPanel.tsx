import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { chat } from "@/lib/api";
import type { ChatResponse } from "@/lib/types";

interface Props {
  analysisId: string;
  prefillClauseId: string | null;
  clauseLabel?: string;
  onClearPrefill: () => void;
  onCitationClick: (clauseId: string) => void;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
  citations?: ChatResponse["citations"];
}

const SUGGESTIONS = [
  "Can I get out after 12 months?",
  "Is the indemnity normal?",
  "What's the worst-case here?",
];

export function ChatPanel({
  analysisId,
  prefillClauseId,
  clauseLabel,
  onClearPrefill,
  onCitationClick,
}: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefillClauseId) inputRef.current?.focus();
  }, [prefillClauseId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, busy]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    const label = prefillClauseId ? `[About ${clauseLabel ?? "selected clause"}] ${msg}` : msg;
    setTurns((t) => [...t, { role: "user", text: label }]);
    setInput("");
    setBusy(true);
    const clauseId = prefillClauseId ?? undefined;
    try {
      const r = await chat(analysisId, msg, clauseId);
      setTurns((t) => [...t, { role: "assistant", text: r.answer, citations: r.citations }]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "assistant", text: "Sorry — that didn't go through. Please try again." },
      ]);
    } finally {
      setBusy(false);
      onClearPrefill();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollRef}
        className="scroll-thin flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
      >
        {turns.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-2">
            <span className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center">
              <Sparkles size={18} className="text-primary" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">Ask about this contract</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Grounded in the document — answers cite clauses.
            </p>
            <div className="mt-4 flex flex-col gap-1.5 w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted transition-colors text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                t.role === "user"
                  ? "inline-block max-w-[88%] bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-tr-sm text-sm"
                  : "max-w-full text-sm text-foreground leading-relaxed"
              }
            >
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
            <span
              className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        {prefillClauseId && (
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs text-primary bg-accent px-2 py-1 rounded-full">
            About: {clauseLabel}
            <button
              type="button"
              onClick={onClearPrefill}
              aria-label="Clear clause context"
              className="hover:opacity-70"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 focus-within:border-primary/50 transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Ask about this contract…"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-tertiary py-1.5"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={!input.trim() || busy}
            aria-label="Send message"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
