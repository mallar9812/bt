# Output format — experiment answers

Shape follows BRIAN SR-15 (period & segment line, visuals, bottom line, supporting data, next
question) and the depth budgets in `depth-policy.md`. Experiment-specific rules:

**Default structure.** `references/report-templates.md` selects the answer's default structure from the
recorded mode and depth (Standard Experiment Read, Targeted Diagnosis, PERIOD Impact Read, Metric
Investigation) and defines the Experiment Card that opens it. It changes no rule in this file, and this
file wins any disagreement.

## Period & segment line

States `exp_id` and `version` for each unit, platform, windows, depth run, and the design:
`CONTROLLED_TEST` · `NO_CONTROL_MULTI_ARM — no explicit control` · `SINGLE_ARM — no comparison`.

In every mode it also states the scope the results were computed in: "overall" or the canonical scope
(lens `L1`), with every value-group expansion written out. A unit with no rows for the segment is
stated as no data for the requested segment, never replaced by its overall figure.

**Segment pending** (an `UNRESOLVED` segment phrase, any mode; `protocols/context-resolution.md`
step 2b): the answer carries exactly one clarification question and segment-independent context only.
It shows no overall metric result and no partial-scope result. It may add "I can also show the result
for all users while you confirm." Only after the user accepts is an overall result shown, labelled
exactly "Overall (all users) — not the requested segment"; it is never presented as the requested
segment, and the segment stays awaiting clarification.

For a stream-origin request the line also lists every scope lens with its canonical scope (value-group
expansions written out) and, where the run was raised from discovery, the ceiling that applied. A run
that stopped at `PHASE_CEILING` is labelled "D2 (discovery ceiling)".

## Comparison language

- Controlled: "var1 vs control".
- No-control: "var2 vs var1 (reference variant)"; say "var2 differed from var1".
- For no-control comparisons never call var1 or var2 **control**, **baseline** or **holdout**, and
  never write **lift** or **treatment effect vs control**.
- Use "associated with" or "consistent with" unless stronger causal evidence is independently
  established. `causal_scope` is carried into the sentence.
- Each pair is reported separately; no cross-pair, cross-comparison-type or cross-version pooling.
- When the latest version was selected without a period, list the earlier available versions with their
  windows.

## Results and meaningfulness

Classification rules: `master-state.md` § Results and meaningfulness.

- For each result, state the adjusted value (after PAB) or the observed value with †, with its Conf, then
  the reading and the line applied with its source: "meaningful = > 0.5% (your threshold for this
  analysis)" or "default line: 1% relative" / "10 bps", with "Conf above 85%". The observed value and the
  PAB sit beside it. `GENERAL` metrics are worded in relative change, `RETENTION` metrics in basis points
  of absolute change. Formats: `+1.28%` (two decimals, explicit sign, Unicode minus), retention
  `+65.6 bps` (one decimal), never "pp"; absolute values three decimals; Conf as `Conf: 99.6%`, `>99.9%`
  above 0.999, `—` when missing. The 95% CI is shown only where a CI line is asked for or the table
  defines it (`summary-table.md`).
- Reader labels are three: **Upside ↑** (meaningful, positive), **Downside ↓** (meaningful, negative) and
  **Neutral** (everything else; the class, for example "insufficient evidence", goes in brackets or the
  tooltip). Higher is treated as better for every metric, so Upside and Downside are direction, not a
  business verdict.
- A value is "after PAB" when adjusted and "observed †" when no PAB exists; when PAB flips a sign, give the
  observed value and the pre-test gap in brackets.
- Statistical significance (p-value, whether the CI excludes 0) is a separate statement and is never
  worded as meaningfulness, and the reverse.
- `INSUFFICIENT_EVIDENCE` reads Neutral and is worded as "the evidence cannot tell a meaningful movement
  from noise" (Conf at or below 85%), never as "no movement".
- `NOT_CLASSIFIED` states its reason: a breakdown cell shown descriptively — "movement shown
  descriptively; no cell-level statistic, so not classified"; zero variance — the exact observed
  difference, with no CI and no p-value; a `GENERAL` metric with a reference of 0 — relative change
  undefined. `NOT_APPLICABLE` is a single-arm unit.
- A breakdown cell is reported under its parent result and never changes the parent's figures or
  classification.
- Stream-origin request: state that the default line (1%, 10 bps, Conf above 85%) was applied and that a
  user-stated threshold cannot be carried through the companion stream.
- Work not run (`NOT_TESTED`: budget or phase ceiling) is stated as not run with its reason and an offer;
  it is never worded as insufficient evidence or as missing data.

## Period impact candidates

- State `impact_window`, `onset` with its basis ("onset Sep 20 — period start, not inferred" or
  "user-stated"), `comparison_window` and the `candidate_discovery_window` in the period & segment line.
- Each experiment-version is a **candidate**, a **timing candidate**, **temporally associated** with
  the movement, or one that **warrants investigation**. Never "caused", "responsible for" or "culprit":
  a start date or lifecycle event alone never supports that, and no current evidence contract does.
- Give each unit's class and the lifecycle evidence behind it with its basis (`OBSERVED`, `ANNOTATED`,
  `PROXY`, `UNKNOWN`); a `PROXY` (arm DAU share, a version boundary) is named as a proxy, never as the
  observed allocation.
- Candidate priority is described as the order of investigation by timing and exposure, never as how
  likely an experiment is to be the cause.
- `SHIPPED` / `KILLED`: state the verdict with the allocation delta (`annotations.md`), that the
  version's experiment-table activity ended, and that for a ship the shipped experience continues
  game-wide beyond the experiment tables. Its evidence is from its pre-end days only.
- `STARTED_AFTER_ONSET`: say it cannot explain the onset. `STABLE_THROUGHOUT`: say timing and exposure
  give no immediate explanation, that exposure stability rests on the `PROXY`, that
  `allocation_stability` is `UNKNOWN` where no annotation documents it (absence of an annotation is not
  evidence), and that it remains a candidate only for non-immediate effects. A proxy exposure event is
  named as a proxy (`ARM_SHARE_STEP` or `EXPOSURE_SHIFT`), never as an observed allocation change. An
  `EXPOSURE_SHIFT` is worded by the boundary it crosses, never by its segment-start date — for example
  "Exposure shift detected across the comparison/impact boundary (proxy; exact transition date
  unresolved)", or "across the lookback/comparison boundary" — and never as "allocation changed on
  Sep 20".
  `LIFECYCLE_UNRESOLVED`: say which lifecycle field is unknown and why.
- State the trigger metric and the resolved scope in the period & segment line, with every value-group
  expansion written out (organic → `install_bucket` ∈ {`organic (google play)`, `organic (w/o google
  play)`}). An `UNRESOLVED` phrase is named with the one question asked; no scoped evidence is shown for
  it. A scoped game-level trigger the source cannot represent is stated as `NO_GAME_LEVEL_COUNTERPART`
  for that scope; the overall game figure is never shown in its place.
- Per unit, present the layers separately: trigger movement (game level), lifecycle/timing
  association, the trigger evidence, the cross-capability evidence with each metric's movement label,
  and "no causal evidence established". Name the metrics that moved in the same direction as the
  trigger metric within the scope and evidence window as *temporally associated* co-movement — never
  "X caused Y" or "Y fell because X fell". List `NOT_ESTABLISHED`, `INSUFFICIENT_DATA`,
  `UNSUPPORTED_FOR_SCOPE` (with the dimension), `NOT_RUN`, `NOT_IN_TABLE`, `NOT_TESTED` and
  `NO_SCOPED_EXPOSURE` by name; none is silently omitted, and an unscoped figure is never presented as
  scoped evidence.
- For each unit's experiment evidence, state its `experiment_evidence_window` and how many of its days
  fall in the lookback, the `comparison_window` and the `impact_window`. Experiment evidence is never
  presented as impact-window evidence by default; `impact_overlap_window` is descriptive only.
- List excluded units with their reason and `NOT_TESTED` / `OUT_OF_BUDGET` units by name; none
  disappears from the answer.
- **Trigger of a capability with no PERIOD trigger role (Q14; none currently):** open by stating that the
  requested metric has no PERIOD role as a trigger, so it is `UNSUPPORTED` / `NO_PERIOD_ROLE` and is not
  measured. Show the game-level trigger movement if Input B returned it (labelled game level), then the
  PERIOD-evidence capabilities' evidence as cross-capability evidence, compared with that game-level
  reference or with none. Never word that evidence as a result for the requested metric, and list the
  units outside the cross-capability set as `NOT_RUN` (no trigger capability).
- **Date axis.** Install-date evidence (Classic Retention, LTV & LTDays) is labelled as install-cohort
  evidence: its window and day counts are install dates, a cohort's day-X activity can fall after the
  impact window, and impact-window cohorts not yet mature are stated as such. Rolling LTV evidence is
  labelled forward from each activity date (T through T+7). A metric on a different date axis from the
  trigger reference is listed as `NOT_COMPARABLE` ("install-date and activity-date evidence are not
  compared"), never as moving with or against it.
- **Stream-origin request.** Present each scope lens separately, never pooled. Name each ContextUpdate's
  disposition (`ACCEPTED_LENS`, `DUPLICATE`, `UNSUPPORTED` with the dimension, `UNRESOLVED_SCOPE`,
  `NO_SCOPED_EXPOSURE`, `LENS_CAP`, `OUT_OF_BUDGET`, `DEFERRED_BY_CEILING`) — none is dropped silently, and
  an unscoped figure is never shown in place of a lens's scoped one. A run stopped at `PHASE_CEILING`
  returns the lifecycle association per unit (class, relevant event with its basis, tier worded as the
  order of investigation by timing and exposure) with the evidence layers stated as not run (reason
  `PHASE_CEILING`, how to deepen); no movement evidence, correlation or Input B is shown for it. When the
  game-level trigger movement came from Stream A, say so ("taken from the metric investigation"); it is
  trigger movement, not experiment evidence.

## Special states

- `NO_COMPARISON` (SINGLE_ARM): timeline, ramp and annotation status plus descriptive metrics, with
  the note "single arm — no comparative result". Not presented as an error and never BLOCKED.
- `UNRESOLVED / UNSUPPORTED_ARM_NAME` (a data-contract safeguard; not seen in current data): name
  the arm(s), state that no comparison was produced, and ask at most one question.
- Engagement (Clear-first): no action is asked for or required. State the primary metric
  (`Clear / DAU`) and the supporting diagnostics (`view`, `use_hint`, `w_clear`) the analysis returned
  at the same scope. A diagnostic the unit lacks is stated as unavailable, never as unchanged or zero. If
  `clear` is `NOT_IN_TABLE` for the unit, state that the Clear analysis was not run; no other action is
  substituted as the primary metric.
- Statistics: `CONFIG_REQUIRED` and `TBD` are stated as such, never filled in. Power stays
  `CONFIG_REQUIRED` unless configured.
- Data conditions: each `data_conditions[]` entry is stated with its scope and effect — a `MISSING`
  variant-day excluded from the paired comparison, an `UNOBSERVED` cut-level cell not read as zero, a
  pinned row or named metric `NOT_IN_TABLE`. None is dropped silently or filled in.
- Maturity: state the matured cutoff from `windows.mature_analysis_window` for each measure whose
  `basis` is `CUTOFF_APPLIED`.
- PAB: state the PAB window and each `pab[]` status (`COMPUTED`, `NOT_APPLICABLE`, `NOT_IN_TABLE`,
  `CONFIG_REQUIRED`, `TBD`). Values with no PAB are marked † and listed by metric group; state the PAB
  population caveat (PAB covers users who existed before the window, so new installs are observed) and,
  when the PAB window overlaps an earlier version, say so.
- `UNCONFIRMED` / not reported (for example `session_length`): say so as the analysis returns it; no
  metric is invented.
- `NO_CAPABILITY`: name the domain that no capability serves and list the registered ones; no proxy
  is run.
- Retention not specified ("retention", "D1 retention", "D3 retention" without "rolling" or
  "classic"): ask once whether the user means classic Retention or Rolling Retention; no retention
  result is shown until answered, and neither is assumed.
- **Retention (classic)** — always labelled so, never "retention" alone and never mixed with Rolling
  Retention:
  - name each result by its day ("D7 retention (classic)") and state the locked definition: users
    active on day X after install ÷ installs, by install-date cohort, `definition_status` UNCONFIRMED
    (D0 users and installs are not proven to be the same population);
  - state the eligible install-date window, and for each day its mature cohort window
    (`mature_analysis_window`) and number of paired cohorts; the window is of install dates, not activity
    days;
  - list excluded cohorts with their reason, and the D0-vs-installs check as a description only;
  - state any day read as zero under the later-row rule (`ABSENT_ROW_LATER_DIFF`) as such, and every
    `MISSING` cohort as excluded, never as zero;
  - unsupported days (D0, above D30, a rolling day other than D1/D3), an explicitly requested negative
    version ("version semantics unknown"), or a PAB
    request: say `UNSUPPORTED` with the reason; nothing is substituted, and the requested item is
    named in the answer, never dropped;
  - a negative version selected without being requested: say Classic Retention was not run for it
    because a version with unknown semantics is never auto-selected, list it as a candidate, and note
    that no other version was used in its place.
- **LTV & LTDays** — labelled "LTV", "Ad LTV", "IAP LTV" and "LTDays", each with its horizon ("D7 LTV",
  "D7 LTDays"); never "revenue", "Rev/DAU" or "ARPDAU", and never mixed with Revenue or either
  retention capability:
  - state the definition: LTV = cohort revenue from install day through day X ÷ installs (Ad LTV and IAP
    LTV: that `ltv_type` only); LTDays = active days from install day through day X ÷ installs; by
    install-date cohort, cumulative, `definition_status` UNCONFIRMED — for LTV because the revenue
    semantics of `experiment.recovery` are not confirmed (no currency, never "net" or "gross"), for
    LTDays because D0 users and installs are not proven to be the same population;
  - when Revenue results appear in the same answer, say that LTV comes from a different source and is
    not reconciled to Revenue;
  - state the eligible install-date window, and per horizon its mature cohort window
    (`mature_analysis_window`) and number of paired cohorts; list excluded cohorts with their reason;
  - state every `MISSING` cohort and `UNOBSERVED` cell as excluded, never as zero; a stored zero is an
    observed zero;
  - note once that neighbouring install cohorts share calendar days, so their paired differences may be
    correlated (a disclosed limitation; no adjustment is made);
  - an unsupported horizon (`HORIZON_UNSUPPORTED`), an explicitly requested negative version ("version
    semantics unknown"), or a PAB request (`NO_PAB`):
    say `UNSUPPORTED` with the reason; the requested item is named, never dropped, and the nearest
    horizon or another version is never substituted; a negative version selected without being
    requested is worded as for Retention (classic);
  - rolling LTDays, predicted LTV or predicted LTDays: say no capability serves it (`NO_CAPABILITY`); no
    LTV or other figure is shown in its place. Rolling LTV is its own capability (below) and is never
    shown as LTV.
- **Rolling LTV** — labelled "Rolling LTV (D7, forward)", "IAP Rolling LTV" and "Ad Rolling LTV"; never
  "LTV" alone, "revenue", "Rev/DAU" or "last 7 days", and never mixed with LTV & LTDays or Revenue:
  - state the definition: for each activity date, the revenue the users active that day generate from
    that day through day +7 (eight days), divided by that day's active users (DAU); by activity date,
    with the user's age-since-install bucket (D00 … D720+) as a dimension, not an install cohort;
    `definition_status` UNCONFIRMED (revenue semantics not confirmed: no currency, never "net" or
    "gross"; Ad Rolling LTV also because its components are not fully established);
  - state the activity-date window, its mature end (activity date + 7 ≤ D-2) and the number of paired
    days, and note the observed slight incompleteness of the source's most recent mature day;
  - note once that consecutive days' forward windows overlap by seven of eight days (daily differences
    were autocorrelated, about 0.6, on inspected data), so the interval may be optimistic; it is not
    corrected for overlap;
  - breakdown cells (age bucket, user type, payer, country, …) are descriptive only: movement and DAU,
    no statistic and no meaningfulness classification;
  - a `MISSING` day — including a day with the source's zero-revenue defect — is stated as excluded,
    never as zero; rows whose revenue was stored as NULL with no forward users are stated as counted at
    zero revenue (a Rolling LTV rule), with their number;
  - D14, D30 or another horizon (`HORIZON_UNSUPPORTED`), an explicitly requested negative version
    ("version semantics unknown"): say `UNSUPPORTED`
    with the reason; the item is named and nothing is substituted. A negative version selected without
    being requested is worded as for Retention (classic). A PAB request is stated as out of scope for
    Rolling LTV.
- **Economy** — the in-game economy only, labelled "Economy (in-game)" with the currency named ("cash
  earned per DAU", "hints spent per DAU"); every value is in in-game units, never money, and never
  worded as revenue, IAP, monetisation or acquisition spend:
  - each currency or resource is reported separately; nothing is pooled across currencies;
  - spend keeps its stored sign (negative for most currencies). Against a negative reference its relative
    change is stated in words: a positive relative change is "spend rose in magnitude", a negative one
    "spend fell in magnitude" (control −90, variant −100 → −10 per DAU, +11.1%: spend rose in
    magnitude). A negative value is never shown as positive;
  - net is earn + spend (purchase excluded); when net's reference is ≤ 0 the absolute change, CI and
    p-value are stated and the result is "not classified: the reference is not positive, so relative
    change is undefined" (`REFERENCE_NON_POSITIVE`);
  - purchase is in-game acquisition, never revenue; its definition status is UNCONFIRMED, as are the
    earner and spender counts;
  - breakdown cells and categories are descriptive only: movement, share and DAU, no statistic and no
    meaningfulness classification;
  - **PAB:** "pre-version in-game economy": each variant's PAB value, the PAB movement (`pab_value`)
    and the experiment-period movement (`observed_movement`), side by side and labelled as such, with
    the PAB window (first and last day, number of days) and the note that PAB covers pre-existing users
    only. PAB net is labelled "derived (earn + spend)". The adjusted effect and its Conf follow, with no
    causal wording. Example: "Cash — PAB earn per DAU: control
    123.95, variant 123.90 (−0.04%); experiment period +0.20%. The variants were already about equal
    on this metric before the version; the experiment-period movement is shown alongside that baseline
    difference.";
  - **PERIOD:** an Economy trigger is reported as the Economy result for its metric and currency ("cash
    spent per DAU"), as trigger evidence; Economy evidence for another trigger is reported per metric
    and currency as cross-capability evidence. Co-movement is worded as association ("cash earned per
    DAU moved in the same direction as Revenue / DAU"), never as one metric causing another; for spend,
    a negative direction is worded as "spend grew in magnitude";
  - an explicitly requested negative version, a balance or a per-user currency rate: say it is
    unsupported with the reason and name it; nothing is substituted. A negative version selected without
    being requested is worded as for Retention (classic).

## Visuals

A run stopped at `PHASE_CEILING` has no movement evidence to chart and is exempt from the SR-22 floor
for its own part; the metric investigation it accompanies carries the answer's charts.

The Master states which findings and visuals the answer needs; `game-viz-design` renders them.
This skill implements no chart rendering. SR-22 is met by the final answer as a whole: the movement
evidence and contributor breakdown for the requested analysis, with several experiment-version units
shown side by side or faceted, never aggregated or pooled to satisfy the floor. SR-23 prose ceilings
apply to the final answer as a whole, not to each unit.

Every visual is built as `VisualEvidence` and follows `references/visual-evidence.md` § Rendering
rules: one native date axis per visual, excluded points left as gaps (never zero), intervals only as
returned, every evidence state shown, neutral styling unless the direction is established, retention
differences in bps, Economy spend with its stored sign, and Rolling LTV labelled forward.
