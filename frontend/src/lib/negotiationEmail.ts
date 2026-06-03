import type { AnalysisResult, RedFlag } from "./types";

export type Tone = "collaborative" | "firm";

/** Turn one red flag into a concrete "ask", preferring the clause's suggested fix. */
function askFor(data: AnalysisResult, flag: RedFlag): string {
  const clause = data.clauses.find((c) => c.id === flag.clause_id);
  const fix = clause?.suggested_fix?.trim();
  if (fix) return `${flag.title} — ${fix}`;
  return `${flag.title} — please revise this clause. ${flag.explanation}`;
}

/**
 * Build a ready-to-send negotiation email entirely from the existing analysis
 * (no extra API call). Tone changes and flag selection are instant.
 */
export function buildNegotiationEmail(
  data: AnalysisResult,
  tone: Tone,
  includedFlagIds: string[],
): string {
  const flags = data.red_flags.filter((f) => includedFlagIds.includes(f.id));
  if (flags.length === 0) {
    return "Select at least one point to include in the email.";
  }

  const asks = flags.map((f, i) => `${i + 1}. ${askFor(data, f)}`).join("\n\n");

  if (tone === "firm") {
    return [
      "Subject: Required changes before signing",
      "",
      "Hello,",
      "",
      "Thank you for the proposed agreement. Before we can countersign, the following points need to be addressed:",
      "",
      asks,
      "",
      "Please send a revised version reflecting these changes, or let us know if any are not workable so we can discuss. We are unable to proceed until they are resolved.",
      "",
      "Regards,",
      "[Your name]",
    ].join("\n");
  }

  return [
    "Subject: A few points before we sign",
    "",
    "Hi there,",
    "",
    "Thanks for sending the agreement over — we're keen to move forward. Before signing, we'd like to align on a few points so the terms work well for both sides:",
    "",
    asks,
    "",
    "We're confident we can find wording that works for everyone, and we're happy to jump on a quick call if that's easier. Looking forward to getting this over the line.",
    "",
    "Best regards,",
    "[Your name]",
  ].join("\n");
}
