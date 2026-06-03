import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/pactpilot/TopBar";
import { UploadHero } from "@/components/pactpilot/UploadHero";
import { Processing } from "@/components/pactpilot/Processing";
import { ResultsLayout } from "@/components/pactpilot/ResultsLayout";
import { analyze } from "@/lib/api";
import type { AnalysisResult, AnalyzeInput } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PactPilot — AI contract review in 30 seconds" },
      {
        name: "description",
        content:
          "Drop a contract. PactPilot flags risk, explains clauses in plain English, and benchmarks terms against the market — no account needed.",
      },
      { property: "og:title", content: "PactPilot — AI contract review in 30 seconds" },
      {
        property: "og:description",
        content: "A lawyer's first look at your contract — in 30 seconds.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap",
      },
    ],
  }),
  component: Index,
});

type View = "upload" | "processing" | "results";

function Index() {
  const [view, setView] = useState<View>("upload");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function start(input: AnalyzeInput) {
    setView("processing");
    try {
      const r = await analyze(input);
      setResult(r);
      setView("results");
    } catch (e) {
      console.error(e);
      setView("upload");
    }
  }

  function reset() {
    setResult(null);
    setView("upload");
  }

  if (view === "results" && result) {
    return <ResultsLayout data={result} onHome={reset} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="pb-24">
        {view === "upload" && <UploadHero onSubmit={start} />}
        {view === "processing" && <Processing />}
      </main>
    </div>
  );
}
