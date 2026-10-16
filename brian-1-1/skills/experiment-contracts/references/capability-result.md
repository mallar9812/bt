# CapabilityResult v1 (`capability-result` 1.0)

One analysis result (one metric, one comparison, one population, one window) in a common, versioned
envelope, so a consumer does not need to know which capability produced it. Existing experiment-master
capabilities are carried through an adapter that copies fields from `AnalysisResponse` and
`result_ledger` (`experiment-master/references/analysis-contract.md`, `master-state.md`); nothing is
recomputed. Future capabilities may emit this envelope directly.

## Availability — how every value that may be absent is carried

```
Avail<T> = { status: AVAILABLE | NOT_RETURNED | NOT_RUN | NOT_APPLICABLE | CONFIG_REQUIRED
                     | UNRESOLVED | NOT_COMPUTABLE,
             value?: T,      # present exactly when status = AVAILABLE
             reason? }       # recommended for every status other than AVAILABLE
```

- `AVAILABLE`: the producer returned the value. It is copied exactly, sign included.
- `NOT_RETURNED`: the producer's methodology does not return this value (e.g. daily PAB observations
  for a pooled-only PAB result).
- `NOT_RUN`: the step that would produce it did not run (e.g. no PAB check was requested).
- `NOT_APPLICABLE`: it does not apply (e.g. PAB for Classic Retention; relative change of a single arm).
- `CONFIG_REQUIRED`: it needs configuration that does not exist (e.g. power basis, PAB confidence floor).
- `UNRESOLVED`: its definition or an input is not established (e.g. the New/Old weight).
- `NOT_COMPUTABLE`: the computation was attempted and is arithmetically undefined (e.g. zero variance,
  reference of 0).

Unavailable is never zero. A stored or observed zero is `AVAILABLE` with value `0`.

## Result kinds

`result_kind` says what kind of result the envelope carries. Fields that do not apply to a kind are
absent, never invented:

- `COMPARISON`: a paired comparison of a reference group and a comparator group. It carries
  `comparison`, `values`, `statistics`, `observations`, `pab` and `window.mature`.
- `DESCRIPTIVE`: a single-arm unit with no comparison (`NO_COMPARISON`). It carries `descriptive` and
  `window.mature`. It carries no `comparison`, `values`, `statistics`, `observations` or `pab`.
- `NOT_RUN`: the result was planned but never computed (not tested, not run, not in table, unsupported).
  It carries `not_run`. It carries no `values`, `statistics`, `observations`, `pab`, `descriptive` or
  `window.mature`. Its `comparison` is present when the planned comparison is known.

A field marked `CONDITIONAL(result_kind=…)` is required for the listed kinds and must be absent for the
others. A consumer rejects an envelope that carries one for another kind as
`INVALID: FIELD_NOT_ALLOWED_FOR_KIND`.

## Fields

Presence: `REQUIRED`, `OPTIONAL` (absent means not provided; consumers treat it as `NOT_RETURNED`),
`CONDITIONAL(result_kind=…)` (see above), `CONDITIONAL` (required when the condition in Notes holds).

| Field | Type | Presence | Notes |
|---|---|---|---|
| `contract.name` | `"capability-result"` | REQUIRED | |
| `contract.version` | string `MAJOR.MINOR` | REQUIRED | `1.0` |
| `result_id` | string | REQUIRED | for experiment-master results, the deterministic `result_id` of `result_ledger` |
| `result_kind` | `COMPARISON` \| `DESCRIPTIVE` \| `NOT_RUN` | REQUIRED | § Result kinds |
| `producer.capability` | string | REQUIRED | e.g. `revenue`, `classic_retention` |
| `producer.component` | string | REQUIRED | e.g. `experiment-master` |
| `producer.method_ref` | string | REQUIRED | the methodology file, e.g. `experiment-master/analyses/revenue.md` |
| `producer.adapter` | string | OPTIONAL | set when an adapter built the envelope |
| `plan_ref` | object `{plan_id, question_id}` | OPTIONAL | the InvestigationPlan question it answers |
| `experiment.exp_id` | string | REQUIRED | |
| `experiment.version` | string | REQUIRED | opaque; versions are never pooled |
| `experiment.name` | string | OPTIONAL | |
| `comparison.pair_id` | string | CONDITIONAL(result_kind=COMPARISON\|NOT_RUN) | for `NOT_RUN`, the planned pair |
| `comparison.reference` | object `{arm, label}` | CONDITIONAL(result_kind=COMPARISON\|NOT_RUN) | e.g. `{arm: control, label: Control}` |
| `comparison.comparator` | object `{arm, label}` | CONDITIONAL(result_kind=COMPARISON\|NOT_RUN) | e.g. `{arm: var1, label: Variant 1}` |
| `comparison.comparison_type` | string | CONDITIONAL(result_kind=COMPARISON\|NOT_RUN) | as returned (e.g. `VARIANT_VS_CONTROL`) |
| `comparison.causal_scope` | `RELATIVE_TO_CONTROL` \| `RELATIVE_TO_REFERENCE_VARIANT` | CONDITIONAL(result_kind=COMPARISON\|NOT_RUN) | |
| `descriptive` | list<object `{arm, value: Avail<number>, exposure: Avail<number>}`> | CONDITIONAL(result_kind=DESCRIPTIVE) | one entry per arm, as returned |
| `not_run.status` | `NOT_RUN` \| `NOT_TESTED` \| `NOT_IN_TABLE` \| `UNSUPPORTED` \| `UNSUPPORTED_FOR_SCOPE` \| `NO_SCOPED_EXPOSURE` | CONDITIONAL(result_kind=NOT_RUN) | the ledger state, as recorded |
| `not_run.reason` | string | CONDITIONAL(result_kind=NOT_RUN) | as recorded (e.g. `OUT_OF_BUDGET`, the quoted probe) |
| `metric.id` | string | REQUIRED | e.g. `spend_per_dau:cash` |
| `metric.label` | string | REQUIRED | |
| `metric.definition_ref` | string | REQUIRED | the `definition_lock` entry it was computed under |
| `metric.definition_status` | string | OPTIONAL | e.g. `UNCONFIRMED`, as returned |
| `metric.unit` | string | REQUIRED | e.g. `per DAU`, `in-game units per DAU`, `ratio` |
| `metric.metric_class` | `GENERAL` \| `RETENTION` | REQUIRED | |
| `metric.sign_convention` | `STORED_SIGN` \| `NON_NEGATIVE` | REQUIRED | `STORED_SIGN` for Economy spend: kept negative, never flipped |
| `metric.intended_direction` | Avail<`UP` \| `DOWN` \| `NO_CHANGE`> | REQUIRED | which way is desired; `UNRESOLVED` unless stated by the user or a confirmed plan; never inferred from the metric name |
| `population.scope` | list<object `{dimension, values}`> | REQUIRED | empty list = overall |
| `population.cut` | list<object `{dimension, value}`> | OPTIONAL | a breakdown cell inside the scope |
| `population.cohort` | string | OPTIONAL | a cohort label as stored |
| `population.user_type` | `NEW` \| `OLD` \| `ALL` \| `UNSPECIFIED` | REQUIRED | `ALL` = new and old together; `UNSPECIFIED` = not established |
| `population.source` | `CANONICAL` \| `SPEC_DERIVED` | REQUIRED | `SPEC_DERIVED` only for a future spec-driven capability |
| `window.analysis` | object `{start, end}` | REQUIRED | dates with year |
| `window.mature` | list<object `{measure, start, end, basis}`> | CONDITIONAL(result_kind=COMPARISON\|DESCRIPTIVE) | as returned (`CUTOFF_APPLIED` \| `NO_CUTOFF_APPLIED`) |
| `window.date_basis` | `ACTIVITY_DATE` \| `INSTALL_DATE` | REQUIRED | from the capability registry; never mixed on one axis |
| `window.observation_unit` | `CALENDAR_DAY` \| `INSTALL_COHORT` | REQUIRED | |
| `values.reference_value` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | |
| `values.comparator_value` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | |
| `values.delta_abs` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | signed: comparator − reference |
| `values.delta_pct` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | relative change in percent of the reference (`delta_pct_of_reference`), where returned; `NOT_COMPUTABLE` with the returned reason otherwise |
| `statistics.method` | string | CONDITIONAL(result_kind=COMPARISON) | e.g. `paired_t_daily`, `paired_t_install_cohort` |
| `statistics.status` | `COMPUTED` \| `NOT_COMPUTABLE_DF_LT_1` \| `NOT_COMPUTABLE_ZERO_VARIANCE` \| `CONFIG_REQUIRED` | CONDITIONAL(result_kind=COMPARISON) | as returned |
| `statistics.n_pairs` | integer | CONDITIONAL(result_kind=COMPARISON) | paired days or paired cohorts |
| `statistics.mean_paired_diff` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | |
| `statistics.p_value` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | the raw two-sided p-value, as returned; never a converted "confidence %" |
| `statistics.interval` | Avail<object `{level, low, high}`> | CONDITIONAL(result_kind=COMPARISON) | the returned confidence interval |
| `statistics.power` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | `CONFIG_REQUIRED` while no power basis is configured |
| `observations` | Avail<list<object `{x, reference_value, comparator_value, diff}`>> | CONDITIONAL(result_kind=COMPARISON) | experiment-period paired units exactly as returned, one value per group per unit; `NOT_RETURNED` when absent |
| `pab.run` | `RUN` \| `NOT_RUN` \| `NOT_SUPPORTED` | CONDITIONAL(result_kind=COMPARISON) | whether a PAB check ran for this result |
| `pab.result_ref` | string | CONDITIONAL | required when `pab.run = RUN`: the PAB request or `pab[]` entry it was copied from |
| `pab.status` | string | CONDITIONAL | required when `pab.run = RUN`: the returned `pab[].status` |
| `pab.window` | Avail<object `{start, end, days}`> | CONDITIONAL(result_kind=COMPARISON) | the PAB period where returned |
| `pab.pooled` | Avail<object `{reference_value, comparator_value}`> | CONDITIONAL(result_kind=COMPARISON) | each group's pooled PAB value where returned |
| `pab.movement_unit` | Avail<`RELATIVE_PCT` \| `ABSOLUTE`> | CONDITIONAL(result_kind=COMPARISON) | unit of `pab_value`, `observed_movement` and `adjusted_movement`; `AVAILABLE` only when the producing methodology states it, otherwise `UNRESOLVED` |
| `pab.pab_value` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | the returned PAB movement |
| `pab.observed_movement` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | the experiment-period movement the PAB check compared against |
| `pab.adjusted_movement` | Avail<number> | CONDITIONAL(result_kind=COMPARISON) | observed movement minus `pab_value` (the PAB already scaled by the result's `old_share`; the unscaled PAB is `pab.raw_value` and the share is `pab.adjusted.old_share`), as returned in `pab[].adjusted.value` (`analysis-contract.md` § PAB adjustment); `NOT_RETURNED` where PAB is not available |
| `pab.adjusted` | Avail<object `{value, ci_low, ci_high, half_width_obs, half_width_pab, conf, basis, old_share}`> | CONDITIONAL(result_kind=COMPARISON) | the PAB-adjusted effect with its interval (observed half-width and the old_share-scaled PAB half-width combined as √(obs² + (old_share × pab)²)) and `conf`, copied from `pab[].adjusted`; never computed by a consumer |
| `pab.confidence` | Avail<object `{value?, floor?, outcome}`> | CONDITIONAL(result_kind=COMPARISON) | PAB confidence as returned. `outcome` is one of the existing values `BELOW_FLOOR` \| `ALWAYS_USE` \| `UNSPECIFIED_BAND` \| `NOT_DETERMINED`; the default `pab_config` now uses `ALWAYS_USE`, so PAB is applied whenever it is computed. `value` is the Conf of the adjusted effect (`pab.adjusted.conf`), copied as returned. The Conf bar is 0.85 (`stats_config.conf_bar`), applied by experiment-master, not here. |
| `pab.observations` | Avail<list<object `{arm, series: [{x, value}]}`>> | CONDITIONAL(result_kind=COMPARISON) | group-specific daily pre-experiment values; returned when the producing analysis returns `pab[].observations`; `NOT_RETURNED` for pooled-only results |
| `pab.excluded_days` | Avail<list<object `{x, arm?, reason, source_ref}`>> | CONDITIONAL(result_kind=COMPARISON) | PAB days excluded, each with the reason and the data condition it came from; `NOT_RETURNED` while PAB missing-row handling is TBD |
| `pab.daily_trend_available` | boolean | CONDITIONAL(result_kind=COMPARISON) | true exactly when `pab.observations` is `AVAILABLE` with a series for both compared groups |
| `meaningfulness` | object | OPTIONAL | experiment-master's classification and reading (`MeaningfulnessResult`: class observed and adjusted, reader label Upside / Downside / Neutral), as recorded; never recomputed |
| `state` | string | REQUIRED | e.g. `COMPUTED`, `NOT_IN_TABLE`, `INSUFFICIENT_DATA` |
| `limitations` | list<object `{kind, detail}`> | REQUIRED | data conditions, maturity, unconfirmed definitions; may be empty |
| `provenance.queries_executed` | Avail<integer> | REQUIRED | as reported by the producer |
| `provenance.tables` | list<string> | REQUIRED | |
| `provenance.evidence_refs` | list<string> | REQUIRED | e.g. `result_ledger` id, `request_id` |

### Not part of this contract

These names are reserved and rejected: `reliability_score`, `confidence_pct`, `confidence_percent`,
`significance`, `verdict`.

**Display of `(1 − p) × 100%`.** A consumer may show this display transformation of the raw p-value
at presentation time. Conditions:
- It is shown only for a `COMPARISON` result whose `statistics.status` is `COMPUTED` and whose
  `statistics.p_value` is `AVAILABLE`. Otherwise the display is "N/A" with the status.
- It is a display transformation of a two-sided p-value. It is not the probability that a variant is
  better, not the probability the hypothesis is true, and not a confidence level of the interval.
- It is never stored in a result, which prevents a second conversion. The PAB-adjusted `Conf` of `pab.adjusted.conf` is a different value: it is returned by the capability from the adjusted effect and its combined interval (`analysis-contract.md` § PAB adjustment), is stored as returned, and is the Conf shown in reads.

## Group-specific observations and the intended PAB chart

- Experiment-period values are kept per group: each `observations` unit carries the reference group's
  value and the comparator group's value. With several variants, each comparison carries its own
  observations. The reference series must be identical across comparisons for the same unit, and a
  consumer checks this rather than assuming it. Groups are never collapsed into a pooled series.
- Pre-experiment (PAB-period) values are `pab.observations`, one series per group. They are returned
  when the producing analysis returns `pab[].observations`
  (`experiment-master/references/analysis-contract.md` § PAB observations). For a pooled-only result,
  `pab.observations` is `NOT_RETURNED` and `pab.daily_trend_available` is `false`.
  A pooled value is never spread into a daily series.
- Excluded PAB days are listed only when the producer returns them with a reason and a source
  (`pab.excluded_days`). No reason is inferred from a gap.
- **Intended chart (future report generator; not built in this phase).** For each metric, one focused
  line chart per group pair:
  - a pre-experiment segment (from `pab.observations`) and an experiment-period segment (from
    `observations`) on the same date axis;
  - each group drawn separately;
  - experiment start marked.

  Rules for drawing it:
  - It is drawn only when `pab.daily_trend_available` is true and both segments share `ACTIVITY_DATE`.
    An install-date metric never gets a pre-experiment trend.
  - Otherwise the experiment-period chart is drawn alone, and the pooled PAB values are shown as
    labelled pooled values, not as a trend.

## New/Old combination (`summary-combination` 1.0)

A derived summary that combines a New-user result and an Old-user result for the same metric,
comparison and window, built by a consumer from existing results only:

```
Final Delta = W_new × RawDelta_new + W_old × PABAdjustedDelta_old,   W_new + W_old = 1
```

| Field | Type | Presence | Notes |
|---|---|---|---|
| `contract.name` | `"summary-combination"` | REQUIRED | |
| `contract.version` | string `MAJOR.MINOR` | REQUIRED | `1.0` |
| `provenance_class` | `PRODUCTION` \| `SYNTHETIC_FIXTURE` | REQUIRED | `SYNTHETIC_FIXTURE` documents test contract arithmetic only and are never rendered as results |
| `metric_id` | string | REQUIRED | must equal each component result's `metric.id` |
| `pair_id` | string | REQUIRED | must equal each component result's `comparison.pair_id` |
| `selection` | `NEW_ONLY` \| `OLD_ONLY` \| `NEW_AND_OLD` | REQUIRED | the user types the user selected |
| `components` | list<object> | REQUIRED | one per selected user type |
| `components[].user_type` | `NEW` \| `OLD` | REQUIRED | must equal the component result's `population.user_type` |
| `components[].result_ref` | string | REQUIRED | the `result_id` of the component's CapabilityResult |
| `components[].raw_delta_pct` | Avail<number> | REQUIRED | copied from the component result's `values.delta_pct` |
| `components[].used_basis` | `RAW` \| `PAB_ADJUSTED` | REQUIRED | `NEW` → `RAW`; `OLD` → `PAB_ADJUSTED` |
| `components[].used_delta_pct` | Avail<number> | REQUIRED | the delta used. For `NEW`, the raw delta. For `OLD`, copied from the component result's `pab.adjusted_movement`, never computed here |
| `components[].used_delta_unit` | Avail<`RELATIVE_PCT` \| `ABSOLUTE`> | REQUIRED | `RELATIVE_PCT` for a `NEW` raw delta (`delta_pct_of_reference`); for `OLD`, copied from `pab.movement_unit` |
| `components[].pab_result_ref` | string | CONDITIONAL | required for `OLD`: the component result's `pab.result_ref` |
| `components[].pab_confidence_outcome` | Avail<`BELOW_FLOOR` \| `ALWAYS_USE` \| `UNSPECIFIED_BAND` \| `NOT_DETERMINED`> | CONDITIONAL | required for `OLD`: copied from the component result's `pab.confidence`; never filled in |
| `components[].weight` | Avail<number> | CONDITIONAL | required when `selection = NEW_AND_OLD` |
| `weight_definition` | Avail<object `{definition_id, approved_by, source_ref}`> | REQUIRED | must name an entry of `compatibility.md` § Approved definitions; `UNRESOLVED` today |
| `unit_comparability` | Avail<object `{basis_id, approved_by, source_ref}`> | REQUIRED | the approved basis showing that the used deltas are comparable; must name an entry of `compatibility.md` § Approved definitions; `UNRESOLVED` today |
| `final_delta_pct` | Avail<number> | REQUIRED | `AVAILABLE` only when every rule below holds |

Rules:
- **Selection:**
  - `NEW_ONLY`: final = the New raw delta.
  - `OLD_ONLY`: final = the Old PAB-adjusted delta.
  - `NEW_AND_OLD`: the weighted sum above.
- **When `final_delta_pct` may be `AVAILABLE`:** only when all of these hold. Otherwise it is
  `UNRESOLVED` with the missing input named.
  - every used delta and weight is `AVAILABLE`, and the weights sum to 1 (tolerance 1e-9);
  - every used delta has the same `AVAILABLE` unit;
  - `unit_comparability` is `AVAILABLE`, and so is `weight_definition` for `NEW_AND_OLD`;
  - each of them names an approved entry. A unit label alone (`RELATIVE_PCT`) does not establish
    comparability.
- **Component compatibility:** each component's result must exist and match the combination on all of:
  - metric (`metric.id`, `metric.definition_ref`);
  - comparison (`comparison.pair_id`);
  - experiment (`exp_id`, `version`);
  - analysis window, date basis and observation unit;
  - population, except `user_type`, which must equal the component's `user_type`.

  The copied values (`raw_delta_pct`, `used_delta_pct`, `used_delta_unit`, `pab_confidence_outcome`)
  must equal the fields they were copied from. A mismatch is `INVALID: COMBINATION_INCOMPATIBLE <field>`.
- **Raw vs used:** the raw deltas (`raw_delta_pct`) and the deltas actually used (`used_delta_pct`)
  are separate fields and are both reported.
- **Synthetic documents:** a `SYNTHETIC_FIXTURE` may carry `approved_by: "SYNTHETIC"` to exercise the
  arithmetic. Production approval is never claimed that way, and a consumer rendering results rejects
  synthetic documents.

**Current status (evidence, 2026-10-09):**
- **Weight:** no approved New/Old contribution-weight definition exists. The analysis files define DAU
  weight and user weight only as emphasis signals, and state "No contribution-to-lift formula is
  defined". `weight_definition` is therefore `UNRESOLVED`.
- **Unit comparability:** no approved comparability basis exists. The units of PAB movements are not
  stated by the existing analysis files: Revenue gives one worked example in percent, and Economy
  describes a "movement" without a unit. `unit_comparability` is therefore `UNRESOLVED`.
- **Old-user PAB-adjusted delta (superseded for reads: old users take the overall PAB in full and mixed results take `old_share × PAB, `analysis-contract.md` § PAB adjustment; the text below stays for the combination contract):** unavailable today.
  - The PAB tables carry no `user_type`.
  - The PAB confidence floor is `CONFIG_REQUIRED`, and the behaviour between the floor and 85% is
    unspecified.
  - No general adjustment formula exists; the only one is a single worked Revenue example.

  So production combinations are `UNRESOLVED`.
