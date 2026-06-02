// AnalysisResult schema — field names must match API exactly.
export type RiskLevel = "high" | "medium" | "low";

export interface Sample {
  id: string;
  name: string;
  description: string;
}

export interface Clause {
  id: string;
  category: string;
  risk_level: RiskLevel;
  quote: string;
  plain_english: string;
  why_risky?: string;
  suggested_fix?: string;
  benchmark?: { percentile: number; typical: string };
}

export interface RedFlag {
  id: string;
  clause_id: string;
  title: string;
  severity: RiskLevel;
  explanation: string;
  why_risky: string;
}

export interface KeyFacts {
  parties?: string;
  term?: string;
  value?: string;
  auto_renewal?: string;
  notice?: string;
  governing_law?: string;
}

export interface Verdict {
  risk_score: number; // 0..100
  risk_level: RiskLevel;
  summary_line: string;
  summary_bullets: string[];
  fairness: { score: number; label: string }; // -1..1
}

export interface Obligations {
  yours: string[];
  theirs: string[];
}

export interface Money {
  total_value?: string;
  payment_schedule?: string;
  penalties?: string[];
  liability_cap?: string;
}

export interface KeyDate {
  label: string;
  date: string;
  type: string;
}

export interface Exit {
  difficulty: "easy" | "moderate" | "hard";
  summary: string;
  termination_terms: string[];
}

export interface MissingClause {
  name: string;
  why_matters: string;
}

export interface Scenario {
  question: string;
  answer: string;
}

export interface AnalysisDocument {
  html: string; // contains <span data-clause="id">...</span>
}

export interface AnalysisResult {
  id: string;
  verdict: Verdict;
  benchmark_summary?: string;
  key_facts: KeyFacts;
  red_flags: RedFlag[];
  clauses: Clause[];
  document: AnalysisDocument;
  obligations?: Obligations;
  money?: Money;
  dates?: KeyDate[];
  exit?: Exit;
  missing_clauses?: MissingClause[];
  scenarios?: Scenario[];
}

export interface ChatCitation {
  clause_id: string;
  quote: string;
}

export interface ChatResponse {
  answer: string;
  citations: ChatCitation[];
}

export type AnalyzeInput =
  | { kind: "file"; file: File }
  | { kind: "text"; text: string }
  | { kind: "sample"; sampleId: string };
