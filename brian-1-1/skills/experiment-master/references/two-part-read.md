# Two-part read (standing behaviour)

Every user-origin FULL_EXPERIMENT_READ (Template A, Detailed Read or Standard) and TARGETED_DIAGNOSIS that gets a
dashboard is run in **two parts**, always, in either dispatch mode, and **both parts always run**: Part 2 starts by itself
as soon as Part 1 is delivered, with no question asked and no pause for the user. Only an explicit instruction from the
user to stop ends the read after Part 1. Part 1 delivers everything that sits outside the
dashboard's Appendix, as the Summary, as soon as it is ready. Part 2 then runs a second pass for the rest: the
Appendix and the detailed read. It changes when things are delivered and in what order work is spent. It changes
no request, response, statistic, classification, budget total or contract.

Owner: Rajeswari. Not applied to PERIOD_IMPACT_ANALYSIS, Template D or any stream-origin request (they have no
dashboard). A TARGETED read runs both parts with the sections its scope supports.

## What belongs to which part

| | Part 1: "the summary" | Part 2: "the detailed read" |
|---|---|---|
| Dashboard sections | Experiment card, Headline results, Verdict, Users, Puzzle types, Guardrails, Summary (with its user-type, payer and cohort options) | the collapsed Appendix: Matrix, Trends, Drill-down, All cells, Every result, Method |
| Datasets | `experiment_card`, `results`, `puzzle`, `x_*`, `p_*`, `run_state`, and `cells` limited to the rows the non-appendix marks read | `cells` in full, `trends`, `trend_pab`, `run_state` set to complete |
| Analysis | Stage 1 of every selected capability (whole-scope result and its PAB); the Stage 2 items that feed the Part 1 sections (below) | every remaining Stage 2 item (full default cut set), Stage 3+ and follow-ups |
| Chat | the **Verdict** only (`template-population.md` § Verdict composition), then one line naming the dashboard and saying Part 2 is running; the Summary table and every other section are on the dashboard, not in chat | one line: the dashboard's Appendix is filled in; nothing else is added to the chat |

**Part 1 Stage 2 items** (the ones that feed non-appendix marks; each capability's analysis file already names the
cut and the statement):

1. the user-type cut (new / old users) for the metrics the Verdict rows 5 and 6 and the Users section show, (the optional "New users by days since install" card is computed on the page from the `x_*` data with `user_type = new`);
2. Engagement's puzzle-type split (Puzzle types section and the Mechanism row);
3. the daily cross-cut series of the test window and of the PAB window that feed the Summary table's segment options and the "New users by days since install" card
   (`x_dau`, `x_rev`, `x_eng`, `x_sess`, `x_rr`, `x_econ` and the matching `p_*`).

Everything else is Part 2. A section is never moved between parts to make Part 1 faster: Part 1 is "whatever is not in
the Appendix". If a Part 1 mark needs a value that only Part 2 produces, that is a bug in the split: add the item to
Part 1 and say so in `CHANGES`/the run notes.

## Flow

1. **Context, once.** Resolve context, run the coverage probes, run the design gate and (parallel dispatch) freeze
   `run/context.json` with its hash, exactly once for the whole read. Part 2 reuses the frozen context and its hash;
   it never resolves context again.
2. **Part 1 analysis.** Each selected capability runs its Part 1 items (workers under `PARALLEL_WORKERS`, in registry
   order under `SEQUENTIAL`). Under parallel dispatch the Master merges and checks the Part 1 results with the
   `parallel-dispatch.md` § 4 checks, with expected counts for the Part 1 items.
3. **Part 1 delivery.**
   a. Classify and write the ledger entries for Part 1 results (the Master's, as always).
   b. Dashboard first (step c), then Chat: the Verdict only, then one line: the dashboard link and that Part 2 is running.
      No Summary table, Experiment card or other report section is written in chat; they are on the dashboard.
   c. Dashboard: create it from the artifact type with the Part 1 datasets and the page from the shipped assets. The
      `run_state` dataset says `part2 = RUNNING`, so the Appendix shows its "Part 2 is running" notice
      (`assets/README.md`). Publish it (private) and show the link.
   d. Show the progress table (`progress-table.md`) with Part 1 done and Part 2 queued.
4. **Part 2 analysis.** Each capability runs its Part 2 items over the same frozen context (workers or sequential), the
   Master merges and checks them (`parallel-dispatch.md` § 4, expected counts for the Part 2 items, and the totals
   for the read: 59 results and 529 cells for the Word Connect Association read), then the follow-up loop runs as
   usual on the complete record (follow-up waves per `parallel-dispatch.md` § 5 where applicable).
5. **Part 2 delivery.** Chat: one line that the dashboard's Appendix is filled in (the Verdict of Part 1 is not repeated or changed; if Part 2 produced a result that contradicts a Verdict row, the changed row is restated in one sentence). Dashboard: write the Part 2 datasets (`cells` in full,
   `trends`, `trend_pab`) and set `run_state` to `part2 = COMPLETE`, **in place** on the same artifact, which needs no
   page republish because the page only reads datasets. Keep the artifact URL.

A statement identical to one Part 1 already ran (same SQL hash in `queries.log`) is served from the stored rows in
Part 2 and not re-run or re-charged. A statement that differs is a new statement.

## Target audience

A stated target audience (`analysis-area-selection.md`) adds its "Target audience" block to the Part 1 Summary and the `audience` dataset to the Part 1 dashboard; it adds no work to Part 2.

## Analysis areas

Both parts run over the areas the user chose before the read started (`analysis-area-selection.md`); unselected areas have no Part 1 or Part 2 step.

## Budget

The totals are unchanged: the same global and per-experiment budgets, the same uplift under parallel dispatch, the same
conditional reserve. Only the order inside `mandatory` changes (`master-state.md` § Budget): Stage 1 for every
capability, then the Part 1 Stage 2 items, then the Part 2 Stage 2 items. A shortfall therefore cuts Part 2 breadth
first, which is still "Stage 2 breadth before Stage 1". Under parallel dispatch each worker's slice (`parallel-dispatch.md`
§ 2) is split into a **Part 1 slice** (its floor plus its Part 1 Stage 2 demand, capped at its slice) and a **Part 2
slice** (the rest). Unspent Part 1 slice rolls into Part 2. Work a part cannot pay for is `NOT_TESTED` /
`OUT_OF_BUDGET`, and the Part 1 delivery says so for Part 1 sections; Part 2 never starts before Part 1 is delivered.

## If something fails or the user interrupts

- **A Part 1 worker fails** (one re-run, then `NOT_TESTED` / `WORKER_FAILED`): Part 1 is still delivered with that gap
  named in the Summary footer and in Guardrails, and Part 2 runs for the rest.
- **The user writes something after Part 1:** Part 2 keeps running; any question is answered from the Part 1 records
  alongside it. Part 2 is never replaced by an offer ("want me to continue?") and never stopped by a question; only the
  user's explicit "stop" does that, and then the dashboard is set to `part2 = PARTIAL` with that reason.
- **Part 2 cannot complete** (budget stop, `BLOCKED`, session end): the dashboard keeps `part2 = RUNNING`, so a new
  session must set `PARTIAL` with the reason and name what is missing. The dashboard never shows an Appendix built
  from partial data as if complete.
- **A change in Part 2 that contradicts Part 1:** never possible by design, since Part 2 only adds rows and datasets.
  If a Part 2 re-classification or spot-check differs from a Part 1 value, Part 2 stops, the discrepancy is recorded in
  `unresolved`, the Part 1 value stays on the page marked, and the user is told.

## Approvals (one click)

The dashboard step needs only a few approvals, because the datasets travel as one bundle (`scripts/build_bundle.py`, one
upload per part instead of one per dataset): Part 1 is create-from-type, one upload, one batched `ArtifactData` write
(`datasets/bundle` and `files/index.html` together); Part 2 is one upload and one `ArtifactData` write
(`datasets/bundle`, now with the Appendix rows and `run_state` complete). When the progress table is first shown, the
Master says once: "The dashboard needs about 3 approvals now and 2 more for Part 2; choose allow for this session on the
first one to skip the rest." Approvals themselves are the host app's; the Master cannot grant them.

## Never

Never hold the Summary back until Part 2 is done, never re-run context for Part 2, never reduce what the full read
contains (the two parts together are exactly the single-pass read), never show Appendix tables built from Part 1
partial `cells` as if they were complete, and never describe Part 1 as the full read, never stop or ask before Part 2 unless the user says stop.
