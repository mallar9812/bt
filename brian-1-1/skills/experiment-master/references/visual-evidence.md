# VisualEvidence — what an experiment visual receives

Visualization is one generic mechanism for every Experiment Analysis capability and every mode:
FULL_EXPERIMENT_READ, TARGETED_DIAGNOSIS, PERIOD_IMPACT_ANALYSIS, descriptive `NO_COMPARISON` answers,
and measured reads forwarded by `analyst-experiment-reads`. It is not a PERIOD feature. A capability
registered later is charted the same way, from its own results, with no change to this file.

The Master builds one `VisualEvidence` per entry in `visual_requirements` (`master-state.md`) from what
it already holds: the `result_ledger`, the stored `analysis_responses` (including each entry's
`observations`, `analysis-contract.md` § Observations), the unit's context and, in PERIOD, the
`PeriodEvidenceRecord`s. `game-viz-design` renders it and chooses only the visual representation.
**Neither issues a query; no new query is ever run to draw a visual.**

## Shape

```
VisualEvidence = {
  visual_id,                                       # request-local label (V1, V2, ...)
  purpose, required_by: DEPTH_FLOOR | MASTER_CHOICE,          # from visual_requirements
  chart_kind: SERIES | SUMMARY | BREAKDOWN | TIMELINE | CARD,
  date_axis?: INSTALL_DATE | ACTIVITY_DATE,        # SERIES and TIMELINE: the one date axis of the
                                                   # visual, as the capability registry declares it
  observation_unit?: CALENDAR_DAY | INSTALL_COHORT,           # the response's pairing_unit
  series: [{
    result_id, parent_result_id?,                  # result_ledger; a cell carries its parent's id
    evidence_ref,                                  # the ledger entry's evidence_ref
    exp_id, version, pair_id, comparison_label, comparison_type, causal_scope,
    capability, metric, metric_label, definition, units, definition_status?,
    metric_class: GENERAL | RETENTION,             # GENERAL: relative %; RETENTION: bps of absolute
    scope, cut?, lens_id?,                         # canonical scope; lens_id is a display label only
    observations?: [{x, reference_value, comparator_value, diff}],   # as returned, never rebuilt
    pab_observations?: [{arm, series: [{x, value}]}],   # pre-experiment PAB values per group, only as
                                                   # returned (§ Building it, step 7)
    excluded: [{x?, reason, source: DATA_CONDITION | EXCLUDED_COHORT | MATURITY | WINDOW}],
    summary?: {reference_value, comparator_value, delta_abs, delta_pct_of_reference,
               ci?: {level, ci_low, ci_high}, p_value?, n_pairs?, stat_status?},   # as returned
    state,                                         # the ledger state (COMPUTED, NOT_IN_TABLE, ...)
    meaningfulness: {classification, reason?, threshold_applied?},   # the Master's, as recorded
    correlation_label?, evidence_status?,          # PERIOD only, as recorded (NOT_COMPARABLE kept)
    direction: ESTABLISHED_UP | ESTABLISHED_DOWN | NOT_ESTABLISHED,   # § Direction
    notes: [] }],                                  # § Capability labels
  windows: {analysis_window, mature_analysis_window[],
            period?: {lookback, comparison_window, impact_window, onset, onset_basis}},
  context_layers?: [{kind: ANNOTATION | LIFECYCLE | VERSION_BOUNDARY | GAME_MOVEMENT,
                     day?, label, basis: OBSERVED | ANNOTATED | PROXY | UNKNOWN, source_ref}],
  header: {metric_line, scope_line, definition_line} }
```

- Every field is copied from an existing record. The only field that did not exist before this
  contract is `observations`, and it holds values the paired test already used.
- `series[]` has one entry per result. A result is never split, merged or re-keyed, so every plotted
  value traces to exactly one `result_id`.
- `source_ref` identifies a context layer by its existing record: an annotation by its row
  (`category`, `created_at`, experiment name); a lifecycle or version boundary by the unit's
  `lifecycle` or `versions[]` field name; a game-level movement by its `GameMovementResult` (metric
  label, window, `comparison_window`, scope signature).
- `header` meets `game-viz-design`'s three-line header: the metric, then a scope line (experiment,
  version, comparison label, canonical scope with value-group expansions, explicit dates with year,
  units and the axis named as install date or activity date), then a one-line definition from
  `definition_lock`.

## Building it (the Master)

1. Take `date_axis` from the capability registry's PERIOD column for the capability, never from the
   data and never from the mode. Classic Retention and LTV & LTDays are `INSTALL_DATE`; Revenue,
   Rolling Retention, Engagement, Sessions, Rolling LTV and Economy are `ACTIVITY_DATE`.
2. Copy `observations` from the response entry as returned. If the entry carries none, the visual is a
   `SUMMARY` of the returned figures and its header says "daily series not returned" (or "cohort series
   not returned"); a pooled result is never drawn as a series. `observations` is drawn as a series
   only when it lists exactly the entry's `stat.n_pairs` units; otherwise the visual is the same
   `SUMMARY`, and its header says "returned series does not match the test".
3. List every excluded unit with its reason from `data_conditions[]`, `excluded_cohorts[]` and
   `windows.mature_analysis_window`.
4. Copy `summary`, `state`, `meaningfulness`, `correlation_label` and `evidence_status` from the
   response and the ledger. Nothing is recomputed, reclassified or re-derived.
5. Set `direction` (§ Direction) and `notes` (§ Capability labels).
6. Put series with different `date_axis` values into different visuals or panels.
7. Copy `pab_observations` only from the response's `pab[].observations` for the same metric, pair
   and cut: per variant, the days that carry a `value`. Days with only a numerator or only a denominator
   are not copied. Leave the field absent when `pab[].observations` is absent (pooled-only, PAB not run
   or not supported) or when `date_axis` is `INSTALL_DATE`. Nothing is derived from a pooled value.

## Rendering rules

These rules apply to every experiment visual, in addition to `game-viz-design`'s house rules, and win
over any default there for experiment evidence. Rules 1, 3 and 4 apply `game-viz-design`'s generic
rules (one date basis per chart, confidence intervals only as supplied, neutral unless the evidence
establishes the direction) to experiment evidence.

1. **One date axis per visual.** A visual never mixes install-date and activity-date observations, and
   a dual y-axis is never used to place two date axes on one chart. Evidence on another axis is shown in
   its own panel with its own axis title. Its correlation label stays `NOT_COMPARABLE`, and the two are
   never drawn as moving together or against each other.
2. **Only returned observations are drawn.** An excluded, missing, unobserved or immature point is left
   as a gap and listed under the chart with its reason. It is never drawn as zero, interpolated,
   carried forward or smoothed. A stored zero is an observed zero and is drawn.
3. **Confidence intervals only as supplied.** An interval is drawn only from a CI the analysis returned
   (`summary.ci`), at its stated level. No interval is computed from the observations, none is drawn
   per day or per cohort, and a result with no returned CI (zero variance, not computable) shows its
   difference with no interval.
4. **Neutral direction styling unless the direction is established** (§ Direction). An unestablished
   result uses neutral styling, never the up or down delta colours.
5. **Every state is visible.** A result that is `NOT_ESTABLISHED`, `INSUFFICIENT_DATA`, `NOT_TESTED`,
   `NOT_COMPARABLE`, `NOT_IN_TABLE`, `UNSUPPORTED_FOR_SCOPE`, `NO_SCOPED_EXPOSURE`, `NOT_RUN` or
   `NOT_CLASSIFIED` is shown labelled with that state. A result with no value is never drawn as a
   zero-height bar or a flat line.
6. **No pooling.** Versions, `exp_id`s, platforms, pairs, scope lenses, cuts and Economy currencies
   each keep their own series. Several units are shown side by side or faceted, never summed or
   averaged.
7. **No analysis in the renderer.** The renderer chooses the visual form only. It never resolves the
   experiment or scope, chooses or substitutes a metric, determines maturity, runs or recomputes a
   test, decides meaningfulness or correlation, infers causality, broadens the scope or issues a query.
8. **Context is labelled as context.** Annotation, lifecycle and version-boundary layers carry their
   basis; a `PROXY` is named as a proxy. A game-level movement is shown as a labelled game-level card,
   never as an experiment series and never on the experiment difference's axis.
9. **Wording.** Titles and insight headings use the comparison label ("var1 vs control", "var2 vs var1
   (reference variant)") and associative wording, never "caused", "drove" or "lift" for a
   no-control comparison (`output-format.md` § Comparison language).

10. **PAB pre-period only as returned.** When a series carries `pab_observations`, each group's
    pre-experiment values and its experiment-period values are drawn on the same activity-date axis.
    Groups are drawn separately and the experiment start is marked. Without `pab_observations`, no
    pre-experiment trend is drawn; a returned PAB movement is stated as a labelled pooled value, and
    daily points are never spread from a pooled value.

## Direction

`direction` is `ESTABLISHED_UP` or `ESTABLISHED_DOWN` only when `stat.status = COMPUTED` and the returned
confidence interval excludes 0; it is the sign of the signed `mean_paired_diff` in the capability's own
metric semantics. This is the existing movement-label test of `period-evidence.md`, used in every mode;
no other rule is introduced. Otherwise `direction` is `NOT_ESTABLISHED`. A meaningfulness
classification never sets or changes `direction`, and `direction` never implies that a change is good or
bad.

## Capability labels

Each series carries the label rules of its capability (`output-format.md`):

- **Retention (classic)** and **LTV & LTDays:** x is the install date (install-cohort evidence, not
  calendar activity); retention differences in bps; LTV and LTDays cumulative at their horizon; immature
  cohorts are gaps; for LTV & LTDays the note that neighbouring cohorts share calendar days.
- **Rolling LTV:** x is the activity date and each point is revenue from that date through day +7
  ("Rolling LTV (D7, forward)"), never revenue earned on the date itself; the overlap note
  (autocorrelation, interval may be optimistic).
- **Economy:** in-game units, never money; one series per currency; spend keeps its stored sign and is
  never flipped or shown as a magnitude, and its direction is worded in magnitude terms ("spend grew in
  magnitude"); a `REFERENCE_NON_POSITIVE` net shows no relative change. A `spend_per_dau` delta always
  uses the neutral colour, whatever its sign or `direction`, because spend can be stored negative and an
  up or down colour would contradict the magnitude wording ("spend fell in magnitude"). The signed delta,
  its wording and `direction` are unchanged; other Economy metrics follow rule 4 as before.
- **Revenue, Rolling Retention, Engagement, Sessions:** x is the activity date; Engagement's primary
  metric (Clear / DAU) and its supporting diagnostics are separate series.
- **Breakdown cells:** shown under their parent result. A descriptive cell (no cell statistic) carries
  movement only, with no interval and no meaningfulness.
- **`NO_COMPARISON` (single variant):** descriptive values per variant; no difference, interval or
  direction.

## Visuals by mode and depth

The SR-22 floor is met by the answer as a whole (`SKILL.md` § Visualization hand-off). Default visuals:

| Mode / state | Visuals |
|---|---|
| TARGETED_DIAGNOSIS (D2) | per unit and pair: a `SERIES` of the requested metric (reference and comparator, or the paired difference) on its date axis; a `BREAKDOWN` of the contributors the capability's Stage 2 returned |
| TARGETED_DIAGNOSIS (D3) and FULL_EXPERIMENT_READ (D3) | the D2 set; a `SUMMARY` of every Stage 1 result (difference with its returned CI and state), grouped by date axis; the mix-shift `BREAKDOWN` where Stage 3 returned one; a `TIMELINE` where ramps, annotations or version boundaries are in play |
| FULL_EXPERIMENT_READ (D3), insufficient-evidence primary metric | a panel for the primary metric when it reads `INSUFFICIENT_EVIDENCE` (a `SERIES` of the returned `observations[].diff` with `summary.ci` as a band; `charts.md` § Chart budget) |
| PERIOD_IMPACT_ANALYSIS | per unit: the trigger metric's `SERIES` with the lookback, comparison and impact windows shaded on the trigger's own date axis; a `SUMMARY` of the cross-capability evidence with its correlation labels, one panel per date axis; the game-level movement as a `CARD`; a lifecycle `TIMELINE` |
| `NO_COMPARISON` | a descriptive `SUMMARY` or `CARD` per variant |
| `PHASE_CEILING` | none for its own part (`output-format.md` § Visuals) |

An explicit user override ("no charts", "just the number") suppresses visuals per SR-2. The number of
visuals is set by these defaults and the floor, never by charting every result.

When no renderer is available in the session, each visual is stated as one text line (`charts.md` § Text
fallback when rendering is unavailable); the floor is met by those lines.
