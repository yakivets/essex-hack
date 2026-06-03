import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { riskColor } from "./risk";
import { buildNegotiationEmail, type Tone } from "@/lib/negotiationEmail";
import type { AnalysisResult } from "@/lib/types";

export function NegotiatePanel({ data }: { data: AnalysisResult }) {
  const flags = data.red_flags;
  const [tone, setTone] = useState<Tone>("collaborative");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [override, setOverride] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const includedIds = useMemo(
    () => flags.map((f) => f.id).filter((id) => !excluded.has(id)),
    [flags, excluded],
  );
  const generated = useMemo(
    () => buildNegotiationEmail(data, tone, includedIds),
    [data, tone, includedIds],
  );
  // Regenerating (tone/selection change) discards manual edits.
  useEffect(() => setOverride(null), [generated]);

  const email = override ?? generated;

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — user can still select/copy manually */
    }
  }

  function download() {
    const blob = new Blob([email], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "negotiation-email.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (flags.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No red flags to negotiate — this contract looks clean. 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tone toggle */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-tertiary mb-1.5">Tone</div>
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          {(["collaborative", "firm"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className="px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors"
              style={{
                background: tone === t ? "var(--card)" : "transparent",
                color: tone === t ? "var(--foreground)" : "var(--muted-foreground)",
                boxShadow: tone === t ? "var(--shadow-card, 0 1px 2px rgba(0,0,0,0.06))" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Points to include */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-tertiary mb-1.5">
          Points to raise
        </div>
        <div className="space-y-1.5">
          {flags.map((f) => {
            const on = !excluded.has(f.id);
            return (
              <label
                key={f.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(f.id)}
                  className="accent-[var(--primary)] w-4 h-4 shrink-0"
                />
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: riskColor(f.severity) }}
                />
                <span className="text-sm text-foreground truncate">{f.title}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Email */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] uppercase tracking-wider text-tertiary">Email</div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
            >
              <Download size={13} /> .txt
            </button>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <textarea
          value={email}
          onChange={(e) => setOverride(e.target.value)}
          spellCheck={false}
          className="w-full h-[460px] max-h-[60vh] resize-y rounded-xl border border-border bg-card p-3.5 text-sm leading-relaxed text-foreground font-mono scroll-thin focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
        />
        <p className="mt-1.5 text-[11px] text-tertiary">
          Not legal advice — review before sending.
        </p>
      </div>
    </div>
  );
}
