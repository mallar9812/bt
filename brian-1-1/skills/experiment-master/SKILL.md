---
name: experiment-master
description: "BRIAN orchestration layer for experiment analysis — first invoked for an experiment request: \"read experiment X\", \"how did the test do\", \"A/B results\", \"why did [metric] move in [variant]\", \"did [feature test] change retention\", \"what did experiments do to [metric] in [period]\", \"[metric] dropped between [date] and [date] — which experiments could have caused it?\". Not an analyst: it resolves experiment context, deterministically picks one of three modes (FULL_EXPERIMENT_READ, TARGETED_DIAGNOSIS, PERIOD_IMPACT_ANALYSIS), dispatches the revenue / retention / engagement / sessions / classic retention / LTV & LTDays / rolling LTV / economy analysis capabilities under a finite budget, decides follow-ups, keeps investigation state, and synthesises pair-level findings. game-viz-design renders its visuals. Never pools experiments or experiment versions, never calls a reference variant a control or baseline, never treats annotations as measured impact. Inherits brian-master shared rules and depth-policy.\n"
---

# Experiment Master — orchestrate, don't analyse

A thin orchestration layer. It decides what must be known, asks the analysis capabilities for it,
keeps state, and synthesises what comes back. It owns no metric, statistic, classification or chart
(see "Does not own"); it does own the meaningfulness interpretation of the statistics capabilities
return (`references/master-state.md` § Results and meaningfulness). This file states the lifecycle;
the contracts own the detail and win any disagreement. Inherits
`brian-master/references/shared-rules.md` and `depth-policy.md`.

**Investigation binding.** For experiment reads, this skill, `depth-policy.md` and the approved
capability methodologies govern the analytical investigation. `investigation-protocol.md` contributes
only its shared BLOCKED-note grammar; its non-experiment D2+ machinery (hypothesis discipline,
attribution ontology, pre-close checklist) is not imported.

## Inputs

Extract into `MasterState.request.extracted` (`references/master-state.md`): `experiment_refs` (name
fragment or `exp_id`; several allowed), `version_ref`, `period_ref`, `onset_ref` (a user-stated start
of the movement, PERIOD only), `comparison_ref` (a user-stated comparison period), `domain_ref` (matched
through the registry's aliases and its retention rule; engagement needs no action to be named),
`segment_ref` (the segment phrases in FULL and TARGETED), `trigger_ref` and `scope_refs` (PERIOD only:
the metric and the segment phrases of the question), gid/cli, any user-stated meaningfulness threshold
(`threshold_refs`, this request only; user-origin requests only — always empty for a stream-origin
request, which uses the default line), and any explicit depth, budget or `delay_extension_days`
override. Overrides follow `depth-policy.md` and the budget rules in `master-state.md`.

A stream-origin request (`origin: COMPANION_STREAM`, defined by
`brian-master/references/evidence-streams.md`) also carries an `investigation_context`, later
ContextUpdates and a `phase_ceiling`. They are taken into `MasterState.request` and handled per
`master-state.md` § Scope lenses and context updates. That context is never experiment evidence, and a
hand-off's `depth` is informational only.

## Mode routing

First match, top to bottom. Depth is the existing BRIAN D-level; no other hierarchy exists.

| # | Condition | Mode | Depth |
|---|---|---|---|
| 1 | `period_ref` present and `experiment_ref` absent | PERIOD_IMPACT_ANALYSIS | D2 |
| 2 | `experiment_ref` present and (`domain_ref` or `segment_ref` present) | TARGETED_DIAGNOSIS | D2 |
| 3 | `experiment_ref` present | FULL_EXPERIMENT_READ | D3 |

- **Several explicitly named experiments:** one mode for the request, one independent ExperimentContext
  per experiment, no pooling and no clarifying question.
- **Experiment plus period:** rule 2 or 3; the period constrains that experiment's analysis window.
- **Experiment without period:** no default calendar period is supplied; the window comes from context
  resolution.
- **Experiment versions:** the unit of analysis is the experiment-version `(exp_id, version)`. Selection
  follows context resolution: `version_ref` → that version; a period → every version active in it;
  otherwise the latest version of each relevant `exp_id` (every `exp_id` matching a named experiment),
  with earlier ones surfaced. Versions, `exp_id`s and platforms are never pooled, and several of them
  are never a reason to ask.
- **No experiment and no period:** if the request is not about experiments, return it to brian-master
  routing; otherwise ask one question.
- **Stream-origin request** (`origin: COMPANION_STREAM`): the same rules apply, so a period with no
  named experiment is PERIOD_IMPACT_ANALYSIS. It is never returned to brian-master routing; a request
  that cannot proceed (no game) is reported as such for the stream. User-origin phrases keep the
  ask-once rule; a scope that arrived as a ContextUpdate is never asked about
  (`protocols/context-resolution.md` step 8).
- **Depth:** the table gives the default. Explicit depth language per `depth-policy.md` ("why", "root
  cause", "deep dive") raises a TARGETED_DIAGNOSIS request to D3, and an explicit user depth override
  applies to any mode; such a request is never silently held at D2. Depth never drops afterwards.
  There is no fourth mode.
- **PAB** is not a domain, capability or mode. A request that mentions it takes its mode from the
  rules above; PAB runs in Stage 1 with each capability that has a PAB table, and a PAB re-check is a
  user-requested follow-up (Follow-up loop).
- Record the matched rule and the depth basis in `mode.rule_matched` and `depth_basis`.

## Lifecycle

0a. **Confirm the experiment** (user-origin FULL or TARGETED read that names an experiment), before every other question and before any analysis query: if the request gives the exact experiment name or `exp_id`, the game and platform, and the probe returns exactly one name, state the resolved experiment in one line and go on; otherwise run only the bounded `CANDIDATES` probe and ask which experiment (up to four nearest, with game, platform, `exp_id`, latest version, dates and arms), plus platform and version only when unclear, exactly as `references/experiment-confirmation.md` says. Never start on a guess; unattended, scheduled and stream-origin reads never ask (one match proceeds with the interpretation stated, otherwise nothing starts and the candidates are reported).
0. **Choose the analysis areas** (user-origin FULL_EXPERIMENT_READ only), straight after step 0a and before any analysis query: ask which of the eight areas to include, with all eight areas and an "All 8 areas" choice shown together in one question, exactly as `references/analysis-area-selection.md` says, then ask, optionally, whether the user wants the data at any filter or cut (default No, all users; only on a Yes follow with user type, payer status and cohorts) in the same file's second call. The answer is either a focus lens on the dashboard and Summary (default) or, if the user chooses it, the scope of the entire read (sent as `segment_ref`). The same call also asks "Fetch experiment data only from Druid?" (Yes is the default and recommended): Yes runs every statement on Druid and a Druid outage blocks the unit (`DRUID_UNAVAILABLE`, nothing substituted); No keeps Druid first and allows the Trino MCP for a table not in Druid or after a Druid failure, one engine per result, engine logged per statement and named in Method. Stored as `data_source`. Skipped when the request already names areas or says all, when unattended, and in every other mode (the data source then defaults to Druid only).
1. **Initialise** MasterState: request, mode, depth and the finite budget (`master-state.md`); for a
   stream-origin request also its `phase_ceiling` (default `EVIDENCE`).
2. **Resolve context** per `protocols/context-resolution.md`: each named experiment individually, or
   period discovery for PERIOD, down to experiment-version units. That protocol fixes each unit's
   windows — `requested_period`, `experiment_active_window`, `stable_window`, `analysis_window` — which
   are never collapsed. The only Druid context probes the Master issues are the bounded probes it
   names: `CANDIDATES`, `DISCOVERY`, `LIFECYCLE`, `SCOPE`, `ARMS`, `COVERAGE`; annotation reads follow
   `annotations.md`. In every mode a requested segment is resolved to the canonical scope, lens `L1`
   (step 2b); it is never broadened or replaced by an overall read. With `phase_ceiling = DISCOVERY`
   the run ends after this step's P0 context work: P1–P3 are recorded `NOT_TESTED` /
   `PHASE_CEILING`, the result carries `tier1_count`, and raising the ceiling continues from step 3 on
   the stored context without repeating it.
3. **Design gate**, read from each ExperimentContext and never recomputed (`context-schema.md`,
   `experiment-classification.md`):
   - `COMPARABLE` → proceed with the context's `comparisons[]` exactly as given;
   - `NO_COMPARISON` (SINGLE_ARM) → descriptive analysis only (see below);
   - `UNRESOLVED` → dispatch nothing for that experiment; follow the clarification rule in
     context-resolution step 8.
4. **Select capabilities** per `references/capability-registry.md`, restricted to the areas chosen in step 0 (unchosen ones are `SKIPPED_NOT_SELECTED`), and run its `COVERAGE` probe before
   any dispatch. Dispatch only where `AVAILABLE`; otherwise record `NOT_IN_TABLE`. FULL selects all eight
   capabilities; PERIOD uses every capability that declares PERIOD support in the registry (all eight
   currently, each with its date axis), running what the trigger, evidence selection, scope, phase and
   budget call for; Classic Retention, LTV
   & LTDays, Rolling LTV and Economy are never dispatched for a negative version: explicitly requested →
   `UNSUPPORTED` / `VERSION_SEMANTICS_UNKNOWN`; otherwise never auto-selected
   (`SKIPPED_NOT_AUTO_SELECTED`), the version staying a listed candidate. No other version is
   substituted. Engagement is Clear-first: `clear` is its implicit primary action, no action is named by
   the user, and its supporting diagnostics are selected by the capability itself
   (`analyses/engagement.md`).
5. **Dispatch** and **ingest** per the stages below, sequentially by default; with `dispatch_mode = PARALLEL_WORKERS`
   (FULL or TARGETED, one unit, three or more capabilities, parity gate passed) follow
   `references/parallel-dispatch.md`: the Master freezes the context and budget slices, isolated workers run one
   capability each, and the Master merges and checks before any result is ingested.
6. **Follow-up loop**, then **synthesise** and hand off visuals. ContextUpdates that arrive during a
   phase are queued and applied at the next phase boundary (the state has one writer); lens admission
   follows `master-state.md` § Scope lenses and context updates.
   Before writing the answer, read `report-generator/report-generator.md` and the files it names,
   and build the answer with them (§ Synthesis). Every user-origin FULL or TARGETED read then also gets
   the interactive dashboard (`report-generator/dashboard.md`), built first; the chat then carries only the Verdict and the dashboard link.
   **Two parts, always** (`references/two-part-read.md`): such a read is delivered in two parts. Part 1 (Stage 1 and the
   items behind everything outside the dashboard's Appendix) is delivered first, as the Summary plus the dashboard;
   Part 2 then runs a second pass for the Appendix and the rest of the Detailed Read, over the same frozen context.

## Two-part read (standing behaviour)

Applies to every user-origin FULL or TARGETED read that gets a dashboard, in `SEQUENTIAL` and `PARALLEL_WORKERS`
alike; there is no switch to turn it off, and both parts always run: Part 2 starts by itself right after Part 1 is
delivered. Context is resolved once. **Part 1** runs Stage 1 for every selected
capability and the Stage 2 items that feed the Experiment card, Headline, Verdict, Users, Puzzle
types, Guardrails and Summary; the Master merges and classifies, then publishes the dashboard and shows only the Verdict in chat
(`summary-table.md` § Detailed Read table, priority rows first) with one line naming the dashboard, and publishes the
dashboard with the Appendix marked "Part 2 is running". **Part 2** runs the remaining Stage 2 items, Stage 3+ and
the follow-up loop, then delivers the rest of the Detailed Read and fills the Appendix datasets in place on the same
artifact. Totals, budgets, statistics and classification are those of a single-pass read; only the order of work and
of delivery changes (`references/two-part-read.md`).

## Live progress

From the first context probe until the dashboard is published, keep `run/progress.json` current and show the user the
progress table (`references/progress-table.md`, rendered by `scripts/progress_table.py`): each step with its state,
elapsed time and approximate time remaining, and the time until Part 1 (the Summary) and until the whole read.
Presentation only; it spends no budget.

## Capability dispatch

The Master creates `AnalysisRequest`s (`references/analysis-contract.md`) for the required unit of
work; granularity is set by that contract and the capability's analysis file. A request's `purpose` is
`ANALYSIS` (which includes the Stage 1 PAB) or `PAB_CHECK` (a user-requested re-check). Every request, dispatch, response, comparison result and finding carries
both `exp_id` and `version`, and no capability receives an experiment context without both. It reads
the analysis file and runs it for the request. `comparisons[]` is copied from the context verbatim —
never edited, extended or re-derived. `stats_config` and `pab_config` take the contract defaults unless
overridden; `query_budget` follows `master-state.md`. In every mode the request carries the lens's
canonical scope, identical for every capability of a unit. Each response is stored whole in
`analysis_responses`, and each `Finding` enters `findings_ledger` exactly as returned. On ingest the
Master writes a `result_ledger` entry per reported result — whole scope or breakdown cell — with its
deterministic `result_id` and its meaningfulness classification (`master-state.md` § Results and
meaningfulness); it never recomputes or adds a statistic.

### Parallel workers (optional)

`references/parallel-dispatch.md` runs the selected capabilities as isolated read-only workers over one frozen
`run/context.json`, each with a fixed budget slice, shared statistics from `scripts/stats_common.py`, and output in
its own folder. Nothing is ingested until the Master has validated the context hash, response schemas, row counts,
re-classified every result and spot-checked raw rows. Independent follow-ups may run as a further wave of workers
(`parallel-dispatch.md` § 5); the follow-up decisions stay with the Master. Default `SEQUENTIAL`. PERIOD mode never uses it.

## Stage sequencing

Stages are analytical phases, not depths. `depth-policy.md` decides what each D-level permits;
`master-state.md` § Stages and depth gives the mapping. A unit of work is one selected capability for
one experiment-version.

- **Stage 1 — WHAT happened.** Mandatory before Stage 2 for each unit of work. Stage 2 never begins
  for a unit whose mandatory Stage 1 is incomplete.
- **Stage 2 — WHERE is the movement:** every computed Stage 1 metric goes to its capability, dispatched
  as that capability's approved analysis file directs. The capability chooses its adaptive crossings
  and grouping; the Master enumerates no combinations, and contribution, weight, movement or
  significance never act as a silent evidence filter. "Top contributors" at D2 is an outcome the
  capability reports, not a Master filter; at D3 the capability's adaptive analysis runs, not every
  theoretical combination. The finite budget bounds breadth.
- **Stage 3+ — WHY / deeper investigation:** D3 only, conditional on the criteria in `master-state.md`,
  which also set the `depth-policy.md` D3 items (mix-shift, evidence timeline, hypothesis table) where
  applicable and subject to budget and evidence. At D2 the Master adds only the D2-allowed explanatory
  work and OFFERS anything deeper.

The order across units, including across experiments in PERIOD mode, follows the spend order in
`master-state.md`; the global and per-experiment budgets always apply.

NO_COMPARISON / SINGLE_ARM experiments receive descriptive analysis only. Comparative analysis is
disabled, but depth-permitted descriptive investigation may continue. The Master never produces
comparative deltas, treatment effects, significance comparisons or causal comparisons for them.

## Budget enforcement

The budget is finite on every run and spent in the order `context → mandatory → conditional`. Before
each request the Master checks the estimate against the remaining global and per-experiment budgets
(per experiment-version unit).
Work that cannot be paid for is recorded `NOT_TESTED` with reason `OUT_OF_BUDGET` and its
`budget_scope`. Mandatory work is never silently skipped or replaced by a lower-depth analysis, and
depth is never downgraded. Spend is the observed statement count. When a budget ends, record `STOP`
with the reason and offer to continue.

A `phase_ceiling` stop (stream-origin request) is an orchestration state, not a budget stop: it is
recorded `NOT_TESTED` / `PHASE_CEILING` with no `budget_scope`, and it neither consumes nor changes a
budget. Spend for additional scope lenses draws on the same global and per-unit budgets.

## Follow-up loop

After every ingest the Master builds candidates from the responses' `followups[]` (suggestions only; an
analysis never executes one) and from gaps it detects. It decides exactly one of `FOLLOW_UP`, `STOP`,
`OFFER` or `ASK`, and records the decision with its reason.

- A candidate becomes a `Followup` only with a triggering finding, reason, expected evidence,
  capability, stage and a computable budget cost (`master-state.md`). A user's explicit request to
  investigate a specific result is a `USER_REQUESTED` follow-up: it references that result's existing
  `result_id` instead of a finding, is never evidence itself, and goes through the same rules. A request
  aimed at a result not yet produced runs the normal analysis first and then references its result.
- Run it only if the depth allows its stage, both budgets cover its cost, and it adds evidence not
  already in the ledger.
- No number of rounds is fixed. The loop ends on `DONE` (mandatory floor complete, no justified
  candidate), `BUDGET`, `DEPTH_CAP`, `NO_NEW_EVIDENCE` or `BLOCKED`.
- Ask the user only when context is genuinely ambiguous or required (for example, several different
  experiment names matching one fragment): one question per response, alongside the delivered work.
  While a requested segment is pending, the delivered work is segment-independent context only; no
  overall or partial-scope result is shown unless the user accepts the offer
  (`protocols/context-resolution.md` step 2b).
- **PAB** is never a domain or capability. It runs in Stage 1 with every capability that has a PAB table
  (`references/capability-registry.md` § PAB), for the whole-scope result and every default-cut cell with a
  pre-test counterpart, after a bounded coverage probe of the PAB table(s). A user may also request a
  re-check of one result (`purpose: PAB_CHECK`, `USER_REQUESTED`, after the normal analysis has produced the
  result it refers to), which bypasses no PAB methodology, eligibility, coverage, data or budget rule.

## PERIOD_IMPACT_ANALYSIS

Follow `references/period-evidence.md`.

- Set `impact_window`, `onset` (user-stated, else the period start; never inferred and never asked
  for), `comparison_window`, `lookback_start` and the `candidate_discovery_window` per `period-evidence.md`.
- Discover experiments over the `candidate_discovery_window` through context-resolution; keep one unit per
  experiment-version `(gid, cli, exp_id, version)`, never pooled, a superseded version included as its
  own unit.
- Classify each unit's lifecycle (`CHANGED_IN_LOOKBACK`, `CHANGING_IN_IMPACT`, `ENDED_IN_WINDOW`,
  `STARTED_AFTER_ONSET`, `STABLE_THROUGHOUT`, `LIFECYCLE_UNRESOLVED`, or excluded with its reason) and
  set candidate priority — timing and exposure only, a spend order, never an evidence or causal
  ranking — per `period-evidence.md` § Candidates.
- Resolve the trigger metric and the requested scope (`context-resolution.md` step 2b). The trigger
  names the capability dispatched first and never limits selection; the canonical scope — value-group
  expansions written out — is sent identically to every capability for a unit. An `UNRESOLVED` user
  phrase is asked once and never guessed (a scope from a ContextUpdate is never asked about; it is
  recorded `UNRESOLVED_SCOPE`); a unit with no scoped rows is `NO_SCOPED_EXPOSURE`, listed and not
  dispatched.
- Dispatch in the PERIOD phases (`master-state.md` § Budget): every PERIOD-evidence capability for the
  cross-capability set (`cross_capability_max_units`, filled in priority order across tiers), the
  trigger capability for every other investigable unit. Each capability runs its own unchanged
  methodology inside the scope; an unsupported dimension is returned as such, never dropped, and no
  unscoped figure is substituted.
- The trigger resolves to exactly one canonical metric of a capability declaring PERIOD trigger support;
  an ambiguous trigger is asked once, nothing is pooled and no capability is substituted. A trigger whose
  capability declares no PERIOD trigger role (`period-evidence.md` Q14; none currently) is `UNSUPPORTED` /
  `NO_PERIOD_ROLE` and the run continues with no trigger capability. Correlation compares evidence only on
  the same `date_axis`; across install-date and activity-date evidence it is `NOT_COMPARABLE`.
- Correlate across capabilities in the Master only (`period-evidence.md` § Trigger, scope and
  evidence): movement labels per evidence metric, co-movement with the trigger metric on identical
  canonical scope, unit, pair and evidence window, one `PeriodCandidateFinding` per unit and pair.
  Correlation is never stated as causation.
- Experiment evidence comes from the `experiment.*` tables, through the capabilities. A candidate is a
  timing observation, not a cause; a `SHIPPED` or `KILLED` unit is analysed on its pre-end days and no
  post-end arm data is fabricated.
- Game-level period movement comes only from an existing BRIAN game-level D0 request. The Master
  issues it as an orchestration dependency; its result is an input to the evidence records, never a
  second top-level answer to the user. It is never reconstructed by summing experiment tables, and
  experiment results are never pooled. A domain with no existing D0 analysis is recorded as
  `NO_GAME_LEVEL_COUNTERPART`. For a stream-origin request, a result Stream A already produced that
  matches the lens in metric, scope, impact period and comparison period is reused instead of issuing the
  request (`master-state.md` § Scope lenses and context updates); it is Layer A trigger movement either
  way, never experiment evidence.
- Keep `impact_window` (the `requested_period`), `comparison_window`, `candidate_discovery_window`,
  `experiment_active_window`, `stable_window`, `experiment_evidence_window`, `impact_overlap_window`,
  `analysis_window` and `mature_analysis_window` separate. `impact_window` remains the governing
  game-level period. Each unit's `experiment_evidence_window` is passed to the capability as its
  `analysis_window` with `analysis_window_basis = EXPERIMENT_EVIDENCE_WINDOW`; the capability contract
  is unchanged. Maturity is read from the response's `windows`, never inferred.
- `STABLE_THROUGHOUT` needs `PROXY` evidence of stable exposure; absence of an annotation is never
  evidence of allocation stability (`allocation_stability = UNKNOWN` unless an annotation documents it).
- Return one evidence record per experiment-version, listed in candidate-priority order (labelled as
  timing and exposure only), with excluded and `NOT_TESTED` units listed too; no evidence ranking, total
  or attribution arithmetic.
- **Scope lenses (stream-origin request).** At most 3 lenses including the requested scope. A newly
  admitted lens reuses discovery, lifecycle, arms and design, windows and candidate ranking and runs only
  scope-dependent work; it never restarts the investigation. Records are keyed by experiment-version and
  canonical scope (the lens is a request-local label), and lenses are never pooled (`master-state.md`
  § Scope lenses and context updates).

## Synthesis

Format and wording follow `references/output-format.md`.

**Required before writing any part of the answer:** read `report-generator/report-generator.md`,
`report-generator/adapter.md`, `report-generator/template-population.md`,
`report-generator/summary-table.md`, `report-generator/charts.md` and `report-generator/dashboard.md`,
and follow their steps. They apply
`output-format.md` and `report-templates.md` unchanged and add the results-table, status and chart
rules. They are presentation only: no query, statistic or classification changes.

- Preserve pair-level results; report each pair separately, in the context's own terms. Several named
  experiments, and several versions of one experiment, are placed side by side with no aggregate result;
  versions are never pooled. When the latest version was chosen without a period, list the earlier
  available versions.
- State which part of a requested period lies in the stable window and which ramp days fall outside it;
  if `stable_window` is unknown, say so. Nothing is dropped silently.
- Report statistics exactly as returned. No invented statistics, significance, lift or causal claim;
  "associated with" or "consistent with" unless the evidence contract supports more. The Verdict carries a
  goal-conditional recommendation (`report-generator/template-population.md` § Verdict composition): what
  the data support for each stated goal, never an order to ship or kill and never a cause.
- State each result's reading (Upside, Downside, Neutral) beside, never in place of, its adjusted and
  observed values, with the line and its source (`output-format.md` § Results and meaningfulness).
- Annotations are contextual commentary and timeline only, never measured impact.
- Carry `NOT_TESTED`, `BLOCKED`, `NOT_IN_TABLE`, `TBD`, `CONFIG_REQUIRED` and `UNCONFIRMED` through
  unchanged, with each response's `data_conditions` and `pab` status; nothing is dropped or read as
  zero. A BLOCKED note follows the protocol grammar and quotes its probe.
- Never call a reference variant control, baseline or holdout.
- Stream-origin request: report each scope lens separately, name each ContextUpdate's disposition, and
  say what did not run (`PHASE_CEILING`, `LENS_CAP`, `UNSUPPORTED`, `UNRESOLVED_SCOPE`). The
  investigation context is never reported as evidence, and a game-level figure taken from Stream A is
  labelled as such.
- End with what the data does not establish.

## Visualization hand-off

The Master records `visual_requirements` — what each visual must show and which findings feed it — at
least to the SR-22 floor for the depth, then loads `game-viz-design`, which renders them. The Master
writes no chart code or chart configuration. SR-22 is met by the final answer as a whole: the movement
evidence and contributor breakdown for the requested analysis, with several units side by side or
faceted and never pooled. SR-23 prose ceilings apply to the whole answer, not to each unit.

Each requirement is passed as `VisualEvidence` (`references/visual-evidence.md`), built from the
`result_ledger`, the stored responses and their `observations` on the capability's native date axis,
with every evidence state kept; nothing is queried, tested or classified to draw it. The answer takes
the default structure `references/report-templates.md` selects from the recorded mode and depth, opened
by the Experiment Card; the selection never changes routing, mode or depth.

The answer is assembled by `report-generator/report-generator.md`. It fills the selected template
from the ledger, the stored responses and the PERIOD records, builds the results tables and the
visual requirements, and hands the visuals to `game-viz-design`. For a user-origin FULL or TARGETED read it first builds
and publishes the dashboard of `experiment-read-ui-spec.md` from the stored results
(`report-generator/dashboard.md`), and the chat then carries only the Verdict and the dashboard link (`report-generator.md` § Chat answer when a dashboard is built). Every other read keeps the full chat report. It is presentation only: it issues no
query, recomputes and classifies nothing, and changes no routing, mode, depth or budget.

## Does not own

Metric formulas, pins and denominators (the analyses); statistical methodology (`analysis-contract.md`);
experiment classification and reference-arm selection (`experiment-classification.md`); arbitrary SQL
(its Druid context probes are the six bounded probes `context-resolution.md` defines; annotation reads
follow `annotations.md`); assignment or SRM methodology; interpreting annotations as metrics;
game-level period reconstruction; chart rendering; selecting, ranking or accepting experiments chosen
by an upstream skill; treating a metric analyst's conclusions (findings, attribution, causation flags)
as experiment evidence.

## Authoritative references

`references/master-state.md` · `references/capability-registry.md` · `references/context-schema.md` ·
`references/experiment-classification.md` · `references/analysis-contract.md` ·
`references/output-format.md` · `references/period-evidence.md` · `references/visual-evidence.md` ·
`references/report-templates.md` · `protocols/context-resolution.md` ·
`analyses/revenue.md` · `analyses/retention.md` · `analyses/engagement.md` · `analyses/sessions.md` ·
`analyses/classic-retention.md` · `analyses/ltv-ltdays.md` · `analyses/rolling-ltv.md` ·
`analyses/economy.md` ·
`report-generator/report-generator.md` · `report-generator/adapter.md` ·
`report-generator/template-population.md` · `report-generator/summary-table.md` ·
`report-generator/charts.md` · `report-generator/dashboard.md` · `report-generator/assets/` (page code, README) · `references/experiment-read-ui-spec.md` ·
`ps-data-catalog/references/annotations.md` (annotation status and stable window, via
context-resolution).
