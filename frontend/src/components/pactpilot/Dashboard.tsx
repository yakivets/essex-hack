import { useEffect, useState } from "react";
import { FileText, Loader2, AlertTriangle, Gauge, Files, Plus, ArrowRight } from "lucide-react";
import { TopBar } from "./TopBar";
import { RiskBadge } from "./risk";
import { getAnalyses } from "@/lib/api";
import type { AnalysisSummary } from "@/lib/types";

interface Props {
  onReopen: (id: string) => void;
  onNew: () => void;
  /** Bumps to force a refetch (e.g. after a new analysis was saved). */
  refreshToken?: number;
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex w-10 h-10 rounded-xl items-center justify-center"
          style={{ background: `${tint}1A`, color: tint }}
        >
          {icon}
        </span>
        <div>
          <div className="text-2xl font-display font-semibold tabular tracking-tight text-foreground leading-none">
            {value}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function Dashboard({ onReopen, onNew, refreshToken }: Props) {
  const [items, setItems] = useState<AnalysisSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getAnalyses()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't load your saved contracts.");
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const total = items?.length ?? 0;
  const highRisk = items?.filter((a) => a.risk_level === "high").length ?? 0;
  const avgScore =
    items && items.length > 0
      ? Math.round(items.reduce((s, a) => s + a.risk_score, 0) / items.length)
      : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar onHome={onNew} onNewAnalysis={onNew} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Your contracts
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every analysis you've saved, with its risk verdict.
            </p>
          </div>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors text-sm font-medium shadow-card"
          >
            <Plus size={16} /> Analyse a contract
          </button>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={<Files size={18} />} label="Contracts analysed" value={total} tint="var(--primary)" />
          <StatCard
            icon={<AlertTriangle size={18} />}
            label="High-risk contracts"
            value={highRisk}
            tint="var(--risk-high)"
          />
          <StatCard
            icon={<Gauge size={18} />}
            label="Average risk score"
            value={total > 0 ? `${avgScore}/100` : "—"}
            tint="var(--risk-med)"
          />
        </div>

        {/* History list */}
        <div className="mt-8">
          <h2 className="text-xs font-medium text-tertiary uppercase tracking-wider">History</h2>

          {items === null ? (
            <div className="mt-6 flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <span className="inline-flex w-12 h-12 rounded-2xl bg-accent items-center justify-center">
                <FileText size={20} className="text-primary" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                No saved contracts yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {error ?? "Analyse a contract and it'll show up here automatically."}
              </p>
              <button
                type="button"
                onClick={onNew}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors text-sm font-medium"
              >
                <Plus size={16} /> Analyse your first contract
              </button>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onReopen(a.id)}
                    className="group w-full text-left rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-card transition-all px-4 py-3.5 flex items-center gap-4"
                  >
                    <span className="inline-flex w-10 h-10 shrink-0 rounded-lg bg-accent items-center justify-center">
                      <FileText size={18} className="text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {a.filename}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{a.contract_type}</span>
                        {a.created_at && (
                          <>
                            <span className="text-tertiary">·</span>
                            <span>{formatDate(a.created_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:block text-sm tabular text-muted-foreground">
                        {a.risk_score}/100
                      </span>
                      <RiskBadge level={a.risk_level} />
                      <ArrowRight
                        size={16}
                        className="text-tertiary group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
