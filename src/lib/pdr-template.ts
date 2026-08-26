// Generates a .docx PDR template matching Clearhouse's real PDR structure
// (the "Bryon" format) that the parse-pdr edge function parses automatically.
//
// Parser-critical constraints (do NOT change without re-checking
// supabase/functions/parse-pdr/index.ts):
//  - Table 1 must contain the labels "Reviewee" and "Job Title" with the value
//    in the cell immediately to the right.
//  - Each competency is its own table whose row 0 is
//    [{Competency}, Rating, Excellent, Good, Meets, Needs Improvement];
//    data rows are success factors, with the X mark placed in columns 2..5.
//  - Two overall-rating tables follow the competencies (reviewee first, then
//    reviewer). Each has 4 rows whose first cell is E / G / M / NI; the mark
//    goes in a short cell on that row. The LAST of the two is definitive.
//  - The reviewee commentary table is a single-column table (max 3 rows).
//  - The development plan table header must contain "Objectives" and
//    "Activities"; data rows put the objective in column 0.
//  - Free-text headings must read exactly: "My Bigger, Brighter Future",
//    "What has gone well?", "What could have gone better?",
//    "Career Aspirations".

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
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
    size: opts.size ?? 22,
    font: FONT,
    color: opts.color,
  });
}

function para(children: TextRun[], opts: { align?: Align; spacing?: number } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 140 },
    children,
  });
}

function plain(
  text: string,
  opts: { bold?: boolean; italics?: boolean; size?: number; color?: string; align?: Align; spacing?: number } = {},
) {
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

function tableOf(cols: number[], rows: string[][], opts: { headerBold?: boolean } = {}): Table {
  const total = cols.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: cols,
    rows: rows.map(
      (r, i) =>
        new TableRow({
          tableHeader: i === 0 && opts.headerBold,
          children: cols.map((w, c) =>
            cell(r[c] ?? "", {
              width: w,
              bold: i === 0 && opts.headerBold,
              shading: i === 0 && opts.headerBold ? HEADER_SHADE : undefined,
              align: i === 0 && opts.headerBold && c >= 2 ? AlignmentType.CENTER : undefined,
            }),
          ),
        }),
    ),
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [run(text, { bold: true, size: 26, color: PRIMARY })],
  });
}

/* ---------------------------------------------------------------- */

const COMPETENCIES: { name: string; factors: string[] }[] = [
  { name: "Thought", factors: ["Strategic perspective", "Problem solving & judgement", "Innovation & improvement"] },
  { name: "Results", factors: ["Delivery & accountability", "Quality of work", "Commercial awareness"] },
  { name: "Expertise", factors: ["Technical knowledge", "Applying expertise", "Continuous learning"] },
  { name: "People", factors: ["Collaboration & teamwork", "Communication", "Coaching & developing others"] },
  { name: "Self", factors: ["Self-awareness", "Resilience & adaptability", "Professionalism & integrity"] },
];

const RATING_ROWS: [string, string][] = [
  ["E", "Excellent — consistently exceeds expectations"],
  ["G", "Good — frequently exceeds expectations"],
  ["M", "Meets — performs to the standard expected"],
  ["NI", "Needs Improvement — below the standard expected"],
];

function employeeTable(): Table {
  return tableOf(
    [1900, 3200, 1900, 3200],
    [
      ["Reviewee", "", "Job Title", ""],
      ["Department", "", "Location", ""],
      ["Reviewer", "", "Review Date", ""],
    ],
  );
}

function ratingLegendTable(): Table {
  return tableOf(
    [900, 2400, 6900],
    [
      ["Rating", "Label", "Description"],
      ...RATING_ROWS.map(([code, desc]) => [code, desc.split(" — ")[0], desc.split(" — ")[1] ?? ""]),
    ],
    { headerBold: true },
  );
}

function competencyTable(name: string, factors: string[]): Table {
  const cols = [3000, 1400, 1400, 1200, 1200, 2000];
  const rows: string[][] = [[name, "Rating", "Excellent", "Good", "Meets", "Needs Improvement"]];
  for (const f of factors) rows.push([f, "", "", "", "", ""]);
  return tableOf(cols, rows, { headerBold: true });
}

function overallRatingTable(who: string): Table {
  return tableOf(
    [900, 6600, 2700],
    [
      ["Rating", "Description", `${who} mark (X)`],
      ...RATING_ROWS.map(([code, desc]) => [code, desc, ""]),
    ],
    { headerBold: true },
  );
}

function commentaryTable(): Table {
  return tableOf([10200], [["[Fill in here]"]]);
}

function devPlanTable(): Table {
  const cols = [2800, 2800, 2800, 1800];
  return tableOf(
    cols,
    [
      ["Objectives", "Activities", "Support / Resources Needed", "Target Date"],
      ["", "", "", ""],
      ["", "", "", ""],
      ["", "", "", ""],
    ],
    { headerBold: true },
  );
}

export async function generatePdrTemplate(): Promise<Blob> {
  const children: Array<Paragraph | Table> = [];

  children.push(
    para([run("Performance Development Review", { bold: true, size: 36, color: PRIMARY })], {
      align: AlignmentType.CENTER,
      spacing: 60,
    }),
  );
  children.push(plain("Clearhouse LLP", { align: AlignmentType.CENTER, color: "555555", spacing: 240 }));

  // 1. Employee Profile
  children.push(sectionHeading("Employee Profile"));
  children.push(employeeTable());
  children.push(blank());

  // 2. Rating legend (ignored by the parser)
  children.push(plain("Rating Scale", { bold: true }));
  children.push(ratingLegendTable());
  children.push(blank());

  // 3. Bigger, Brighter Future
  children.push(sectionHeading("My Bigger, Brighter Future"));
  children.push(plain("In this section, describe the ambition you are working towards.", { italics: true, color: "777777" }));
  children.push(plain("[Fill in here]"));
  children.push(blank());

  // 4. Section One: Looking Back
  children.push(sectionHeading("Section One: Looking Back"));

  children.push(plain("What has gone well?", { bold: true }));
  children.push(
    plain("Consider different elements of your role, the impact you have had and what you are most proud of.", {
      italics: true,
      color: "777777",
    }),
  );
  children.push(plain("[Fill in here]"));
  children.push(blank());

  children.push(plain("What could have gone better?", { bold: true }));
  children.push(
    plain("Do you feel there are areas where a different approach would have led to a better outcome?", {
      italics: true,
      color: "777777",
    }),
  );
  children.push(plain("[Fill in here]"));
  children.push(blank());

  // 5. Core competencies
  children.push(sectionHeading("Core Competencies"));
  children.push(
    plain("Mark X in one rating column for each success factor.", { italics: true, color: "777777" }),
  );
  for (const c of COMPETENCIES) {
    children.push(competencyTable(c.name, c.factors));
    children.push(blank(80));
  }

  // 6. Overall rating
  children.push(sectionHeading("Overall Performance Rating"));
  children.push(plain("Reviewee's assessment", { bold: true }));
  children.push(overallRatingTable("Reviewee"));
  children.push(blank(100));
  children.push(plain("Reviewer's assessment", { bold: true }));
  children.push(overallRatingTable("Reviewer"));
  children.push(blank());

  // 7. Reviewee commentary → becomes the overall performance summary
  children.push(plain("Reviewee Commentary", { bold: true }));
  children.push(commentaryTable());
  children.push(blank());

  // 8. Section Two: Looking Forward
  children.push(sectionHeading("Section Two: Looking Forward"));
  children.push(plain("Career Aspirations", { bold: true }));
  children.push(
    plain("What career growth are you looking for over the next one to three years?", { italics: true, color: "777777" }),
  );
  children.push(plain("[Fill in here]"));
  children.push(blank());

  // 9. Professional Development Planning
  children.push(sectionHeading("Professional Development Planning"));
  children.push(devPlanTable());
  children.push(blank(240));

  children.push(
    plain("Template based on Clearhouse's standard PDR — matches the format our system parses automatically.", {
      italics: true,
      color: "777777",
    }),
  );

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: FONT, color: PRIMARY },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
