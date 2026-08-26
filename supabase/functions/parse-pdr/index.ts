// parse-pdr: unzip a .docx PDR, parse word/document.xml, return structured ParsedPdr JSON.
// No DB writes — caller (frontend) reviews then applies.
//
// Two parsers:
//  1. parseBryonDocument  — Clearhouse's real PDR format (11 tables, see below).
//  2. parseLegacyDocument — the earlier simplified template (kept for backward compat).
// parseDocument() sniffs the file and dispatches.

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
  employee?: { name: string; position: string };
  bff_summary: string;
  performance_what_went_well: string;
  performance_what_could_go_better: string;
  performance_summary: string;
  career_aspirations_summary: string;
  current_year_rating_code: RatingCode | null;
  current_year_rating?: number | null;
  competencies: ParsedCompetency[];
  dev_plan: ParsedDevPlanRow[];
  warnings: string[];
}

const COMPETENCY_NAMES: CompetencyName[] = ["Thought", "Results", "Expertise", "People", "Self"];
const RATING_BY_COL: Record<number, RatingCode> = { 2: "E", 3: "G", 4: "M", 5: "NI" };
const NUMERIC_BY_CODE: Record<RatingCode, number> = { E: 4.5, G: 3.5, M: 2.5, NI: 1.0 };

/* ------------------------------------------------------------------ */
/* XML helpers                                                         */
/* ------------------------------------------------------------------ */

const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function paragraphText(pXml: string): string {
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
  return [...trXml.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((m) => cellText(m[0]));
}

function tableRows(tblXml: string): string[][] {
  const trs = [...tblXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
  return trs.map(rowCells);
}

type Block = { kind: "table"; rows: string[][] } | { kind: "para"; text: string };

// Document-order blocks. A <w:tbl> starts before its inner paragraphs, so the
// alternation consumes the whole table and inner <w:p> are not emitted twice.
function documentBlocks(xml: string): Block[] {
  const out: Block[] = [];
  for (const m of xml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g)) {
    if (m[0].startsWith("<w:tbl")) out.push({ kind: "table", rows: tableRows(m[0]) });
    else {
      const t = paragraphText(m[0]).trim();
      if (t) out.push({ kind: "para", text: t });
    }
  }
  return out;
}

function isMarked(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (/[xX✓✔☑☒]/.test(t)) return true;
  return t.length > 0;
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Bryon (real Clearhouse) format parser                               */
/* ------------------------------------------------------------------ */

// Guidance / prompt prose that must never be captured as an answer.
const BRYON_GUIDANCE: RegExp[] = [
  /^consider different elements/i,
  /^how you have worked/i,
  /^do you feel/i,
  /^what has given you/i,
  /^this section is completed by/i,
  /^\(using bullet points/i,
  /^using bullet points/i,
  /^in this section,? describe/i,
  /^in preparation for/i,
  /^for example/i,
  /^instructions?\s*:/i,
  /^taking all the above/i,
  /^a needs improvement/i,
  /^what career growth/i,
  /^what specific skills/i,
  /^what knowledge or experience/i,
  /^are you looking/i,
  /^what is your career vision/i,
  /^what would you like to achieve/i,
  /^this section is an opportunity/i,
  /^please (use|provide|reflect|consider|describe|note)/i,
];

const BRYON_HEADINGS: RegExp[] = [
  /^employee profile\b/i,
  /^(my\s+)?bigger,?\s*brighter\s*future/i,
  /^section\s+(one|two|three|1|2|3)\b/i,
  /^what\s+has\s+gone\s+well/i,
  /^what\s+could\s+have\s+gone\s+better/i,
  /^career\s+aspirations?/i,
  /^professional\s+development/i,
  /^core\s+competenc(y|ies)/i,
  /^overall\s+(performance\s+)?rating/i,
  /^reviewee\s+commentary/i,
  /^reviewer\s+commentary/i,
  /^looking\s+(back|forward)\b/i,
];

const isBryonGuidance = (t: string) => BRYON_GUIDANCE.some((r) => r.test(t.trim()));
const isBryonHeading = (t: string) => {
  const s = t.trim();
  if (!s || s.length > 140) return false;
  return BRYON_HEADINGS.some((r) => r.test(s));
};

// Collect the answer paragraphs that follow a heading, skipping guidance/prompt
// bullets and stopping at the next heading. Returns "" when nothing usable.
function collectAnswer(paras: string[], headingRe: RegExp): string {
  for (let i = 0; i < paras.length; i++) {
    const t = paras[i].trim();
    if (!headingRe.test(t)) continue;
    const collected: string[] = [];
    const inline = t.replace(headingRe, "").replace(/^[:\-\s?]+/, "").trim();
    if (inline && !isBryonGuidance(inline) && !isBryonHeading(inline)) collected.push(inline);
    for (let j = i + 1; j < paras.length; j++) {
      const q = paras[j].trim();
      if (!q) continue;
      if (isBryonHeading(q)) break;
      if (isBryonGuidance(q)) continue;
      if (/^[?•\-–]+$/.test(q)) continue;
      if (q.endsWith("?") && q.length < 160) continue; // prompt question
      collected.push(q);
      if (collected.join(" ").length > 4000) break;
    }
    const result = collected.join("\n").trim();
    if (result) return result;
  }
  return "";
}

function looksLikeEmployeeTable(rows: string[][]): boolean {
  if (!rows.length) return false;
  const flat = rows.flat().join(" | ").toLowerCase();
  return /reviewee/.test(flat) && (/job\s*title/.test(flat) || /position/.test(flat) || /department/.test(flat));
}

function parseEmployeeTable(rows: string[][]): { name: string; position: string } {
  let name = "";
  let position = "";
  for (const r of rows) {
    for (let c = 0; c < r.length; c++) {
      const label = (r[c] ?? "").trim().toLowerCase().replace(/[:\s]+$/, "");
      const value = (r[c + 1] ?? "").trim();
      if (!value) continue;
      if (!name && /^reviewee(\s*name)?$/.test(label)) name = value;
      if (!position && /^(job\s*title|position|role)$/.test(label)) position = value;
    }
  }
  return { name, position };
}

function detectBryonCompetencyTable(rows: string[][]): CompetencyName | null {
  if (rows.length < 2 || (rows[0]?.length ?? 0) < 5) return null;
  const header = rows[0].map((c) => c.toLowerCase());
  const looksRating = header.some((h) => /excellent/.test(h)) || header.some((h) => /needs\s*improvement/.test(h));
  if (!looksRating) return null;
  const name = rows[0][0]?.trim() ?? "";
  return COMPETENCY_NAMES.find((n) => name.toLowerCase().includes(n.toLowerCase())) ?? null;
}

function parseBryonCompetency(rows: string[][], name: CompetencyName): ParsedCompetency {
  const counts: Partial<Record<RatingCode, number>> = {};
  const lines: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    for (let c = 2; c <= 5; c++) {
      if (isMarked(r[c] ?? "")) {
        const code = RATING_BY_COL[c];
        counts[code] = (counts[code] ?? 0) + 1;
        break;
      }
    }
    const textCells = [r[0], r[1], ...(r.slice(6) ?? [])].map((x) => (x ?? "").trim()).filter(Boolean);
    if (textCells.length) lines.push(textCells.join(" — "));
  }
  const order: RatingCode[] = ["NI", "M", "G", "E"];
  let rating_code: RatingCode | null = null;
  for (const code of Object.keys(counts) as RatingCode[]) {
    if (
      rating_code === null ||
      counts[code]! > counts[rating_code]! ||
      (counts[code] === counts[rating_code] && order.indexOf(code) > order.indexOf(rating_code))
    ) {
      rating_code = code;
    }
  }
  return { competency_name: name, rating_code, commentary: lines.join("\n").trim() };
}

// Overall-rating tables (Tables 8 & 9): rows labelled E / G / M / NI with an X.
function looksLikeOverallRatingTable(rows: string[][]): boolean {
  if (rows.length < 3) return false;
  const labels = rows.map((r) => (r[0] ?? "").trim().toLowerCase());
  const hits = labels.filter((l) => /^(e|g|m|ni)\b/.test(l) || /^(excellent|good|meets|needs)/.test(l)).length;
  return hits >= 3 && !detectBryonCompetencyTable(rows);
}

function rowLabelToCode(label: string): RatingCode | null {
  const l = label.trim().toLowerCase();
  if (/^ni\b/.test(l) || /^needs/.test(l)) return "NI";
  if (/^e\b/.test(l) || /^excellent/.test(l)) return "E";
  if (/^g\b/.test(l) || /^good/.test(l)) return "G";
  if (/^m\b/.test(l) || /^meets/.test(l)) return "M";
  return null;
}

function parseOverallRatingTable(rows: string[][]): RatingCode | null {
  for (const r of rows) {
    const code = rowLabelToCode(r[0] ?? "");
    if (!code) continue;
    for (let c = 1; c < r.length; c++) {
      const cellVal = (r[c] ?? "").trim();
      if (!cellVal) continue;
      // Skip descriptive prose cells; only accept short marks.
      if (cellVal.length <= 3 && isMarked(cellVal)) return code;
    }
  }
  return null;
}

function looksLikeDevPlanTable(rows: string[][]): boolean {
  if (rows.length < 2) return false;
  const header = rows[0].map((c) => c.toLowerCase());
  return header.some((h) => /objective/.test(h)) && header.some((h) => /activit/.test(h));
}

function parseBryonDevPlan(rows: string[][]): ParsedDevPlanRow[] {
  const out: ParsedDevPlanRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const objective = (r[0] ?? "").trim();
    const activities = (r[1] ?? "").trim();
    const support = (r[2] ?? "").trim();
    if (!objective && !activities && !support) continue;
    if (!objective) continue;
    if (/^\[fill in here\]$/i.test(objective)) continue;
    out.push({
      objective,
      activities,
      support_resources: support,
      target_date: normalizeDate((r[3] ?? "").trim()),
    });
  }
  return out;
}

function isBryonFormat(blocks: Block[]): boolean {
  const tables = blocks.filter((b) => b.kind === "table") as Extract<Block, { kind: "table" }>[];
  if (tables.length < 8) return false;
  if (!tables.some((t) => looksLikeEmployeeTable(t.rows))) return false;
  const comps = tables.filter((t) => detectBryonCompetencyTable(t.rows)).length;
  return comps >= 3;
}

function parseBryonDocument(blocks: Block[]): ParsedPdr {
  const warnings: string[] = [];
  const tables = blocks.filter((b) => b.kind === "table").map((b) => (b as { rows: string[][] }).rows);
  const paras = blocks.filter((b) => b.kind === "para").map((b) => (b as { text: string }).text);

  // Table 1 — employee info
  const empTable = tables.find(looksLikeEmployeeTable);
  const employee = empTable ? parseEmployeeTable(empTable) : { name: "", position: "" };
  if (!employee.name) warnings.push("Employee name not found in the header table");

  // Tables 3-7 — competencies
  const competencies: ParsedCompetency[] = [];
  for (const rows of tables) {
    const name = detectBryonCompetencyTable(rows);
    if (name && !competencies.find((c) => c.competency_name === name)) {
      competencies.push(parseBryonCompetency(rows, name));
    }
  }
  for (const n of COMPETENCY_NAMES) {
    if (!competencies.find((c) => c.competency_name === n)) {
      competencies.push({ competency_name: n, rating_code: null, commentary: "" });
      warnings.push(`Competency "${n}" not found in document`);
    }
  }
  competencies.sort((a, b) => COMPETENCY_NAMES.indexOf(a.competency_name) - COMPETENCY_NAMES.indexOf(b.competency_name));

  // Tables 8 & 9 — self assessment then reviewer assessment. The reviewer's is definitive.
  const ratingTables = tables.filter(looksLikeOverallRatingTable);
  let current_year_rating_code: RatingCode | null = null;
  if (ratingTables.length >= 2) {
    current_year_rating_code = parseOverallRatingTable(ratingTables[ratingTables.length - 1]);
  } else if (ratingTables.length === 1) {
    current_year_rating_code = parseOverallRatingTable(ratingTables[0]);
    warnings.push("Only one overall rating table found — used it as the reviewer rating");
  }
  if (!current_year_rating_code) warnings.push("Reviewer's overall rating not detected");

  // Table 10 — reviewee commentary (single-column free text block)
  let performance_summary = "";
  const commentaryTable = tables.find(
    (rows) =>
      rows.length <= 3 &&
      rows.every((r) => r.length <= 2) &&
      rows.flat().join(" ").trim().length > 0 &&
      !looksLikeDevPlanTable(rows) &&
      !looksLikeEmployeeTable(rows) &&
      !looksLikeOverallRatingTable(rows),
  );
  if (commentaryTable) {
    performance_summary = commentaryTable
      .flat()
      .map((c) => c.trim())
      .filter((c) => c && !/^reviewee\s+commentary:?$/i.test(c) && !/^\[fill in here\]$/i.test(c))
      .join("\n")
      .trim();
  }
  if (!performance_summary) warnings.push("Overall performance summary (Reviewee Commentary) not detected");

  // Table 11 — development plan
  const devTable = tables.find(looksLikeDevPlanTable);
  const dev_plan = devTable ? parseBryonDevPlan(devTable) : [];
  if (!dev_plan.length) warnings.push("No development plan rows detected");

  // Free-text sections from paragraphs
  const bff_summary = collectAnswer(paras, /^(my\s+)?bigger,?\s*brighter\s*future/i);
  const performance_what_went_well = collectAnswer(paras, /^what\s+has\s+gone\s+well/i);
  const performance_what_could_go_better = collectAnswer(paras, /^what\s+could\s+have\s+gone\s+better/i);
  const career_aspirations_summary = collectAnswer(paras, /^career\s+aspirations?/i);

  return {
    employee,
    bff_summary,
    performance_what_went_well,
    performance_what_could_go_better,
    performance_summary,
    career_aspirations_summary,
    current_year_rating_code,
    current_year_rating: current_year_rating_code ? NUMERIC_BY_CODE[current_year_rating_code] : null,
    competencies,
    dev_plan,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Legacy parser (earlier simplified template) — kept for compat        */
/* ------------------------------------------------------------------ */

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
  if (!t || t.length > 120) return false;
  return KNOWN_HEADING_PATTERNS.some((r) => r.test(t));
}

function isGuidance(p: string): boolean {
  const t = p.trim();
  if (!t) return false;
  return GUIDANCE_PATTERNS.some((r) => r.test(t));
}

function findAnswerAfterHeading(paragraphs: string[], headingRe: RegExp): string {
  for (let i = 0; i < paragraphs.length; i++) {
    const t = paragraphs[i].trim();
    if (!headingRe.test(t)) continue;
    if (!isKnownHeading(t)) continue;
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

function detectLegacyCompetencyTable(rows: string[][]): CompetencyName | null {
  if (rows.length < 3 || rows[0].length < 6) return null;
  const name = rows[0][0]?.trim();
  if (!name) return null;
  return COMPETENCY_NAMES.find((n) => name.toLowerCase().includes(n.toLowerCase())) ?? null;
}

function parseLegacyCompetency(rows: string[][], name: CompetencyName): ParsedCompetency {
  const reviewerRow = rows[2] ?? [];
  let rating_code: RatingCode | null = null;
  for (let c = 2; c <= 5; c++) {
    if (isMarked(reviewerRow[c] ?? "")) {
      rating_code = RATING_BY_COL[c];
      break;
    }
  }
  const commentaryRow = rows[4] ?? [];
  const commentary = commentaryRow
    .filter((c) => c && c.trim())
    .join("\n")
    .trim()
    .replace(/^reviewer\s+commentary\s*:?\s*/i, "")
    .trim();
  return { competency_name: name, rating_code, commentary };
}

function parseLegacyDevPlan(tables: string[][][]): ParsedDevPlanRow[] {
  for (const rows of tables) {
    if (!looksLikeDevPlanTable(rows)) continue;
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

function deriveOverallRating(comps: ParsedCompetency[]): RatingCode | null {
  const order: RatingCode[] = ["NI", "M", "G", "E"];
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

function parseLegacyDocument(blocks: Block[]): ParsedPdr {
  const warnings: string[] = [];
  const tables = blocks.filter((b) => b.kind === "table").map((b) => (b as { rows: string[][] }).rows);
  const paragraphs = blocks.filter((b) => b.kind === "para").map((b) => (b as { text: string }).text);

  const competencies: ParsedCompetency[] = [];
  for (const rows of tables) {
    const name = detectLegacyCompetencyTable(rows);
    if (name && !competencies.find((c) => c.competency_name === name)) {
      competencies.push(parseLegacyCompetency(rows, name));
    }
  }
  for (const n of COMPETENCY_NAMES) {
    if (!competencies.find((c) => c.competency_name === n)) {
      competencies.push({ competency_name: n, rating_code: null, commentary: "" });
      warnings.push(`Competency "${n}" not found in document`);
    }
  }
  competencies.sort((a, b) => COMPETENCY_NAMES.indexOf(a.competency_name) - COMPETENCY_NAMES.indexOf(b.competency_name));

  const cellTexts: string[] = [];
  for (const rows of tables) for (const r of rows) for (const c of r) if (c.trim()) cellTexts.push(c.trim());
  const searchPool = [...paragraphs, ...cellTexts];

  const bff_summary = findAnswerAfterHeading(searchPool, /^(my\s+)?bigger,?\s*brighter\s*future/i);
  const performance_what_went_well = findAnswerAfterHeading(searchPool, /^what\s+(has\s+)?gone\s+well|^what\s+went\s+well/i);
  const performance_what_could_go_better = findAnswerAfterHeading(searchPool, /^what\s+could\s+(have\s+)?gone?\s+better|^what\s+could\s+go\s+better/i);
  const performance_summary = findAnswerAfterHeading(searchPool, /^summary\s+of\s+overall\s+performance|^overall\s+performance\s+summary|^performance\s+summary/i);
  const career_aspirations_summary = findAnswerAfterHeading(searchPool, /^career\s+aspirations?/i);

  const dev_plan = parseLegacyDevPlan(tables);
  if (!dev_plan.length) warnings.push("No development plan rows detected");

  const current_year_rating_code = deriveOverallRating(competencies);

  return {
    bff_summary,
    performance_what_went_well,
    performance_what_could_go_better,
    performance_summary,
    career_aspirations_summary,
    current_year_rating_code,
    current_year_rating: current_year_rating_code ? NUMERIC_BY_CODE[current_year_rating_code] : null,
    competencies,
    dev_plan,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Dispatch + HTTP                                                     */
/* ------------------------------------------------------------------ */

function parseDocument(xml: string): ParsedPdr {
  const blocks = documentBlocks(xml);
  return isBryonFormat(blocks) ? parseBryonDocument(blocks) : parseLegacyDocument(blocks);
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
export { parseDocument, parseBryonDocument, parseLegacyDocument, documentBlocks };
