import { useEffect, useRef, useState } from "react";
import { Upload, FileText, Sparkles } from "lucide-react";
import type { AnalyzeInput, Sample } from "@/lib/types";
import { getSamples } from "@/lib/api";

interface Props {
  onSubmit: (input: AnalyzeInput) => void;
}

export function UploadHero({ onSubmit }: Props) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [drag, setDrag] = useState(false);
  const [showText, setShowText] = useState(false);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSamples().then(setSamples).catch(() => setSamples([]));
  }, []);

  function handleFile(f: File | null | undefined) {
    if (!f) return;
    onSubmit({ kind: "file", file: f });
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-16 pb-24 rise-in">
      <div className="text-center max-w-3xl mx-auto">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">AI Contract Review</p>
        <h1 className="mt-3 text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
          Know what you're signing.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A lawyer's first look — in 30 seconds.
        </p>
      </div>

      <div className="mt-12">
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault(); setDrag(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className="block cursor-pointer rounded-2xl bg-card transition-all duration-200"
          style={{
            border: `1.5px ${drag ? "solid" : "dashed"} ${drag ? "var(--primary)" : "var(--border)"}`,
            boxShadow: drag ? "0 0 0 6px rgba(37,99,235,0.08)" : undefined,
          }}
        >
          <div className="px-8 py-14 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center">
              <Upload size={24} className="text-primary" />
            </div>
            <p className="mt-5 text-lg font-medium">Drop a PDF or DOCX, or browse</p>
            <p className="mt-1 text-sm text-muted-foreground">Up to 10 MB · processed in seconds</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); fileRef.current?.click(); }}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors px-4 py-2.5 rounded-lg text-sm font-medium shadow-card"
              >
                <Upload size={16} /> Browse files
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowText((s) => !s); }}
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border border-border bg-white hover:bg-muted transition-colors"
              >
                <FileText size={16} /> Paste text instead
              </button>
            </div>
          </div>
        </label>

        {showText && (
          <div className="mt-4 rise-in">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your contract text here…"
              className="w-full min-h-[180px] rounded-2xl border border-border bg-card p-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={text.trim().length < 40}
                onClick={() => onSubmit({ kind: "text", text })}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-4 py-2.5 rounded-lg text-sm font-medium"
              >
                Analyse text
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center gap-2 text-xs font-medium text-tertiary uppercase tracking-wider">
          <Sparkles size={14} /> Or try a sample
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {samples.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSubmit({ kind: "sample", sampleId: s.id })}
              className="group text-left rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-card transition-all px-4 py-3 max-w-xs"
            >
              <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{s.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-low" /> Private · deleted after analysis
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> No account needed
        </span>
      </div>
    </div>
  );
}
