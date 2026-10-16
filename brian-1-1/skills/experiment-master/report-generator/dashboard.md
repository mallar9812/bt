# Dashboard — always built, before the chat Verdict

Product decision (owner: Rajeswari): every experiment read that gets a chat report also gets the
interactive dashboard. It is the last report-generator step (step 7 of `report-generator.md`) and is
presentation only, exactly like steps 1–6. Its look, wording and reading rule are the accepted reference
reads (`references/experiment-read-ui-spec.md`); its code is shipped in `assets/` and is reused, not rebuilt.

## When it runs

| Request | Dashboard |
|---|---|
| User-origin read, Template A (Standard Experiment Read or Detailed Read) | **Always** |
| User-origin read, Template B (Targeted Diagnosis) | **Always** |
| Template C (PERIOD), Template D (metric investigation), any stream-origin request | Not built. The UI spec describes one experiment-version read; these keep their existing formats. |
| A read with no computed result at all (every unit `NOT_TESTED`, `UNRESOLVED` or `NOT_IN_TABLE`) | Not built; the chat report names why, per `output-format.md`. |

The user does not need to ask, and the High-level / Detailed wording question (`report-generator.md`
step 1a) does not gate it. It only shapes the chat report. The dashboard always carries the complete
record, i.e. the Detailed Read content, **built in two parts** (§ Two parts).

## Two parts

The read is delivered in two parts, always (`references/two-part-read.md`). The dashboard follows it:

- **Part 1** creates and publishes the dashboard with every section outside the Appendix (Experiment card, Headline
  results, Verdict, Users, Puzzle types, Guardrails, Summary) and its datasets (`experiment_card`,
  `results`, `puzzle`, `x_*`, `p_*`, `cells` limited to the rows those sections read, `run_state` with
  `part2 = RUNNING`). The Appendix shows its "Part 2 is running" notice and no tables.
- **Part 2** updates the same artifact (same `url`) by writing the remaining datasets (`cells` in full, `trends`,
  `trend_pab`) and setting `run_state` to `COMPLETE`. The page is not republished: it only reads datasets.
- The chat is short: after the dashboard is published it carries only the Verdict and the dashboard link (Part 1), and one closing line when Part 2 fills the Appendix (Part 2).
- The § Checks run on Part 1 (items about the Appendix are checked after Part 2) and again after Part 2; a dashboard
  that fails a check is not published or updated.

## Units

One dashboard (one artifact) per experiment-version on one platform, titled
`exp name | cli (Android/iOS) | version` (`experiment-read-ui-spec.md` § 1). Several named experiments,
versions or platforms give several dashboards, side by side in the answer, never pooled. A TARGETED read
builds the same page with the sections its scope supports; a section with no evidence is left out
(SR-26) but every non-computed state is still named.

## Inputs and what it never does

- Inputs are the stored `result_ledger`, `analysis_responses`, `MasterState.context`, `visual_requirements`
  / `VisualEvidence` and the display tiers of `evidence-selection.md`, i.e. what steps 1–6 already used.
  The same records feed the chat report and the dashboard, so the two never disagree.
- Issues no query. Recomputes no statistic, PAB value, interval or classification **in the Master**; the one
  exception is the page-side recompute in § Recompute rule. Fills no missing value. Unavailable values keep
  their status and reason and are never shown as zero or as `—`.
- Numbers shown on the page are bound to the stored fields (live data marks), never typed from prose.
- Follows every "What it never does" rule of `report-generator.md`: no analyst commentary beyond the
  verdict rows of `evidence-selection.md`, no causal language, "variant" and never "arm" in page text, var1
  is never called "control" unless the experiment has a real control, no invented user inputs.

## Precedence over the UI spec

`references/experiment-read-ui-spec.md` is the layout and look. Where it differs from an accepted contract,
the contract wins (`report-generator.md` § UI specification). Nothing in the spec is overridden any more
except one item, settled here:

- **Header and Method** state the stable window, `NOT_TESTED`, `BLOCKED`, `NOT_IN_TABLE`, `CONFIG_REQUIRED`
  and `UNCONFIRMED` items unchanged (nothing dropped silently, spec § 3.7).

The Recommendation row is built (§ Verdict rows), the reading is the PAB-adjusted Conf reading of
`master-state.md` § Results and meaningfulness, and the reader labels are Upside / Downside / Neutral with
the class in the tooltip.

## Compulsory rules

Every rule on this page is compulsory for every dashboard, not a preference. The ones below are the design and
verdict rules that produced the accepted dashboard; a dashboard that breaks any of them is not published.

1. **Assets verbatim.** `assets/page.css`, the generated body in the shape of `assets/page.body.example.html`
   and `assets/page.js`, with only the per-experiment constants set. No redesign, no retyped number: every
   value is a mark bound to a dataset field.
2. **Fixed section order and ids** (spec § 4): Experiment card, Headline results, Verdict, Users, Puzzle types, Guardrails, Summary (the segment options live in it; there is no separate explorer section), then the collapsed Appendix (Matrix, Trends, Drill-down, Every
   result, Method).
3. **Standard headline set** (§ Headline tiles), which always includes Clear/DAU.
4. **Nine Verdict rows, no Scope row** (§ Verdict rows). Windows, reference variant, PAB window, versions and
   annotation status live in the Experiment card and Method only.
5. **Optional section.** "New users by days since install" is optional. It ships hidden behind a prompt card
   ("Do you want to see it?" with a "Yes, show it" button) and is shown only after the viewer says yes.
6. **Appendix variant pair in the row header.** In "All cells" and "Every result" every row shows the variant
   pair in its row header (`<metric> · var2 vs var1`); there is no separate Pair or variant column.
7. **Wording.** "variant", never "arm", in page text and in dataset text (the Experiment card rows included);
   var1 is never called "control" unless it is one. Reading labels are only Upside / Downside / Neutral, with the
   class in tooltips; † on every observed-only value.
8. **No silent drops.** A result or state that is not computed is named in Guardrails and Method.

### How a verdict is reached

The Verdict is reached the same way every time, from recorded results only, and it never orders a ship or kill:

1. Classify each whole-scope result on its PAB-adjusted effect (observed minus old-user share × PAB; observed with † where there is no PAB) with the line of `master-state.md` § Results and meaningfulness: 1% relative, 10 bps for
   retention; the whole interval beyond the line is meaningful; Conf above 85% then size decides; otherwise
   insufficient evidence; net cash is not classified.
2. Fix the primary metric: the one the user named, otherwise inferred from the test type and labelled
   (`evidence-selection.md` § Primary metric).
3. Tier every result (`evidence-selection.md` § Tiers) and order it (§ Order).
4. Fill the nine rows in order (§ Verdict rows) from those results; a row with no result is left out, never
   replaced by a placeholder; a row is about one cut or section only; each number appears once.
5. Set each chip by the rule of `evidence-selection.md`, never by wording.
6. Compose the Recommendation last, from rows 2 to 8 only: one headline sentence, then one close of the form
   "If <goal A> is the goal, <variant> is <upside | a marginal upside | not supported>; if <goal B> is the
   goal, ...". It adds no number or claim that is not in those rows and gives no cause.
7. Set the What to discount row to the first caveat that applies (`evidence-selection.md` § Caveat).
8. A range that spans zero is worded "a lack of evidence, not evidence of no effect".

## Build

1. **Create from the Dashboard artifact type.** Call the Artifact tool with `action: "quickstart"` (intent
   `other`, `design_systems: false`) once, or publish with the `type_url` it lists for Dashboard and the
   title; follow that type's own instructions for the store (`dash/meta`, `datasets/<id>`, `files/index.html`).
   The page is one file, `files/index.html`, at most 256 KB. Do not verify by rendering or browsing unless
   the user asks.
2. **Datasets before the page, as one bundle.** Write each dataset of § Datasets as `<id>.json` (a list of rows) in a
   folder, run `python3 scripts/build_bundle.py <folder> <out>`, upload `bundle.json` once (`upload_asset`, up to 8 MB; a second
   file `bundle2.json` only when the builder makes one) and write one `datasets/bundle` document with `source.kind = file`
   (and `datasets/bundle2` if any). Every row carries `_ds`, the dataset id; the page splits the rows back
   (`ok()` in `assets/page.js`) and still reads everything through `dash.data` / `dash.onData`. A read built the older way
   (one document per dataset) still renders: `ok()` falls back to it when there is no `bundle`. Write the bundle document
   and `files/index.html` in one `ArtifactData` batch, so the whole publish is: create from type, one upload, one batched write.
3. **Page from the shipped assets.** `files/index.html` = `<style>` + `assets/page.css` verbatim, the body
   generated for this experiment in the shape of `assets/page.body.example.html`, and `<script>` +
   `assets/page.js` verbatim with its per-experiment constants set (`assets/README.md`). Never retype a
   number: every value, pill and prose number is a mark with `data-source`, `data-field` and `data-where`
   that `fillMarks` fills from the dataset.
4. **Sections in the spec's fixed order and ids** (§ 4): header, Experiment card, Headline results,
   Verdict (+ "What was tested" / "What to discount, and why" cards), Users, Puzzle types, Guardrails, Summary (the segment options live in it; there is no separate explorer section), then the collapsed Appendix (Matrix first, Trends, Drill-down, Every result,
   Method). The headline tile set is the standard set until the user defines another (spec § 4.3); the optional "New users by days since install" card ships hidden behind its prompt; the appendix tables carry the variant pair in the row header. Headers,
   cuts and metric rows come from the data of this experiment, never hard-coded.
5. **Interactivity** as the spec defines it (nav with scroll-spy, selects, date range, filters, sortable
   tables, the Summary table's segment options, collapsible sections). A control is built only if the stored data can drive it; otherwise it is left
   out. Never describe a control, dark mode or explorer that the page does not actually have.
6. **Charts** are the `VisualEvidence` of `charts.md` rendered by the page (line charts of actual daily
   reference and variant values, spec § 5). No series returned means the summary state `charts.md` names,
   not an empty chart.
7. **Checks before publishing** (§ Checks), then **publish** as a private page (Part 1; Part 2 updates its datasets in place, § Two parts) (the user shares it if they
   want). A rerun of the same experiment-version updates the same artifact (same `url`) instead of creating
   a new one. If the Artifact tool is unavailable, deliver the self-contained HTML with `SendUserFile` and
   say so in one line.

## Datasets

All are built from stored records by the report-generator, one row per stored row, nothing computed.
Field lists are in `assets/README.md`.

| Dataset | Content | Source records |
|---|---|---|
| `results` | Every whole-scope result: reference, comparator, observed, PAB, adjusted value and effect, Conf, p, paired units, class (observed) and class (adjusted). | `result_ledger` with `pab[].adjusted` and `meaningfulness` |
| `cells` | Every breakdown cell × metric × pair, default cuts: install cohort, user type, payer status. | `result_ledger` cells (`analysis-contract.md` § Default cut set) |
| `puzzle` | Puzzle type × pair: share of clears, adjusted effect, contribution; overall row. Engagement only. | engagement response |
| `trends`, `trend_pab` | Daily numerators and denominators per metric for the reference and each comparator; the baseline and its half-width per metric and pair. | `VisualEvidence`, `pab[]` |
| `x_dau`, `x_rev`, `x_eng`, `x_sess`, `x_rr`, `x_econ` | Daily cross-cut rows of the test window. | the capabilities' daily series at the default cut set |
| `p_dau`, `p_rev`, `p_eng`, `p_sess`, `p_rr`, `p_econ` | The same rows for the PAB window. | the PAB statements (`analysis-contract.md` § PAB adjustment) |
| `experiment_card` | The Experiment card rows, including Population, Meaningfulness line, PAB window, Primary metric. | `MasterState.context`, `report-templates.md` card |
| `run_state` | One row, `part2` = `RUNNING` / `COMPLETE` / `PARTIAL` and an optional `note`: the two-part marker (§ Two parts). | the Master's two-part run state |

A dataset the stored records cannot fill is not written, and the page section it drives is left out with the
state named. The segment options need `x_dau` and at least one other `x_*`; without them the Summary table shows all users only and the "New users by days since install" card is not built and the Matrix and cells tables carry the cut view.

## Recompute rule

The dashboard follows the exception in `report-generator.md`: the **page** (never the Master) recomputes the
PAB-adjusted effect, its interval and Conf for the Summary table's segment options and the "New users by days since install" card (from `x_*` and `p_*`) and for the Trends
readout of a chosen date range, with exactly the rule of `master-state.md` § Results and meaningfulness
(`confOf` / `classify` in `assets/page.js`). Everything else on the page is read from `results`, `cells` and
`puzzle` as stored.

## Headline tiles

- **Standard set** (until the user defines another): Rev/DAU (all revenue), **Clear/DAU**, banner impressions/DAU,
  W2E impressions/DAU, session time/DAU, rolling D1, classic D1, classic D7, LTV D7, LTDays D7. Clear/DAU is
  always a headline tile.
- **Big number** = the PAB-adjusted change versus the reference, in % (basis points for retention); the
  observed value with † where PAB is not available. A tile never shows the absolute value of the metric.
- **Pill** beside it = Upside ↑ / Downside ↓ / Neutral (class in the tooltip). No Conf on the tile; Conf and the
  delta are in the Summary and the full results table. "Insufficient evidence" is a Neutral pill whose
  tooltip names the class.
- **Comparison rule.** The reference is the control when the experiment has one, otherwise the
  lowest-numbered variant (`var1`). One row per comparator: every other variant against the reference. The
  reference itself gets no row. With a real control and three variants the rows are `var1`, `var2`, `var3`
  versus control; with no control and variants `var1`, `var2`, `var3` the rows are `var2` and `var3`
  versus `var1`. The tile name line and the sub-line under Headline results name the reference
  ("vs var1").
- Big numbers stay ink-coloured even when meaningful; the pill has no background inside tiles; Neutral is
  plain muted text (`experiment-read-ui-spec.md` § 6).

## Verdict rows

The Verdict section is the nine disclosure rows of `evidence-selection.md` § Verdict rows, in that order, each a
bold one-sentence summary plus a chip, with the numbers as bound marks:

1. **Recommendation** (`Decision`, open): opens with "Recommendation:" and is goal-conditional (what to ship
   to, what to hold, for the stated goal), then the Decision. A goal the owner has not stated is shown as the
   inferred primary metric and says so (`evidence-selection.md` § Primary metric).
2. **Primary metric** (`Lift` / `Flat` / `Watch`, open).
3. **Value of the installs** (LTV, LTDays, rolling LTV).
4. **Mechanism** (what moved in the puzzle split; engagement only).
5. **New users** (`user_type = new`), 6. **Old users** (`user_type = old`) (one cut each).
7. **Revenue guardrail**, 8. **In-game economy**.
9. **What to discount** (`Caution`: the PAB population caveat, small cells, exposure ramp, spiky metrics).

There is no Scope row (and no scope sentence inside the Recommendation row): windows, reference variant, PAB
window, versions and annotation status are in the Experiment card and Method.

Chips are the spec's set; a chip is chosen by the rule of `evidence-selection.md`, never by wording. A row
whose evidence does not exist is left out and its state is named in Guardrails and Method.

## Checks

Before publishing (spec § 8, plus the new ones). Fix and re-check; do not publish a page that fails.

1. No empty value marks (`—`) anywhere; every pill matches its numbers; † on every observed-only value.
2. Section order, nav links and ids exactly as in spec § 4; Matrix first in the appendix.
3. No two cuts or metric types mixed in a statement or table.
4. Every headline tile follows § Headline tiles: change not value, reference row absent, pill labels only
   Upside / Downside / Neutral, comparison rule applied.
5. The Recommendation row is present and opens with "Recommendation:".
6. With every cut value selected, the Summary table's segment options reproduce the overall and user-type numbers of
   `results` (same effect, same Conf, same label). A mismatch means a dataset is wrong: fix it, do not hide
   the segment options.
7. Reading labels: no result shows a label other than Upside / Downside / Neutral on the page; the class
   appears only in tooltips and the "Every result" table.
8. Page text has "variant", never "arm"; var1 is not called "control" unless it is one.
9. Page size at most 256 KB; datasets attached; the page reads only datasets that exist.
10. Headline set includes Clear/DAU; the Verdict has no Scope row.
11. "New users by days since install" is hidden behind its prompt card until the viewer clicks yes.
12. "All cells" and "Every result" have no Pair column; each row header reads `<metric> · var2 vs var1`.
13. "All cells" and "Every result" carry two dropdown checklist menus above the table (`#dt-pick`, `#res-pick`, built by `fieldPicker`): Variants (All variants plus one checkbox per variant pair) and Fields (All fields plus one checkbox per field), each closing on an outside click or Escape. All variants are on by default; the default fields are Capability (Every result only), Exp change and % change (PAB-adj.), and the rest are off until ticked. Fields: var1 (reference), Comparator, Exp change (the observed effect, never called "Observed" in a header), PAB, Delta (PAB-adj.), % change (PAB-adj.), Conf, p, paired units (DAU-days in All cells), PAB status, and Capability in Every result. There is no Reading column: the reading of the observed effect sits next to the Exp change value (`expCell`) and the PAB-adjusted reading next to the % change value (`pctCell`).
14. The Matrix is one table with one line per selected variant under each metric (row header `<metric> · var2 vs var1`) a Variants dropdown and a multi-select Metric groups dropdown. All metric groups are selected by default, so the Matrix opens with every group together, each group's metrics contiguous under its own group heading row (the heading row is shown always, also when one group is selected); never one matrix per variant.
15. No "arm" in dataset text (Experiment card rows included) or page text.

17. Datasets are bundled (`datasets/bundle`, `bundle2` only above 7 MB) and every row has `_ds`; `run_state` is a dataset inside the bundle, not a separate document.
16. `run_state` exists; Part 1 publishes it as `RUNNING`, Part 2 sets it to `COMPLETE` (or `PARTIAL` with the missing items in `note`). The Appendix is never shown built from Part 1's partial `cells`.

18. Every section heading collapses and expands its section (`initCollapse`); the Experiment card ships collapsed (`class="collapsed"` on `#sec-card`); "Collapse all sections" / "Expand all sections" sit under the header; a nav click expands its target (and opens the Appendix when the target is inside it).
19. Header: the visible text is "All effects are PAB-adjusted" and "Scope", both underlined; the rest of each sentence is the hover/focus tooltip (`.hv`). Headline results: only "† = observed, PAB not available" is visible; the other bullets sit in the "i" hover button on the heading.
20. User-type wording: "new users" always means `user_type = new` and "old users" always means `user_type = old`; the word "established" is never used for a user type. The "New users by days since install" card says `user_type = new` (tag and label) and is computed on the page from `x_*` with `u = new`, observed †.
21. There is no Segment explorer section or "Explore" nav link. The Summary table starts as the stored all-users table; its controls are four dropdown checklists with everything ticked by default, Cohort (with All, None and installed in / existed before the read window presets), User type (New users = `user_type new`, Old users = `user_type old`), Payer flag and Metrics (the metric groups), plus Reset (and "Target audience" when an audience is set). There is no Split across control. A subset of Cohort, User type or Payer flag shows the recomputed table; a subset of Metrics also filters the stored all-users table. Any non-default state hides the stored table and shows the recomputed one, with a "Showing: …" line and a note that classic retention, LTV, LTDays and rolling LTV are not cut by segment.

## Target audience

When the owner stated a target audience (`references/analysis-area-selection.md`), the read writes an `audience` dataset (one row: `u` = `new` / `old` / empty, `p` = `payer` / `non_payer` / empty, `c` = comma-separated cohort values or empty, `label`) and a "Target audience (stated by the owner)" row in the Experiment card. The page then opens the Summary table's controls on that audience, shows a note ("a statement of who the experiment is for, not a filter"), and offers a "Target audience" button and "Reset (all users)". No audience dataset means the page opens on all users. With `apply = LENS` the audience never changes a stored number or hides a result. With `apply = SCOPE` there is no `audience` dataset: the whole page is for that audience, labelled in the title, the Experiment card and the Summary heading.

## Variant dots

Every variant has its own colored dot wherever it is named in a header or tile row, not only var1 and var2: the page gives `th[data-arm=varN]` and `.tile .row[data-arm=varN] .arm` the color `--cN` (N = 1 to 8, taken from the host palette, with fixed fallbacks), and the reference column (`th[data-ref]`) the color of var1. With several variants the generated body has one column or row per pair ("var3 vs var1", "var4 vs var1") each with `data-arm="varN"`, and the Summary table's recomputed view and the "New users by days since install" card show one column (or one table) per pair.

## Unselected analysis areas

When the user chose a subset of areas (`references/analysis-area-selection.md`), the generated body omits every tile, Verdict row, Summary-table group, Matrix group and section that only an unselected area can fill, and names them once in Guardrails ("Not checked: …, not selected"). A page with an empty (—) mark because an area was not selected fails check 1.

22. With several variants, every variant pair header, tile row and trend line has its own distinct dot color; the reference column has var1's dot.
23. With an `audience` dataset the Summary table opens on it and Reset returns the stored all-users table; without one it opens on all users.

## Answer shape

Two deliveries (`references/two-part-read.md`), the dashboard always first. **Part 1:** once the dashboard is published, the
chat carries the Verdict only (`report-generator.md` § Chat answer when a dashboard is built), then one sentence that names the
dashboard and says Part 2 is running; nothing else. **Part 2:** one sentence saying the dashboard's Appendix is filled in
(reload it if it still shows "Part 2 is running"). The chat never repeats the dashboard's contents.
