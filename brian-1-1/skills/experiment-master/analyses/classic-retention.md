# Classic Retention analysis

**Label:** "Retention (classic)". Capability `classic_retention`, domain `CLASSIC_RETENTION`.

**Sources:** `experiment.retained_users` (Druid; numerator) and `experiment.installs` (Druid;
denominator). In both tables `gid` and `cli` are VARCHAR — quote literals — and `__time` is the
install date (`install_date`, VARCHAR, holds the same date). A `retained_users` row is one variant,
install date, `diff` and dimension cell for an `(exp_id, version)`; `diff` is the number of days since
install and `users` the cohort's users active on that day. An `installs` row is one variant, install
date and dimension cell, with `installs`. Rows exist only where the count is above zero.

**Definition lock:** "classic retention (experiment cohort tables), DX". Never blended with Rolling
Retention (`analyses/retention.md`), with the rolling series of `investigate-rolling-retention`, or with
the game-level cohort chart of `investigate-retention`. Each retention day X is its own metric and
comparison, with its own `definition_lock` entry:

| Metric | numerator | denominator | denominator_table | grain | table | definition_status |
|---|---|---|---|---|---|---|
| `classic_retention_dX` (X = 1…30) | SUM(`users`) WHERE `diff` = X | SUM(`installs`) | `experiment.installs` | variant × install date | `experiment.retained_users` | UNCONFIRMED |

- Numerator and denominator are matched on `exp_id`, `version`, `variant`, install date and the
  requested scope (and the cut cell when cut), each summed separately, then divided.
- `definition_status: UNCONFIRMED`: D0 users and installs are not proven to describe the same
  population (they differ in observed data). Report results with that caveat. Installs are always the
  denominator; D0 users never replace them.
- **D0 check (descriptive only):** for each variant (and cell), SUM(`users`) at `diff` = 0 is compared
  with SUM(`installs`) over the eligible cohorts and returned in `d0_installs_check[]`. It never feeds a
  result and is never used to correct either table. No explanation of a difference is offered.

**Retention days.** Supported: every whole X from 1 to 30. The Master sends `metrics` with the requested
days (default `classic_retention_d1`, `_d3`, `_d7`, `_d14`, `_d30`) and `retention_days_basis`
(`DEFAULT` or `USER_REQUESTED`). D0 is never a retention result, and X > 30 is never computed (both are
the Master's `UNSUPPORTED`, `capability-registry.md`). Each X is independent: an X with no mature
eligible cohort does not stop the others.

**Eligible cohorts (capability-level exception: the analysis window bounds install dates).** The
received `analysis_window` keeps its contract meaning (`requested_period ∩ experiment_active_window ∩
stable_window`, within D-2, `protocols/context-resolution.md`), but here it bounds **install dates**:
an install cohort is eligible iff its install date lies inside `analysis_window`. It is never read as a
calendar window of activity days. No lifecycle rule is added; the existing windows, stable-window edge
cases and D-2 cutoff apply unchanged.

**Reporting span.** The Master sends the version's unclipped observed active span
(`context.observed_active_span`: `first_active_day` to `min(last_active_day, D-2)`). Install cohorts
inside that span but outside `analysis_window` are listed in `excluded_cohorts[]` (variant, install
dates, installs, reason `OUTSIDE_REQUESTED_PERIOD` or `OUTSIDE_STABLE_WINDOW`). The span is for
reporting only: it never makes a cohort eligible, and cohorts outside it are not enumerated.

**Maturity (SR-6 D-2, calendar-based).** Day X of an eligible cohort is mature only when
`install_date + X ≤ D-2` (`D-n` counts back from the current date, as in the D-2 freshness rule). An
immature `diff` row is absent in these tables; an immature cohort is left out of day X and is never
read as zero, and maturity is never inferred from whether a row exists.

- `mature_analysis_window` has one entry per requested measure `classic_retention_dX`, with `basis =
  CUTOFF_APPLIED`: start = `analysis_window.start`, end = `min(analysis_window.end, D-2 − X)`, both
  install dates. If it is empty, nothing is computed for that X.
- Different X values have different mature cohort sets.

**Missing rows (capability-level exception to the shared no-zero rule, B4).** For a mature cohort of
one variant (and the same scope cell or cut cell):

| Situation | `data_conditions` entry | Effect |
|---|---|---|
| no `diff` = X row, and a row at some `diff` > X exists for the same cohort, variant and cell (the cohort's later activity was loaded) | scope `VARIANT_COHORT_DAY`, condition `ABSENT_ROW_LATER_DIFF`, `install_date`, `retention_day` | `READ_AS_ZERO_LATER_DIFF`: the numerator for day X is 0 for that cohort |
| no `diff` = X row and no row at any `diff` > X | scope `VARIANT_COHORT_DAY`, condition `MISSING` | `EXCLUDED_FROM_PAIR` for that X; never zero |
| no `installs` row for the cohort and variant (any `retained_users` rows exist or not) | scope `VARIANT_COHORT`, condition `MISSING`, metric = all | `EXCLUDED_FROM_PAIR` for every X; no denominator is built from D0 users |
| a cut cell with no `installs` row on a cohort whose variant has other cells | scope `CUT_CELL`, condition `UNOBSERVED`, `install_date`, `cut` | `NOT_READ_AS_ZERO`; the cell-cohort contributes no observation |

Only the first row reads an absent row as zero; nothing else is zero-filled. A stored NULL `users` or
`installs` is undefined, never zero; an `installs` value of 0 leaves the ratio undefined. Both exclude
only the affected observations and are reported; their exact condition labels stay TBD, as in Rolling
Retention.

**Paired observation (pairing unit: install-date cohort).** For each X and each pair from the received
`comparisons[]`, a paired unit is one eligible install date that is mature for X and on which both the
reference and the comparator have a defined day-X ratio. The observation is `comparator DX − reference
DX` for that cohort. A cohort defined for one side only is not a paired unit; the absent side is
reported (`MISSING`, `VARIANT_COHORT` or `VARIANT_COHORT_DAY`). The statistics are those of
`analysis-contract.md` § Paired test, unchanged, with `pairing_unit = INSTALL_COHORT`, `stat.method =
paired_t_install_cohort` and `n_paired_cohorts` (no `n_paired_days`). `reference_value` and
`comparator_value` are the pooled ratios over the paired cohorts (numerators and installs each summed,
then divided); `exposure` is each side's installs from `experiment.installs`; `delta_abs` and
`delta_pct_of_reference` follow the contract. Each result carries `retention_day: X`. No SRM,
minimum-sample, multiple-testing, peeking or other significance rule is added, and this analysis never
classifies meaningfulness (the Master's, `master-state.md` § Results and meaningfulness).

**Scope.** A requested scope is applied as a fixed cell to both tables. Supported scope dimensions are
`country`, `install_bucket`, `lat_flag` and `device_type` (the dimensions this analysis supports as
cuts). Any other dimension — `build`, `install_type`, `payer_flag`, `user_type`, `cohort` and the rest —
makes every metric `UNSUPPORTED_FOR_SCOPE`. Scoped values with no rows for the unit make the scope
`UNAVAILABLE`. A dimension is never dropped and nothing is computed at a broader scope.

**Default cut set (`analysis-contract.md` § Default cut set):** install cohort, `user_type` and `payer_flag`
are not in these tables, so those cuts are `UNSUPPORTED_FOR_SCOPE` for every metric here (stated once, not
per metric). This analysis is already by install date, so every result is for users who installed in the
window: it is read observed (`OBSERVED_NO_PAB`, †) and no PAB exists for it. Its own cuts below remain
the Stage 2 cuts.

**Cuts (Stage 2 — WHERE).** One dimension at a time, in this order: `country`, `install_bucket`,
`lat_flag`, `device_type`. No crossed cuts. `NA`, empty and NULL are never cut values.

- `lat_flag` is supported for a unit only when it has non-`NA` values there (both tables); a unit whose
  values are all `NA` makes the `lat_flag` cut `UNSUPPORTED_FOR_SCOPE`.
- `build` is not a cut: it holds one value per `(exp_id, version)`. `install_type` is not a cut (always
  `NA` in the inspected data); `payer_flag`, `user_type` and `cohort` are not in these tables. None is
  added because a column exists.
- **Cell statistics: this analysis produces cell-level statistics** (`analysis-contract.md` § Breakdown
  cells). A cell of the chosen dimension gets its own `comparison_results[]` entry per X with `cut:
  [{dimension, value}]`, built exactly as the whole-scope entry: the same eligibility, maturity and
  missing-row rules applied inside the cell (the later-`diff` evidence must come from the same cell),
  installs from the same cell, the same paired test. A cell with fewer than 2 paired cohorts or zero
  variance returns the contract's `NOT_COMPUTABLE_*` status. A cell entry never alters the whole-scope
  entry, and cells are not compared with each other.

**PAB:** not supported. There is no PAB table for these sources and no approved PAB methodology, so
this analysis never suggests a `PAB_CHECK`, and a `PAB_CHECK` request for it returns `pab` status
`NOT_APPLICABLE` with reason "no PAB methodology or table for Classic Retention". No PAB figure is
produced.

**Coverage:** an `(exp_id, version)` with no `retained_users` rows after a live bounded probe is
`NOT_IN_TABLE`; with none in `installs` it is `NOT_IN_TABLE` with reason `DEPENDENCY`. Both are the
Master's coverage results, with the probe quoted.

**Data handling:** every statement is bounded by `exp_id`, `version` and `__time` (install date);
versions are never pooled. Stage 1 issues two statements: `retained_users` grouped by variant, install
date and `diff` (0–30) over `analysis_window`, and `installs` grouped by variant and install date over
the reporting span (the extra dates serve `excluded_cohorts[]` only). A Stage 2 step adds the cut
dimension to both. Scope filters apply to both. Count with `GROUP BY`, never `COUNT(DISTINCT)`.

**Negative versions:** the Master never dispatches this analysis for a version whose stored value
starts with `-`: an explicitly requested one is `UNSUPPORTED` / `VERSION_SEMANTICS_UNKNOWN`, and one the
shared rules selected without a request is never auto-selected for it (`capability-registry.md`
§ Selection by mode). If one is received anyway, the analysis returns `BLOCKED` with reason
`VERSION_SEMANTICS_UNKNOWN` and computes nothing.

**PERIOD:** Classic Retention supports PERIOD as trigger and as cross-capability evidence, with this
file's methodology unchanged (`period-evidence.md` § Trigger, scope and evidence). The received
`analysis_window` is the unit's `experiment_evidence_window`, applied to **install dates** exactly as
above (date axis `INSTALL_DATE`): eligible cohorts are those installed inside it, each day X is mature
only for `install_date + X ≤ D-2`, and `mature_analysis_window` per day reports what remains;
impact-window cohorts that are not yet mature for a day are not computed for it (`NOT_MATURED`), never
zero. A cohort's day-X activity can fall after the impact window. As the trigger, one day X is its
metric; as evidence it runs its default days. Pairing, statistics, cells, missing rows, RETENTION
meaningfulness and negative versions are unchanged; there is still no PAB.

**Unspecified (TBD / data owner):** why D0 users and installs differ (`definition_status` stays
UNCONFIRMED); what negative versions mean; why experiment installs are lower than game-level installs;
the condition labels for a NULL numerator or denominator and for zero installs; a load-completeness
marker (until one exists, maturity rests on D-2 alone); retention days beyond 30; PAB.

**Contract:** compute exactly the received `comparisons[]`, never re-derive the reference arm;
`NO_COMPARISON` returns descriptive values only (each variant's pooled DX and installs); MISSING,
UNOBSERVED and `ABSENT_ROW_LATER_DIFF` are explicit data conditions; the later-`diff` zero is the only
zero read from an absent row; shared statistical methodology stays in `analysis-contract.md`; wording
per `output-format.md`.
