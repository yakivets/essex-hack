import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/pactpilot/TopBar";
import { UploadHero } from "@/components/pactpilot/UploadHero";
import { Processing } from "@/components/pactpilot/Processing";
import { VerdictHero } from "@/components/pactpilot/VerdictHero";
import { RedFlagsSection } from "@/components/pactpilot/RedFlagsSection";
import { DocumentSection } from "@/components/pactpilot/DocumentSection";
import { Sections } from "@/components/pactpilot/Sections";
import { ChatDock } from "@/components/pactpilot/ChatDock";
import { analyze } from "@/lib/api";
import type { AnalysisResult, AnalyzeInput } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PactPilot — AI contract review in 30 seconds" },
      { name: "description", content: "Drop a contract. PactPilot flags risk, explains clauses in plain English, and benchmarks terms against the market — no account needed." },
      { property: "og:title", content: "PactPilot — AI contract review in 30 seconds" },
      { property: "og:description", content: "A lawyer's first look at your contract — in 30 seconds." },
    ],
  }),
  component: Index,
});

type View = "upload" | "processing" | "results";

function Index() {
  const [view, setView] = useState<View>("upload");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [selectedFlagIndex, setSelectedFlagIndex] = useState(0);
  const [scrollToken, setScrollToken] = useState(0);
  const [prefillClauseId, setPrefillClauseId] = useState<string | null>(null);

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

  function selectClause(id: string, fromFlag?: number) {
    setSelectedClauseId(id);
    setScrollToken((t) => t + 1);
    if (result && fromFlag === undefined) {
      const idx = result.red_flags.findIndex((f) => f.clause_id === id);
      if (idx >= 0) setSelectedFlagIndex(idx);
    }
  }

  function selectFlag(i: number) {
    if (!result) return;
    setSelectedFlagIndex(i);
    const flag = result.red_flags[i];
    if (flag) selectClause(flag.clause_id, i);
  }

  const selectedClauseLabel = result && selectedClauseId
    ? result.clauses.find((c) => c.id === selectedClauseId)?.category
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="pb-32">
        {view === "upload" && <UploadHero onSubmit={start} />}
        {view === "processing" && <Processing />}
        {view === "results" && result && (
          <div className="max-w-5xl mx-auto px-6 pt-10 space-y-4 rise-in">
            <VerdictHero data={result} />
            <RedFlagsSection
              data={result}
              selectedFlagIndex={selectedFlagIndex}
              onSelectFlag={selectFlag}
            />
            <DocumentSection
              data={result}
              selectedClauseId={selectedClauseId}
              onSelectClause={(id) => selectClause(id)}
              onAskAbout={(id) => setPrefillClauseId(id)}
              scrollToken={scrollToken}
            />
            <Sections data={result} />
          </div>
        )}
      </main>
      {view === "results" && result && (
        <ChatDock
          analysisId={result.id}
          prefillClauseId={prefillClauseId}
          clauseLabel={selectedClauseLabel}
          onClearPrefill={() => setPrefillClauseId(null)}
          onCitationClick={(id) => selectClause(id)}
        />
      )}
    </div>
  );
}
