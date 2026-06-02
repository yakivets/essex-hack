import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { riskColor, riskLabel } from "./risk";

function Gauge({ score, level }: { score: number; level: "high" | "medium" | "low" }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(eased * score);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const R = 56;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - v / 100);

  return (
    <div className="relative w-[160px] h-[160px]">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <title>Risk score {score} of 100</title>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={R} fill="none"
          stroke={riskColor(level)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold tabular tracking-tight">{Math.round(v)}</div>
        <div className="text-xs text-tertiary">of 100</div>
      </div>
    </div>
  );
}

function FairnessMeter({ score, label }: { score: number; label: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(score), 80);
    return () => clearTimeout(t);
  }, [score]);
  const pct = ((v + 1) / 2) * 100;
  return (
    <div>
      <div className="relative h-2 rounded-full bg-muted overflow-visible">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-white shadow-card transition-all"
          style={{ left: `calc(${pct}% - 8px)`, transitionDuration: "900ms", transitionTimingFunction: "cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-tertiary">
        <span>Favours them</span>
        <span className="text-foreground font-medium">{label}</span>
        <span>Favours you</span>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-tertiary">{label}</div>
      <div className="text-sm font-medium text-foreground mt-0.5 tabular">{value}</div>
    </div>
  );
}

export function VerdictHero({ data }: { data: AnalysisResult }) {
  const v = data.verdict;
  return (
    <div className="rise-in">
      <div className="bg-card border border-border rounded-2xl shadow-card p-6 sm:p-8">
        <div className="grid lg:grid-cols-[auto_1fr] gap-8 items-start">
          <div className="flex flex-col items-center gap-3">
            <Gauge score={v.risk_score} level={v.risk_level} />
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: riskColor(v.risk_level), background: `${riskColor(v.risk_level)}1A` }}
            >
              {riskLabel(v.risk_level)} risk
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{v.summary_line}</h2>
              <button className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-foreground px-3 py-2 rounded-lg border border-border bg-white hover:bg-muted transition-colors">
                <Download size={15} /> Export
              </button>
            </div>
            <ul className="mt-5 space-y-2">
              {v.summary_bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <Check size={11} className="text-primary" />
                  </span>
                  <span className="text-foreground">{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <FairnessMeter score={v.fairness.score} label={v.fairness.label} />
            </div>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <StatTile label="Parties" value={data.key_facts.parties} />
              <StatTile label="Term" value={data.key_facts.term} />
              <StatTile label="Value" value={data.key_facts.value} />
              <StatTile label="Auto-renewal" value={data.key_facts.auto_renewal} />
              <StatTile label="Notice" value={data.key_facts.notice} />
              <StatTile label="Governing law" value={data.key_facts.governing_law} />
            </div>
          </div>
        </div>
      </div>
      {data.benchmark_summary && (
        <div className="mt-3 px-4 py-3 rounded-xl border border-border bg-white text-sm text-muted-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {data.benchmark_summary}
        </div>
      )}
    </div>
  );
}
