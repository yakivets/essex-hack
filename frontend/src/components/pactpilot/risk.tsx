import { useEffect, useState } from "react";
import type { RiskLevel } from "@/lib/types";

export function riskColor(r: RiskLevel) {
  if (r === "high") return "var(--risk-high)";
  if (r === "medium") return "var(--risk-med)";
  return "var(--risk-low)";
}
export function riskBg(r: RiskLevel) {
  if (r === "high") return "rgba(225,29,72,0.08)";
  if (r === "medium") return "rgba(245,158,11,0.10)";
  return "rgba(16,185,129,0.10)";
}
export function riskLabel(r: RiskLevel) {
  return r === "high" ? "High" : r === "medium" ? "Medium" : "Low";
}

export function RiskGauge({
  score,
  level,
  size = 112,
}: {
  score: number;
  level: RiskLevel;
  size?: number;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setV((1 - Math.pow(1 - p, 3)) * score);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  const R = 46;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <title>Risk score {score} of 100</title>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={riskColor(level)}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - v / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-3xl font-semibold tabular tracking-tight">
          {Math.round(v)}
        </div>
        <div className="text-[10px] text-tertiary -mt-0.5">of 100</div>
      </div>
    </div>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ color: riskColor(level), background: riskBg(level) }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor(level) }} />
      {riskLabel(level)}
    </span>
  );
}
