import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const STEPS = ["Reading", "Extracting clauses", "Classifying", "Benchmarking", "Scoring risk"];

const TIPS = [
  "Auto-renewal clauses often require 60–90 days' notice to cancel — easy to miss.",
  "An uncapped indemnity can cost far more than the entire contract is worth.",
  "A liability cap under 12 months' fees is unusually one-sided.",
  "Watch one-sided assignment — they can transfer the deal, but you can't.",
  "No limitation-of-liability clause means your exposure is unlimited.",
  "Vague price-increase wording quietly removes your budget certainty.",
];

/** An animated "contract under review" scene: a magnifier sweeps the page,
 *  risk lines light up as they're found, and clause tags float out. */
function ReviewScene() {
  return (
    <svg viewBox="0 0 360 220" className="w-full h-full float-soft" role="img" aria-label="Analysing the contract">
      <title>Reviewing the contract</title>

      {/* page */}
      <rect x="64" y="20" width="150" height="184" rx="10" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
      <rect x="82" y="36" width="84" height="9" rx="3" fill="var(--foreground)" opacity="0.55" />

      {/* body lines (some are "risk" lines that pulse) */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = 62 + i * 21;
        const w = i % 2 === 0 ? 116 : 92;
        const risk = i === 2 || i === 4;
        const color = i === 2 ? "var(--risk-high)" : "var(--risk-med)";
        return (
          <g key={i}>
            <rect x="82" y={y} width={w} height="8" rx="3" fill="var(--muted)">
              {risk && (
                <animate attributeName="fill" values={`var(--muted);${color};var(--muted)`} dur="2.6s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
              )}
            </rect>
            {risk && (
              <rect x="82" y={y} width={w} height="8" rx="3" fill={color} opacity="0">
                <animate attributeName="opacity" values="0;0.18;0" dur="2.6s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
              </rect>
            )}
          </g>
        );
      })}

      {/* magnifier sweeping down the page */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 116; 0 0" dur="4.6s" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" repeatCount="indefinite" />
        <circle cx="150" cy="58" r="24" fill="var(--primary)" opacity="0.06" />
        <circle cx="150" cy="58" r="24" fill="none" stroke="var(--primary)" strokeWidth="4" />
        <line x1="167" y1="75" x2="182" y2="92" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* clause tags floating out as they're "extracted" */}
      {[
        { label: "Liability", dot: "var(--risk-high)", begin: "0s" },
        { label: "Auto-renewal", dot: "var(--risk-med)", begin: "1.5s" },
        { label: "Payment", dot: "var(--risk-low)", begin: "3s" },
      ].map((t, i) => (
        <g key={i} opacity="0">
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="4.5s" begin={t.begin} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="248 150; 256 96" dur="4.5s" begin={t.begin} repeatCount="indefinite" />
          <rect x="0" y="0" width="92" height="24" rx="12" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
          <circle cx="14" cy="12" r="4" fill={t.dot} />
          <text x="26" y="16" fontSize="11" fontWeight="500" fill="var(--muted-foreground)">{t.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function Processing() {
  const [progress, setProgress] = useState(0.04);
  const [tip, setTip] = useState(0);

  // Estimated progress that eases toward ~94% over ~45s, so it always reads as
  // "moving toward done" rather than a frozen spinner. It snaps away when the
  // real result arrives and this screen unmounts. True per-step sync needs
  // backend progress events + the multi-agent pipeline (docs/09-multi-agent-plan.md).
  useEffect(() => {
    const id = setInterval(() => setProgress((p) => p + (0.94 - p) * 0.022), 180);
    return () => clearInterval(id);
  }, []);

  // Rotate the informative tips (slow, so they're readable).
  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 6500);
    return () => clearInterval(id);
  }, []);

  const current = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));

  return (
    <div className="max-w-2xl mx-auto px-6 pt-14 pb-24 rise-in">
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="h-[230px] bg-gradient-to-b from-accent/40 to-transparent flex items-center justify-center px-6">
          <div className="w-full max-w-[360px]">
            <ReviewScene />
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-7 -mt-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-center text-foreground">
            Reviewing your contract
          </h2>

          {/* rotating informative tip */}
          <div key={tip} className="fade-swap mt-2 min-h-[40px] text-center text-sm text-muted-foreground max-w-md mx-auto">
            <span className="text-[11px] uppercase tracking-wider text-primary font-semibold">Did you know</span>
            <p className="mt-0.5">{TIPS[tip]}</p>
          </div>

          {/* live step checklist */}
          <ol className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {STEPS.map((s, i) => {
              const isDone = i < current;
              const isActive = i === current;
              return (
                <li
                  key={s}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors"
                  style={{
                    borderColor: isDone || isActive ? "var(--primary)" : "var(--border)",
                    background: isDone ? "var(--accent)" : "var(--card)",
                    color: isDone || isActive ? "var(--foreground)" : "var(--tertiary)",
                  }}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: isDone ? "var(--primary)" : "transparent" }}>
                    {isDone ? (
                      <Check size={11} className="text-primary-foreground" />
                    ) : isActive ? (
                      <Loader2 size={12} className="animate-spin text-primary" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                    )}
                  </span>
                  {s}
                </li>
              );
            })}
          </ol>

          {/* creeping progress — always moving toward done */}
          <div className="mt-5 mx-auto max-w-md h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.round(progress * 100)}%`, transition: "width 200ms linear" }}
            />
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Analysing with OCI GenAI — this can take up to a minute.
      </p>
    </div>
  );
}
