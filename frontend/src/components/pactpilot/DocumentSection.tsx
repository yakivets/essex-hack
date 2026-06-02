import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, MessageCircleQuestion } from "lucide-react";
import { Section } from "./Section";
import { RiskBadge, riskColor, riskLabel } from "./risk";
import type { AnalysisResult, Clause, RiskLevel } from "@/lib/types";

type Mode = "flags" | "all" | "category";

interface Props {
  data: AnalysisResult;
  selectedClauseId: string | null;
  onSelectClause: (id: string) => void;
  onAskAbout: (clauseId: string) => void;
  scrollToken: number; // increments when external selection should trigger scroll
}

export function DocumentSection({ data, selectedClauseId, onSelectClause, onAskAbout, scrollToken }: Props) {
  const [mode, setMode] = useState<Mode>("flags");
  const [severityFilter, setSeverityFilter] = useState<Set<RiskLevel>>(new Set(["high", "medium", "low"]));
  const docRef = useRef<HTMLDivElement>(null);

  const clauseMap = useMemo(() => new Map(data.clauses.map((c) => [c.id, c])), [data.clauses]);
  const flagClauseIds = useMemo(() => new Set(data.red_flags.map((f) => f.clause_id)), [data.red_flags]);

  const visibleClauses = useMemo(() => {
    let list = data.clauses;
    if (mode === "flags") list = list.filter((c) => flagClauseIds.has(c.id));
    list = list.filter((c) => severityFilter.has(c.risk_level));
    return list;
  }, [data.clauses, mode, severityFilter, flagClauseIds]);

  const countBy = (lvl: RiskLevel) => data.clauses.filter((c) => c.risk_level === lvl).length;

  // paint highlights on rendered html
  useEffect(() => {
    const root = docRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-clause]").forEach((el) => {
      const id = el.dataset.clause!;
      const c = clauseMap.get(id);
      if (!c) return;
      const color = riskColor(c.risk_level);
      el.style.cursor = "pointer";
      el.style.borderBottom = `2px solid ${color}`;
      el.style.background = id === selectedClauseId ? `${color}22` : `${color}10`;
      el.style.padding = "1px 2px";
      el.style.borderRadius = "3px";
      el.style.transition = "background 150ms";
      el.onclick = () => onSelectClause(id);
    });
  }, [data.document.html, clauseMap, selectedClauseId, onSelectClause]);

  // scroll selected into view in document pane
  useEffect(() => {
    if (!selectedClauseId || !docRef.current) return;
    const el = docRef.current.querySelector<HTMLElement>(`[data-clause="${selectedClauseId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedClauseId, scrollToken]);

  const selected = selectedClauseId ? clauseMap.get(selectedClauseId) ?? null : null;

  return (
    <Section
      id="document"
      icon={<FileText size={18} />}
      iconTint="var(--accent)"
      title="Document"
      badge={<span className="text-xs font-medium text-muted-foreground tabular">{data.clauses.length} clauses</span>}
      defaultOpen
    >
      <div className="grid lg:grid-cols-[220px_1fr_280px] gap-4 pt-3">
        {/* LEFT INDEX */}
        <div className="min-w-0">
          <div className="inline-flex p-0.5 bg-muted rounded-lg text-xs">
            {([["flags", "Red flags"], ["all", "All"], ["category", "By category"]] as const).map(([k, l]) => (
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
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["high", "medium", "low"] as RiskLevel[]).map((lvl) => {
              const active = severityFilter.has(lvl);
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    const n = new Set(severityFilter);
                    if (n.has(lvl)) n.delete(lvl); else n.add(lvl);
                    setSeverityFilter(n);
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
          <div className="mt-3 max-h-[420px] overflow-y-auto pr-1 space-y-3">
            {(["high", "medium", "low"] as RiskLevel[]).map((lvl) => {
              const group = visibleClauses.filter((c) => c.risk_level === lvl);
              if (!group.length) return null;
              return (
                <div key={lvl}>
                  <div className="text-[11px] uppercase tracking-wider text-tertiary mb-1.5 px-1">{riskLabel(lvl)}</div>
                  <ul className="space-y-1">
                    {group.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => onSelectClause(c.id)}
                          className="w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors"
                          style={{
                            background: c.id === selectedClauseId ? "var(--accent)" : "transparent",
                            color: c.id === selectedClauseId ? "var(--accent-foreground)" : "var(--foreground)",
                          }}
                        >
                          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: riskColor(c.risk_level) }} />
                          <span className="align-middle">{c.category}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER DOCUMENT */}
        <div className="relative min-w-0 rounded-xl border border-border bg-white">
          <div
            ref={docRef}
            className="prose-document max-h-[520px] overflow-y-auto px-6 py-5 text-[15px] leading-7"
            dangerouslySetInnerHTML={{ __html: data.document.html }}
          />
          {/* minimap */}
          <Minimap data={data} selectedClauseId={selectedClauseId} onSelect={onSelectClause} />
        </div>

        {/* RIGHT DETAIL */}
        <aside className="lg:sticky lg:top-20 self-start">
          {selected ? <ClauseDetail clause={selected} onAsk={() => onAskAbout(selected.id)} /> : (
            <div className="rounded-xl border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
              Select a clause to see its plain-English meaning, benchmark, and a suggested fix.
            </div>
          )}
        </aside>
      </div>
    </Section>
  );
}

function ClauseDetail({ clause, onAsk }: { clause: Clause; onAsk: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 rise-in">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-tertiary uppercase tracking-wider">{clause.category}</span>
        <RiskBadge level={clause.risk_level} />
      </div>
      <blockquote className="mt-3 text-sm text-foreground/80 border-l-2 pl-3 italic" style={{ borderColor: riskColor(clause.risk_level) }}>
        "{clause.quote}"
      </blockquote>
      <div className="mt-3 text-sm">
        <div className="text-tertiary text-xs uppercase tracking-wider">Plain English</div>
        <p className="mt-1">{clause.plain_english}</p>
      </div>
      {clause.why_risky && (
        <div className="mt-3 text-sm">
          <div className="text-tertiary text-xs uppercase tracking-wider">Why it matters</div>
          <p className="mt-1">{clause.why_risky}</p>
        </div>
      )}
      {clause.benchmark && (
        <div className="mt-3 text-xs text-muted-foreground">
          Harsher than <span className="font-semibold text-foreground tabular">{clause.benchmark.percentile}%</span> — typical is {clause.benchmark.typical}.
        </div>
      )}
      {clause.suggested_fix && (
        <div className="mt-3 p-3 rounded-lg bg-accent text-sm">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">Suggested fix</div>
          <p className="mt-1 text-foreground">{clause.suggested_fix}</p>
        </div>
      )}
      <button
        type="button"
        onClick={onAsk}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors text-sm font-medium"
      >
        <MessageCircleQuestion size={15} /> Ask about this clause
      </button>
    </div>
  );
}

function Minimap({ data, selectedClauseId, onSelect }: { data: AnalysisResult; selectedClauseId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="absolute top-3 right-1.5 bottom-3 w-2 flex flex-col gap-[3px]">
      {data.clauses.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          aria-label={`Jump to ${c.category}`}
          className="flex-1 rounded-sm transition-all"
          style={{
            background: riskColor(c.risk_level),
            opacity: c.id === selectedClauseId ? 1 : 0.45,
            transform: c.id === selectedClauseId ? "scaleX(1.6)" : "scaleX(1)",
          }}
        />
      ))}
    </div>
  );
}
