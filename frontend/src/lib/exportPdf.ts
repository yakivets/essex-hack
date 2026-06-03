import type { AnalysisResult, RiskLevel } from "./types";

type RGB = [number, number, number];

const BRAND: RGB = [37, 99, 235];
const TEXT: RGB = [11, 11, 15];
const MUTED: RGB = [75, 85, 99];
const TERTIARY: RGB = [156, 163, 175];
const RULE: RGB = [236, 236, 239];

function riskRGB(level: RiskLevel): RGB {
  if (level === "high") return [225, 29, 72];
  if (level === "medium") return [245, 158, 11];
  return [16, 185, 129];
}
function riskLabel(level: RiskLevel) {
  return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
}
function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Generate and download a branded PDF summary of the analysis. */
export async function exportPdf(data: AnalysisResult) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const need = (h: number) => {
    if (y + h > pageH - 56) {
      doc.addPage();
      y = margin;
    }
  };

  const body = (
    t: string,
    opts: { color?: RGB; size?: number; bold?: boolean; indent?: number; gap?: number } = {},
  ) => {
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? TEXT));
    const lines = doc.splitTextToSize(t, contentW - indent) as string[];
    for (const line of lines) {
      need(size + 4);
      doc.text(line, margin + indent, y);
      y += size + 4;
    }
    if (opts.gap) y += opts.gap;
  };

  const heading = (t: string) => {
    need(34);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND);
    doc.text(t.toUpperCase(), margin, y);
    y += 6;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BRAND);
  doc.text("PactPilot", margin, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TERTIARY);
  doc.text("Contract Review Summary", margin, y + 22);
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(dateStr, pageW - margin, y + 6, { align: "right" });
  y += 36;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageW - margin, y);
  y += 26;

  // ── Verdict ─────────────────────────────────────────────────────────────
  const v = data.verdict;
  doc.setFillColor(...riskRGB(v.risk_level));
  doc.roundedRect(margin, y - 14, 172, 22, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`${riskLabel(v.risk_level).toUpperCase()} RISK  ·  ${v.risk_score}/100`, margin + 12, y);
  y += 26;

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...TEXT);
  for (const line of doc.splitTextToSize(v.summary_line, contentW) as string[]) {
    need(20);
    doc.text(line, margin, y);
    y += 20;
  }
  y += 4;
  body(`Fairness: ${v.fairness.label}`, { color: MUTED });
  if (data.benchmark_summary) body(data.benchmark_summary, { color: MUTED });

  // ── Key points ──────────────────────────────────────────────────────────
  if (v.summary_bullets?.length) {
    heading("Key points");
    for (const b of v.summary_bullets) body(`•  ${b}`, { indent: 4 });
  }

  // ── Key facts ───────────────────────────────────────────────────────────
  const facts = Object.entries(data.key_facts).filter(([, val]) => val) as [string, string][];
  if (facts.length) {
    heading("Key facts");
    for (const [k, val] of facts) body(`${titleCase(k)}:  ${val}`);
  }

  // ── Red flags ───────────────────────────────────────────────────────────
  if (data.red_flags?.length) {
    heading(`Red flags (${data.red_flags.length})`);
    for (const f of data.red_flags) {
      need(24);
      doc.setFillColor(...riskRGB(f.severity));
      doc.circle(margin + 3, y - 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...TEXT);
      for (const line of doc.splitTextToSize(
        `${f.title}  (${riskLabel(f.severity)})`,
        contentW - 14,
      ) as string[]) {
        need(15);
        doc.text(line, margin + 12, y);
        y += 15;
      }
      body(f.explanation, { color: MUTED, indent: 12 });
      if (f.why_risky) body(`Why it matters: ${f.why_risky}`, { color: MUTED, indent: 12, gap: 6 });
    }
  }

  // ── Obligations ─────────────────────────────────────────────────────────
  if (data.obligations && (data.obligations.yours.length || data.obligations.theirs.length)) {
    heading("Obligations");
    if (data.obligations.yours.length) {
      body("You must", { bold: true });
      for (const o of data.obligations.yours) body(`•  ${o}`, { indent: 4 });
    }
    if (data.obligations.theirs.length) {
      body("They must", { bold: true, gap: 2 });
      for (const o of data.obligations.theirs) body(`•  ${o}`, { indent: 4 });
    }
  }

  // ── Money ───────────────────────────────────────────────────────────────
  if (data.money) {
    const m = data.money;
    heading("Money");
    if (m.total_value) body(`Total value:  ${m.total_value}`);
    if (m.payment_schedule) body(`Payment schedule:  ${m.payment_schedule}`);
    if (m.liability_cap) body(`Liability cap:  ${m.liability_cap}`);
    if (m.penalties?.length) {
      body("Penalties", { bold: true });
      for (const p of m.penalties) body(`•  ${p}`, { indent: 4 });
    }
  }

  // ── Exit ────────────────────────────────────────────────────────────────
  if (data.exit) {
    heading(`Exit — ${data.exit.difficulty}`);
    body(data.exit.summary, { color: MUTED });
    for (const t of data.exit.termination_terms) body(`•  ${t}`, { indent: 4 });
  }

  // ── Missing protections ─────────────────────────────────────────────────
  if (data.missing_clauses?.length) {
    heading("Missing protections");
    for (const mc of data.missing_clauses) {
      body(mc.name, { bold: true });
      body(mc.why_matters, { color: MUTED, indent: 4, gap: 4 });
    }
  }

  // ── Footer on every page ────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.8);
    doc.line(margin, pageH - 40, pageW - margin, pageH - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TERTIARY);
    doc.text(
      "Not legal advice — a first-pass review, not a lawyer. Generated by PactPilot.",
      margin,
      pageH - 26,
    );
    doc.text(`${i} / ${pages}`, pageW - margin, pageH - 26, { align: "right" });
  }

  doc.save("pactpilot-contract-review.pdf");
}
