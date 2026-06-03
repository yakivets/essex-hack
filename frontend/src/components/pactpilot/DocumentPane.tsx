import { useEffect, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { riskColor, riskLabel } from "./risk";
import type { AnalysisResult, RiskLevel } from "@/lib/types";

type Mode = "flags" | "all";

interface Props {
  data: AnalysisResult;
  selectedClauseId: string | null;
  onSelectClause: (id: string) => void;
  scrollToken: number;
}

export function DocumentPane({ data, selectedClauseId, onSelectClause, scrollToken }: Props) {
  const [mode, setMode] = useState<Mode>("flags");
  const [severity, setSeverity] = useState<Set<RiskLevel>>(new Set(["high", "medium", "low"]));
  const docRef = useRef<HTMLDivElement>(null);

  const clauseMap = useMemo(() => new Map(data.clauses.map((c) => [c.id, c])), [data.clauses]);
  const flagClauseIds = useMemo(() => new Set(data.red_flags.map((f) => f.clause_id)), [data.red_flags]);

  const isVisible = useMemo(() => {
    return (id: string) => {
      const c = clauseMap.get(id);
      if (!c) return false;
      if (mode === "flags" && !flagClauseIds.has(id)) return false;
      return severity.has(c.risk_level);
    };
  }, [clauseMap, flagClauseIds, mode, severity]);

  // Paint highlights on the rendered HTML.
  useEffect(() => {
    const root = docRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-clause]").forEach((el) => {
      const id = el.dataset.clause!;
      const c = clauseMap.get(id);
      if (!c) return;
      const visible = isVisible(id);
      const color = riskColor(c.risk_level);
      el.style.cursor = "pointer";
      el.style.transition = "background 150ms, border-color 150ms";
      el.style.borderRadius = "3px";
      el.style.padding = "1px 2px";
      if (visible) {
        el.style.borderBottom = `2px solid ${color}`;
        el.style.background = id === selectedClauseId ? `${color}33` : `${color}14`;
      } else {
        el.style.borderBottom = "2px solid transparent";
        el.style.background = id === selectedClauseId ? "var(--muted)" : "transparent";
      }
      el.onclick = () => onSelectClause(id);
    });
  }, [data.document.html, clauseMap, selectedClauseId, isVisible, onSelectClause]);

  // Scroll the selected clause into view.
  useEffect(() => {
    if (!selectedClauseId || !docRef.current) return;
    const el = docRef.current.querySelector<HTMLElement>(`[data-clause="${selectedClauseId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedClauseId, scrollToken]);

  const countBy = (lvl: RiskLevel) => data.clauses.filter((c) => c.risk_level === lvl).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Controls */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground mr-1">
          <FileText size={16} className="text-primary" /> Document
          <span className="text-xs text-tertiary tabular ml-1">{data.clauses.length} clauses</span>
        </div>
        <div className="inline-flex p-0.5 bg-muted rounded-lg text-xs ml-auto">
          {([["flags", "Red flags"], ["all", "All clauses"]] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className="px-2.5 py-1.5 rounded-md font-medium transition-colors"
              style={{
                background: mode === k ? "var(--card)" : "transparent",
                color: mode === k ? "var(--foreground)" : "var(--muted-foreground)",
                boxShadow: mode === k ? "var(--shadow-card)" : undefined,
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["high", "medium", "low"] as RiskLevel[]).map((lvl) => {
            const active = severity.has(lvl);
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  const n = new Set(severity);
                  if (n.has(lvl)) n.delete(lvl);
                  else n.add(lvl);
                  setSeverity(n);
                }}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors"
                style={{
                  borderColor: active ? riskColor(lvl) : "var(--border)",
                  background: active ? `${riskColor(lvl)}14` : "var(--card)",
                  color: active ? riskColor(lvl) : "var(--muted-foreground)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor(lvl) }} />
                {riskLabel(lvl)} <span className="tabular opacity-70">{countBy(lvl)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Document body + minimap */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={docRef}
          className="prose-document scroll-thin h-full overflow-y-auto px-7 py-6 pr-10 text-[15px] leading-7 text-foreground"
          dangerouslySetInnerHTML={{ __html: data.document.html }}
        />
        <div className="absolute top-4 right-2 bottom-4 w-2 flex flex-col gap-[3px]">
          {data.clauses.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectClause(c.id)}
              aria-label={`Jump to ${c.category}`}
              className="flex-1 rounded-sm transition-all"
              style={{
                background: riskColor(c.risk_level),
                opacity: c.id === selectedClauseId ? 1 : 0.4,
                transform: c.id === selectedClauseId ? "scaleX(1.6)" : "scaleX(1)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
