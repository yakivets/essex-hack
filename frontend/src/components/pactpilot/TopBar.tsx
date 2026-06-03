import { ShieldCheck, RotateCcw, PanelRightOpen } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <title>PactPilot</title>
        <path
          d="M5 20 L5 6 L14 6 C18 6 20 8 20 11 C20 14 18 16 14 16 L9 16 M16 16 L21 21"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="80"
          strokeDashoffset="80"
          style={{ animation: "draw-stroke 900ms ease-out forwards" }}
        />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-foreground">
        PactPilot
      </span>
    </div>
  );
}

interface Props {
  onHome?: () => void;
  onNewAnalysis?: () => void;
  onOpenDetails?: () => void;
}

export function TopBar({ onHome, onNewAnalysis, onOpenDetails }: Props) {
  return (
    <header className="shrink-0 z-40 backdrop-blur-md bg-card/70 border-b border-border">
      <div className="max-w-[1600px] mx-auto px-5 h-14 flex items-center justify-between">
        {onHome ? (
          <button
            type="button"
            onClick={onHome}
            aria-label="Back to start"
            className="rounded-lg -ml-1 px-1 py-1 hover:opacity-80 transition-opacity"
          >
            <Wordmark />
          </button>
        ) : (
          <Wordmark />
        )}

        <div className="flex items-center gap-2">
          {onOpenDetails && (
            <button
              type="button"
              onClick={onOpenDetails}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/40 transition-colors"
            >
              <PanelRightOpen size={14} /> Details
            </button>
          )}
          {onNewAnalysis && (
            <button
              type="button"
              onClick={onNewAnalysis}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/40 transition-colors"
            >
              <RotateCcw size={13} /> New
            </button>
          )}
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5 bg-card">
            <ShieldCheck size={14} className="text-tertiary" />
            Not legal advice
          </div>
        </div>
      </div>
    </header>
  );
}
