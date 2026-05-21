// parse-pdr: unzip a .docx PDR, parse word/document.xml, return structured ParsedPdr JSON.
// No DB writes — caller (frontend) reviews then applies.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { BlobReader, ZipReader, TextWriter } from "https://deno.land/x/zipjs@v2.7.45/index.js";

type RatingCode = "E" | "G" | "M" | "NI";
type CompetencyName = "Thought" | "Results" | "Expertise" | "People" | "Self";

interface ParsedCompetency {
  competency_name: CompetencyName;
  rating_code: RatingCode | null;
  commentary: string;
}
interface ParsedDevPlanRow {
  objective: string;
  activities: string;
  support_resources: string;
  target_date: string | null;
}
interface ParsedPdr {
  bff_summary: string;
  performance_what_went_well: string;
  performance_what_could_go_better: string;
  performance_summary: string;
  career_aspirations_summary: string;
  current_year_rating_code: RatingCode | null;
  competencies: ParsedCompetency[];
  dev_plan: ParsedDevPlanRow[];
  warnings: string[];
}

const COMPETENCY_NAMES: CompetencyName[] = ["Thought", "Results", "Expertise", "People", "Self"];
const RATING_BY_COL: Record<number, RatingCode> = { 2: "E", 3: "G", 4: "M", 5: "NI" };

const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function paragraphText(pXml: string): string {
  // <w:t>...</w:t> runs concatenated, <w:br/> as newlines
  let out = "";
  const tokens = pXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:br\b[^\/]*\/>|<w:tab\b[^\/]*\/>/g);
  for (const m of tokens) {
    if (m[1] !== undefined) out += decodeEntities(m[1]);
    else if (m[0].startsWith("<w:br")) out += "\n";
    else if (m[0].startsWith("<w:tab")) out += "\t";
  }
  return out;
}

function cellText(tcXml: string): string {
  const ps = [...tcXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((m) => paragraphText(m[0]));
  return ps.join("\n").trim();
}

function rowCells(trXml: string): string[] {
  // top-level <w:tc> within this <w:tr>. Naive split is OK because cells aren't nested in rows.
  return [...trXml.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((m) => cellText(m[0]));
}

function tableRows(tblXml: string): string[][] {
  const trs = [...tblXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
  return trs.map(rowCells);
}

// Detect "X-in-cell": cell contains a non-empty mark (any non-whitespace).
// Also detect symbol/checkbox fallbacks.
function isMarked(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  // Common explicit marks
  if (/[xX✓✔☑☒]/.test(t)) return true;
  // Any other non-whitespace counts (typed mark like a dot, '*', etc.)
  return t.length > 0;
}

function detectCompetencyTable(rows: string[][]): CompetencyName | null {
  if (rows.length < 3 || rows[0].length < 6) return null;
  const name = rows[0][0]?.trim();
  if (!name) return null;
  const match = COMPETENCY_NAMES.find((n) => name.toLowerCase().includes(n.toLowerCase()));
  return match ?? null;
}

function parseCompetency(rows: string[][], name: CompetencyName): ParsedCompetency {
  // Row 2 = Reviewer row; cols 2..5 are rating cells
  const reviewerRow = rows[2] ?? [];
  let rating_code: RatingCode | null = null;
  for (let c = 2; c <= 5; c++) {
    if (isMarked(reviewerRow[c] ?? "")) {
      rating_code = RATING_BY_COL[c];
      break;
    }
  }
  // Row 4 = Reviewer commentary. Strip the leading "Reviewer Commentary:" label.
  const commentaryRow = rows[4] ?? [];
  const commentary = commentaryRow
    .filter((c) => c && c.trim())
    .join("\n")
    .trim()
    .replace(/^reviewer\s+commentary\s*:?\s*/i, "")
    .trim();
  return { competency_name: name, rating_code, commentary };
}

// Strict heading patterns — anchored to the start of a paragraph so guidance prose
// (e.g. "This section is an opportunity to explore overall performance...") is NOT
// treated as a heading.
const KNOWN_HEADING_PATTERNS: RegExp[] = [
  /^summary\s+of\s+overall\s+performance/i,
  /^overall\s+performance\s+summary/i,
  /^performance\s+summary/i,
  /^career\s+aspirations?/i,
  /^what\s+(has\s+)?gone\s+well/i,
  /^what\s+went\s+well/i,
  /^what\s+could\s+(have\s+)?gone?\s+better/i,
  /^what\s+could\s+go\s+better/i,
  /^(my\s+)?bigger,?\s*brighter\s*future/i,
  /^development\s+objectives?/i,
  /^professional\s+development/i,
  /^core\s+competenc(y|ies)/i,
  /^section\s+(one|two|three|four|five|1|2|3|4|5)\b/i,
  /^part\s+(one|two|three|1|2|3)\b/i,
  /^overall\s+rating/i,
  /^reviewer\s+commentary/i,
  /^reviewee\s+commentary/i,
];

// Template guidance prose — skipped when collecting the typed answer.
const GUIDANCE_PATTERNS: RegExp[] = [
  /^this\s+section\s+is\b/i,
  /^this\s+is\s+an\s+opportunity/i,
  /opportunity\s+to\s+(explore|discuss|reflect|consider)/i,
  /^please\s+(use|provide|reflect|consider|describe|note)/i,
  /^in\s+this\s+section/i,
  /^use\s+this\s+(section|space)/i,
];

function isKnownHeading(p: string): boolean {
  const t = p.trim();
  if (!t) return false;
  if (t.length > 120) return false;
  return KNOWN_HEADING_PATTERNS.some((r) => r.test(t));
}

function isGuidance(p: string): boolean {
  const t = p.trim();
  if (!t) return false;
  return GUIDANCE_PATTERNS.some((r) => r.test(t));
}

// Find a heading paragraph (strict match), then collect the answer that follows,
// skipping template guidance and stopping at the next known heading.
// If nothing usable is captured, return "" so the manager fills it in the modal.
function findAnswerAfterHeading(paragraphs: string[], headingRe: RegExp): string {
  for (let i = 0; i < paragraphs.length; i++) {
    const t = paragraphs[i].trim();
    if (!headingRe.test(t)) continue;
    if (!isKnownHeading(t)) continue; // must look like an actual heading
    const collected: string[] = [];
    const after = t.replace(headingRe, "").replace(/^[:\-\s]+/, "").trim();
    if (after && !isGuidance(after) && !isKnownHeading(after)) collected.push(after);
    for (let j = i + 1; j < paragraphs.length; j++) {
      const q = paragraphs[j].trim();
      if (!q) continue;
      if (isKnownHeading(q)) break;
      if (isGuidance(q)) continue;
      collected.push(q);
      if (collected.join(" ").length > 4000) break;
    }
    const result = collected.join("\n").trim();
    if (result) return result;
  }
  return "";
}

function parseDevPlan(tables: string[][][]): ParsedDevPlanRow[] {
  // Find a table whose header row mentions "Development Objectives" (or "Objective")
  for (const rows of tables) {
    if (rows.length < 2) continue;
    const header = rows[0].map((c) => c.toLowerCase());
    const hasObj = header.some((h) => /(development\s+)?objective/.test(h));
    const hasAct = header.some((h) => /activit/.test(h));
    if (!hasObj || !hasAct) continue;
    const out: ParsedDevPlanRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const objective = (r[0] ?? "").trim();
      if (!objective) continue;
      out.push({
        objective,
        activities: (r[1] ?? "").trim(),
        support_resources: (r[2] ?? "").trim(),
        target_date: normalizeDate((r[3] ?? "").trim()),
      });
    }
    if (out.length) return out;
  }
  return [];
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  // Try ISO first
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // DD/MM/YYYY or MM/DD/YYYY — store null if ambiguous; reviewer can fix in modal
  return null;
}

function deriveOverallRating(comps: ParsedCompetency[]): RatingCode | null {
  const order: RatingCode[] = ["NI", "M", "G", "E"];
  // Most frequent; tiebreak by highest in order
  const counts: Record<string, number> = {};
  for (const c of comps) if (c.rating_code) counts[c.rating_code] = (counts[c.rating_code] ?? 0) + 1;
  const keys = Object.keys(counts);
  if (!keys.length) return null;
  let best = keys[0];
  for (const k of keys) {
    if (counts[k] > counts[best] || (counts[k] === counts[best] && order.indexOf(k as RatingCode) > order.indexOf(best as RatingCode))) {
      best = k;
    }
  }
  return best as RatingCode;
}

async function unzipDocumentXml(bytes: Uint8Array): Promise<string> {
  const blob = new Blob([bytes]);
  const reader = new ZipReader(new BlobReader(blob));
  const entries = await reader.getEntries();
  const entry = entries.find((e) => e.filename === "word/document.xml");
  if (!entry) {
    await reader.close();
    throw new Error("Invalid .docx: word/document.xml not found");
  }
  const xml = await entry.getData!(new TextWriter());
  await reader.close();
  return xml as string;
}

function parseDocument(xml: string): ParsedPdr {
  const warnings: string[] = [];

  // All <w:tbl> in order
  const tblMatches = [...xml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)].map((m) => m[0]);
  const tables = tblMatches.map(tableRows);

  // All top-level paragraphs (best-effort: every <w:p> in the doc)
  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((m) => paragraphText(m[0]).trim()).filter(Boolean);

  // Competencies
  const competencies: ParsedCompetency[] = [];
  for (const rows of tables) {
    const name = detectCompetencyTable(rows);
    if (name && !competencies.find((c) => c.competency_name === name)) {
      competencies.push(parseCompetency(rows, name));
    }
  }
  for (const n of COMPETENCY_NAMES) {
    if (!competencies.find((c) => c.competency_name === n)) {
      competencies.push({ competency_name: n, rating_code: null, commentary: "" });
      warnings.push(`Competency "${n}" not found in document`);
    }
  }
  // Reorder to canonical
  competencies.sort((a, b) => COMPETENCY_NAMES.indexOf(a.competency_name) - COMPETENCY_NAMES.indexOf(b.competency_name));

  // Text fields — search both paragraphs AND table cells (firm template may embed them in tables)
  const cellTexts: string[] = [];
  for (const rows of tables) for (const r of rows) for (const c of r) if (c.trim()) cellTexts.push(c.trim());
  const searchPool = [...paragraphs, ...cellTexts];

  const bff_summary = findLabeledText(searchPool, /bigger,?\s*brighter\s*future|^\s*bff/i);
  const performance_what_went_well = findLabeledText(searchPool, /what\s+(has\s+)?gone\s+well|what\s+went\s+well/i);
  const performance_what_could_go_better = findLabeledText(searchPool, /what\s+could\s+(have\s+)?gone?\s+better|what\s+could\s+go\s+better/i);
  const performance_summary = findLabeledText(searchPool, /(summary\s+of\s+)?overall\s+performance|performance\s+summary/i);
  const career_aspirations_summary = findLabeledText(searchPool, /career\s+aspirations?/i);

  const dev_plan = parseDevPlan(tables);
  if (!dev_plan.length) warnings.push("No development plan rows detected");

  const current_year_rating_code = deriveOverallRating(competencies);

  return {
    bff_summary,
    performance_what_went_well,
    performance_what_could_go_better,
    performance_summary,
    career_aspirations_summary,
    current_year_rating_code,
    competencies,
    dev_plan,
    warnings,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ct = req.headers.get("content-type") ?? "";
    let bytes: Uint8Array;
    if (ct.includes("application/json")) {
      const body = await req.json();
      const b64 = body?.file_base64;
      if (typeof b64 !== "string" || !b64.length) {
        return new Response(JSON.stringify({ error: "file_base64 required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const bin = atob(b64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      const buf = await req.arrayBuffer();
      bytes = new Uint8Array(buf);
    }
    if (bytes.byteLength < 100) {
      return new Response(JSON.stringify({ error: "Empty or invalid file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const xml = await unzipDocumentXml(bytes);
    const parsed = parseDocument(xml);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-pdr error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Export for tests
export { parseDocument };
