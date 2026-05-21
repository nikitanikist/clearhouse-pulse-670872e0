# PDR Auto-Populate — Technical Plan (v2)

## A) Parsing approach — Edge Function that unzips `.docx` and parses `word/document.xml`

Rejected alternatives:
- **mammoth.js (client)** — drops cell-level structure we need; ships a big parser to browser.
- **LLM extraction** — overkill for a fixed firm template; non-deterministic, costs per upload. Possible future fallback, not v1.

**Decision:** Deno edge function `parse-pdr` using `jsr:@zip-js/zip-js` to unzip the .docx and `deno-dom` to walk `word/document.xml`. Deterministic, free, server-side.

## B) Detecting the checked rating per competency table

**Confirmed from inspecting the real firm template:** there are NO real checkboxes (no `w:sdt`/`w14:checkbox`, no legacy `FORMCHECKBOX`, no ☐/☑/☒ glyphs, no Wingdings). Rating "boxes" are plain empty table cells; the reviewer types an `X` into the chosen cell.

**Primary detection (the path this template needs):**
For the Reviewer row of each competency table, read the 4 rating cells (Excellent / Good / Meets / Needs Improvement). The **first cell whose trimmed text is non-empty** wins. Typical content is `X`/`x`, but any non-whitespace counts (handles `✓`, `*`, etc.).

**Secondary fallbacks (kept for robustness against future edits):**
1. Content-control checkbox: `<w:sdt>` → `<w14:checkbox><w14:checked w14:val="1"/>`.
2. Legacy form field: `<w:checkBox>` with `<w:checked/>` inside `<w:ffData>`.
3. Symbol fallback: cell contains `☒`/`☑`/`✓`/`✔` or `<w:sym w:font="Wingdings" w:char="00FE"/>`.

If **zero or multiple** cells are marked, we return `rating: null` + an `ambiguous: true` flag so the review modal can highlight it for manager confirmation. Same logic reused for the overall performance rating.

## B.1) Exact competency table layout (confirmed via python-docx)

Each of the 5 tables is **5 rows × 6 cols**, in this fixed order: **Thought, Results, Expertise, People, Self**.

```
row0: [competencyName] [Rating]    [Excellent][Good][Meets][Needs Improvement]
row1: [competencyName] [Reviewee]  [ rating cells x4 ]
row2: [competencyName] [Reviewer]  [ rating cells x4 ]   ← parse for rating_code
row3: ["Reviewee Commentary:" + text spans the row]
row4: ["Reviewer Commentary:" + text spans the row]      ← parse for commentary
```

Identification: find the 5 tables whose row0 col0 matches one of the 5 competency names (case-insensitive). For each, read row2 cols 2..5 → rating, and row4 text after the `"Reviewer Commentary:"` label → commentary.

## C) Upload flow

1. Manager clicks **Upload PDR** in Overview → PDRs sub-section.
2. Client uploads to Storage at `pdr-documents/{employee_id}/{timestamp}_{filename}.docx`.
3. Client inserts a `pdr_documents` row (employee_id, file_path, file_name, file_size, uploaded_by = auth.uid()).
4. Client invokes edge function `parse-pdr` with `{ file_path }`. The function downloads via service-role, unzips, extracts a `ParsedPdr` JSON object, and **returns it** (no DB writes).
5. Client opens the Review modal (step D). Only **Apply** writes to `employees` / `employee_core_competencies` / `employee_dev_plan_rows`.

### Required RLS / policy migration (single migration)
- **Storage `pdr-documents` INSERT/UPDATE/DELETE** for `authenticated` where `(storage.foldername(name))[1]::uuid` belongs to an employee the caller `can_view_employee` of.
- **`pdr_documents` INSERT** for `authenticated` with the same employee-visibility check + `uploaded_by = auth.uid()`.
- **`employees` UPDATE** for `authenticated` where `can_view_employee(position)`.
- **`employee_core_competencies` INSERT + UPDATE** with the same check. (Verified: schema already has `UNIQUE(employee_id, competency_name)` — will NOT re-add.)
- **`employee_dev_plan_rows` INSERT + DELETE** with the same check (apply step deletes existing rows for that employee then re-inserts).

## D) UX — Review-before-Apply (no blind overwrite)

`<Dialog>` "Review extracted PDR data", sections mirror the template:

- **Performance text fields** — textareas pre-filled for `bff_summary`, `performance_what_went_well`, `performance_what_could_go_better`, `performance_summary`, `career_aspirations_summary`. Small "show current value" toggle per field.
- **Overall rating** — radio (E/G/M/NI). Yellow "couldn't auto-detect — please pick" banner if ambiguous.
- **5 Competencies** (Thought, Results, Expertise, People, Self) — each row: radio (E/G/M/NI) + commentary textarea; ambiguous radios pre-flagged.
- **Dev Plan** — editable table (add/remove rows) of `objective / activities / support_resources / target_date`.
- Footer: **Cancel** | **Apply to employee record** (primary).

Apply runs writes sequentially client-side. Cancel discards edits — file + `pdr_documents` row stay (the doc is still archived).

## E) Files to add / change

**New**
- `supabase/functions/parse-pdr/index.ts` — unzip + XML parse, returns `ParsedPdr`.
- `supabase/functions/parse-pdr/index_test.ts` — Deno test against the sample.
- `supabase/migrations/<ts>_pdr_upload_and_apply_policies.sql` — RLS policies above.
- `src/lib/pdr/types.ts` — shared `ParsedPdr` shape.
- `src/components/portal/pdr/PdrUploader.tsx` — drag/drop + upload + invoke parser.
- `src/components/portal/pdr/PdrReviewDialog.tsx` — review-before-apply modal.
- `src/components/portal/pdr/applyParsedPdr.ts` — client writer that fans out inserts/updates.

**Changed**
- `src/components/portal/tabs/Overview.tsx` — add **PDRs** sub-section: list `pdr_documents` for the employee + `<PdrUploader />`.

## F) Testing

Need **one filled sample PDR** using the real X-in-cell convention (you'll attach). The Deno test asserts the extracted `ParsedPdr` matches expected values: BFF text, both "Looking Back" answers, overall rating + summary, all 5 competency ratings + commentaries, career aspirations, dev plan rows.

Not blocking on a form-field variant (firm doesn't use them).

---

Reply **approve** + attach the sample to proceed.
