// Generates a .docx PDR template matching the structure the parse-pdr edge
// function expects. Run in the browser; returns a Blob ready to download.
//
// Parser-critical constraints baked in here (do NOT change without re-checking
// supabase/functions/parse-pdr/index.ts):
//  - Each competency is its OWN table whose row 0, cell 0 holds the competency
//    name; row 2 cells 2..5 are the rating cells (E/G/M/NI) the reviewer marks;
//    row 4 holds the reviewer commentary. detectCompetencyTable requires
//    rows[0].length >= 6 and rows.length >= 3.
//  - Free-text answer headings must match the parser's KNOWN_HEADING_PATTERNS
//    exactly at the start of the paragraph ("What Has Gone Well", "What Could
//    Have Gone Better", "Summary of Overall Performance", "Bigger, Brighter
//    Future", "Career Aspirations").
//  - The development plan table header row must contain "Objective(s)" and
//    "Activities"; data rows put the objective in column 0.

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const FONT = "Arial";
const PRIMARY = "0072BC";
const HEADER_SHADE = "D9E2F3";

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function run(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({
    text,
    bold: opts.bold,
    italics: opts.italics,
    size: opts.size ?? 22, // 11pt
    font: FONT,
    color: opts.color,
  });
}

function para(children: TextRun[], opts: { align?: Align; spacing?: number; heading?: typeof HeadingLevel.HEADING_1 } = {}) {
  return new Paragraph({
    alignment: opts.align,
    heading: opts.heading,
    spacing: { after: opts.spacing ?? 140 },
    children,
  });
}

function plain(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; color?: string; align?: Align; spacing?: number } = {}) {
  return para([run(text, opts)], { align: opts.align, spacing: opts.spacing });
}

function blank(spacing = 120) {
  return new Paragraph({ spacing: { after: spacing }, children: [] });
}

function cell(text: string, opts: { bold?: boolean; shading?: string; width: number; align?: Align }) {
  return new TableCell({
    borders: cellBorders,
    width: { size: opts.width, type: WidthType.DXA },
    margins: cellMargins,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: opts.align, children: [run(text, { bold: opts.bold })] })],
  });
}

// One competency table. Row 0 = name + rating headers; row 2 = reviewer mark
// cells (cols 2..5 = E/G/M/NI, left blank); row 4 = reviewer commentary.
function competencyTable(name: string): Table {
  const cols = [1700, 1500, 600, 600, 600, 600, 3300];
  const total = cols.reduce((a, b) => a + b, 0);
  const spacerCells = () => cols.map((w) => cell("", { width: w }));
  const headerCells = [
    cell(name, { bold: true, shading: HEADER_SHADE, width: cols[0] }),
    cell("Rating (mark X)", { bold: true, shading: HEADER_SHADE, width: cols[1] }),
    cell("E", { bold: true, shading: HEADER_SHADE, width: cols[2], align: AlignmentType.CENTER }),
    cell("G", { bold: true, shading: HEADER_SHADE, width: cols[3], align: AlignmentType.CENTER }),
    cell("M", { bold: true, shading: HEADER_SHADE, width: cols[4], align: AlignmentType.CENTER }),
    cell("NI", { bold: true, shading: HEADER_SHADE, width: cols[5], align: AlignmentType.CENTER }),
    cell("Reviewer Commentary", { bold: true, shading: HEADER_SHADE, width: cols[6] }),
  ];
  const reviewerCells = [
    cell("Reviewer rating", { width: cols[0] }),
    cell("", { width: cols[1] }),
    cell("", { width: cols[2], align: AlignmentType.CENTER }),
    cell("", { width: cols[3], align: AlignmentType.CENTER }),
    cell("", { width: cols[4], align: AlignmentType.CENTER }),
    cell("", { width: cols[5], align: AlignmentType.CENTER }),
    cell("", { width: cols[6] }),
  ];
  const commentaryCells = [
    cell("", { width: cols[0] }),
    cell("", { width: cols[1] }),
    cell("", { width: cols[2] }),
    cell("", { width: cols[3] }),
    cell("", { width: cols[4] }),
    cell("", { width: cols[5] }),
    cell("[Fill in here]", { width: cols[6] }),
  ];
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({ tableHeader: true, children: headerCells }),
      new TableRow({ children: spacerCells() }),
      new TableRow({ children: reviewerCells }),
      new TableRow({ children: spacerCells() }),
      new TableRow({ children: commentaryCells }),
    ],
  });
}

function devPlanTable(): Table {
  const cols = [2400, 2400, 2400, 1600];
  const total = cols.reduce((a, b) => a + b, 0);
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell("Development Objectives", { bold: true, shading: HEADER_SHADE, width: cols[0] }),
      cell("Activities to Undertake", { bold: true, shading: HEADER_SHADE, width: cols[1] }),
      cell("Support & Resources Needed", { bold: true, shading: HEADER_SHADE, width: cols[2] }),
      cell("Target Date", { bold: true, shading: HEADER_SHADE, width: cols[3] }),
    ],
  });
  const blankRow = () => new TableRow({ children: cols.map((w) => cell("", { width: w })) });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: cols,
    rows: [header, blankRow(), blankRow(), blankRow()],
  });
}

function infoLine(label: string) {
  return para([run(`${label}: `, { bold: true }), run("_______________________________")], { spacing: 80 });
}

function sectionHeading(text: string) {
  return para([run(text, { bold: true, size: 26, color: PRIMARY })], { heading: HeadingLevel.HEADING_1, spacing: 120 });
}

const COMPETENCIES = ["Thought", "Results", "Expertise", "People", "Self"] as const;

export async function generatePdrTemplate(): Promise<Blob> {
  const children: Array<Paragraph | Table> = [];

  // Header
  children.push(
    para([run("Performance Development Review", { bold: true, size: 36, color: PRIMARY })], { align: AlignmentType.CENTER, spacing: 60 }),
  );
  children.push(plain("Clearhouse LLP — Employee Portal Template", { align: AlignmentType.CENTER, color: "555555", spacing: 240 }));

  // Employee information
  children.push(sectionHeading("Employee Information"));
  children.push(infoLine("Employee Name"));
  children.push(infoLine("Position"));
  children.push(infoLine("Department"));
  children.push(infoLine("Review Period"));
  children.push(infoLine("Reviewer / Supervisor"));
  children.push(blank());

  // Section 1: Current Year Performance Rating (decorative — overall rating is
  // derived from competency ratings by the parser, but kept for human context).
  children.push(sectionHeading("Section 1: Current Year Performance Rating"));
  children.push(plain("Overall Rating (E / G / M / NI): _____"));
  children.push(plain("Rating Description: _____"));
  children.push(plain("Numeric Rating (0-5): _____"));
  children.push(blank());

  // Section 2: Overall Performance — free-text. Heading + inline placeholder on
  // the same line (the parser captures the text after the heading) plus a blank
  // paragraph for writing room.
  children.push(sectionHeading("Section 2: Overall Performance"));
  children.push(plain("What Has Gone Well: [Fill in here]"));
  children.push(blank());
  children.push(plain("What Could Have Gone Better: [Fill in here]"));
  children.push(blank());
  children.push(plain("Summary of Overall Performance: [Fill in here]"));
  children.push(blank());

  // Section 3: Core Competency Ratings — one table per competency.
  children.push(sectionHeading("Section 3: Core Competency Ratings"));
  children.push(plain("Core Competencies", { bold: true }));
  for (const name of COMPETENCIES) {
    children.push(competencyTable(name));
    children.push(blank(80));
  }

  // Section 4: Bigger, Brighter Future — heading paragraph (matches parser
  // pattern) followed by the fill-in answer paragraph.
  children.push(sectionHeading("Section 4: Bigger, Brighter Future (BFF)"));
  children.push(plain("Bigger, Brighter Future"));
  children.push(plain("[Fill in here]"));
  children.push(blank());

  // Section 5: Career Aspirations
  children.push(sectionHeading("Section 5: Career Aspirations"));
  children.push(plain("Career Aspirations"));
  children.push(plain("[Fill in here]"));
  children.push(blank());

  // Section 6: Professional Development Plan
  children.push(sectionHeading("Section 6: Professional Development Plan"));
  children.push(plain("Professional Development Plan Summary"));
  children.push(plain("[Fill in here]"));
  children.push(blank());
  children.push(devPlanTable());
  children.push(blank());

  // Section 7: Potential Rating (decorative — not parsed by parse-pdr).
  children.push(sectionHeading("Section 7: Potential Rating"));
  children.push(plain("Potential Rating (Well Placed / Ready Now / Ready Soon / Ready Later): _____"));
  children.push(blank(240));

  // Footer
  children.push(plain("Once filled, upload this file in the employee's Overview → PDRs section of the portal.", { italics: true, color: "777777" }));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: FONT, color: PRIMARY }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
