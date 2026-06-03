import { useEffect, useState } from "react";
import { Download, Flag, MessageCircleQuestion, MessageSquare } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { RiskBadge, riskColor, riskLabel } from "./risk";
import { exportPdf } from "@/lib/exportPdf";
import type { AnalysisResult, Clause } from "@/lib/types";

type Tab = "risk" | "chat";

interface Props {
  data: AnalysisResult;
  selectedClauseId: string | null;
  selectedFlagIndex: number;
  onSelectClause: (id: string) => void;
  onSelectFlag: (i: number) => void;
  prefillClauseId: string | null;
  clauseLabel?: string;
  onAskAbout: (clauseId: string) => void;
  onClearPrefill: () => void;
  onCitationClick: (clauseId: string) => void;
}

function Gauge({ score, level }: { score: number; level: "high" | "medium" | "low" }) {
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
    <div className="relative w-[112px] h-[112px] shrink-0">
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

function Fairness({ score, label }: { score: number; label: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(score), 80);
    return () => clearTimeout(t);
  }, [score]);
  const pct = ((v + 1) / 2) * 100;
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card shadow-card transition-all"
          style={{
            left: `calc(${pct}% - 7px)`,
            transitionDuration: "900ms",
            transitionTimingFunction: "cubic-bezier(0.2,0.8,0.2,1)",
          }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-tertiary">
        <span>Favours them</span>
        <span className="text-foreground font-medium">{label}</span>
        <span>Favours you</span>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-tertiary">{label}</div>
      <div
        className="text-xs font-medium text-foreground mt-0.5 leading-snug break-words line-clamp-2"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function ClauseDetail({ clause, onAsk }: { clause: Clause; onAsk: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 rise-in">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-tertiary uppercase tracking-wider">
          {clause.category}
        </span>
        <RiskBadge level={clause.risk_level} />
      </div>
      <blockquote
        className="mt-2.5 text-sm text-foreground/80 border-l-2 pl-3 italic"
        style={{ borderColor: riskColor(clause.risk_level) }}
      >
        "{clause.quote}"
      </blockquote>
      <div className="mt-3 text-sm">
        <div className="text-tertiary text-[11px] uppercase tracking-wider">Plain English</div>
        <p className="mt-1 text-foreground">{clause.plain_english}</p>
      </div>
      {clause.why_risky && (
        <div className="mt-3 text-sm">
          <div className="text-tertiary text-[11px] uppercase tracking-wider">Why it matters</div>
          <p className="mt-1 text-foreground">{clause.why_risky}</p>
        </div>
      )}
      {clause.benchmark && (
        <div className="mt-3 text-xs text-muted-foreground">
          Harsher than{" "}
          <span className="font-semibold text-foreground tabular">
            {clause.benchmark.percentile}%
          </span>{" "}
          — typical is {clause.benchmark.typical}.
        </div>
      )}
      {clause.suggested_fix && (
        <div className="mt-3 p-3 rounded-lg bg-accent text-sm">
          <div className="text-[11px] uppercase tracking-wider text-accent-foreground font-semibold">
            Suggested fix
          </div>
          <p className="mt-1 text-foreground">{clause.suggested_fix}</p>
        </div>
      )}
      <button
        type="button"
        onClick={onAsk}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors text-sm font-medium"
      >
        <MessageCircleQuestion size={15} /> Ask about this clause
      </button>
    </div>
  );
}

export function RiskRail(props: Props) {
  const { data, selectedClauseId, selectedFlagIndex, onSelectClause, onSelectFlag, onAskAbout } =
    props;
  const [tab, setTab] = useState<Tab>("risk");
  const v = data.verdict;
  const flags = data.red_flags;
  const selected = selectedClauseId
    ? (data.clauses.find((c) => c.id === selectedClauseId) ?? null)
    : null;

  function ask(id: string) {
    onAskAbout(id);
    setTab("chat");
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Verdict header */}
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-start gap-4">
          <Gauge score={v.risk_score} level={v.risk_level} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: riskColor(v.risk_level),
                  background: `${riskColor(v.risk_level)}1A`,
                }}
              >
                {riskLabel(v.risk_level)} risk
              </span>
              <button
                type="button"
                onClick={() => exportPdf(data)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
              >
                <Download size={13} /> Export
              </button>
            </div>
            <h2 className="font-display mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground">
              {v.summary_line}
            </h2>
          </div>
        </div>
        <div className="mt-3">
          <Fairness score={v.fairness.score} label={v.fairness.label} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <Fact label="Parties" value={data.key_facts.parties} />
          <Fact label="Term" value={data.key_facts.term} />
          <Fact label="Value" value={data.key_facts.value} />
          <Fact label="Notice" value={data.key_facts.notice} />
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex items-center gap-1 px-3 pt-3">
        {(
          [
            ["risk", "Risk", <Flag size={14} key="f" />, flags.length],
            ["chat", "Chat", <MessageSquare size={14} key="c" />, null],
          ] as const
        ).map(([k, label, icon, count]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k as Tab)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: tab === k ? "var(--primary)" : "transparent",
              color: tab === k ? "var(--foreground)" : "var(--muted-foreground)",
            }}
          >
            {icon} {label}
            {count != null && <span className="text-xs tabular text-tertiary">{count}</span>}
          </button>
        ))}
      </div>
      <div className="h-px bg-border shrink-0" />

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {tab === "risk" ? (
          <div className="scroll-thin h-full overflow-y-auto p-4 space-y-3">
            {selected && <ClauseDetail clause={selected} onAsk={() => ask(selected.id)} />}
            {flags.length > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs text-tertiary uppercase tracking-wider px-0.5">
                  <span>Red flags</span>
                  <span className="tabular">{flags.length}</span>
                </div>
                {flags.map((f, i) => {
                  const active = i === selectedFlagIndex && selectedClauseId === f.clause_id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onSelectFlag(i)}
                      className="w-full text-left rounded-xl border bg-card hover:shadow-card transition-all relative overflow-hidden p-3.5 pl-4"
                      style={{ borderColor: active ? "var(--primary)" : "var(--border)" }}
                    >
                      <span
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ background: riskColor(f.severity) }}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm text-foreground">{f.title}</div>
                        <RiskBadge level={f.severity} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{f.explanation}</p>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                No red flags — this one looks clean.
              </div>
            )}
          </div>
        ) : (
          <ChatPanel
            analysisId={props.data.id}
            prefillClauseId={props.prefillClauseId}
            clauseLabel={props.clauseLabel}
            onClearPrefill={props.onClearPrefill}
            onCitationClick={props.onCitationClick}
          />
        )}
      </div>
    </div>
  );
}
