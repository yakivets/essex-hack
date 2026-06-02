import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const steps = [
  "Reading",
  "Extracting clauses",
  "Classifying",
  "Benchmarking vs market",
  "Scoring risk",
];

export function Processing() {
  const [done, setDone] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setDone((d) => (d < steps.length ? d + 1 : d));
    }, 480);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 pt-20 pb-24 rise-in">
      <div className="bg-card border border-border rounded-2xl shadow-card p-8 sm:p-10">
        <div className="grid sm:grid-cols-2 gap-8 items-center">
          <div className="relative h-[220px] mx-auto w-full max-w-[220px]">
            <svg viewBox="0 0 200 240" className="w-full h-full">
              <title>Scanning document</title>
              <rect x="20" y="10" width="160" height="220" rx="10" fill="#FFFFFF" stroke="#ECECEF" />
              {[0, 1, 2, 3, 4].map((i) => (
                <rect
                  key={i}
                  x="36"
                  y={40 + i * 28}
                  width={i % 2 === 0 ? 128 : 96}
                  height="10"
                  rx="3"
                  fill="#F0F1F4"
                >
                  <animate
                    attributeName="fill"
                    values="#F0F1F4;#DCE7FF;#F0F1F4"
                    dur="1.4s"
                    begin={`${i * 0.18}s`}
                    repeatCount="indefinite"
                  />
                </rect>
              ))}
              <rect
                x="24"
                y="20"
                width="152"
                height="2"
                fill="#2563EB"
                style={{ animation: "scan-sweep 1.8s ease-in-out infinite" }}
              />
            </svg>
          </div>
          <ol className="space-y-3">
            {steps.map((s, i) => {
              const isDone = i < done;
              const isActive = i === done;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: isDone ? "var(--primary)" : isActive ? "var(--accent)" : "var(--muted)",
                      color: isDone ? "#fff" : "var(--primary)",
                    }}
                  >
                    {isDone ? <Check size={14} /> : isActive ? <Loader2 size={14} className="animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />}
                  </span>
                  <span className={`text-sm ${isDone ? "text-foreground" : isActive ? "text-foreground font-medium" : "text-tertiary"}`}>
                    {s}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <div className="mt-6 grid sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl shimmer" />
        ))}
      </div>
    </div>
  );
}
