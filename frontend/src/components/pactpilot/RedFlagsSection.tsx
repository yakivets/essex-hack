import { Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { Section } from "./Section";
import { RiskBadge, riskColor } from "./risk";
import type { AnalysisResult } from "@/lib/types";

interface Props {
  data: AnalysisResult;
  selectedFlagIndex: number;
  onSelectFlag: (index: number) => void;
}

export function RedFlagsSection({ data, selectedFlagIndex, onSelectFlag }: Props) {
  const flags = data.red_flags;
  if (!flags || flags.length === 0) return null;

  const highCount = flags.filter((f) => f.severity === "high").length;

  return (
    <Section
      id="red-flags"
      icon={<Flag size={18} />}
      iconTint="rgba(225,29,72,0.10)"
      title="Red flags"
      badge={
        <span className="text-xs font-medium text-muted-foreground tabular">
          {flags.length} found{highCount ? ` · ${highCount} high` : ""}
        </span>
      }
      defaultOpen
    >
      <div className="space-y-3 pt-3">
        {flags.map((f, i) => {
          const active = i === selectedFlagIndex;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFlag(i)}
              className="w-full text-left rounded-xl border border-border bg-white hover:shadow-card transition-all relative overflow-hidden p-4 pl-5"
              style={{ outline: active ? "2px solid var(--primary)" : undefined, outlineOffset: -2 }}
            >
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: riskColor(f.severity) }} />
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium text-foreground">{f.title}</div>
                <RiskBadge level={f.severity} />
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.explanation}</p>
              <p className="mt-1.5 text-sm text-foreground/80"><span className="text-tertiary">Why it matters: </span>{f.why_risky}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => onSelectFlag(Math.max(0, selectedFlagIndex - 1))}
          disabled={selectedFlagIndex <= 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-white disabled:opacity-40 hover:bg-muted transition-colors"
          aria-label="Previous flag"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <span className="text-tertiary tabular">{selectedFlagIndex + 1} / {flags.length}</span>
        <button
          type="button"
          onClick={() => onSelectFlag(Math.min(flags.length - 1, selectedFlagIndex + 1))}
          disabled={selectedFlagIndex >= flags.length - 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-white disabled:opacity-40 hover:bg-muted transition-colors"
          aria-label="Next flag"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </Section>
  );
}
