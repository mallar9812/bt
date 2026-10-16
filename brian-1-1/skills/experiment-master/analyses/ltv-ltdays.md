# LTV & LTDays analysis

**Label:** "LTV" / "Ad LTV" / "IAP LTV" / "LTDays". Capability `ltv_ltdays`, domain `LTV_LTDAYS`.

**Sources:** `experiment.recovery` (Druid; LTV numerators), `experiment.active_dau_days` (Druid; LTDays
numerator) and `experiment.installs` (Druid; denominator of every metric). In `recovery` and
`active_dau_days` `gid` and `cli` are BIGINT (integer literals); in `installs` they are VARCHAR (quote
literals). In all three `__time` is the install date (`install_date`, VARCHAR, holds the same date).
A `recovery` row is one variant, install date, `diff`, `ltv_type` and dimension cell for an
`(exp_id, version)`, with `recovery`; an `active_dau_days` row is the same without `ltv_type`, with
`active_dau_days`; an `installs` row is one variant, install date and dimension cell, with `installs`.
`ltv_type` holds `ad` and `iap` only. Each `recovery` row has one `ad` and one `iap` row for every
`active_dau_days` row (identical row skeleton); `active_dau_days` stores no zero rows, while `recovery`
stores zeros.

**Cumulative values.** The value at `diff` = X is already cumulative over days 0 through X since
install (D0 included). It is read from the `diff` = X rows only; a value is never reconstructed by
summing rows with `diff` ≤ X, and no other table (`experiment.revenue_without_xpromo`,
`experiment.retained_users`, `experiment.rolling_ltv`, `experiment.predicted_*`) is substituted for
these sources.

**Definition lock:** "LTV & LTDays (experiment cohort tables), DX". Each metric family and each horizon
X is its own metric and comparison, with its own `definition_lock` entry and its own results:

| Metric | numerator | denominator | denominator_table | grain | table | definition_status |
|---|---|---|---|---|---|---|
| `ltv_dX` (LTV) | SUM(`recovery`) WHERE `diff` = X AND `ltv_type` IN ('ad', 'iap') | SUM(`installs`) | `experiment.installs` | variant × install date | `experiment.recovery` | UNCONFIRMED |
| `ad_ltv_dX` (Ad LTV) | SUM(`recovery`) WHERE `diff` = X AND `ltv_type` = 'ad' | SUM(`installs`) | `experiment.installs` | variant × install date | `experiment.recovery` | UNCONFIRMED |
| `iap_ltv_dX` (IAP LTV) | SUM(`recovery`) WHERE `diff` = X AND `ltv_type` = 'iap' | SUM(`installs`) | `experiment.installs` | variant × install date | `experiment.recovery` | UNCONFIRMED |
| `ltdays_dX` (LTDays) | SUM(`active_dau_days`) WHERE `diff` = X | SUM(`installs`) | `experiment.installs` | variant × install date | `experiment.active_dau_days` | UNCONFIRMED |

- Numerator and denominator are matched on `exp_id`, `version`, `variant`, install date and the
  requested scope (and the cut cell when cut), each summed separately, then divided.
- LTV `definition_status: UNCONFIRMED`: the revenue semantics of `recovery` are not established
  (net or gross, currency, xpromo treatment). It is never labelled net or gross and carries no currency.
  It is a different source from the Revenue capability (`analyses/revenue.md`); the two are never
  blended, reconciled or substituted. Ad revenue in `recovery` is known to differ slightly (about
  0.6–0.7% on inspected cohorts) from the non-IAP revenue of `experiment.revenue_without_xpromo`; that
  is a known source difference, not an error to correct.
- LTDays `definition_status: UNCONFIRMED`: its D0 term is the cohort's D0 active users, and D0 users and
  installs are not proven to describe the same population (`analyses/classic-retention.md`). There is no
  `diff` = 0 row, so no D0 check is made here.

**Horizons.** Supported X: 1, 3, 5, 7, 10, 15, 21, 30, 45, 60, 90, 120, 180 — exactly the `diff` values
present in both tables. The Master sends `metrics` for the requested families and horizons (default
horizons D1, D3, D7, D15, D30) and `horizon_basis` (`DEFAULT` or `USER_REQUESTED`). Any other horizon
(D0, D2, D14, D28, …) is the Master's `UNSUPPORTED` / `HORIZON_UNSUPPORTED` (`capability-registry.md`);
the nearest horizon is never substituted. Each X is independent: an X with no mature eligible cohort
does not stop the others.

**Eligible cohorts (capability-level exception: the analysis window bounds install dates).** As in
Classic Retention, the received `analysis_window` keeps its contract meaning (`requested_period ∩
experiment_active_window ∩ stable_window`, within D-2, `protocols/context-resolution.md`), but here it
bounds **install dates**: an install cohort is eligible iff its install date lies inside
`analysis_window`. It is never read as a calendar window of activity days. No lifecycle rule is added;
the existing windows, stable-window edge cases and D-2 cutoff apply unchanged. A cohort's later days may
fall after the version's active window; whether those days still reflect the version is an open data-owner
question, and no bound is added.

**Reporting span.** The Master sends `context.observed_active_span` (`first_active_day` to
`min(last_active_day, D-2)`). Install cohorts inside that span but outside `analysis_window` are listed
in `excluded_cohorts[]` (variant, install dates, installs, reason `OUTSIDE_REQUESTED_PERIOD` or
`OUTSIDE_STABLE_WINDOW`). The span is for reporting only: it never makes a cohort eligible.

**Maturity (SR-6 D-2, calendar-based), identical for all four families.** Horizon X of an eligible
cohort is mature only when `install_date + X ≤ D-2`. The tables carry rows up to `install_date + X =
D-1`, and they are rebuilt on every load, so a D-1 value can still change; it is never used. An
immature cohort is left out of horizon X and is never read as zero, and maturity is never inferred from
whether a row exists.

- `mature_analysis_window` has one entry per requested measure, with `basis = CUTOFF_APPLIED`: start =
  `analysis_window.start`, end = `min(analysis_window.end, D-2 − X)`, both install dates. If it is
  empty, nothing is computed for that X (`NOT_MATURED`).
- Different X values have different mature cohort sets.

**Missing rows (no exception: the shared no-zero rule applies).** For a mature eligible cohort of one
variant:

| Situation | `data_conditions` entry | Effect |
|---|---|---|
| no row at `diff` = X in the family's table (whether or not rows exist at other `diff` values) | scope `VARIANT_COHORT_DAY`, condition `MISSING`, `metric`, `install_date` | `EXCLUDED_FROM_PAIR` for that metric and X; never zero |
| no `installs` row for the cohort and variant (activity rows exist or not) | scope `VARIANT_COHORT`, condition `MISSING`, metric = all | `EXCLUDED_FROM_PAIR` for every metric and X; no denominator is built from any other value |
| a cut cell with no `installs` row, or with installs but no row at `diff` = X, on a cohort whose variant has other cells | scope `CUT_CELL`, condition `UNOBSERVED`, `install_date`, `cut`, `metric` | `NOT_READ_AS_ZERO`; the cell-cohort contributes no observation to that cell |

- A stored `0` in `recovery` is an observed zero (common for `iap`). An absent row is never an observed
  zero. Classic Retention's later-row rule (`ABSENT_ROW_LATER_DIFF`) does not apply here: under
  cumulative values a later row does not show that day X is zero.
- A whole-scope numerator is the SUM of the rows that exist for the cohort and variant; absent cells
  are not zero-filled and no value is estimated for them.
- A stored NULL `recovery`, `active_dau_days` or `installs` is undefined, never zero; an `installs` value
  of 0 leaves the ratio undefined. Both exclude only the affected observations and are reported; their
  exact condition labels stay TBD, as in Classic and Rolling Retention.

**Paired observation (pairing unit: install-date cohort).** For each metric, each X and each pair from
the received `comparisons[]`, a paired unit is one eligible install date that is mature for X and on
which both the reference and the comparator have a defined ratio. The observation is `comparator −
reference` for that cohort. A cohort defined for one side only is not a paired unit; the absent side is
reported. The statistics are those of `analysis-contract.md` § Paired test, unchanged, with
`pairing_unit = INSTALL_COHORT`, `stat.method = paired_t_install_cohort` and `n_paired_cohorts` (no
`n_paired_days`). `reference_value` and `comparator_value` are the pooled ratios over the paired cohorts
(numerators and installs each summed, then divided); `exposure` is each side's installs from
`experiment.installs`; `delta_abs` and `delta_pct_of_reference` follow the contract. Each result carries
`horizon_day: X`. No SRM, minimum-sample, multiple-testing, power, peeking or other significance rule is
added, and this analysis never classifies meaningfulness (the Master's, `GENERAL`, `master-state.md`
§ Results and meaningfulness).

- **Known limitation (disclosed, not adjusted):** cumulative values of neighbouring install cohorts
  share most of their calendar days, so their paired differences may be correlated and the interval may
  be optimistic. Effects common to both variants on a day cancel in the paired difference. No
  correction or other method is applied.

**Scope.** A requested scope is applied as a fixed cell to all three tables. Supported scope dimensions
are `country`, `install_bucket`, `lat_flag` and `device_type` (the dimensions this analysis supports as
cuts; `lat_flag` only where the unit has non-`NA` values). Any other dimension — `build`,
`install_type`, `payer_flag`, `user_type`, `cohort`, `rev_type` and the rest — makes every metric
`UNSUPPORTED_FOR_SCOPE`. Scoped values with no rows for the unit make the scope `UNAVAILABLE`. A
dimension is never dropped and nothing is computed at a broader scope.

**Default cut set (`analysis-contract.md` § Default cut set):** install cohort, `user_type` and `payer_flag`
are not in these tables, so those cuts are `UNSUPPORTED_FOR_SCOPE` for every metric here (stated once, not
per metric). This analysis is already by install date, so every result is for users who installed in the
window: it is read observed (`OBSERVED_NO_PAB`, †) and no PAB exists for it. Its own cuts below remain
the Stage 2 cuts.

**Cuts (Stage 2 — WHERE).** One dimension at a time, in this order: `country`, `install_bucket`,
`lat_flag`, `device_type`. No crossed cuts. `NA`, empty and NULL are never cut values.

- `lat_flag` is supported for a unit only when it has non-`NA` values there (all three tables); a unit
  whose values are all `NA` makes the `lat_flag` cut `UNSUPPORTED_FOR_SCOPE`.
- `build` is not a cut (one value per `(exp_id, version)`); `install_type` is not a cut (always `NA` in
  the inspected data); `payer_flag`, `user_type`, `cohort` and `rev_type` are not in these tables;
  `ltv_type` selects the metric family and is not a cut.
- **Cell statistics: this analysis produces cell-level statistics** (`analysis-contract.md` § Breakdown
  cells). A cell of the chosen dimension gets its own `comparison_results[]` entry per metric and X with
  `cut: [{dimension, value}]`, built exactly as the whole-scope entry: the same eligibility, maturity and
  missing-row rules applied inside the cell, installs from the same cell, the same paired test. A cell
  with fewer than 2 paired cohorts or zero variance returns the contract's `NOT_COMPUTABLE_*` status. A
  cell entry never alters the whole-scope entry, and cells are not compared with each other. Small cells
  can be volatile (a few payers move IAP LTV a lot); no minimum-size rule is added.

**PAB:** not supported. There is no PAB table for these sources and no approved PAB methodology, so
this analysis never suggests a `PAB_CHECK`, and a `PAB_CHECK` request for it returns `pab` status
`NOT_APPLICABLE` with reason "no PAB methodology or table for LTV & LTDays". No PAB figure is produced.

**Coverage:** `installs` is the dependency: with no `installs` rows for an `(exp_id, version)` the
capability is `NOT_IN_TABLE` with reason `DEPENDENCY`. `recovery` and `active_dau_days` each gate only
their own families: with no `recovery` rows the three LTV families are `NOT_IN_TABLE` at `METRIC` scope
(with the probe quoted) and LTDays still runs, and the reverse for `active_dau_days`; with neither, the
capability is `NOT_IN_TABLE`. These are the Master's coverage results.

**Data handling:** every statement is bounded by `exp_id`, `version` and `__time` (install date);
versions are never pooled. Stage 1 issues three statements: `recovery` grouped by variant, install date,
`diff` and `ltv_type` with `diff` IN the requested horizons, over `analysis_window` (omitted when no LTV
family is requested); `active_dau_days` grouped by variant, install date and `diff`, same filter
(omitted when LTDays is not requested); and `installs` grouped by variant and install date over the
reporting span (the extra dates serve `excluded_cohorts[]` only). A Stage 2 step adds the cut dimension
to each. Scope filters apply to all three. Count with `GROUP BY`, never `COUNT(DISTINCT)`.

**Negative versions:** the Master never dispatches this analysis for a version whose stored value
starts with `-`: an explicitly requested one is `UNSUPPORTED` / `VERSION_SEMANTICS_UNKNOWN`, and one the
shared rules selected without a request is never auto-selected for it (`SKIPPED_NOT_AUTO_SELECTED`,
`capability-registry.md` § Selection by mode). If one is received anyway, the analysis returns `BLOCKED`
with reason `VERSION_SEMANTICS_UNKNOWN` and computes nothing.

**PERIOD:** LTV & LTDays — one capability with four metric families — supports PERIOD as trigger and as
cross-capability evidence, with this file's methodology unchanged (`period-evidence.md` § Trigger, scope
and evidence). The received `analysis_window` is the unit's `experiment_evidence_window`, applied to
**install dates** (date axis `INSTALL_DATE`); each horizon X is mature only for `install_date + X ≤ D-2`,
so long horizons often have no mature cohort in a recent window (`NOT_MATURED`, never zero). As the
trigger, one family and one horizon is its metric ("D7 LTV" → `ltv_d7`; Ad, IAP and LTDays only when
named; no horizon → asked once); as evidence it runs its families at its default horizons. Pairing,
statistics (including the cohort-overlap caveat), cells, missing rows, `GENERAL` meaningfulness and
negative versions are unchanged; there is still no PAB.

**Unspecified (TBD / data owner):** the revenue semantics of `recovery` (net or gross, currency, xpromo)
and its small ad-revenue difference from the Revenue source (LTV stays UNCONFIRMED); why D0 users and
installs differ (LTDays stays UNCONFIRMED); what negative versions mean; what rows that start only at a
later `diff` mean (a few cohorts and cells have their first row at `diff` 3–15, some without an
`installs` row); whether a cohort's days after its version ended still reflect that version; the
condition labels for a NULL numerator or denominator and for zero installs; a load-completeness marker
(until one exists, maturity rests on D-2 alone); PAB.

**Contract:** compute exactly the received `comparisons[]`, never re-derive the reference arm;
`NO_COMPARISON` returns descriptive values only (each variant's pooled value per metric and X, and its
installs); `MISSING` and `UNOBSERVED` are explicit data conditions and no absent row is read as zero;
shared statistical methodology stays in `analysis-contract.md`; wording per `output-format.md`.
