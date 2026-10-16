# Period evidence — PERIOD_IMPACT_ANALYSIS

Two independent evidence streams, never mixed:

- **A. Experiment-level evidence** — the `experiment.*` tables, through the analysis capabilities
  (`references/analysis-contract.md`).
- **B. Game-level period movement** — the existing BRIAN game-metric analysis, requested at D0.

Experiment-level results are never summed across experiments or versions: users overlap, so a sum
counts the same users and revenue more than once. Game-level movement is never reconstructed from the
experiment tables. Each experiment-version gets its own evidence record.

A PERIOD question such as "Revenue/DAU dropped between Sep 20 and Sep 25 — which experiments could
explain it?" is answered with **candidates**: experiment-versions whose lifecycle has a plausible
temporal relationship to the movement. A candidate is a timing and exposure observation, never a cause.
An experiment can be a candidate without starting near the impact: one that started earlier, ramped
and reached stable allocation before the impact, one that shipped or was killed shortly before it, and
one that has run at stable allocation throughout are all candidates (§ Candidates).

## Impact period, onset and lookback

| Term | Definition |
|---|---|
| `impact_window` | the period the user names as the movement (`requested_period`; e.g. Sep 20–25) |
| `onset` | the user-stated start of the movement when given (`onset_basis = USER_STATED`, e.g. "started dropping around Sep 22" → Sep 22); otherwise `impact_window.start` (`onset_basis = PERIOD_START_DEFAULT`). Never inferred from metric movement, and its absence is never a reason to ask |
| `comparison_window` | the period the movement is measured against: a user-stated one when given; otherwise the equal-length period immediately preceding `impact_window` (Sep 20–25 → Sep 14–19), anchored per SR-5 and SR-7 when the period is a calendar unit |
| `delay_extension_days` | CONFIGURABLE, default 7 (`master-state.md` § Period configuration); one value for every capability |
| `lookback_start` | `comparison_window.start − delay_extension_days` (Sep 14 − 7 → Sep 7) |
| `candidate_discovery_window` | `[lookback_start, impact_window.end]`, within D-2 (Sep 7 → Sep 25) |

The lookback has two parts. The comparison-window part is principled: an exposure change from the start
of the comparison window onward can move the impact-vs-comparison delta, while a change before it is
present in both windows. The `delay_extension_days` part covers delayed, cumulative and cohort-ageing
effects. Units whose discovered first day equals `lookback_start` may be left-censored; their true first
active day comes from the bounded `LIFECYCLE` probe, not from a wider scan
(`protocols/context-resolution.md`).

## Windows

These windows are kept separate and never collapsed. An experiment being active during the impact
window does not make every day stable or analytically mature.

| Window | Scope | Meaning | Owner |
|---|---|---|---|
| `impact_window` | period | the user's requested impact period (`requested_period`); the governing game-level movement window | the request |
| `comparison_window` | period | the equal-length anchored comparison period (above) | the request / this file |
| `candidate_discovery_window` | period | `[lookback_start, impact_window.end]`: used to discover and classify candidates only | this file |
| `experiment_active_window` | unit | first to last active day of the version inside the `candidate_discovery_window` | discovery (`protocols/context-resolution.md`) |
| `stable_window` | unit | the post-ramp period of stable allocation: a window, `empty` or `unknown`; the record preserves which | `protocols/context-resolution.md`, from the annotations |
| `experiment_evidence_window` | unit | `candidate_discovery_window ∩ experiment_active_window ∩ stable_window`, within D-2: the days on which experiment-level evidence for the candidate is gathered, including the pre-end days of a version that shipped or was killed | `protocols/context-resolution.md` |
| `impact_overlap_window` | unit | `impact_window ∩ experiment_active_window`: descriptive only; never an evidence window and never confused with `experiment_evidence_window` | `protocols/context-resolution.md` |
| `analysis_window` | unit | unchanged capability-contract meaning: the days the capability analyses. In PERIOD mode the Master passes `experiment_evidence_window` as the `analysis_window` and records `analysis_window_basis = EXPERIMENT_EVIDENCE_WINDOW`; the global meaning of `analysis_window` and the capability contract are not changed | `context-schema.md`, `analysis-contract.md` |
| `mature_analysis_window` | unit, per measure | the span of the analysis window on which each measure is matured, as the analysis reports it | the analysis response (`analysis-contract.md`) |

Experiment-level evidence is never presented as impact-window evidence by default. For each unit the
answer states how many evidence days fall in the lookback (`[lookback_start, comparison_window.start)`),
the `comparison_window` and the `impact_window`.

The Master never infers maturity from `freshness` or from `analysis_window`. A response without
`windows.mature_analysis_window` is recorded in `unresolved` as `UNCONFIRMED` for that capability, and
the record carries no mature window for it.

## Candidates

**Unit.** Every candidate is one experiment-version `(gid, cli, exp_id, version)`. Versions are never
pooled: a superseded version whose lifecycle event falls in the `candidate_discovery_window` stays in the candidate
context as its own unit and is never merged with the version that succeeds it. Lifecycle, timing,
allocation, analysis, evidence and conclusions are all per unit.

**Definition.** A unit is a candidate when it is active on at least one day of `impact_window`, or has a
lifecycle event within `candidate_discovery_window`. Lifecycle events are: version start, version end, allocation
change, ship and kill. Discovery over the `candidate_discovery_window` returns every unit active on at least one
of its days; each is classified below.

**Lifecycle block** (per unit, `context-schema.md`). Each field carries its basis: `OBSERVED` (the
experiment tables), `ANNOTATED` (`charts_annotations`), `PROXY` (an estimate, never called the observed
value) or `UNKNOWN`.

| Field | Source and basis |
|---|---|
| `observed_first_active_day`, `left_censored` | `DISCOVERY` (`OBSERVED`); `left_censored = true` when it equals `lookback_start` |
| `true_first_active_day` | the `LIFECYCLE` probe for left-censored units (`OBSERVED`, within the history the table retains); otherwise the observed first day; `UNKNOWN` when unresolved |
| `last_active_day`, `active_on_impact_end` | `DISCOVERY` (`OBSERVED`), within the `candidate_discovery_window` |
| `allocation_events[]` | mapped `Experiments` annotations (`ANNOTATED`), each with `mapping: DATE_ALIGNED | AMBIGUOUS` |
| `stable_allocation_start` | the start of `stable_window` (`ANNOTATED`; `UNKNOWN` when `stable_window` is unknown) |
| `end_type` | `SHIPPED` (with the arm) · `KILLED` · `ENDED_UNKNOWN` · `RUNNING`, by the fixed rule in `annotations.md` on the version's mapped end annotation (`ANNOTATED`); `ENDED_UNKNOWN` without one; `RUNNING` when active on `e` (`OBSERVED`) |
| `treated_share` | share of the unit's users in comparator arms: the annotation allocation % (`ANNOTATED`), otherwise the comparator arms' share of arm DAU over the unit's active days in the `candidate_discovery_window` (`PROXY`) |
| `version_boundaries` | the predecessor's last day and the successor's first day of the same `exp_id` (`OBSERVED`). A version boundary is not by itself an allocation change; where one is used as allocation evidence it is labelled `PROXY` |
| `allocation_stability` | `ANNOTATED` only when a `DATE_ALIGNED` allocation annotation positively documents the allocation in force for the unit (its start or latest allocation change); otherwise `UNKNOWN`. It records what is documented, never that no later change occurred: absence of an annotation is never positive evidence of allocation stability |
| `exposure_stability` | `STABLE` · `CHANGED` · `UNDETERMINED`, always `PROXY`: the exposure-proxy policy below applied to the unit's daily arm DAU from `experiment.dau` |
| `exposure_events[]` | the proxy's detected exposure events in `[L, e]`, each `{day, signal: ARM_SHARE_STEP | EXPOSURE_SHIFT, value, basis: PROXY}` |

Allocation and exposure are kept apart: day-1 arm DAU of a version is partial, so an arm-DAU build-up is
an exposure ramp, not the configured allocation. Allocation evidence comes from the annotation
percentage; arm DAU share is only ever the `PROXY`.

**Exposure-proxy policy — CONFIGURABLE** (`master-state.md` § Period configuration). It detects exposure
events the annotations may have missed, from the daily arm DAU that `DISCOVERY` returns. A version's
first active day is excluded when it is the version's true start (it is a partial day). Two signals,
kept distinct:

- **Arm-share step / ramp (`ARM_SHARE_STEP`).** Each arm's daily share of the unit's DAU. An event is a
  day on which any arm's share differs from its share on the previous included day by more than
  `arm_share_step_pp`. It captures allocation moving between arms (10% → 30% → 50% is a ramp of
  events, not a stable allocation, even though the final share is stable).
- **Exposure shift relative to the platform (`EXPOSURE_SHIFT`).** Segments: `S0` =
  `[lookback_start, comparison_window.start)`, `S1` = `comparison_window`, `S2` = `impact_window`. For
  each consecutive pair, the unit's ratio of mean daily DAU (later ÷ earlier) is divided by the
  platform ratio — the median ratio over the reference units: the units on the same `(gid, cli)` active
  on every included day of `[L, e]`. An event is a pair whose relative movement exceeds
  `exposure_change_pct` in either direction; it is dated the first day of the later segment (segment
  granularity, `PROXY`). That date exists only for deterministic classification and proximity: it
  establishes a shift across the segment boundary, not the day the exposure changed, and the actual
  ramp or plateau may have happened earlier inside the segment. It is never reported as the date of an
  allocation or exposure change. Dividing by the platform ratio separates the unit's own exposure ramp from
  natural, platform-wide DAU growth or weekday swings.

`exposure_stability` is `CHANGED` when either signal fires, `STABLE` when neither fires over the
comparison and impact span and the lookback, and `UNDETERMINED` when the unit lacks a segment it needs or
the platform has fewer than `min_reference_units` reference units. The initial values are
configuration decisions taken from one game's observation (gid 22, Sep 7–25, 2026), not statistically
established thresholds, and are to be reviewed per game: stable units moved at most 0.31 share points
(large units) and 3.1 points (units of about 1.5k DAU per day), annotated allocation steps were 20
points or more, stable units' segment movement stayed within about ±4% of the platform, and a known
unannotated exposure ramp moved about +26% relative to it.

**Classification.** `o` = onset, `L` = `lookback_start`, `e` = `impact_window.end`. The *exposure events*
of a unit, dated in `[L, e]`, are its version start (when `true_first_active_day ≥ L`, `OBSERVED`), its
`DATE_ALIGNED` allocation events (`ANNOTATED`) and its proxy `exposure_events` (`PROXY`). Apply the
first rule that matches:

1. **`ENDED_IN_WINDOW`** — the version ends within `[L, e]` (its `last_active_day` in the
   `candidate_discovery_window` is before `e`), with `end_type` `SHIPPED`, `KILLED` or `ENDED_UNKNOWN`. A ship or kill is a
   game-level exposure change: when a variant ships, the version can disappear from the experiment
   tables while the shipped experience keeps serving the game, so experiment-table disappearance is
   never read as no impact.
2. **`LIFECYCLE_UNRESOLVED`** — `left_censored` and `true_first_active_day` is `UNKNOWN`; or no exposure
   event places the unit in rules 3–5 and either `exposure_stability` is `UNDETERMINED` or an
   `AMBIGUOUS` annotation falls in `[L, e]`. Never guessed.
3. **`STARTED_AFTER_ONSET`** — version start after `o` (and on or before `e`). It cannot explain the
   onset; at most it relates to later days of the impact period.
4. **`CHANGING_IN_IMPACT`** — an exposure event within `[o, e]`, the version having started on or
   before `o`.
5. **`CHANGED_IN_LOOKBACK`** — the latest exposure event lies within `[L, o)` and the unit stays active
   through the impact period — for example started Sep 15, ramped to Sep 17, stable from Sep 17, onset
   Sep 20.
6. **`STABLE_THROUGHOUT`** — `true_first_active_day < L`, active across the comparison and impact span,
   no exposure event of any basis in `[L, e]`, and `exposure_stability = STABLE` (`PROXY`): the
   available exposure evidence supports materially stable exposure. It is never assigned merely
   because no annotation exists or because the endpoint arm shares look similar. `allocation_stability`
   is carried as found — `UNKNOWN` whenever no annotation positively documents the allocation — and is
   stated as a limitation. Timing and exposure give no immediate explanation; it remains a candidate
   because a long-running stable experiment can still have a delayed, cumulative, interaction or other
   non-immediate effect. It is never read as evidence that the experiment caused the movement.

**Excluded** (listed with the reason, never a candidate): `ENDED_BEFORE_IMPACT` — the last active day is
before `L` with no lifecycle event in the `candidate_discovery_window`; `POST_IMPACT` — first active day after `e`.
Annotation no-op re-stamps (0%→0%) and rows their author flagged as errors are not lifecycle events.

**Candidate priority — timing and exposure only.** It sets the investigation spend order under the finite
PERIOD budget (`master-state.md`) and nothing else. It is not an evidence ranking, a causal ranking or a
likelihood score; no numeric score is computed.

| Tier | Classes |
|---|---|
| 1 | `CHANGED_IN_LOOKBACK`, `CHANGING_IN_IMPACT`, `ENDED_IN_WINDOW` with `end_type` `SHIPPED` or `KILLED` |
| 2 | `STARTED_AFTER_ONSET`, `LIFECYCLE_UNRESOLVED`, `ENDED_IN_WINDOW` with `end_type` `ENDED_UNKNOWN` |
| 3 | `STABLE_THROUGHOUT` |

Within a tier, in order: (1) proximity, in days, of the unit's *relevant event* to `o` (the latest
exposure event in `[L, o)` for `CHANGED_IN_LOOKBACK`; the first in `[o, e]` for `CHANGING_IN_IMPACT`;
the version start for `STARTED_AFTER_ONSET`; the last active day for `ENDED_IN_WINDOW`; none for the
others, which sort after units that have one); (2) `treated_share`, descending; (3) discovery order.
Metric movement, capability results, and experiment names, descriptions, features or hypotheses are
never priority inputs. `treated_dau` (comparator-arm DAU) may be reported as descriptive evidence but is
not a priority input.

## Trigger, scope and evidence

**Trigger metric** — the metric in the user's question ("Revenue/DAU dropped…"). It is resolved to the
capability that owns it and to exactly one of that capability's own `definition_lock` names, and it names
the capability dispatched first; that capability must declare PERIOD `trigger` support
(`capability-registry.md` § Registry). It never limits which capabilities are selected. A phrase that does
not resolve to one canonical metric is `UNRESOLVED` and asked once; metrics are never pooled into a
trigger, no default metric is chosen for an ambiguous phrase, and no other capability is substituted for
the owning capability. If the trigger capability's data is unavailable for a unit, its own data states
apply (`NOT_IN_TABLE`, `MISSING`, `NOT_MATURED`, …) and the other PERIOD-evidence capabilities still run
as cross-capability evidence under the normal rules. PAB follows the same rule as any read: it runs in Stage 1 for every PAB-capable
capability dispatched, whether or not it is the trigger (`capability-registry.md` § PAB).

**Per-capability trigger and evidence notes** (each capability keeps its own definitions, observation
unit, maturity, statistical method and exceptions; the analysis file's PERIOD section governs):

- **Classic Retention** — trigger `classic_retention_dX` for one day X (D1–D30). "D7 retention" → 
  `classic_retention_d7`; an unqualified D1 or D3 asks once whether classic or Rolling Retention is meant
  (`capability-registry.md` § Domain matching); no day → asked once. Evidence: its own default days.
  Install-date evidence: the window bounds install cohorts and each day X is mature only for
  `install_date + X ≤ D-2`; RETENTION (bps) meaningfulness.
- **LTV & LTDays** — one capability. "D7 LTV" → `ltv_d7` (Ad and IAP LTV are evidence of the same
  capability); "D7 Ad LTV" → `ad_ltv_d7`; "D7 IAP LTV" → `iap_ltv_d7`; "D7 LTDays" → `ltdays_d7`; no
  horizon → asked once for the horizon; an unsupported horizon is `HORIZON_UNSUPPORTED`. Evidence: its
  families at its default horizons. Install-date evidence, maturity `install_date + X ≤ D-2` per horizon.
- **Rolling LTV** — trigger `rolling_ltv_d7` ("rolling LTV"), `iap_rolling_ltv_d7` or
  `ad_rolling_ltv_d7`; D7 is the only horizon. Activity-date evidence, forward from T through T+7 (never
  backward revenue); mature only for `T + 7 ≤ D-2`; a day's forward revenue can extend past the comparison
  or impact window, and this is stated. Rolling LTDays has no capability.
- **Economy** — trigger `<metric>:<cash_type>` (for example `spend_per_dau:cash`); the currency is part of
  the metric, never of the scope. "Economy" alone, or a metric in a game with several currencies and none
  named, is asked once; no currency is pooled and none is chosen by default. Activity-date evidence;
  signed spend, E1 and E3 unchanged. Evidence: every Stage 1 metric, one result per metric and currency.
- **Revenue, Rolling Retention, Engagement, Sessions** — unchanged; activity-date evidence.

**Capability with no PERIOD trigger role (Q14).** A generic mechanism for a capability that declares no
PERIOD trigger role in the registry, with its stated reason; no current capability does. When a trigger
metric resolves to such a capability:

- the trigger component is `UNSUPPORTED` / `NO_PERIOD_ROLE`, stays recorded in `unresolved`, and is not
  an evidence metric;
- the PERIOD analysis otherwise continues unchanged: discovery, lifecycle and candidate classification,
  scope and context work, Input B, and every PERIOD-evidence capability on the cross-capability set, each
  as a cross-capability capability (`evidence_role = CROSS_CAPABILITY`, basis `PERIOD_CROSS_CAPABILITY`);
- there is no trigger capability and none is put in its place: no capability is dispatched first
  instead, and the trigger work of `P2` and `P3` (`master-state.md` § Budget) has nothing to run — it
  is recorded `NOT_RUN` with reason `NO_PERIOD_ROLE`, and the units outside the cross-capability set keep
  their records with `evidence_status = NOT_RUN`;
- Input B is requested for the trigger metric under its existing rules (including
  `NO_GAME_LEVEL_COUNTERPART`); the correlation reference is `GAME_TRIGGER` when that game-level
  movement exists, otherwise `NONE`, and its date axis is the declaring capability's;
- the evidence capabilities' results are accounted for as their own results; none is presented as
  measuring or answering the requested metric.

```
trigger = { phrase, domain, capability, metric,                 # e.g. revenue, "Revenue / DAU (overall, includes IAP)"
            resolution: RESOLVED | UNRESOLVED | UNSUPPORTED,     # UNSUPPORTED: no PERIOD role (Q14);
                                                                 # capability and metric then null
            direction_stated?: UP | DOWN,                       # from the wording; context only, never a filter
            game_movement: GameMovementResult | NO_GAME_LEVEL_COUNTERPART }
```

**Requested scope** — the segment the question names, resolved by the Master to a canonical scope
(`protocols/context-resolution.md` step 2b) and sent identically to every capability evaluated for a
unit (`analysis-contract.md` § Scope). It is the mode-neutral `RequestedScope` defined in
`master-state.md` § Scope lenses and context updates, used here unchanged.

A `RESOLVED_VALUE_GROUP` always shows its expansion (organic → `install_bucket` ∈ {`organic (google
play)`, `organic (w/o google play)`}, the validated group). An `UNRESOLVED` phrase blocks scoped evidence until it
is resolved. A finding computed outside the canonical scope is never evidence for the scoped trigger,
and an overall (unscoped) figure is never substituted for a scoped one.

**Evidence metrics** — for each investigated unit, every metric that each PERIOD-evidence capability
(`capability-registry.md` § Registry) returns at its own Stage 1 under its own `definition_lock`, each
computed by the capability's existing methodology inside the canonical scope; a capability runs its own
Stage 1, not every metric it can produce. The trigger capability's trigger-metric result is the *trigger
evidence* (`evidence_role = TRIGGER`); every other metric, including the trigger capability's other
metrics, is *cross-capability evidence* (`CROSS_CAPABILITY`). A result is computed once and only its role
is recorded: the role never changes its `result_id`, and no capability is run twice for one result.
Economy returns one result per metric and currency (`<metric>:<cash_type>`), never pooled; LTV & LTDays
returns its families as one capability. A metric's own `definition_status` (for example `UNCONFIRMED`) is
carried with it. The Master defines no metric.

**Date axis.** Every evidence record carries the `date_axis` its capability declares: `INSTALL_DATE` for
Classic Retention and LTV & LTDays (the window bounds install cohorts, and evidence days are install
dates), `ACTIVITY_DATE` for Rolling LTV, Economy, Revenue, Rolling Retention, Engagement and Sessions.
The day counts in the lookback, comparison and impact windows are counted on that axis.

**Layers kept apart in every answer:**

| Layer | What it is | Source |
|---|---|---|
| A. Trigger movement | the game-level change of the trigger metric over impact vs comparison, in scope | Input B |
| B. Lifecycle / timing association | the unit's candidate class and relevant event | § Candidates |
| C. Evidence metric movement | each metric's within-experiment pair difference, in scope | the capabilities |
| D. Cross-capability correlation | which evidence metrics moved with the trigger metric, same unit, pair, scope and window | the Master (below) |
| E. Causal evidence | none is established by any current contract | `causal_evidence.status = NONE_ESTABLISHED` |

**Movement labels** (per evidence metric, from the shared paired-test output the capability returns; no
other significance rule is introduced):

| Label | When |
|---|---|
| `SAME_DIRECTION` / `OPPOSITE_DIRECTION` | `stat.status = COMPUTED`, the returned confidence interval excludes 0, and the sign of `mean_paired_diff` matches / opposes the reference direction |
| `NOT_ESTABLISHED` | `stat.status = COMPUTED` and the interval includes 0 — not evidence of no movement |
| `INSUFFICIENT_DATA` | `NOT_COMPUTABLE_DF_LT_1`, `NOT_COMPUTABLE_ZERO_VARIANCE`, or no paired days |
| `UNSUPPORTED_FOR_SCOPE` | the capability returned the metric or its scope as unsupported |
| `NOT_RUN` / `NOT_IN_TABLE` / `NOT_TESTED` | carried as returned or as recorded by the budget |
| `NOT_COMPARABLE` | the evidence metric's `date_axis` differs from the reference's (install-date vs activity-date evidence); no direction comparison is made, whatever the statistics |

**Cross-capability correlation (Master only).** Within one unit and pair, the *reference direction* is
the experiment-level trigger metric's direction when that direction is established (`COMPUTED`, interval
excluding 0); otherwise the game-level trigger direction, labelled `reference = GAME_TRIGGER`; with
neither, every label that needs a direction is `NOT_ESTABLISHED`. With a trigger whose capability
declares no PERIOD trigger role (Q14; none currently) there is no experiment-level trigger evidence, so
the reference is `GAME_TRIGGER` or `NONE`. **Same date axis only:** the reference has the trigger
capability's `date_axis`, and an evidence metric is compared with it only when its own `date_axis` is the
same (`INSTALL_DATE` ↔ `INSTALL_DATE`, `ACTIVITY_DATE` ↔ `ACTIVITY_DATE`); across axes the label is
`NOT_COMPARABLE`, even when `exp_id`, `version`, pair and scope match. Each direction label still rests on
the metric's own valid statistical evidence. Direction is the sign of the signed `mean_paired_diff` in the
capability's own metric semantics, never converted to magnitude: for Economy spend, which keeps its
stored sign, a negative direction means spend grew in magnitude, and the answer says so in words.
Metrics are correlated only when their canonical scope is identical to the trigger evidence's (each
capability's own denominator per its methodology is stated, not reconciled), and the days each metric was
measured on are stated, with the days common to all (`common_days`), computed separately for each date
axis. Correlation is co-movement in the
same experiment, pair, scope and evidence window; it is never turned into causality, and no metric is
described as driving another.

## Input B — game-level movement

```
GameMovementRequest = {domain, gid, cli?, window: requested_period, comparison_window,
                       scope?: canonical scope, depth: D0}
GameMovementResult  = the existing skill's D0 card, unchanged:
                      {metric label, value, prior_value, delta_abs, delta_pct, freshness, source skill}
```

- Periods are calendar-anchored per SR-5 and SR-7. Which existing skill answers is brian-master's
  routing decision; this contract does not name it. Its queries spend the budget as observed statements.
- `comparison_window` is the one defined above, so the game-level delta and the lookback use the same
  comparison.
- `definition_alignment` is `IDENTICAL | NOT_IDENTICAL | UNVERIFIED`. Default `UNVERIFIED`.
  `REVENUE` is `NOT_IDENTICAL`: experiment revenue excludes xpromo, game-level net and gross do not.
  `IDENTICAL` requires a reconciling check run in the current conversation.
- A domain with no cataloged game-level counterpart yields no result and is recorded as
  `NO_GAME_LEVEL_COUNTERPART`. No proxy is substituted.
- With a scope, the game-level request carries it. If the game-level source cannot represent the scope,
  the result is `NO_GAME_LEVEL_COUNTERPART` for that scope: the overall game metric is never
  substituted, and the analysis continues with experiment-level evidence.

## PeriodEvidenceRecord

One per experiment-version, metric and pair (per metric when the unit is `NO_COMPARISON`). For
engagement the primary metric is Clear / DAU; the supporting diagnostics the analysis returns at the
same scope are carried as their own metrics, and no action needs to be named in the request.

```
{ result_id,                                       # master-state.md § Results and meaningfulness: the
                                                   # meaningfulness classification and the correlation
                                                   # label live in that result_ledger entry
  experiment, gid, cli, exp_id, version, metric,
  trigger_metric, scope,                           # canonical scope the metric was computed in
  capability, evidence_role: TRIGGER | CROSS_CAPABILITY,  # role never changes result_id
  date_axis: INSTALL_DATE | ACTIVITY_DATE,         # declared by the capability (registry)
  candidate:            {class, tier, excluded_reason?, relevant_event?: {type, day, basis},
                         proximity_days_to_onset?, treated_share?: {value, basis}, end_type,
                         priority_position},
  lifecycle:            the unit's lifecycle block, each field with its basis,
  windows:              {impact_window, comparison_window, candidate_discovery_window, onset,
                         onset_basis, experiment_active_window, stable_window,
                         experiment_evidence_window, impact_overlap_window,
                         analysis_window, analysis_window_basis, mature_analysis_window},
  evidence_days:        {lookback, comparison, impact},   # days of experiment_evidence_window in each,
                                                   # counted on date_axis (install dates or activity dates)
  experiment_movement:  {pair_id, comparison_label, comparison_type, delta_abs,
                         delta_pct_of_reference, n_paired_days}
                        | descriptive[]            # when design.status = NO_COMPARISON
  period_movement:      GameMovementResult,
  definition_alignment: IDENTICAL | NOT_IDENTICAL | UNVERIFIED,
  affected_segment:     [from Stage 2 findings],
  temporal_overlap:     {overlap_days, comparison_overlap_days, ramp_events_in_period[]},
  exposure_evidence:    {arm_dau},                 # active users from experiment.dau, not assignment
  contribution_evidence:{experiment_pair_difference, game_level_movement},   # descriptive only
  statistical_evidence: the stat block as returned,
  cross_metric_evidence:[finding_ids from other capabilities, same pair],
  concurrent_experiment_overlap: [{experiment, overlap_days}],
  evidence_status:      EVALUATED | NO_COMPARISON | UNRESOLVED | NOT_TESTED | NO_SCOPED_EXPOSURE
                        | NOT_RUN,                 # NOT_RUN: Q14 (none currently), outside the set
  causality_status:     ASSOCIATION_ONLY | NO_COMPARISON,
  unresolved_explanation: [] }
```

## PeriodCandidateFinding — the Master-level finding

One per experiment-version and pair, built by the Master from that unit's `PeriodEvidenceRecord`s; it
holds no figure that is not in them.

```
{ exp_id, version, gid, cli, pair_id, comparison_label,
  trigger:          {metric, capability, scope, game_movement},                          # A
  association:      {class, tier, relevant_event: {day, basis}, experiment_evidence_window,
                     evidence_days: {lookback, comparison, impact}},                     # B
  trigger_evidence: {metric, delta_abs, delta_pct_of_reference, ci, n_paired_days,
                     direction, movement_label, record_ref},                             # C
  cross_capability_evidence: [{capability, scope_status,
      metrics: [{metric, definition_status?, delta_abs, delta_pct_of_reference, ci,
                 n_paired_days, mature_analysis_window, movement_label, record_ref}]}],  # C
  correlation:      {reference: EXPERIMENT_TRIGGER | GAME_TRIGGER | NONE, reference_date_axis,
                     common_days: [{date_axis, days}],
                     same_direction[], opposite_direction[], not_established[], not_comparable[],
                     insufficient_data[], unsupported_for_scope[], not_run[],
                     not_in_table[], not_tested[]},                                      # D
  causal_evidence:  {status: NONE_ESTABLISHED},                                          # E
  causality_status: ASSOCIATION_ONLY }
```

- Every evidence metric keeps `exp_id`, `version`, the trigger metric, the canonical scope, its
  capability, its metric name and its evidence window.
- `record_ref` is the `result_id` of the referenced `PeriodEvidenceRecord`. Movement and correlation
  labels are carried on that result's `result_ledger` entry (`master-state.md` § Results and
  meaningfulness); they never change its meaningfulness classification.
- A unit with `NO_SCOPED_EXPOSURE` keeps a finding with that status and no evidence.
- With a trigger whose capability declares no PERIOD trigger role (Q14; none currently),
  `trigger.metric` names the requested metric with status `UNSUPPORTED` / `NO_PERIOD_ROLE`,
  `trigger_evidence` is `NOT_RUN` (reason `NO_PERIOD_ROLE`), and `cross_capability_evidence` carries every
  PERIOD-evidence capability; the finding states that its evidence does not measure that metric.

- `candidate` and `lifecycle` are timing and exposure context set by the Master; `experiment_movement`,
  `statistical_evidence` and the other evidence fields are the capabilities' results. Neither is
  described as establishing the other, and capability evidence never changes a candidate's class or
  priority.
- `contribution_evidence` is descriptive: the two movements side by side. No attribution or scaling
  arithmetic is defined (TBD) — no statement that an experiment explains or contributed some share or
  amount of the game's movement.
- `experiment_movement` and `period_movement` are different quantities (a within-experiment difference
  and a game-level change over time). Neither is described as explaining the other.
- `ENDED_IN_WINDOW` units are analysed on their valid pre-end days inside the `experiment_evidence_window`, by the
  capability's own methodology; that is the evidence about the experiment before its lifecycle
  transition. For `SHIPPED`, the post-ship game-wide exposure is not experiment-table activity: no
  post-end arm data exists and none is fabricated.
- `temporal_overlap` is computed from the windows above; annotations supply ramp-event dates as context
  only and never a measured figure. It does not substitute for `stable_window`.
- The stable portion of the analysed span and the ramp or pre-ramp days outside it are read from
  `windows` and stated explicitly in the answer; an `unknown` `stable_window` is stated as unknown.
- A unit the budget does not reach keeps its record with `evidence_status = NOT_TESTED` (reason
  `OUT_OF_BUDGET`); it is never dropped.
- No evidence ranking, total, average or pooling across experiments or versions, and no aggregated
  impact. Records are listed in candidate-priority order, which is a spend order and is labelled as
  timing and exposure only; excluded units follow, with their reasons.
- Cross-capability wording states co-movement only, for example: "Experiment A is temporally associated
  with the Revenue/DAU decline. Within organic installs in D08-D14 and its evidence window,
  Sessions/DAU, Session Time/DAU, D1 rolling retention and Clear/DAU also declined." Never "Sessions
  caused the Revenue/DAU decline".
- Wording: "candidate", "timing candidate", "temporally associated", "associated with" or "consistent
  with", "warrants investigation". Stronger language is used only where the evidence contract explicitly
  supports it; none currently does. A start date or lifecycle event alone never supports causal
  language.
- A movement the existing analysis flags as notable remains that analysis's finding; the Master does not
  re-derive it.
