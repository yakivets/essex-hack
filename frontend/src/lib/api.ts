import type { AnalysisResult, AnalyzeInput, ChatResponse, Sample } from "./types";
import { mockAnalysis, mockSamples } from "./mockAnalysis";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const useMock = !BASE;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getSamples(): Promise<Sample[]> {
  if (useMock) {
    await wait(150);
    return mockSamples;
  }
  const res = await fetch(`${BASE}/api/samples`);
  if (!res.ok) throw new Error("Failed to load samples");
  return res.json();
}

export async function analyze(input: AnalyzeInput): Promise<AnalysisResult> {
  if (useMock) {
    await wait(2600);
    return mockAnalysis;
  }
  const form = new FormData();
  if (input.kind === "file") form.append("file", input.file);
  if (input.kind === "text") form.append("text", input.text);
  if (input.kind === "sample") form.append("sample_id", input.sampleId);
  const res = await fetch(`${BASE}/api/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Failed to analyze contract");
  return res.json();
}

export async function getAnalysis(id: string): Promise<AnalysisResult> {
  if (useMock) {
    await wait(100);
    return mockAnalysis;
  }
  const res = await fetch(`${BASE}/api/analysis/${id}`);
  if (!res.ok) throw new Error("Failed to load analysis");
  return res.json();
}

export async function chat(
  analysisId: string,
  message: string,
  clauseId?: string,
): Promise<ChatResponse> {
  if (useMock) {
    await wait(900);
    const clause = clauseId ? mockAnalysis.clauses.find((c) => c.id === clauseId) : undefined;
    return {
      answer: clause
        ? `On the ${clause.category.toLowerCase()} clause: ${clause.plain_english} ${clause.why_risky ?? ""}`.trim()
        : `Here's what stands out: ${mockAnalysis.verdict.summary_line} ${mockAnalysis.verdict.summary_bullets[0]}.`,
      citations: clause
        ? [{ clause_id: clause.id, quote: clause.quote }]
        : [{ clause_id: "c2", quote: mockAnalysis.clauses.find((c) => c.id === "c2")!.quote }],
    };
  }
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysis_id: analysisId, message, clause_id: clauseId }),
  });
  if (!res.ok) throw new Error("Chat failed");
  return res.json();
}
