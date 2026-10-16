# Parallel dispatch (optional)

Runs the selected capabilities of one experiment-version at the same time, as isolated workers, then
merges and checks them before anything is ingested. It changes who executes the queries and nothing
else: requests, responses, budgets, statistics, classification and the ledger are the unchanged
contracts. `dispatch_mode` is `SEQUENTIAL` (default) or `PARALLEL_WORKERS`.

## When it applies

- FULL_EXPERIMENT_READ and TARGETED_DIAGNOSIS, one experiment-version unit at a time. PERIOD_IMPACT_ANALYSIS
  keeps its phase and priority order (`master-state.md` § Budget) and is always `SEQUENTIAL`.
- Chosen by the user ("in parallel", "fast") or by configuration. Fewer than three selected capabilities
  → `SEQUENTIAL`.
- **Parity gate.** The default stays `SEQUENTIAL` until one read has been run both ways with identical
  output: every classification equal, every value equal to 1e-9 relative, same row counts. Record the
  outcome; a later change to a capability file or to `scripts/stats_common.py` reopens the gate.

## 1. Master, serial, before any worker (spends `context`)

1. Context resolution, design gate, capability selection and the `COVERAGE` probes, exactly as in
   `SKILL.md` § Lifecycle steps 1–4.
2. Run `python3 scripts/stats_common_test.py`; anything but `OK` stops the parallel path (fall back to
   `SEQUENTIAL`).
3. Write `run/context.json` and never change it afterwards: unit `(exp_id, version)`, `comparisons[]`
   verbatim, the four windows, canonical scope, variant display names (the reference is named by its own
   name, never "control"), `pab_config`, `stats_config`, `data_as_of` (UTC timestamp), the selected
   capabilities with `estimated_cost`, and the budget slices (§ 2, with their weights and caps). Store its SHA-256 in MasterState.
4. Pre-create `run/<capability>/` for every worker.

## 2. Budget slices

**Uplift.** A parallel run gets more budget than a sequential one, because workers cannot reuse each
other's series (the registry estimates are upper bounds that assume no reuse) and a retry costs a
statement. `parallel_budget_uplift` (CONFIGURABLE, default 0.20) multiplies the resolved global and
per-experiment budgets for the run: FULL_EXPERIMENT_READ 150 becomes 180, TARGETED_DIAGNOSIS 60 becomes
72. The resolution order, the finite-budget rule and the sequential defaults are unchanged.

**Pool.** `R` = uplifted global budget minus the statements already spent on `context`. The Master keeps
`conditional_reserve` = 20% of `R` for Stage 3+ and follow-ups. The rest, `P`, is split among the workers.

**Split, by metric size and cuts.**

1. Every worker first gets its **floor**: the capability's Stage 1 analysis plus PAB statements from the
   registry (`capability-registry.md` § Cost estimates). Stage 1 is never traded away.
2. The surplus `P − Σ floor` is shared in proportion to each capability's workload weight
   `W = metrics × (1 + cuts)`: `metrics` is the number of metrics the capability reports, and `cuts` is the
   number of default-cut dimensions its analysis file names (`analysis-contract.md` § Default cut set).
   Shares are rounded by largest remainder so the slices add up exactly to `P`.
3. A slice is capped at the capability's **demand**: its floor plus the default-cut statements its
   analysis file names (one per cut dimension and metric group). What a cap releases is shared among the
   others by the same weights, and anything left after every demand is met goes back to the reserve.
4. If `P` cannot cover the floors, Stage 2 breadth is cut first (stage-major rule, `master-state.md`
   § Budget): the affected Stage 2 items are `NOT_TESTED` / `OUT_OF_BUDGET`, and the worker is told
   which before it starts.

Every worker's request carries `data_source` (`analysis-area-selection.md` § Data source); with `druid_only = true` it runs nothing outside Druid. A worker may not exceed its slice; it stops and reports. Unspent slices return to the pool, which
funds follow-ups and the one re-run of a failed worker. `actual_cost` is the observed statement count
from the worker's `queries.log`.

**Two parts.** Every read is a two-part read (`two-part-read.md`). Each worker's slice is split into a **Part 1 slice**
(its floor plus its Part 1 Stage 2 demand, capped at the slice) and a **Part 2 slice** (the rest); an unspent Part 1
slice rolls into Part 2, and the reserve rule is unchanged. The context is frozen once and shared by both parts.

## 3. Workers

One worker per capability **per part**: the Part 1 wave runs first (its items are in `two-part-read.md`), the Master
merges it and delivers Part 1, and the Part 2 wave then runs over the same `run/context.json` and hash, writing to
`run/<capability>/part2/` (Part 1 output is in `run/<capability>/part1/`; the file table below applies to each). At most `parallel_workers_max`
(default 4) at a time, started staggered by about 5 seconds. A worker receives only: its `analyses/<capability>.md`, `references/analysis-contract.md`,
`run/context.json`, its slice, and `scripts/stats_common.py`. It may run read-only queries and write inside
its own `run/<capability>/`. It must not write to the ledger, MasterState, datasets or any artifact; must not
classify or interpret (`classify` is Master-only); must not re-derive windows, scope, variants or
comparisons; and must use `stats_common` for every statistic.

Worker output, all in `run/<capability>/`:

| File | Content |
|---|---|
| `request.json` (follow-up waves only, written by the Master) | the follow-up `AnalysisRequest` |
| `response.json` | the capability's `AnalysisResponse`, whole, per `analysis-contract.md` |
| `raw/*.json` | each query's returned rows, unmodified |
| `queries.log` | one line per statement: UTC start, seconds, row count, SHA-256 of the SQL, engine (`druid` or `trino`) |
| `heartbeat.json` | `state`, `done`, `total` (expected statements), `updated_at`, rewritten after every query; feeds the live progress table (`progress-table.md`) |
| `status.json` | `capability`, `context_sha256` (echo), `status` `COMPLETE` / `PARTIAL` / `FAILED`, `reason`, `slice`, `queries_executed`, `not_tested[]` |

When it finishes, a worker sends the user one line (`<Capability> finished: <n> queries, <minutes> min`) and nothing else.

A query error or a rate-limit response is retried once after a back-off; a second failure stops the worker
with `PARTIAL` or `FAILED` and the reason. A worker never hides a gap and never estimates a missing value.

## 4. Merge, serial, by the Master — nothing is ingested before this passes

Run once after the Part 1 wave and once after the Part 2 wave, each time over that wave's workers, with the expected
counts of that part; the read's totals (59 results and 529 cells in the reference read) are checked after Part 2.

For every worker, in registry order:

1. `status.json` present, `status = COMPLETE`, `context_sha256` equals the stored hash.
2. `response.json` validates against the response schema; `comparisons[]`, windows and canonical scope
   echo `run/context.json` exactly.
3. Counts: the number of results and breakdown cells equals what the analysis file's default cut set and
   the PAB coverage imply for this unit; `result_id` values are unique and deterministic. Record the totals
   per capability and overall (for the Word Connect Association read: 59 results, 529 cells).
4. Re-classify **every** result with `stats_common.classify` from the returned interval, `conf` and value
   (cheap and exact); the Master's classification is the one recorded.
5. Spot-check at least two results per capability, one meaningful and one with PAB unavailable, by
   recomputing the statistic from that worker's `raw/*.json` through a path that does not use the worker's
   response, and, once per run, one direct re-query of a headline result (charged to `mandatory`).
6. Reconcile `queries.log` counts against `queries_executed` and the slice; a discrepancy is recorded in
   `unresolved` with the observed value kept.

A worker that is `PARTIAL` or `FAILED`, or fails a check, is re-run once by the Master sequentially. If it
still fails, its items are `NOT_TESTED` with reason `WORKER_FAILED` and the read is delivered as partial and
says so. A failed check is never fixed by editing a worker's numbers.

After the merge the Master continues as in `SEQUENTIAL`: ledger entries, the Stage 3+ and follow-up
decisions, cross-capability work (the puzzle-type contribution, which needs Engagement's Clear / DAU
result, the Summary, the Verdict), synthesis and the dashboard. Those and the follow-up decisions are never delegated; only the execution of independent follow-ups may be (§ 5).

## 5. Follow-up waves (optional)

The follow-up loop is unchanged: after every merge the Master builds candidates from the responses'
`followups[]` and its own gap checks, applies the existing rules (triggering finding or `USER_REQUESTED`
result, reason, expected evidence, capability, stage, computable cost, depth allows the stage, both budgets
cover it, adds evidence not in the ledger), and decides exactly one of `FOLLOW_UP`, `STOP`, `OFFER`, `ASK`.
Only the execution of the approved follow-ups may be parallel. Each such batch is one **wave** and one
iteration of the loop; the loop ends on the usual conditions (`DONE`, `BUDGET`, `DEPTH_CAP`,
`NO_NEW_EVIDENCE`, `BLOCKED`), and no number of waves is fixed.

**Independence test.** Two follow-ups run in the same wave only if all of these hold:
1. they belong to different capabilities (several follow-ups for one capability go to one worker and run
   in order inside it);
2. neither one's trigger, parameters or expected evidence depends on the other's result;
3. neither is a `USER_REQUESTED` follow-up aimed at a result that has not been produced yet;
4. neither needs a ledger entry the other will create.

A follow-up that fails the test waits for the next wave. A wave of fewer than two independent follow-ups
is run by the Master directly, with no workers.

**Wave budget.** Funded from the Master's reserve plus the slices workers returned unspent, in the existing
spend order (stage-major, then capability in registry order). Each follow-up's slice is its priced cost
(`capability-registry.md` § Cost estimates: statements per analytical step times the steps asked for); there
is no weighting. A follow-up the wave cannot pay for is deferred or recorded `NOT_TESTED` /
`OUT_OF_BUDGET`, never shrunk, and a budget stop ends the loop with `STOP` and the usual offer to continue.

**Workers.** Same rules as § 3 and the same frozen `run/context.json` (hash echoed). The Master writes each
follow-up as an `AnalysisRequest` to `run/wave<k>/<capability>/request.json`, carrying the triggering
`result_id` or finding id and the follow-up's cost; the worker answers in the same folder with the same
four files. Nothing a worker writes is visible to a worker in the same wave.

**Merge.** The § 4 checks apply to each wave, with expected row counts taken from the request, every result
re-classified, and at least one spot-check per capability from raw rows. Merged results then feed the next
candidate round exactly as the first merge did.

## Failure modes this design guards against

| Risk | Guard |
|---|---|
| Two workers write the same file or the ledger | each writes only its own folder; the Master alone ingests |
| Combined spend overshoots the budget | fixed slices plus a Master reserve, observed counts reconciled |
| Capabilities use different windows or definitions | one frozen `context.json`, hash echoed and compared |
| Eight copies of the statistics drift apart | one `stats_common.py`, tested before dispatch, classification in one place |
| Warehouse rate limits or timeouts | worker cap, staggered starts, one retry, explicit `PARTIAL` |
| A worker's summary hides an error | status file, counts, re-classification, spot-checks from raw rows |
| A write approval stalls the run | workers are read-only; every write is the Master's, after the merge |
| Part 2 contradicts a value already shown in Part 1 | Part 2 only adds rows; a difference stops Part 2 and is recorded in `unresolved` |
| Parallel follow-ups depend on each other | the independence test; dependent follow-ups wait for the next wave |
| Follow-up waves overrun the budget | priced slices from the reserve and returned slices only; deferred, never shrunk |
