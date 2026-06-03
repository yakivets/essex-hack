import { useState } from "react";
import { TopBar } from "./TopBar";
import { DocumentPane } from "./DocumentPane";
import { RiskRail } from "./RiskRail";
import { DetailsDrawer } from "./DetailsDrawer";
import type { AnalysisResult } from "@/lib/types";

interface Props {
  data: AnalysisResult;
  onHome: () => void;
}

export function ResultsLayout({ data, onHome }: Props) {
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [selectedFlagIndex, setSelectedFlagIndex] = useState(0);
  const [scrollToken, setScrollToken] = useState(0);
  const [prefillClauseId, setPrefillClauseId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function selectClause(id: string, fromFlag?: number) {
    setSelectedClauseId(id);
    setScrollToken((t) => t + 1);
    if (fromFlag === undefined) {
      const idx = data.red_flags.findIndex((f) => f.clause_id === id);
      if (idx >= 0) setSelectedFlagIndex(idx);
    }
  }

  function selectFlag(i: number) {
    setSelectedFlagIndex(i);
    const flag = data.red_flags[i];
    if (flag) selectClause(flag.clause_id, i);
  }

  const clauseLabel = selectedClauseId
    ? data.clauses.find((c) => c.id === selectedClauseId)?.category
    : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <TopBar onHome={onHome} onNewAnalysis={onHome} onOpenDetails={() => setDetailsOpen(true)} />

      <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden scroll-thin p-3 sm:p-4">
        <div className="lg:h-full max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(460px,560px)] gap-3 sm:gap-4">
          <section className="lg:h-full lg:min-h-0 min-h-[60vh] rounded-2xl border border-border bg-card overflow-hidden shadow-card">
            <DocumentPane
              data={data}
              selectedClauseId={selectedClauseId}
              onSelectClause={(id) => selectClause(id)}
              scrollToken={scrollToken}
            />
          </section>
          <section className="lg:h-full lg:min-h-0 min-h-[70vh] rounded-2xl border border-border bg-card overflow-hidden shadow-card">
            <RiskRail
              data={data}
              selectedClauseId={selectedClauseId}
              selectedFlagIndex={selectedFlagIndex}
              onSelectClause={(id) => selectClause(id)}
              onSelectFlag={selectFlag}
              prefillClauseId={prefillClauseId}
              clauseLabel={clauseLabel}
              onAskAbout={(id) => setPrefillClauseId(id)}
              onClearPrefill={() => setPrefillClauseId(null)}
              onCitationClick={(id) => selectClause(id)}
            />
          </section>
        </div>
      </main>

      <DetailsDrawer data={data} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div>
  );
}
