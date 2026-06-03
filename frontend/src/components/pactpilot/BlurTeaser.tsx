import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { RiskGauge, riskColor, riskLabel } from "./risk";
import type { AnalysisResult } from "@/lib/types";

interface Props {
  data: AnalysisResult;
  /** The full report, rendered blurred behind the teaser overlay. */
  children: ReactNode;
  onSignIn: () => void;
}

/**
 * Logged-out teaser: the verdict (gauge + risk level + one-line summary) is shown
 * for free; the full report is blurred behind a "Sign in to unlock" call-to-action.
 */
export function BlurTeaser({ data, children, onSignIn }: Props) {
  const v = data.verdict;
  return (
    <div className="relative h-full">
      {/* Blurred, inert preview of the real report. */}
      <div className="absolute inset-0 blur-[6px] saturate-[0.85] pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 bg-background/40" aria-hidden="true" />

      {/* Teaser overlay */}
      <div className="relative h-full overflow-y-auto scroll-thin flex items-start sm:items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-card p-6 rise-in my-6">
          <div className="flex items-center gap-4">
            <RiskGauge score={v.risk_score} level={v.risk_level} />
            <div className="min-w-0">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ color: riskColor(v.risk_level), background: `${riskColor(v.risk_level)}1A` }}
              >
                {riskLabel(v.risk_level)} risk
              </span>
              <h2 className="font-display mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground">
                {v.summary_line}
              </h2>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-border bg-accent/40 p-4 text-center">
            <span className="inline-flex w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
              <Lock size={16} className="text-primary" />
            </span>
            <h3 className="mt-3 font-display text-base font-semibold tracking-tight text-foreground">
              Sign in to unlock the full report
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              See every flagged clause, the highlighted document, market benchmarks, the negotiation
              draft, and grounded Q&amp;A chat.
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors text-sm font-medium shadow-card"
            >
              <Sparkles size={15} /> Unlock full report — free
            </button>
            <p className="mt-2 text-[11px] text-tertiary">
              Demo account: demo@pactpilot.ai / demo1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
