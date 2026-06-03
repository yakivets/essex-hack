import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/pactpilot/TopBar";
import { UploadHero } from "@/components/pactpilot/UploadHero";
import { Processing } from "@/components/pactpilot/Processing";
import { ResultsLayout } from "@/components/pactpilot/ResultsLayout";
import { Dashboard } from "@/components/pactpilot/Dashboard";
import { AuthModal } from "@/components/pactpilot/AuthModal";
import { analyze, getAnalysis, saveAnalysis } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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

type View = "upload" | "processing" | "results" | "dashboard";

function Index() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("upload");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [dashboardToken, setDashboardToken] = useState(0);

  // Ids already persisted this session — keeps auto-save idempotent on the client.
  const savedIds = useRef<Set<string>>(new Set());

  // Reset the client save-cache on sign-out so a different account isn't skipped.
  useEffect(() => {
    if (!user) savedIds.current.clear();
  }, [user]);

  // Auto-save: whenever a logged-in user is viewing a fresh result, persist it.
  // This fires both for analyze-while-logged-in and for log-in-while-viewing
  // (the blur teaser path), since `user` flipping non-null re-runs the effect.
  useEffect(() => {
    if (!user || view !== "results" || !result) return;
    if (savedIds.current.has(result.id)) return;
    savedIds.current.add(result.id);
    saveAnalysis(result.id)
      .then(() => setDashboardToken((t) => t + 1))
      .catch((e) => {
        savedIds.current.delete(result.id); // allow a later retry
        console.error("Auto-save failed", e);
      });
  }, [user, view, result]);

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

  async function reopen(id: string) {
    try {
      const r = await getAnalysis(id);
      savedIds.current.add(r.id); // already persisted; don't re-save on view
      setResult(r);
      setView("results");
    } catch (e) {
      console.error("Failed to reopen analysis", e);
    }
  }

  function reset() {
    setResult(null);
    setView("upload");
  }

  function goDashboard() {
    setDashboardToken((t) => t + 1);
    setView("dashboard");
  }

  if (view === "dashboard") {
    return <Dashboard onReopen={reopen} onNew={reset} refreshToken={dashboardToken} />;
  }

  if (view === "results" && result) {
    return (
      <>
        <ResultsLayout
          data={result}
          onHome={reset}
          onNewAnalysis={reset}
          onSignIn={() => setAuthOpen(true)}
          onDashboard={user ? goDashboard : undefined}
        />
        <AuthModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          reason="Sign in to unlock the full report — every clause, the document, benchmarks, and chat."
        />
      </>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <TopBar onSignIn={() => setAuthOpen(true)} onDashboard={user ? goDashboard : undefined} />
      <main className="flex-1 min-h-0 overflow-hidden">
        {view === "upload" && <UploadHero onSubmit={start} />}
        {view === "processing" && <Processing />}
      </main>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
