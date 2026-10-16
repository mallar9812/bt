# ExperimentContext

Produced once per request by `protocols/context-resolution.md`; passed to every analysis.

```
{ experiment: {raw, resolved, candidates[]},
  gid,
  requested_period?,
  versions: [{exp_id, version, first_active_day, last_active_day, active_days,
              selected: bool, selection_basis: VERSION_REF | PERIOD | LATEST,
              version_semantics_unknown: bool}],   # surfaced in the answer; true when the stored
                                                   # value starts with "-" (never interpreted)
  units: [                                   # one per selected experiment-version (exp_id, version)
    { exp_id, version, cli,
      windows: {experiment_active_window, stable_window, analysis_window, baseline_window?,
                analysis_window_basis: REQUESTED_PERIOD | EXPERIMENT_EVIDENCE_WINDOW,
                experiment_evidence_window?, impact_overlap_window?},   # the last two PERIOD only
      lifecycle?: {                          # PERIOD only; each field {value, basis:
                                             #   OBSERVED | ANNOTATED | PROXY | UNKNOWN}
        observed_first_active_day, left_censored, true_first_active_day, last_active_day,
        active_on_impact_end, allocation_events[{day, arms_before_after, mapping: DATE_ALIGNED}],
        stable_allocation_start, end_type: SHIPPED | KILLED | ENDED_UNKNOWN | RUNNING,
        treated_share, version_boundaries: {predecessor_last_day?, successor_first_day?},
        allocation_stability: ANNOTATED | UNKNOWN,
        exposure_stability: STABLE | CHANGED | UNDETERMINED,           # basis always PROXY
        exposure_events[{day, signal: ARM_SHARE_STEP | EXPOSURE_SHIFT, value}] },   # PROXY
      scope_coverage?: {                     # any mode with a scope; protocols/context-resolution.md 2b
        scope_signature,                     # the canonical scope this coverage is for
        lens_id?,                            # request-local label, for display; see the note below
        status: AVAILABLE | NO_SCOPED_EXPOSURE,
        per_table: [{table, status: AVAILABLE | UNAVAILABLE | UNSUPPORTED}] },
      candidate?: {                          # PERIOD only; references/period-evidence.md § Candidates
        class: CHANGED_IN_LOOKBACK | CHANGING_IN_IMPACT | ENDED_IN_WINDOW | STARTED_AFTER_ONSET
             | STABLE_THROUGHOUT | LIFECYCLE_UNRESOLVED | EXCLUDED,
        excluded_reason?: ENDED_BEFORE_IMPACT | POST_IMPACT,
        tier: 1 | 2 | 3, relevant_event?, proximity_days_to_onset?, priority_position },
      design: {
        classification:   CONTROLLED_TEST | NO_CONTROL_MULTI_ARM | SINGLE_ARM,
        status:           COMPARABLE | NO_COMPARISON | UNRESOLVED,
        reason:           SINGLE_ARM | UNSUPPORTED_ARM_NAME | null,
        explicit_control: bool,
        reference_arm:    "control" | "var<N>" | null,
        reference_basis:  EXPLICIT_CONTROL | CONVENTION_VAR1 | CONVENTION_LOWEST_VARIANT | null,
        comparison_type:  CONTROL_VS_VARIANT | REFERENCE_VARIANT_VS_VARIANT | NONE,
        arm_set_stable:   bool,
        arms: [{name, role: CONTROL | REFERENCE_VARIANT | VARIANT, alloc_timeline[]}],
        comparisons: [{pair_id,              # canonical <comparator>_vs_<reference>
                                             # (experiment-classification.md § Pairing)
                       reference, comparator, comparison_type,
                       eligible: bool, ineligible_reason?}] } } ],
  ramp_events[],                             # from the annotations, which carry no version; in PERIOD
                                             # each carries its mapping (DATE_ALIGNED unit | AMBIGUOUS)
  annotation_status: running | killed | shipped | unknown  + basis,   # per experiment (exp_id)
  concurrent: [...], freshness: {...}, annotation_probe: {...},
  assumptions[], disambiguate[] }
```

- **The unit is the experiment-version `(exp_id, version)`.** `version` is the `version` value of the
  `experiment.*` tables, an opaque string compared exactly — never parsed, truncated or numerically
  ordered. It is platform-specific because `exp_id` contains the platform. Versions are never pooled,
  including on transition days: rows of different versions on one day belong to their own units.
  `windows` and `design` are per unit. A unit always carries both `exp_id` and `version`; no
  downstream capability receives an experiment context without both.
- `scope_coverage` is keyed by `scope_signature`, one object per canonical scope (`master-state.md`
  § Scope lenses and context updates). A user-origin request has one (lens `L1`); a stream-origin
  request has one per admitted lens. Everything else in a unit (windows, lifecycle, candidate, design)
  is scope-independent and shared by every lens.
- `design` is defined by `references/experiment-classification.md`; this file only carries it.
- `lifecycle` and `candidate` (PERIOD only) are defined by `references/period-evidence.md`; this file
  only carries them. They are per unit: a superseded version and its successor each carry their own,
  and neither is merged into the other. A `PROXY` value is never presented as observed allocation.
  `end_type` is the version's lifecycle outcome; `annotation_status` stays the per-`exp_id` status.
- `design.status` (which arms are compared) and `annotation_status` (what happened to the
  experiment or ramp) are **completely independent**. `annotation_status` comes only from the
  fixed annotation rule and never selects or changes `reference_arm`; `design` never alters
  `annotation_status`. Annotation rows carry no version, so `annotation_status` describes the
  experiment (`exp_id`), not a version.
- `role = REFERENCE_VARIANT` marks the reference arm of a no-control experiment; `explicit_control`
  stays false.
- `design.status = NO_COMPARISON` (SINGLE_ARM) still carries timeline, ramp, annotation status
  and descriptive metrics; it yields no comparison and is not BLOCKED.
- `reason = UNSUPPORTED_ARM_NAME` is a data-contract safeguard for a future arm name that is
  neither `control` nor `var<N>`; it is not a condition observed in current data.
