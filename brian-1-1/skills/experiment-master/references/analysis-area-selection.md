# Read setup questions: analysis areas and target audience (asked before a full read starts)

Before a user-origin FULL_EXPERIMENT_READ starts any work, the Master asks which analysis areas the user wants in the
read. The user can pick any set or pick all. This changes only which capabilities run; it changes no request, statistic,
classification or contract. Owner: Rajeswari.

## The areas

The areas are the capabilities of `capability-registry.md`, named for the user in plain words:

| Area (what the user sees) | Capability id | Covers |
|---|---|---|
| Revenue | `revenue` | Rev/DAU, revenue by type, ad impressions, eCPM |
| Rolling retention | `retention` | Rolling D1 and D3 |
| Engagement | `engagement` | Clear/DAU and the other actions per DAU, puzzle types |
| Sessions | `sessions` | Sessions/DAU, session time |
| Classic retention | `classic_retention` | D1, D7 ... by install date |
| LTV and LTDays | `ltv_ltdays` | LTV and active days per install |
| Rolling LTV | `rolling_ltv` | Forward rolling LTV |
| Economy | `economy` | In-game cash earned, spent, purchased; earners and spenders |

That is eight areas. The wording shown to the user is the first column; ids never appear in the question.

## When it is asked

- **Asked:** a user-origin FULL_EXPERIMENT_READ (Template A, Detailed Read or Standard) with no area named in the request.
- **Not asked, all areas run:** the request already says "everything", "all metrics" or "full read" in plain words, or the
  read is unattended / scheduled (state "all areas" at the top of the answer and proceed).
- **Not asked, the named areas run:** the request names areas or metrics (TARGETED_DIAGNOSIS: `domain_ref` is the
  selection) or a `segment_ref`. PERIOD_IMPACT_ANALYSIS and any stream-origin request never ask.
- **Once per read.** The choice is reused if the same experiment is read again in the session, unless the user changes it.

It is asked straight after the experiment is confirmed (`experiment-confirmation.md`; that step may run only the bounded `CANDIDATES` probe) and before any analysis query, so no budget is spent on an area the user does not want.

## How it is asked

One `AskUserQuestion` call that shows all eight areas and the "all" choice together, with no second round:

1. "Which analysis areas should this read include?" (single choice): **All 8 areas (Recommended)** or **Only the areas ticked below**.
2. "Revenue, retention, engagement, sessions" (multi-select): Revenue, Rolling retention, Engagement, Sessions.
3. "Install-date and economy" (multi-select): Classic retention, LTV and LTDays, Rolling LTV, Economy.
4. "Fetch experiment data only from Druid?" (single choice): **Yes, Druid only (Recommended)** or **No, Druid first, Trino allowed too**. See § Data source below.

The question tool allows four options per question and four questions per call, so the eight areas are split across questions 2 and 3 and the data-source question is question 4 of the same
call. If question 1 is "All 8 areas", questions 2 and 3 are ignored. If it is "Only the areas ticked below", the ticked
areas are the selection; ticking nothing is read as all. When `AskUserQuestion` is not available, ask in plain text with the
numbered list of areas above and "reply with the numbers, or `all`". The question states the trade-off once: fewer areas
means a shorter read.

## Data source: Druid only (question 4 of the areas call)

Every experiment statement runs on Druid (`experiment.*`). The user can switch that off; Yes is the default.

- **Yes, Druid only (Recommended, default).** Every statement of the read, in every capability and every worker, runs on Druid
  through the Druid tools. Nothing is run on Trino or any other engine. If Druid cannot be reached (tool missing, repeated
  connection or authorization failure), the affected unit is `BLOCKED` with reason `DRUID_UNAVAILABLE`; no other engine
  is substituted, and the user is told and offered the "No" choice for a re-run.
- **No, Druid first, Trino allowed too.** Druid stays the first engine for every statement. The Trino MCP
  (`mcp__trino-mcp__execute_query`, catalog `delta`, tables qualified `schema.table`) may be used for a statement only when
  the table is not in Druid or Druid has failed for it. Before the first Trino statement for a table, `get_table_schema`
  confirms the table and columns exist; a table that does not exist in Trino either is `NOT_IN_TABLE`. SQL is read-only.
- **One engine per result.** A single result (one cell, one metric, one pair) is computed entirely from one engine; rows from
  Druid and Trino are never mixed inside one statistic or one daily series.
- **Logged and labelled.** `queries.log` carries the engine of every statement (`druid` or `trino`). A result that came from
  Trino is named in Method ("Data from Trino: <tables>") and in the progress table; the default read shows nothing extra
  because every statement is Druid.
- **Not covered.** The annotation read (`play_data.charts_annotations`, Databricks only, `annotations.md`) and the
  `chart_config` version lookup are not experiment data and keep their own engine. When the read touches them, Method says
  so once ("Annotations read from Databricks").
- **Not asked, Yes applies:** the request already says Druid only or names Trino, or the read is unattended, scheduled,
  stream-origin, or the question tool is unavailable (a user-stated "use Trino" sets No; otherwise Yes). Stored as
  `data_source: {druid_only: true | false, basis: ASKED | USER_NAMED | DEFAULT}` and passed to every worker in its request.

## Target audience (asked straight after the areas)

The audience is optional. Right after the areas, one `AskUserQuestion` call with a single question asks whether the user wants the data at any filter or cut. It is asked in the same cases as the area question and skipped when the request already says (a `segment_ref` such as "new users only", or "all users").

1. **Do you want to see the data at any filter or cut (user type, payer status, cohorts)?** (single choice): **No, all users (Recommended)** · **Yes, pre-select it on the dashboard and lead with it; the read stays for all users** · **Yes, run the entire read for that cut only**.

"No" ends the setup: no `target_audience` is stored (`basis: ALL_DEFAULT`) and nothing about the read or the dashboard changes. Only on a "Yes" does a second `AskUserQuestion` call follow, with three single-choice questions, each with the default first. The first answer decides `apply`: the pre-select choice is `LENS`, the entire-read choice is `SCOPE`.

1. **User type:** All users, new and old (Recommended) · New users only (installed during the test) · Old users only (installed before the test).
2. **Payer status:** All, payers and non-payers (Recommended) · Payers only · Non-payers only.
3. **Cohorts (days since install):** All cohorts (Recommended) · Only recent installs, D00 to D30 · Only older cohorts, D31 and later. The "Other" box takes specific cohorts, for example "D02-D07, D08-D14".

If all three are "all", the "Yes" is read as "No". Without the question tool, ask the same in plain text (the filter question first, the three only after a yes). No answer is read as all users.

The answer is stored as `target_audience: {user_type?, payer?, cohorts[]?, label, apply: LENS | SCOPE, basis: ASKED | USER_NAMED | ALL_DEFAULT}` in `request.extracted`. It is the owner's statement, taken as given and never verified against the experiment's own configuration; if the context shows a different population (`MasterState.context` Population), say so in one line. **`apply = LENS` (the default, "pre-select"):** a focus lens, not a filter or a re-scope. Whole-scope results, PAB and every statistic are unchanged and still shown. What it changes:

- **Analysis.** The audience's cut is a Part 1 Stage 2 item (user-type, payer and cohort cuts are default cuts already, so usually no extra statement). Nothing is dropped.
- **Chat Summary.** When the audience is not all users, one extra column block "Target audience: <label>" follows the all-users block, filled from stored cells for a single cut (one user type, one payer status, or one cohort). A combined or multi-cohort audience is shown on the dashboard only (the page computes it), and the Summary says so in one line.
- **Verdict.** The Recommendation and Primary metric rows state the result for the target audience first, then the all-users result, as separate statements (never mixed in one sentence).
- **Dashboard.** An `audience` dataset (one row: `u`, `p`, `c`, `label`) makes the Summary table's controls open on the target audience, with a "Target audience" button and "Reset (all users)" beside them (`dashboard.md`). The Experiment card gets a "Target audience" row ("stated by the owner").

**`apply = SCOPE` ("the entire read for this audience"):** the audience is passed on as the request's `segment_ref`, in the user's own terms (for example "new users, user_type new", "payers", "cohorts D02-D07 and D08-D14"), and goes through the existing path unchanged: `protocols/context-resolution.md` step 2b resolves it to the canonical scope, lens `L1`, and it is never broadened or replaced by an overall read. Mode routing is unchanged (`SKILL.md` rule 2: an experiment with a `segment_ref` is TARGETED_DIAGNOSIS, D2 by default; the user can ask for a deeper read in words as always). The selected areas all run inside the scope; a dimension an area cannot be scoped to is returned as unsupported and shown as such, never dropped and never replaced by an unscoped figure. Everything in the report and dashboard is then for that audience only, and its label is in the title, the Experiment card and the Summary heading. No `audience` dataset is written (nothing opens "on" a cut because everything is that cut). The scoped run is not tested end to end in this plugin version; the Master states the scope once at the top of the answer.

## What the selection changes

- **Dispatch.** Only selected capabilities are dispatched. Each unselected one is recorded `SKIPPED_NOT_SELECTED` with
  reason `USER_SELECTION` and is never dispatched, probed for coverage or charged to the budget. Every other
  rule (version semantics, `SKIPPED_NOT_AUTO_SELECTED`, `NOT_IN_TABLE`) applies unchanged to the selected ones.
- **Budget.** The totals are unchanged and spent only on selected areas; the unused part of an unselected area's slice is
  not reassigned, so a smaller read is also a cheaper one. Part 1 / Part 2 (`two-part-read.md`) run exactly as before, over
  the selected areas.
- **Progress table.** Unselected areas show as `SKIPPED` ("not selected") and add no time to the estimate
  (`progress-table.md`).
- **Chat report and dashboard.** Everything that needs an unselected area is left out, with its state named in Guardrails
  ("Not checked: <areas>, not selected") and in Method, never shown as a gap in the data:
  Verdict rows, headline tiles, Summary-table groups and rows, Matrix groups and Appendix rows that only an unselected area
  can fill. The Summary table's segment options use the `x_*` datasets of the selected areas only (`x_dau`, the
  denominator, is built whenever any `x_*` is). A section whose data comes from unselected areas only is omitted.
- **No other change.** Nothing from a selected area is altered by what was not selected; PAB, meaningfulness and Conf are
  per result as always.

## Adding areas later

If the user later asks for an area that was not selected, it is a `USER_REQUESTED` run of that area over the stored
context (no context resolution again), and the dashboard is republished at the same URL with the new rows (the page body
is generated per read). The ledger keeps both runs.

## Never

Never run a Trino statement when `data_source.druid_only` is true; never start any analysis query before the choice is made (or the "not asked" rule applies); never describe a read as complete when
areas were not selected; never drop an area the user ticked; never treat the choice as a depth change; never use a target audience with `apply = LENS` to filter, re-scope or hide a result, and never run a scoped read unless the user chose "the entire read for this audience".
