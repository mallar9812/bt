# MasterState — investigation state

One state per investigation, created when context resolution starts and carried to the answer. The
Experiment Master is the only writer. Analyses receive an AnalysisRequest and return an
AnalysisResponse (`references/analysis-contract.md`); they never see the state and never mutate it.
Every figure in an answer traces to a response stored here — nothing is answered from memory of an
earlier query.

`Finding`, `AnalysisRequest` and `AnalysisResponse` are owned by `analysis-contract.md`;
`ExperimentContext` is owned by `context-schema.md`. This file wraps them with ids and bookkeeping and
never alters or redefines them.

## Shape

```
MasterState = {
  request:  { raw, hand_off?: {analyst, depth, entities, window, segment, visuals},
              extracted: {experiment_refs[], version_ref?, period_ref?, onset_ref?, comparison_ref?,
                          domain_ref?, trigger_ref?,                 # trigger_ref PERIOD only
                          scope_refs[],                              # PERIOD segment phrases
                          segment_ref?,                              # FULL / TARGETED segment phrases
                          experiment_confirmation?: {status: EXACT | CONFIRMED_BY_USER | UNATTENDED_SINGLE_MATCH, resolved[]},   # experiment-confirmation.md
                          capability_selection: {areas[], basis: ASKED | USER_NAMED | ALL_DEFAULT},   # analysis-area-selection.md
                          data_source: {druid_only: bool, basis: ASKED | USER_NAMED | DEFAULT},   # analysis-area-selection.md § Data source; default druid_only = true
                          target_audience?: {user_type?, payer?, cohorts[]?, label, apply: LENS | SCOPE, basis: ASKED | USER_NAMED | ALL_DEFAULT},   # LENS: focus only, never a filter; SCOPE: sent as segment_ref
                          gid?, cli?,
                          threshold_refs[]: [{value, unit: RELATIVE_PCT | BPS, applies_to?,
                                              source: USER_STATED, evidence_ref}],   # user-origin
                                              # only; always empty for a stream-origin request
                          depth_override?, budget_override?, stats_config_override?,
                          delay_extension_override?},
              origin?: COMPANION_STREAM,                 # set only on a stream-origin request
              phase_ceiling: DISCOVERY | EVIDENCE,       # default EVIDENCE when absent
              investigation_context?: {                  # context only, never evidence
                request_id, trigger_phrase, impact_period, comparison_period_hint?,
                requested_scope: [{dimension, values[]}], unresolved_phrases[],
                user_depth_language?, experiment_intent, game_movement_candidates[] } },
  mode:     { value: FULL_EXPERIMENT_READ | TARGETED_DIAGNOSIS | PERIOD_IMPACT_ANALYSIS,
              rule_matched },
  depth:    D2 | D3,                          # assigned at routing; never lowered during the run
  depth_basis: MODE_DEFAULT | DEPTH_LANGUAGE | USER_OVERRIDE,
  stage:    STAGE_1 | STAGE_2 | STAGE_3_PLUS, # current analytical stage — not a depth
  contexts: [ExperimentContext],              # one per explicitly named experiment, or one per
                                              # discovered experiment in PERIOD; each holds its
                                              # experiment-version units
  requested_scope: RequestedScope,            # every mode; § Scope lenses and context updates
  scope_lenses: [{lens_id, ordinal, scope: [{dimension, values[]}], scope_signature,
                  origin: REQUESTED | CONTEXT_UPDATE, source_ref?,
                  status: ADMITTED | NOT_TESTED, reason?}],          # every mode; L1 always present
  context_updates?: [{update_id, seq, type: SCOPE_REFINEMENT | TRIGGER_REVISION,
                      scope_signature?, disposition, lens_id?, reason?}],   # stream-origin only
  period?:  { requested_period, scope: {gid, cli?},
              onset, onset_basis: USER_STATED | PERIOD_START_DEFAULT,
              impact_window, comparison_window, delay_extension_days, lookback_start,
              candidate_discovery_window,
              trigger,                        # period-evidence.md § Trigger, scope and evidence
              cross_capability_set: [{exp_id, version, priority_position}],
              units: [{gid, cli, exp_id, version, experiment, first_active_day, last_active_day,
                       active_days, experiment_active_window, context_ref,
                       candidate_class, tier, priority_position, excluded_reason?,
                       evidence_status}],
              annotation_mapping: [{annotation_ref, mapping: DATE_ALIGNED | AMBIGUOUS, units[]}],
              game_movement: [{domain, scope_signature, source: EM_D0_REQUEST | STREAM_A_EXTRACTION,
                               request?, response, evidence_ref?, definition_alignment}] },
                                              # inputs and record: references/period-evidence.md
  selected_capabilities: [{capability, basis, coverage: [{exp_id, version, status, probe}], status}],
  analysis_requests:  [{request_id, capability, exp_id, version, stage, purpose: MANDATORY | CONDITIONAL,
                        analysis_purpose: ANALYSIS | PAB_CHECK,
                        request: AnalysisRequest, estimated_cost, actual_cost,
                        cost_source: OBSERVED | SELF_REPORTED, triggered_by?}],
  analysis_responses: [{request_id, response: AnalysisResponse}],
  findings_ledger:    [{finding_id, request_id, stage, finding: Finding}],
  result_ledger:      [ResultEntry],          # § Results and meaningfulness
  request_accounting: [{element_id, kind: SEGMENT | OVERALL_OPT_IN, phrase?, question_ref?,
                        outcome, result_ids[]}],   # § Request accounting
  pending_followups:  [Followup],
  decisions:   [{decision_id, step, decision: FOLLOW_UP | STOP | OFFER | ASK, reason, refs[],
                 budget_remaining}],
  budget:      { unit: "query",
                 global_query_budget, per_experiment_query_budget?,
                 source: {global: REQUEST_OVERRIDE | CONFIG | DEFAULT,
                          per_experiment?: REQUEST_OVERRIDE | CONFIG | DEFAULT},
                 spent: {context, mandatory, conditional, total},
                 per_experiment: [{exp_id, version, allowed, spent,
                                   status: COMPLETED | PARTIAL | NOT_TESTED}],
                 experiments_completed: [{exp_id, version}],
                 experiments_not_tested: [{exp_id, version, reason: OUT_OF_BUDGET,
                                           budget_scope: GLOBAL | PER_EXPERIMENT}] },
  unresolved:  [{item_id, kind, scope, reason, budget_scope?, probe?}],
  visual_requirements: [{visual_id, purpose, scope, metric, source_findings[], evidence_refs[],
                         date_axis?, window, segment, required_by}],   # references/visual-evidence.md
  open_questions:      [{question, why_required, status: ASKED | ANSWERED | NOT_NEEDED}] }
```

- `capability.basis`: `ALL_FOR_FULL` | `REQUESTED_DOMAIN` | `ALL_RELEVANT` | `PARTNER_BY_FOLLOWUP` |
  `PERIOD_TRIGGER` | `PERIOD_CROSS_CAPABILITY` (the last two PERIOD only; `capability-registry.md`).
- `capability.status`: `PLANNED` | `DONE` | `SKIPPED_NOT_IN_TABLE` | `SKIPPED_UNSUPPORTED` (with the
  `UNSUPPORTED` reason, for example `VERSION_SEMANTICS_UNKNOWN` for an explicitly requested negative
  version) | `SKIPPED_NOT_SELECTED` (reason `USER_SELECTION`: an area the user did not choose, `analysis-area-selection.md`) | `SKIPPED_NOT_AUTO_SELECTED` (Classic Retention, LTV & LTDays, Rolling LTV, Economy: a
  negative version the shared rules selected without it being requested; reason
  `VERSION_SEMANTICS_UNKNOWN`) | `NOT_TESTED`.
- `coverage.status`: `AVAILABLE` | `NOT_IN_TABLE`, with the probe quoted (see the registry).
- `period.units[].evidence_status`: `EVALUATED` | `NO_COMPARISON` | `UNRESOLVED` | `NOT_TESTED` (reason
  `OUT_OF_BUDGET`) | `NO_SCOPED_EXPOSURE` | `NOT_RUN` (reason `NO_PERIOD_ROLE`: a unit outside the
  cross-capability set when the trigger's capability declares no PERIOD trigger role,
  `period-evidence.md` Q14; none currently). Every discovered unit stays in `period.units[]` whatever its
  class or status; a unit the budget does not reach is `NOT_TESTED`, never removed. An *investigable*
  unit is one that is not `NO_SCOPED_EXPOSURE` and whose design is not `UNRESOLVED`.
- `period.trigger` and `requested_scope` are resolved once per request
  (`protocols/context-resolution.md` step 2b) and are identical for every unit and capability;
  `period.cross_capability_set` lists the units filled in priority order up to
  `cross_capability_max_units`.
- `period` windows, classes, tiers and priority are defined in `period-evidence.md`. `onset_basis` is
  `USER_STATED` when `onset_ref` is present, otherwise `PERIOD_START_DEFAULT` with `onset` =
  `requested_period.start`; onset is never inferred and never asked for.
- `request.hand_off.depth` is informational: it never sets, raises or lowers `depth`.
  `requested_scope`, `scope_lenses[]`, `phase_ceiling` and `context_updates[]` are defined in § Scope
  lenses and context updates. `requested_scope` and `scope_lenses[]` (with `L1`) exist in every mode;
  `phase_ceiling` other than `EVIDENCE` and `context_updates[]` exist only for a stream-origin request.
- `mode.rule_matched` names the routing rule that matched. `depth` starts at the mode default
  (FULL → D3, TARGETED → D2, PERIOD → D2) and is the existing BRIAN D-level. Explicit depth language or
  a user override per `depth-policy.md` can raise it, and `depth_basis` records which applied; there is
  no fourth mode.
- `budget.per_experiment[].status`: `COMPLETED` (mandatory floor finished), `PARTIAL` (some mandatory
  work done, the rest `NOT_TESTED`), `NOT_TESTED` (not started).

## Experiment-version units

The unit of analysis is the experiment-version `(exp_id, version)`. `version` is the `version` value of
the `experiment.*` tables; it is platform-specific because `exp_id` contains the platform. Versions are
never pooled, including on transition days; `exp_id`s and platforms are never pooled either. Every
query, context, classification, window, capability, analysis, finding, comparison and budget is bounded
by both `exp_id` and `version`. Every analysis request, capability dispatch, analysis response,
comparison result and finding carries both, and no downstream capability receives an experiment
context without both. Which versions become units is decided in `protocols/context-resolution.md`
(`version_ref`, a period, or the latest version of each relevant `exp_id`); several versions are never a
reason to ask.

**Compatibility names.** Fields and settings named for an *experiment* — `per_experiment_query_budget`,
`per_experiment`, `experiments_completed`, `experiments_not_tested`, `experiment_active_window`,
`n_comparisons_in_experiment` — keep their names. Their scope is the experiment-version unit.

## Explicitly named experiments

A request that names several experiments is not ambiguous and triggers no clarifying question. Each
named experiment gets its own independent ExperimentContext, and the applicable mode runs against each
unit. User-level metrics are never pooled across experiments or versions. Synthesis may place the
resulting evidence side by side but produces no aggregate experiment result: no supported methodology
exists for one.

## Stages and depth

Stages are analytical phases, not depth levels. **D0–D3 remain the only depth hierarchy**, and
`depth-policy.md` is authoritative for what each depth allows. No other numbering is mapped onto it.

| Depth | Stage 1 — WHAT happened | Stage 2 — WHERE is the movement | Stage 3+ — WHY / deeper investigation |
|---|---|---|---|
| D2 | every selected capability × comparison | capability-directed decomposition toward the top contributors, as `depth-policy.md` defines D2 | not run. D2-allowed explanatory work only: the annotation scan on the localized window (commentary) and partner-capability cross-checks at Stages 1–2. Anything deeper is OFFERED. |
| D3 | same | capability-directed adaptive analysis within its supported dimensions, as its analysis file defines | conditional (below) |

- Every Stage 1 metric that was computed receives Stage 2, directed by that capability's approved
  analysis file. The Master enumerates no dimension combinations. No contribution, weight, movement,
  effect-size or significance filter silently decides which evidence is kept: "top contributors" is an
  analytical outcome the capability reports, and breadth is bounded by the budget alone.
  PERIOD_IMPACT_ANALYSIS exception: Stage 2 is mandatory only for the trigger capability on the
  cross-capability set. A cross-capability (evidence) capability runs Stage 2 only as a follow-up whose
  triggering finding is an established co-movement (`SAME_DIRECTION` or `OPPOSITE_DIRECTION`) **and**
  whose justification comes from that capability's own Stage 1 evidence (its `followups[]` or its
  finding); co-movement alone is never sufficient. It then runs the capability's existing Stage 2
  methodology unchanged. For units outside the cross-capability set, only the trigger capability's
  Stage 1 is mandatory; its Stage 2 is not run by default and happens only through the existing
  follow-up rules (§ Follow-ups), when that unit's trigger evidence provides the triggering finding and
  justifies the deeper investigation. Not every candidate receives trigger Stage 2.
- Stage 3+ runs only when all hold: depth is D3; a decision with a stated reason is recorded; budget
  remains; the step adds evidence not already in the ledger.
- Where applicable, and subject to budget and evidence, D3 Stage 3+ delivers the `depth-policy.md` D3
  items: a mix-shift analysis built from the capability's own cell-level movement, share and weight
  results (no new formula); an evidence timeline (ramp events and annotation commentary, never a
  metric); and a hypothesis table whose hypotheses are association-only, tied to queried findings, and
  `NOT_TESTED` with a reason when untested.
- Mandatory work is never silently skipped and never replaced by a lower-depth analysis.

## Budget

There is always a finite budget: no unlimited, zero or unset global value exists.

- **Unit:** one executed query statement. Context probes, analysis queries, follow-ups and game-level
  movement requests all spend it.
- **Resolution order**, for each budget value: `REQUEST_OVERRIDE` → `CONFIG` → `DEFAULT`. An override
  that is not a positive integer is ignored, stated, and the next source is used.
- **Defaults** — initial values, approved and CONFIGURABLE. They are configuration values, not
  architectural constants, and may be changed without touching this contract:

  | Mode | Depth | `global_query_budget` | `per_experiment_query_budget` |
  |---|---|---|---|
  | FULL_EXPERIMENT_READ | D3 | 150 | 150 |
  | TARGETED_DIAGNOSIS | D2 | 60 | 60 |
  | PERIOD_IMPACT_ANALYSIS | D2 | 300 | 30 |

  For FULL_EXPERIMENT_READ and TARGETED_DIAGNOSIS runs with several experiment-version units (several
  named experiments or selected versions), the mode's per-experiment default applies to each and the
  default global budget is that value times the number of units; for a single unit the two are equal.
  PERIOD_IMPACT_ANALYSIS does not scale: discovery can return any number of units, so its default
  global budget is the table value (300) and its per-experiment default (30) caps each unit. Which
  units the global budget reaches is decided by the PERIOD spend order below. A TARGETED_DIAGNOSIS raised to D3 keeps the TARGETED defaults unless overridden, and
  depth is not lowered when a budget is exhausted.
- **Per-experiment budget** applies whenever a run has more than one experiment-version unit (PERIOD,
  several named experiments, or several selected versions). It caps the spend attributable to one unit.
  Statements are issued per unit in such runs so that spend is attributable; discovery and coverage
  probes are the exception and count toward `context` (global only).
- **Spend order:**
  1. `context` — context resolution, discovery and coverage probes, including the PAB-table coverage
     probe of each PAB-capable capability.
  2. `mandatory` — the mode's floor: Stage 1 across every selected capability and experiment, then
     Stage 2. The order is stage-major, then capability in registry order, then unit by `exp_id` ascending,
     then versions by `first_active_day`. PERIOD replaces the stage-major order with the phases below;
     within every phase, units go in candidate-priority order — tier, then proximity of the relevant
     event to onset, then `treated_share`, then discovery order (`period-evidence.md` § Candidates) —
     and, within a unit, the trigger capability first, then the others in registry order. Priority
     spends the budget on temporally and exposure-relevant candidates first; it is not an evidence or
     causal ranking.
  3. `conditional` — Stage 3+ work and follow-ups.

  **PERIOD phases** (`P0` is `context`, `P1`–`P3` are `mandatory`, `P4` is `conditional`):

  | Phase | Work |
  |---|---|
  | `P0` | context: discovery, lifecycle, annotations, `SCOPE`, scope-bounded `COVERAGE`, `ARMS`, the game-level trigger movement (Input B; deferred for a stream-origin request, see § Scope lenses and context updates) |
  | `P1` | Stage 1 of every capability that declares PERIOD `evidence` (`capability-registry.md` § Registry) for the cross-capability set |
  | `P2` | Stage 2 of the trigger capability for the cross-capability set |
  | `P3` | Stage 1 of the trigger capability for every other investigable unit (Tier 1, then 2, then 3) |
  | `P4` | follow-ups only, under the existing follow-up rules and while budget remains: evidence-capability Stage 2 under the co-movement-plus-justification rule (§ Stages and depth), and trigger Stage 2 for a `P3` unit only where its own trigger evidence justifies it — never for every `P3` unit by default |

  Work a phase cannot pay for is `NOT_TESTED` / `OUT_OF_BUDGET` at unit × capability level; the unit
  keeps its record and finding. The global (300) and per-unit (30) budgets are unchanged. Stage 1 of the
  PERIOD-evidence capabilities costs 14 statements per unit at the current registry cost estimates (2 + 1 +
  2 + 1 + 2 + 3 + 1 + 2), so `P1` costs at most `cross_capability_max_units` × 14 = 140 per lens at the
  default; the defaults (300, 30, 10) are not raised or lowered for it. With a trigger whose capability
  declares no PERIOD trigger role (`period-evidence.md` Q14; none currently) there is no trigger
  capability: `P0` and `P1` run as above, `P2` and `P3` have no work (`NOT_RUN`, reason `NO_PERIOD_ROLE`,
  no spend), and `P4` runs only the evidence-capability follow-ups.
- **Estimates and actuals:** each request carries `estimated_cost` from the registry's cost estimates;
  its `query_budget` is `min(estimated_cost, remaining)` under both budgets. `actual_cost` is the number
  of query statements observed being executed (`cost_source = OBSERVED`); an analysis's own
  `queries_executed` is used only when no observed count is available (`SELF_REPORTED`), and a
  discrepancy between the two is recorded in `unresolved` with the observed value kept.
- **When a budget runs out,** work not yet done is recorded as `NOT_TESTED` with reason `OUT_OF_BUDGET`
  and `budget_scope` `GLOBAL` or `PER_EXPERIMENT`:
  - per-experiment exhaustion affects that unit only; the others continue;
  - global exhaustion affects every unfinished item, including experiments not yet started
    (`experiments_not_tested`).
  The Master then records `STOP` with its reason and OFFERS to continue with more budget.
- **Mandatory work first.** Conditional work runs only after the mandatory floor completes and while
  both budgets still cover its estimated cost.
- **Parallel slices.** Under `dispatch_mode = PARALLEL_WORKERS` (`parallel-dispatch.md`) the resolved global and
  per-experiment budgets are multiplied by `parallel_budget_uplift` (CONFIGURABLE, default 0.20). After `context`,
  the Master holds a `conditional_reserve` of 20% of what remains; every worker gets its Stage 1 floor, and the
  surplus is shared by `metrics × (1 + cuts)`, each slice capped at the capability's demand. A worker never spends
  beyond its slice. The stage-major cut rule and the `NOT_TESTED` / `OUT_OF_BUDGET` recording are unchanged;
  `actual_cost` stays the observed statement count. Follow-up waves (`parallel-dispatch.md` § 5) are paid from the
  reserve and the slices returned unspent, at each follow-up's priced cost.
- **Two parts.** A user-origin FULL or TARGETED read is delivered in two parts (`two-part-read.md`). Totals are
  unchanged; inside `mandatory` the order is Stage 1 for every capability, then the Part 1 Stage 2 items (those that
  feed the non-appendix dashboard sections), then the remaining Stage 2 items (Part 2). A shortfall therefore cuts Part 2
  breadth first. Under parallel dispatch each slice is split into a Part 1 slice and a Part 2 slice.
- Stage-major order means a global shortfall cuts Stage 2 breadth before it drops a unit's Stage 1,
  provided the global budget covers Stage 1 for every unit. PERIOD uses its phases instead, which put
  the cross-capability set's depth before trigger-only breadth. No other allocation algorithm is
  defined.
- **Depth is never silently downgraded.** Depth stays as assigned; unfinished work is listed, never
  dropped.

## Period configuration — CONFIGURABLE

| Setting | Default | Meaning |
|---|---|---|
| `delay_extension_days` | 7 | days added before `comparison_window.start` to set `lookback_start` (`period-evidence.md`); one value for every capability, never capability-specific |
| `arm_share_step_pp` | 5 | exposure proxy: day-over-day change in an arm's share of unit DAU, in percentage points, that counts as an `ARM_SHARE_STEP` event |
| `exposure_change_pct` | 10 | exposure proxy: unit segment-to-segment DAU movement relative to the platform median, in percent, that counts as an `EXPOSURE_SHIFT` event |
| `min_reference_units` | 3 | exposure proxy: fewer reference units on the `(gid, cli)` leaves `exposure_stability = UNDETERMINED` |
| `cross_capability_max_units` | 10 | the number of investigable units, filled in candidate-priority order across tiers, that receive every capability declaring PERIOD evidence |

The three exposure-proxy values are initial configuration decisions from one game's observation, not
statistically established thresholds (`period-evidence.md` § Candidates); review them per game.

Resolution order as for the budgets: `REQUEST_OVERRIDE` → `CONFIG` → `DEFAULT`; a value that is not a
non-negative integer is ignored, stated, and the next source is used.

## Follow-ups

```
Followup = { followup_id,
             source: ANALYSIS_SUGGESTED | MASTER_DETECTED | USER_REQUESTED,
             triggering_finding_id?,       # required unless USER_REQUESTED; never manufactured
             triggering_result_ref?,       # USER_REQUESTED only: the result_id of an existing
                                           # result_ledger entry
             user_request?: {text, turn_ref},          # USER_REQUESTED only; verbatim
             context?: {exp_id, version, metric, scope, analysis_window},   # USER_REQUESTED: read
                                           # from the referenced result, never re-entered
             reason, expected_evidence,
             capability, purpose: ANALYSIS | PAB_CHECK,
             scope: {scope_signature, pair_ids[], cuts[], stage: STAGE_2 | STAGE_3_PLUS},
             budget_cost,                  # estimated statements: registry cost estimates × scope
             status: PENDING | SCHEDULED | DONE | REJECTED | OFFERED | NOT_TESTED }
```

- A follow-up is created only with `reason`, `expected_evidence`, a `scope` from which `budget_cost`
  can be computed, and its trigger: `triggering_finding_id` for `ANALYSIS_SUGGESTED` and
  `MASTER_DETECTED`, or `triggering_result_ref` for `USER_REQUESTED`. Otherwise it is not created.
- `scope.scope_signature` is the canonical scope the follow-up runs in (§ Scope lenses and context
  updates); a follow-up never runs under another scope. For `USER_REQUESTED` it is the referenced
  result's scope.
- **`USER_REQUESTED`** is an explicit user request to investigate a specific result further ("check the
  segments", "check the daily consistency"). `triggering_result_ref` must be the `result_id` of an entry
  already in `result_ledger`, including a non-computed one; a reference is never invented, and no
  capability Finding is manufactured for it. The user's words are recorded in `user_request`; they
  permit the work and are never evidence. The follow-up then goes through the same decision, depth,
  phase and budget rules as any other, and its new results get their own `result_id`s; the referenced
  result is unchanged. A general "go deeper" is a depth upgrade (`depth-policy.md`), not a `Followup`.
- **A request that targets a result not yet produced** (for example a first-turn "give me the PAB read
  for experiment X") first runs the normal analysis for the mode; the follow-up is then created
  referencing the `result_id` that analysis produced. If no result can be referenced, no follow-up is
  created, and the reason is stated.
- Analyses only suggest (`followups[]` in the response, recorded as `ANALYSIS_SUGGESTED`); they never
  execute one. The Master decides and records the decision with its reason.
- No fixed number of rounds exists; the loop is bounded by the budgets, the depth and new evidence.
- A follow-up that repeats a query already in the ledger is `REJECTED` with that reason.
- PAB runs in Stage 1 under `purpose: ANALYSIS` (`capability-registry.md` § PAB), so it is no longer a
  follow-up. A `PAB_CHECK` is only a `USER_REQUESTED` re-check of one existing result: it bypasses nothing
  (the capability's PAB methodology, eligibility, coverage, data and budget rules apply unchanged), and a
  methodology input that is `CONFIG_REQUIRED` or `TBD` is reported as that status; no PAB result is
  fabricated. It is costed from the registry's PAB re-check statements, carries the stage of its trigger,
  and runs only if the depth allows that stage and both budgets cover it.

## Scope lenses and context updates

**Every mode.** The requested scope is resolved once per request (`protocols/context-resolution.md`
step 2b) from the user's segment phrases (`segment_ref` in FULL and TARGETED, `scope_refs` in PERIOD)
or, for a stream-origin request, from its pre-validated scope:

```
RequestedScope = { requested: [{phrase, dimension?, values[]?,
                                status: RESOLVED | RESOLVED_VALUE_GROUP | UNRESOLVED, basis}],
                   unit_selection: {cli?},             # a platform word selects units; not a cell filter
                   canonical: [{dimension, values[]}],  # empty = overall
                   per_capability: [{capability, status: SUPPORTED | UNSUPPORTED | UNAVAILABLE,
                                     dimension_status: [{dimension, status, reason?}]}] }
```

- Every request has `scope_lenses[]` with `L1` = the canonical requested scope (overall when none),
  `origin: REQUESTED`. A user-origin request has exactly this one lens in every mode. Only a
  stream-origin request can add refinement lenses (below).
- `L1` is sent as `AnalysisRequest.scope` to every selected capability for every unit, in every mode
  (`analysis-contract.md` § Scope). Nothing is broadened or substituted: an `UNRESOLVED` phrase blocks
  scoped evidence until it is resolved, `UNSUPPORTED` / `UNAVAILABLE` / `NO_SCOPED_EXPOSURE` are stated
  per capability and unit, and no unscoped figure is produced in place of a scoped one.
- **`scope_signature`** = dimensions sorted a–z, each `dimension=` followed by its values trimmed,
  case-folded, de-duplicated and sorted and joined by `|`, entries joined by `;` (empty scope = the empty
  string). It is defined here identically to `brian-master/references/evidence-streams.md`, so a
  user-origin request does not depend on that file. In a lens record and the lens dedupe key a `cli`
  entry is included, as unit selection; in a result key it is excluded (§ Results and meaningfulness).
- **`lens_id`** is a request-local label for one admitted canonical scope (`L1`, `L2`, `L3`). It is not
  an identity key, is not stable across requests and is never a reason to pool. Within a request
  `lens_id` and `scope_signature` map one-to-one (equal scopes are `DUPLICATE`), so records key on the
  canonical scope, and `lens_id` is found by looking up a record's `scope_signature` in `scope_lenses[]`.

**Stream-origin request only** (`origin: COMPANION_STREAM`; contract in
`brian-master/references/evidence-streams.md`): the phase ceiling, refinement lenses and ContextUpdates
below. Without `investigation_context`: one lens, `phase_ceiling = EVIDENCE`, no updates.

- **Phase ceiling.** `DISCOVERY` runs P0 context only and stops. Input B is not resolved. P1–P3 are
  recorded `NOT_TESTED` with reason `PHASE_CEILING`, which is an orchestration state: it has no
  `budget_scope` and changes no budget. The result returns `tier1_count`, the Tier-1 units among
  investigable units under lens 1 (Tier 1 is a timing and exposure ordering only, `period-evidence.md`
  § Candidates). `EVIDENCE` runs P0–P4. Raising the ceiling for the same `request_id` continues at P1 on
  the stored P0 state: discovery, lifecycle, annotations, arms and design, windows and candidate ranking
  are never recomputed.
- **Lenses.** A lens is one canonical scope under which scope-dependent evidence is produced. At most 3,
  including `L1`, the requested scope (overall when none), which always takes slot 1. Every other lens
  is a proper refinement of an existing lens (it adds a dimension or narrows a dimension's values);
  a scope equal to an existing lens is `DUPLICATE`; an empty intersection is `UNRESOLVED_SCOPE`. A lens
  keeps every dimension of the requested scope. Dedupe key `(request_id, scope_signature)`; among updates
  sharing a signature the lowest `seq` is the holder and the rest are `DUPLICATE`, whatever order they
  were delivered in (an early `DUPLICATE` is revised if a lower-`seq` update arrives later).
- **Validation.** Each update's scope is validated against the live `SCOPE` probe
  (`protocols/context-resolution.md` step 2b). A scope that no capability and table can read for any
  investigable unit (`UNSUPPORTED`, `UNAVAILABLE`, `UNRESOLVED_SCOPE`, `NO_SCOPED_EXPOSURE`) does not
  consume a lens and is recorded with its reason; it is never broadened.
- **Admission is made on the closed update set.** Updates are validated and recorded as they arrive and
  applied at phase boundaries (one writer), but admitted only once the set is closed. Valid candidates
  rank by dimension count (more first), then the update's `contribution_pct` (higher first), then `seq`;
  they fill the remaining slots and the rest are `NOT_TESTED` with reason `LENS_CAP`. A lens never
  restarts the investigation: only scope-dependent work runs for it (scoped `COVERAGE`, Stage 1 and 2
  evidence, correlation, the evidence record).
- **Order and budget.** P0 once; then P1–P3 for each admitted lens in ordinal order; P4 for all lenses
  only after the update set is closed. The spend order (`context → mandatory → conditional`), the global
  and per-experiment budgets and their defaults are unchanged and shared by all lenses; spend is
  attributed to `lens_id` for reporting only. Lenses run in that deterministic order and each spends only
  what both budgets still cover: work a lens cannot pay for is `NOT_TESTED` / `OUT_OF_BUDGET` for that
  lens, unit and capability, recorded and offered; no lens is dropped, narrowed or reordered, and no
  budget is raised. With every capability declaring PERIOD evidence, a later lens can be partly or wholly
  `NOT_TESTED` at the default budgets.
- **Keyed records.** `evidence_status`, `scope_coverage`, each `AnalysisRequest` scope, each
  `PeriodEvidenceRecord`, each `game_movement` entry and each `result_ledger` entry are per unit and
  canonical scope (`scope_signature`); the lens is a request-local label. Lenses are never pooled, and
  one canonical scope is sent identically to every capability for a unit.
- **Input B.** Resolved once the update set is closed, per lens; not at all for a run that stops at
  `DISCOVERY`. A `game_movement_candidates` entry that matches the lens in metric, scope, impact period
  and comparison period is reused: `source: STREAM_A_EXTRACTION`, no request, no spend. Otherwise the
  existing game-level request runs (`source: EM_D0_REQUEST`). `definition_alignment` follows
  `period-evidence.md` § Input B, unchanged. Either way it is Layer A trigger movement.
- **Context is not evidence.** `investigation_context` never enters `analysis_requests`,
  `analysis_responses` or `findings_ledger`. Only the lens scope and the period fields shape requests.
  A metric analyst's findings, attribution and causation flags are not accepted at all.
- **Dispositions** recorded in `context_updates[]`: `ACCEPTED_LENS`, `DUPLICATE`, `UNSUPPORTED`,
  `UNRESOLVED_SCOPE`, `NO_SCOPED_EXPOSURE`, `LENS_CAP`, `OUT_OF_BUDGET`, `DEFERRED_BY_CEILING`.
  `TRIGGER_REVISION` re-resolves the trigger (`period.trigger`) without a new lens or a restart.

## Results and meaningfulness

Every result the Master reports gets one `result_ledger` entry, in every mode, written when the Master
ingests the capability response. The capability response keeps the statistical evidence; the ledger
entry points to it and holds the Master's meaningfulness classification. Statistical significance and
meaningfulness are separate: significance alone never makes a movement meaningful, and its absence
never makes one meaningless.

```
ResultEntry = { result_id,
                key: {exp_id, version, capability, metric, pair_id, scope, cut?, analysis_window},
                parent_result_id?,             # breakdown cell only: the result_id of the same key
                                               # without cut
                mode, analysis_window_basis,   # origin context only; never part of the key
                evidence_ref?: {request_id, metric, pair_id, cut?,
                                source: COMPARISON_RESULT | FINDING | CUT},   # where the evidence is
                state: COMPUTED | NOT_IN_TABLE | NO_SCOPED_EXPOSURE | INSUFFICIENT_DATA |
                       UNSUPPORTED_FOR_SCOPE | NOT_TESTED | NOT_RUN | NO_COMPARISON,
                state_ref?,                    # the data condition, metric_status entry, quoted probe
                                               # or stopped request that explains a non-computed state
                meaningfulness: Meaningfulness,    # classified on the PAB-adjusted interval where PAB exists
                correlation?: {reference: {type: EXPERIMENT_TRIGGER | GAME_TRIGGER | NONE, ref?},
                               label},         # PERIOD only (period-evidence.md)
                outcome?: ANSWERED | INSUFFICIENT_EVIDENCE | DATA_UNAVAILABLE |
                          NO_DATA_FOR_SEGMENT | UNSUPPORTED,
                descriptive: bool }            # true when the answer is descriptive only

Meaningfulness = { classification: MEANINGFUL | NO_MEANINGFUL_MOVEMENT | INSUFFICIENT_EVIDENCE
                                   | NOT_CLASSIFIED | NOT_APPLICABLE,
                   reason?: NO_CELL_STATISTIC | NOT_COMPUTABLE | NOT_COMPUTED | REFERENCE_ZERO
                           | REFERENCE_NON_POSITIVE,   # Economy net only (E1)
                   metric_class: GENERAL | RETENTION,
                   basis: PAB_ADJUSTED | OBSERVED_NO_PAB,   # the interval the rule read (†)
                   reading: UPSIDE | DOWNSIDE | NEUTRAL,    # reader label (§ Reading labels)
                   adjusted?: {value, ci_low, ci_high, conf, old_share,   # from the response's pab[].adjusted, or the
                               unit: RELATIVE_PCT | BPS},      # observed interval when OBSERVED_NO_PAB
                   threshold_applied?: {value, unit: RELATIVE_PCT | BPS,
                                        source: USER_STATED | DEFAULT_LINE, evidence_ref?,
                                        conf_bar},
                   rule_applied?: CI_BEYOND_LINE | CI_WITHIN_LINE | CONF_AND_SIZE | CONF_BELOW_BAR,
                   threshold_limitation?: USER_THRESHOLD_NOT_PROPAGATED }
```

**Result identity.**

- The key uses existing fields only. `metric` is the capability's `definition_lock` name. `pair_id` is
  the canonical `<comparator>_vs_<reference>` of the context's comparison
  (`experiment-classification.md` § Pairing; `NONE` for a `NO_COMPARISON` descriptive result), never an
  ordinal or display label. `scope` is the canonical cell scope with every `cli` entry removed (the
  platform is already in `exp_id`; empty = overall). `cut` is the breakdown cell, if any.
  `analysis_window` is the response's `windows.analysis_window`.
- **Empty analysis window:** when `analysis_window` has no days, its key value is the sentinel
  `start = "empty"`, `end = "empty"` — never null or omitted — so every empty window of the same key
  gives one identity. The sentinel identifies the result only; it never makes an empty window
  analysable (the result's state follows the table below).
- `result_id` is the canonical JSON array, with no whitespace, of `[exp_id, version, capability, metric,
  pair_id, scope_signature(scope), scope_signature(cut) or "", analysis_window.start,
  analysis_window.end]`, every value as stored (dates as `YYYY-MM-DD`). It is deterministic: rebuilt
  from the same key in any mode, request order, lens or later turn it is the same string. It survives
  serialization and is never an array position or response index.
- `mode` is not in the key: the same experiment, version, capability, metric, pair, scope, cut and window
  is the same result whether it came from PERIOD, FULL or TARGETED. Within a run an existing entry is
  reused, never duplicated. `lens_id` is never part of the key.
- An item gets a `result_id` once it resolves to a full key, even when no statistic can be produced. An
  item that never resolves to one gets none: a metric with no capability is recorded in `unresolved` as
  `NO_CAPABILITY`, an unresolved segment phrase as `UNRESOLVED_SCOPE` with its question in
  `open_questions` and a `CLARIFICATION_REQUIRED` element in `request_accounting`, and a capability
  not dispatched for a unit stays in `selected_capabilities` with its coverage, budget or unsupported
  status. No statistic is fabricated, nothing is zero-filled, no overall figure stands in for a segment
  and no other definition stands in for a metric.

**Breakdown cells.**

- A cell result has the key with `cut` and a `parent_result_id`. It gets its own `result_id` whenever
  the Master records it, statistical or descriptive.
- A cell `comparison_results[]` entry (`analysis-contract.md` § Breakdown cells) is classified on its own
  returned CI, like any result. A cell that the capability reports only descriptively (`findings` or
  `cuts`) is `COMPUTED` with `evidence_ref` to that finding or cut, and its meaningfulness is
  `NOT_CLASSIFIED` with reason `NO_CELL_STATISTIC`. A cell with no data follows the states below.
- The Master never computes a cell statistic. A cell never replaces, alters or relabels its parent, and
  cells are never correlated with each other or with their parent.

**Metric class and scale.**

- `RETENTION` = the metrics of the `retention` capability (Rolling Retention) and of the
  `classic_retention` capability (each `classic_retention_dX`). Every other metric is `GENERAL`,
  whatever its display unit; a rate or share metric is not `RETENTION` by being a rate. The LTV & LTDays
  metrics (`ltv_dX`, `ad_ltv_dX`, `iap_ltv_dX`, `ltdays_dX`) are `GENERAL`, and so are the Rolling LTV
  metrics (`rolling_ltv_d7`, `iap_rolling_ltv_d7`, `ad_rolling_ltv_d7`) and the Economy metrics (six per
  `cash_type`, `analyses/economy.md`).
- `GENERAL` is judged on relative change: the point estimate is `delta_pct_of_reference`, and each CI
  bound is divided by `reference_value` (× 100). Where `reference_value` is negative (Economy
  `spend_per_dau`, which keeps the source's sign, negative for most currencies, `analyses/economy.md`
  E3), the two divided bounds are reordered so the lower comes first; a positive relative change then
  means the negative quantity grew in magnitude. The line is unchanged. `RETENTION` is judged on
  absolute change in the rate, in basis points: `delta_abs` and the CI bounds × 10,000. Where PAB exists
  the point estimate and bounds are the adjusted ones (`pab[].adjusted`), in the same unit.
- The bands apply to the size of the movement in either direction.

**Thresholds.**

- **User-stated** (`request.extracted.threshold_refs`): applies to this request only and never changes a
  metric's global definition. A threshold naming a metric applies to that metric; one naming none
  applies to every metric on its scale (a percentage to `GENERAL`, basis points or percentage points to
  `RETENTION`). A retention threshold with an ambiguous unit ("0.5%") is asked about once: percentage
  points or relative. A user-stated threshold replaces the line for its metrics; the Conf bar is unchanged.
- **Default line** — CONFIGURABLE (`stats_config.meaningful_line_pct`, `meaningful_line_bps`, `conf_bar`):

  | Class | Meaningful line | Conf bar |
  |---|---|---|
  | `GENERAL` (relative change) | 1% | Conf above 85% |
  | `RETENTION` (absolute, bps) | 10 bps | Conf above 85% |

  Any movement above the line is meaningful, and Conf above the bar counts as sufficient evidence. There
  is no grey band: the rule below always ends in a final class.
- **Stream-origin request:** the stream contract carries no threshold. `threshold_refs` is always
  empty: wording forwarded in `trigger_phrase`, `unresolved_phrases[]` or any other stream field is
  never promoted to a `USER_STATED` threshold, even when it reads like one. Only the default line
  applies, and every result records `threshold_limitation: USER_THRESHOLD_NOT_PROPAGATED`. This is a
  standing limitation, never a claim that a user threshold was applied. A user-origin request uses
  `USER_STATED` thresholds as above.
- `threshold_applied` always records the value, unit, source (with the user's words as `evidence_ref`)
  and the Conf bar, so the classification is auditable.

**Classification** (only a `COMPUTED` statistic with a returned interval is classified). The interval is
the PAB-adjusted one where PAB exists (`pab[].adjusted`, `basis = PAB_ADJUSTED`) and the observed 95%
interval otherwise (`basis = OBSERVED_NO_PAB`, †). Let `L` be the line, `lo` and `hi` the interval bounds,
`v` the adjusted (or observed) point value and `conf` its Conf, all in the metric's own unit:

1. `lo > L` or `hi < −L` (the whole interval beyond the line, in one direction) → `MEANINGFUL`
   (`CI_BEYOND_LINE`).
2. `lo > −L` and `hi < L` (the whole interval inside the line) → `NO_MEANINGFUL_MOVEMENT`
   (`CI_WITHIN_LINE`). Only for `GENERAL`; `RETENTION` has no such band.
3. Otherwise, `conf > conf_bar` and `|v| ≥ L` → `MEANINGFUL` (`CONF_AND_SIZE`); `conf > conf_bar` and
   `|v| < L` → `NO_MEANINGFUL_MOVEMENT` (`CONF_AND_SIZE`).
4. Otherwise (`conf ≤ conf_bar`, or `conf` missing) → `INSUFFICIENT_EVIDENCE` (`CONF_BELOW_BAR`).

- A user-stated threshold changes `L` only. No CI-width cutoff and no other numerical threshold is
  introduced, and "the CI includes zero" is never an automatic rule.
- `INSUFFICIENT_EVIDENCE` means the required data exists and the analysis is valid, but the evidence is
  too uncertain to tell a meaningful movement from noise. It is never used for work that did not run.
- Absolute-unit metrics with no relative form (Economy `net_per_dau`) and results with
  `reference_value = 0` stay `NOT_CLASSIFIED` (table below).

**Reading labels.** `reading` is the reader-facing word, derived from the class and the sign of `v`:
`MEANINGFUL` and `v > 0` → `UPSIDE`; `MEANINGFUL` and `v < 0` → `DOWNSIDE`; every other class
(`NO_MEANINGFUL_MOVEMENT`, `INSUFFICIENT_EVIDENCE`, `NOT_CLASSIFIED`) → `NEUTRAL`. Higher is treated as better for
every metric, so Upside and Downside are direction, not a business verdict. The class stays in the ledger
and the tooltip. A result that did not run has no reading (state table below).

**States and outcomes.** Every result ends in an explicit state.

| State | When | Meaningfulness | Outcome |
|---|---|---|---|
| `COMPUTED` | a computed statistic with a CI | classified (above) | `ANSWERED`, or `INSUFFICIENT_EVIDENCE` |
| `COMPUTED` | a descriptive-only breakdown cell | `NOT_CLASSIFIED` / `NO_CELL_STATISTIC` | `ANSWERED` (descriptive) |
| `COMPUTED` | a `GENERAL` metric whose `reference_value` is 0 (relative change undefined) | `NOT_CLASSIFIED` / `REFERENCE_ZERO` | `ANSWERED` (descriptive) |
| `COMPUTED` | Economy `net_per_dau` whose `reference_value` is ≤ 0 (relative change undefined; `analyses/economy.md` E1, Economy only) | `NOT_CLASSIFIED` / `REFERENCE_NON_POSITIVE` | `ANSWERED` (descriptive) |
| `NO_COMPARISON` | a single-arm unit | `NOT_APPLICABLE` | `ANSWERED` (descriptive) |
| `INSUFFICIENT_DATA` | `NOT_COMPUTABLE_ZERO_VARIANCE`: the exact observed difference is reported, with no CI and no p-value | `NOT_CLASSIFIED` / `NOT_COMPUTABLE` | `ANSWERED` (descriptive) |
| `INSUFFICIENT_DATA` | `NOT_COMPUTABLE_DF_LT_1` or no paired days (for Classic Retention and LTV & LTDays: fewer than 2 paired install cohorts, or none) | `NOT_CLASSIFIED` / `NOT_COMPUTABLE` | `DATA_UNAVAILABLE` |
| `NOT_IN_TABLE` | a pinned row, named metric or base action absent; a measure with no matured days (`state_ref` reason `NOT_MATURED`; for Classic Retention and LTV & LTDays, no eligible install cohort mature for that day or horizon) | `NOT_CLASSIFIED` / `NOT_COMPUTED` | `DATA_UNAVAILABLE` |
| `NO_SCOPED_EXPOSURE` | no rows for the scope in the unit | `NOT_CLASSIFIED` / `NOT_COMPUTED` | `NO_DATA_FOR_SEGMENT` |
| `UNSUPPORTED_FOR_SCOPE` | the capability does not support the scope for the metric | `NOT_CLASSIFIED` / `NOT_COMPUTED` | `UNSUPPORTED` |
| `NOT_RUN` | dependent work not run because its base is absent (for example diagnostics without `clear`) | `NOT_CLASSIFIED` / `NOT_COMPUTED` | `DATA_UNAVAILABLE` |
| `NOT_TESTED` | budget or phase ceiling | `NOT_CLASSIFIED` / `NOT_COMPUTED` | none: "not run" with its reason and an offer |

**Correlation (PERIOD).** The movement and correlation labels of `period-evidence.md` are attached to the
evidence result's ledger entry, with the trigger result's `result_id` as the reference
(`EXPERIMENT_TRIGGER`), the game-level movement record (`GAME_TRIGGER`), or `NONE`. Correlation is a
separate dimension: it never changes a classification, and a result can be `MEANINGFUL` while its
correlation is `NOT_ESTABLISHED`. Results are correlated only when their keys are identical apart from
capability and metric, with no `cut`. A non-computed state maps to the existing labels: `NOT_IN_TABLE` →
`NOT_IN_TABLE`; `INSUFFICIENT_DATA` → `INSUFFICIENT_DATA`; `UNSUPPORTED_FOR_SCOPE` →
`UNSUPPORTED_FOR_SCOPE`; `NOT_TESTED` → `NOT_TESTED`; `NOT_RUN` → `NOT_RUN`; `NO_SCOPED_EXPOSURE` →
`NOT_IN_TABLE` (reason: no scoped exposure). When no reference direction is established (neither the
experiment-level trigger nor the game-level fallback, `period-evidence.md`), a label that needs one is
`NOT_ESTABLISHED`, with the reference's state as the reason.

## Request accounting

Records the requested segment and any overall result shown in its place while the segment is pending
(`protocols/context-resolution.md` step 2b). Other request elements keep the existing records
(`unresolved`, `open_questions`, `selected_capabilities`).

- A requested segment is a `SEGMENT` element. While its phrase is `UNRESOLVED` its `outcome` is
  `CLARIFICATION_REQUIRED` and `question_ref` points to its `open_questions` entry; nothing
  scope-dependent runs or spends budget for it. Once resolved, its `outcome` is that of its results.
- An overall result shown after the user explicitly accepts the offer is a separate `OVERALL_OPT_IN`
  element. Its results have their own `result_id`s with an empty scope, it is labelled "Overall (all
  users) — not the requested segment", and it never changes the `SEGMENT` element, which stays
  `CLARIFICATION_REQUIRED` until the segment is resolved.

## Unresolved items

`kind` is one of: `BLOCKED`, `NOT_TESTED`, `NOT_IN_TABLE`, `UNRESOLVED_DESIGN`, `UNRESOLVED_SCOPE`,
`CONFIG_REQUIRED`, `TBD`, `UNCONFIRMED`, `NO_CAPABILITY`, `NO_GAME_LEVEL_COUNTERPART`,
`COST_DISCREPANCY`, `UNSUPPORTED`. `NOT_TESTED` carries a `reason` (`OUT_OF_BUDGET`, `PHASE_CEILING`,
`LENS_CAP`, or the depth that disallowed it) and, for budget, a `budget_scope`. `UNSUPPORTED` carries a
`reason`; Classic Retention uses `VERSION_SEMANTICS_UNKNOWN` (an explicitly requested negative version,
never dispatched; an unrequested one is `SKIPPED_NOT_AUTO_SELECTED`, not `UNSUPPORTED`),
`RETENTION_DAY_UNSUPPORTED` (D0, a day above D30, or a rolling day other than D1/D3) and `NO_PAB` (a
requested PAB check). LTV & LTDays uses `VERSION_SEMANTICS_UNKNOWN` and `SKIPPED_NOT_AUTO_SELECTED` the
same way, `HORIZON_UNSUPPORTED` (a horizon outside D1, D3, D5, D7, D10, D15, D21, D30, D45, D60, D90,
D120, D180), and `NO_PAB`. Rolling LTV uses `VERSION_SEMANTICS_UNKNOWN` and `SKIPPED_NOT_AUTO_SELECTED`
the same way, and `HORIZON_UNSUPPORTED` (any horizon other than D7). Rolling LTDays and predicted LTV /
LTDays are `NO_CAPABILITY`. Economy uses `VERSION_SEMANTICS_UNKNOWN` and `SKIPPED_NOT_AUTO_SELECTED` the
same way; an Economy balance or per-user currency rate is `NO_CAPABILITY` in V1. `NO_PERIOD_ROLE` is
reserved for a trigger whose capability declares no PERIOD trigger role (`period-evidence.md` Q14); no
capability does currently. `BLOCKED` follows the protocol grammar and quotes its probe. `NO_COMPARISON`
is a design status, not an unresolved item.

**Data conditions.** What an analysis reports in `data_conditions[]` (`analysis-contract.md`) is stored
with its response and carried to the answer. These are descriptive observations, not unresolved kinds:
`MISSING` is not an unresolved `kind`, and an unobserved cut-level cell is never recorded as
`NOT_IN_TABLE`. `NOT_IN_TABLE` stays the coverage result for an absent `(exp_id, version)`. The
cohort-grain conditions of Classic Retention and LTV & LTDays (`VARIANT_COHORT`, `VARIANT_COHORT_DAY`,
and Classic Retention's `ABSENT_ROW_LATER_DIFF` exception) are stored and reported the same way. Rolling
LTV's two rules — zero Independent revenue with NULL forward users read as `MISSING` (known defect), and
NULL revenue with zero forward users read as zero (`analyses/rolling-ltv.md`) — belong to that capability
and apply nowhere else.

## Visual requirements

The Master records what each visual must show and which findings feed it. `game-viz-design` renders;
the Master writes no chart code. `required_by` is `DEPTH_FLOOR` (SR-22) or `MASTER_CHOICE`.
`evidence_refs[]` lists the `result_id`s the visual draws on (and the `source_ref` of each context
layer), and `date_axis` its one date axis. Each requirement is handed to `game-viz-design` as
`VisualEvidence`, built from the ledger, the stored responses and their `observations`
(`references/visual-evidence.md`); no query is run to draw a visual.

## Invariants

- One writer; analyses never mutate state.
- Findings enter the ledger exactly as returned.
- `design.status` and `annotation_status` stay independent of each other.
- The reference arm is read from the context, never re-selected.
- PAB is never a domain, capability or mode; it runs in Stage 1, and a PAB check is only a user-requested re-check.
- Every request, dispatch, response, comparison result and finding carries both `exp_id` and `version`.
- Maturity is read from `windows.mature_analysis_window` in the response; it is never inferred from
  `freshness` or `analysis_window`.
- Meaningfulness is classified only by the Master, only from statistics a capability returned; analyses
  never classify. `result_id` is deterministic and mode-independent, excludes `cli` and `lens_id`, and a
  breakdown cell never alters its parent result.
- Stream-origin context is context, never evidence; scope lenses are never pooled and scope is never
  broadened; `phase_ceiling` is not a budget; `context_updates[]` is append-only; a stream-origin request
  is never returned to `brian-master` routing.
