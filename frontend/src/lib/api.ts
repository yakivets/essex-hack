import type {
  AnalysisResult,
  AnalysisSummary,
  AnalyzeInput,
  AuthResponse,
  ChatResponse,
  Sample,
  User,
} from "./types";
import { mockAnalysis, mockSamples } from "./mockAnalysis";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const useMock = !BASE;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Auth token plumbing ---
// The auth context owns the token (localStorage) and pushes it here so every
// request can attach `Authorization: Bearer <token>` without prop-drilling.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...(extra ?? {}) };
  if (authToken) h.Authorization = `Bearer ${authToken}`;
  return h;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.detail === "string") return body.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

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
  // Auth header lets the backend fall back to the DB (owner-checked) when the
  // in-memory cache has expired — needed to reopen a saved dashboard contract.
  const res = await fetch(`${BASE}/api/analysis/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load analysis");
  return res.json();
}

// --- Auth ---
export async function register(email: string, password: string): Promise<AuthResponse> {
  if (useMock) {
    await wait(300);
    return { token: "mock-token", user: { id: "mock", email } };
  }
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res, "Registration failed"));
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (useMock) {
    await wait(300);
    return { token: "mock-token", user: { id: "mock", email } };
  }
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res, "Login failed"));
  return res.json();
}

export async function getMe(): Promise<User> {
  if (useMock) {
    await wait(100);
    return { id: "mock", email: "demo@pactpilot.ai" };
  }
  const res = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

// --- Dashboard / history ---
export async function getAnalyses(): Promise<AnalysisSummary[]> {
  if (useMock) {
    await wait(150);
    return [];
  }
  const res = await fetch(`${BASE}/api/analyses`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load saved analyses");
  return res.json();
}

export async function saveAnalysis(analysisId: string): Promise<AnalysisSummary> {
  if (useMock) {
    await wait(150);
    return {
      id: analysisId,
      filename: "Contract",
      contract_type: "Contract",
      risk_score: mockAnalysis.verdict.risk_score,
      risk_level: mockAnalysis.verdict.risk_level,
      created_at: new Date().toISOString(),
    };
  }
  const res = await fetch(`${BASE}/api/analyses`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ analysis_id: analysisId }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to save analysis"));
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
