import { Scale, DollarSign, CalendarDays, DoorOpen, ShieldAlert, HelpCircle } from "lucide-react";
import { Section } from "./Section";
import type { AnalysisResult } from "@/lib/types";

export function Sections({ data }: { data: AnalysisResult }) {
  return (
    <>
      {data.obligations && (data.obligations.yours.length || data.obligations.theirs.length) ? (
        <Section
          id="obligations"
          icon={<Scale size={18} />}
          title="Your obligations"
          badge={<span className="text-xs text-muted-foreground tabular">{data.obligations.yours.length} yours · {data.obligations.theirs.length} theirs</span>}
        >
          <div className="grid sm:grid-cols-2 gap-4 pt-3">
            <ObCol title="You must" items={data.obligations.yours} />
            <ObCol title="They must" items={data.obligations.theirs} />
          </div>
        </Section>
      ) : null}

      {data.money ? (
        <Section
          id="money"
          icon={<DollarSign size={18} />}
          iconTint="rgba(16,185,129,0.12)"
          title="Money"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <Tile label="Total value" value={data.money.total_value} />
            <Tile label="Payment schedule" value={data.money.payment_schedule} />
            <Tile label="Liability cap" value={data.money.liability_cap} />
            <Tile label="Penalties" value={data.money.penalties?.length ? `${data.money.penalties.length} terms` : undefined} />
          </div>
          {data.money.penalties?.length ? (
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {data.money.penalties.map((p, i) => <li key={i}>• {p}</li>)}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {data.dates?.length ? (
        <Section
          id="dates"
          icon={<CalendarDays size={18} />}
          title="Key dates"
          badge={<span className="text-xs text-muted-foreground tabular">{data.dates.length} dates</span>}
        >
          <Timeline data={data} />
        </Section>
      ) : null}

      {data.exit ? (
        <Section
          id="exit"
          icon={<DoorOpen size={18} />}
          title="Exit analysis"
          badge={<span className="text-xs font-medium capitalize" style={{ color: data.exit.difficulty === "hard" ? "var(--risk-high)" : data.exit.difficulty === "moderate" ? "var(--risk-med)" : "var(--risk-low)" }}>{data.exit.difficulty}</span>}
        >
          <div className="pt-3 text-sm">
            <p className="text-foreground">{data.exit.summary}</p>
            <ul className="mt-3 space-y-1.5 text-muted-foreground">
              {data.exit.termination_terms.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </div>
        </Section>
      ) : null}

      {data.missing_clauses?.length ? (
        <Section
          id="missing"
          icon={<ShieldAlert size={18} />}
          iconTint="rgba(245,158,11,0.14)"
          title="Missing clauses"
          badge={<span className="text-xs text-muted-foreground tabular">{data.missing_clauses.length}</span>}
        >
          <p className="text-sm text-muted-foreground pt-3 mb-3">Protections this contract lacks.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.missing_clauses.map((m, i) => (
              <div key={i} className="rounded-xl border border-border bg-white p-4">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{m.why_matters}</div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {data.scenarios?.length ? (
        <Section
          id="scenarios"
          icon={<HelpCircle size={18} />}
          title="What happens if…"
          badge={<span className="text-xs text-muted-foreground tabular">{data.scenarios.length}</span>}
        >
          <ul className="pt-3 divide-y divide-border">
            {data.scenarios.map((s, i) => (
              <li key={i} className="py-3">
                <div className="text-sm font-medium text-foreground">{s.question}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.answer}</div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

function ObCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-tertiary font-semibold">{title}</div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-tertiary">•</span>{it}</li>)}
      </ul>
    </div>
  );
}

function Tile({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-tertiary">{label}</div>
      <div className="text-sm font-medium mt-0.5 tabular">{value}</div>
    </div>
  );
}

function Timeline({ data }: { data: AnalysisResult }) {
  const dates = [...(data.dates ?? [])].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  if (!dates.length) return null;
  const min = +new Date(dates[0].date);
  const max = +new Date(dates[dates.length - 1].date);
  const span = Math.max(1, max - min);
  const today = Date.now();
  const todayPct = Math.max(0, Math.min(100, ((today - min) / span) * 100));

  return (
    <div className="pt-6 pb-2">
      <div className="relative h-1.5 rounded-full bg-muted">
        {today >= min && today <= max && (
          <div className="absolute -top-1 bottom-0 w-0.5 bg-primary" style={{ left: `${todayPct}%` }}>
            <div className="absolute -top-5 -translate-x-1/2 text-[10px] uppercase tracking-wider text-primary font-semibold">Today</div>
          </div>
        )}
        {dates.map((d, i) => {
          const pct = (((+new Date(d.date)) - min) / span) * 100;
          return (
            <div key={i} className="absolute -top-1.5 -translate-x-1/2" style={{ left: `${pct}%` }}>
              <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-foreground" />
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0,1fr))` }}>
        {dates.map((d, i) => (
          <div key={i} className="text-center">
            <div className="text-[11px] uppercase tracking-wider text-tertiary">{d.type}</div>
            <div className="text-sm font-medium mt-0.5">{d.label}</div>
            <div className="text-xs text-muted-foreground tabular">{new Date(d.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
