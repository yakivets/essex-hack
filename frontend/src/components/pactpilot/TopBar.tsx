import { ShieldCheck } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/70 border-b border-border">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <title>PactPilot</title>
            <path
              d="M5 20 L5 6 L14 6 C18 6 20 8 20 11 C20 14 18 16 14 16 L9 16 M16 16 L21 21"
              stroke="#2563EB"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="80"
              strokeDashoffset="80"
              style={{ animation: "draw-stroke 900ms ease-out forwards" }}
            />
          </svg>
          <span className="font-semibold tracking-tight text-foreground">PactPilot</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5 bg-white">
          <ShieldCheck size={14} className="text-tertiary" />
          Not legal advice
        </div>
      </div>
    </header>
  );
}
