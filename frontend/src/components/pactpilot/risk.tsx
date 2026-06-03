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
