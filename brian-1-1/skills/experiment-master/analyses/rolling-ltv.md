# Rolling LTV analysis

**Label:** "Rolling LTV (D7, forward)" / "IAP Rolling LTV" / "Ad Rolling LTV". Capability `rolling_ltv`,
domain `ROLLING_LTV`.

**Source:** `experiment.rolling_ltv` (Druid) only; no other table is read. `gid` and `cli` are BIGINT
(integer literals). `__time` is the **activity date** (`date_field`, VARCHAR, holds the same date). A row
is one activity date, variant, dimension cell and `rev_type` for an `(exp_id, version)`. `rev_type` =
`Independent` is the total row: it carries `dau` (the cell's active users on the activity date) and the
total forward revenue. The component rows (`banner`, `interstitial`, `w2e`, `iap`, `ad_on_inactivity`,
`audio`, and any other non-NULL value) carry that type's forward revenue and no `dau`. Rows with
`rev_type` NULL hold no revenue and no `dau`; they are not read and are reported once. `dau` summed over
the Independent rows of a variant-day equals that variant-day's `experiment.dau`; `experiment.dau`,
`experiment.recovery` and `experiment.retained_users` were used to establish the definitions and are
never queried by this analysis.

**What it measures.** Rolling LTV is a forward metric anchored on the activity date, not a backward
"last 7 days" revenue and not install-cohort LTV (`analyses/ltv-ltdays.md`). For activity date T, the
users active on T in a cell (`dau`) and the revenue those same users generate from T through T+7
(eight calendar days, T included; `d7_rev`). It is stored per activity date and cell; the source
computes it, and this analysis never rebuilds it from other tables.

**Cohort (`cohort` dimension).** The user's age since install on activity date T: `D00` (installed on
T), `D01`, `D02-D07`, `D08-D14`, `D15-D30`, `D31-D60`, `D61-D120`, `D121-D180`, `D181-D240`,
`D241-D360`, `D361-D720`, `D720+` (labels as stored). These are activity-day age buckets: not install
cohorts and not lifetime active-day buckets. Every active user-day falls in exactly one bucket.

**Definition lock:** "Rolling LTV (experiment.rolling_ltv), forward D7". Each metric has its own
`definition_lock` entry and its own results:

| Metric | numerator | denominator | denominator_table | grain | table | definition_status |
|---|---|---|---|---|---|---|
| `rolling_ltv_d7` (Rolling LTV) | SUM(`d7_rev`) WHERE `rev_type` = 'Independent' | SUM(`dau`) WHERE `rev_type` = 'Independent' | `experiment.rolling_ltv` | variant × activity date | `experiment.rolling_ltv` | UNCONFIRMED |
| `iap_rolling_ltv_d7` (IAP Rolling LTV) | SUM(`d7_rev`) WHERE `rev_type` = 'iap' | SUM(`dau`) WHERE `rev_type` = 'Independent' | `experiment.rolling_ltv` | variant × activity date | `experiment.rolling_ltv` | UNCONFIRMED |
| `ad_rolling_ltv_d7` (Ad Rolling LTV) | SUM(`d7_rev`) WHERE `rev_type` IS NOT NULL AND `rev_type` NOT IN ('Independent', 'iap') | SUM(`dau`) WHERE `rev_type` = 'Independent' | `experiment.rolling_ltv` | variant × activity date | `experiment.rolling_ltv` | UNCONFIRMED |

- Numerator and denominator are matched on `exp_id`, `version`, `variant`, activity date and the
  requested scope (and the cell when cut), each summed separately, then divided. Daily ratios are never
  averaged into a period rate.
- `definition_status: UNCONFIRMED` for all three: the revenue semantics of the source (net or gross,
  currency, xpromo) are not established, so no metric is called net, gross or currency-specific. Ad
  Rolling LTV is also unconfirmed because the meaning of `ad_on_inactivity` and `audio` is not
  established and the component rows do not reconcile exactly to the Independent total (about 0.003% on
  inspected cells); Ad is never derived as Independent − IAP.
- Impressions, clears and the `users` fields are not metrics of this analysis: their semantics are not
  established.

**Horizon: D7 only.** `d14_rev` and `d30_rev` are never read. Regular production loads truncate the
14-day window and leave the 30-day window NULL; values on occasionally backfilled dates do not establish
a supported methodology. A request for D14, D30 or any other horizon is the Master's `UNSUPPORTED` /
`HORIZON_UNSUPPORTED` (`capability-registry.md`); no other horizon is substituted. A pipeline change that
makes another horizon reliable needs a new discovery.

**Analysis window.** The received `analysis_window` keeps its contract meaning and is a window of
activity dates (`requested_period ∩ experiment_active_window ∩ stable_window`, within D-2,
`protocols/context-resolution.md`); no exception applies. A day's forward revenue can extend past the
version's last active day; whether those days still reflect the version is an open data-owner question,
and no bound is added.

**Maturity (SR-6 D-2, calendar-based).** Activity date T is mature for D7 only when `T + 7 ≤ D-2`.
`mature_analysis_window` has one entry per measure with `basis = CUTOFF_APPLIED`: start =
`analysis_window.start`, end = `min(analysis_window.end, D-2 − 7)`. If it is empty, nothing is computed
(`NOT_MATURED`). Maturity is never inferred from NULL or non-NULL values: the source fills `d7_rev` for
some dates whose window is not complete, and rewrites recent dates on each load before freezing them.
Data-quality limitation (recorded, not corrected): on inspected data the source's D-2 day itself looked
slightly incomplete (about 0.7% of the 8-day total on the last mature date).

**Missing data** (`data_conditions[]`; nothing is zero-filled, apart from the one NULL exception below):

| Situation | `data_conditions` entry | Effect |
|---|---|---|
| no Independent row for a required variant-day | scope `VARIANT_DAY`, condition `MISSING` | `EXCLUDED_FROM_PAIR` for every metric |
| **known defect (this capability only):** an Independent row of the variant-day has `d7_rev` = 0 AND `d7_users_rev_type_independent` IS NULL | scope `VARIANT_DAY`, condition `MISSING`, with the defect rows quoted as `probe` | `EXCLUDED_FROM_PAIR` for every metric; never an observed zero |
| on a mature variant-day, an Independent row has NULL `d7_rev` and its `d7_users_rev_type_independent` is not 0 (NULL or above 0) | scope `VARIANT_DAY`, condition `MISSING`, with the rows quoted as `probe` | `EXCLUDED_FROM_PAIR` for every metric; never zero |
| on a mature variant-day, a component row (`iap` or non-IAP) has NULL `d7_rev` and its `d7_users` is not 0 | scope `METRIC_DAY`, condition `MISSING`, with the rows quoted as `probe` | `EXCLUDED_FROM_PAIR` for the metric that row belongs to (IAP or Ad) |
| the variant-day is loaded but has no `iap` row (IAP) or no non-IAP component row (Ad) | scope `METRIC_DAY`, condition `NOT_IN_TABLE` | that metric's day only; the bounded probe is quoted |
| a cut cell with no Independent row on a variant-day that has other cells | scope `CUT_CELL`, condition `UNOBSERVED` | `NOT_READ_AS_ZERO`; the cell is shown as not observed |

- A stored `0` revenue is an observed zero, except under the defect condition above. The defect rule is
  specific to this source and applies nowhere else. The whole variant-day is excluded because its
  revenue is not observed, and dropping only the defective rows would change the population.
- **NULL revenue with no forward users (capability-level exception, this capability only).** A stored
  NULL `d7_rev` in a row whose forward users are 0 (`d7_users_rev_type_independent` = 0 on an
  Independent row; `d7_users` = 0 on a component row) is read as zero revenue, and the row stays in the
  population (its `dau` stays in the denominator). On inspected data every NULL `d7_rev` on a mature day
  had this pattern: Independent rows were single-user cells with no forward revenue users and NULL
  impressions, and component rows had no users and NULL impressions for that type. The number of rows
  read this way is reported per variant-day; no condition label is defined for it (TBD). Every other
  stored NULL stays undefined and is never read as zero (table above). This exception is distinct from
  the false-zero defect (0 revenue with NULL forward users, read as `MISSING`) and applies nowhere else.
- A `dau` of 0 or NULL leaves the ratio undefined: the observation is excluded and reported; its exact
  condition label stays TBD, as in Revenue.

**Paired observation (pairing unit: calendar day).** For each metric and each pair from the received
`comparisons[]`, a paired unit is one mature activity date in `analysis_window` on which both the
reference and the comparator have a defined ratio within the requested scope (all cohorts and cells of
the scope pooled, numerators and denominators each summed). The observation is `comparator −
reference` for that date. The statistics are those of `analysis-contract.md` § Paired test, unchanged
(`pairing_unit = CALENDAR_DAY`, `stat.method = paired_t_daily`, `n_paired_days`). `reference_value`
and `comparator_value` are pooled over the paired days; `exposure` is each side's summed `dau`. No SRM,
minimum-sample, multiple-testing, power, peeking or other significance rule is added, and this analysis
never classifies meaningfulness (the Master's, `GENERAL`, `master-state.md` § Results and
meaningfulness).

- **Known limitation (disclosed, not corrected):** consecutive activity dates have forward windows that
  overlap by 7 of 8 days, and the same users recur across days. On inspected data the lag-1
  autocorrelation of the daily paired differences was about 0.6, so the paired_t_daily interval may be
  optimistic. No autocorrelation correction is applied, and the interval is never described as
  corrected for overlap.

**Scope.** A requested scope is applied as a fixed cell (on the Independent and component rows alike).
Supported scope dimensions are `cohort`, `user_type`, `payer_flag`, `country`, `install_bucket`,
`device_type`, `device_language` and `lat_flag` (only where the unit has non-`NA` values); each carries
`dau` on the Independent rows. Any other dimension — `build`, `install_type`, `cli`, `rev_type` and the
rest — makes every metric `UNSUPPORTED_FOR_SCOPE`. Scoped values with no rows for the unit make the scope
`UNAVAILABLE`. A dimension is never dropped and nothing is computed at a broader scope.

**Cuts (Stage 2 — WHERE).** One dimension at a time from the supported dimensions
above, `cohort` and `user_type` first, then `payer_flag` (the default cut set), then `country`, `install_bucket`,
`device_type`, `device_language`, `lat_flag`; no crossed cuts. `NA`, empty and NULL are never cut values.
`rev_type` selects the metric and is not a cut; `build`, `install_type` and `cli` are not cuts.

- **Cell statistics: this analysis produces cell-level statistics** for the default cut set
  (`analysis-contract.md` § Breakdown cells). A cell gets its own `comparison_results[]` entry per metric
  with `cut`, built as the whole-scope entry (the paired test over the cell's mature paired days, the
  cell's own `dau`). There is no PAB: cells are observed (`OBSERVED_NO_PAB`). A cell never alters the
  whole-scope result.

**PAB:** out of scope for this capability. It never suggests a `PAB_CHECK` and computes no PAB figure.

**Coverage:** an `(exp_id, version)` with no `rolling_ltv` rows after a live bounded probe is
`NOT_IN_TABLE` (the Master's coverage result). There is no dependency table.

**Data handling:** every statement is bounded by `exp_id`, `version` and `__time` (activity date);
versions are never pooled. Stage 1 issues one statement: `rolling_ltv` grouped by variant, activity date
and `rev_type`, over `analysis_window`, returning SUM(`dau`), SUM(`d7_rev`), the defect test
(Independent rows with `d7_rev` = 0 and NULL `d7_users_rev_type_independent`) and the NULL tests (rows
with NULL `d7_rev`, split by whether their forward users are 0). A Stage 2 step adds the
cut dimension. Scope filters apply to every row. Count with `GROUP BY`, never `COUNT(DISTINCT)`.

**Negative versions:** the Master never dispatches this analysis for a version whose stored value
starts with `-`: an explicitly requested one is `UNSUPPORTED` / `VERSION_SEMANTICS_UNKNOWN`, and one the
shared rules selected without a request is never auto-selected for it (`SKIPPED_NOT_AUTO_SELECTED`,
`capability-registry.md` § Selection by mode). If one is received anyway, the analysis returns `BLOCKED`
with reason `VERSION_SEMANTICS_UNKNOWN` and computes nothing.

**PERIOD:** Rolling LTV supports PERIOD as trigger and as cross-capability evidence, with this file's
methodology unchanged (`period-evidence.md` § Trigger, scope and evidence). The received
`analysis_window` is the unit's `experiment_evidence_window` of activity dates (date axis
`ACTIVITY_DATE`); each date T is mature only for `T + 7 ≤ D-2`. The metric stays forward-looking (T
through T+7), never backward revenue, and a date's forward revenue can extend past the comparison or
impact window; this is stated. D7 is the only horizon; Rolling LTDays has no capability. Pairing, the
autocorrelation caveat, descriptive cells, the defect and NULL rules and negative versions are
unchanged; PAB stays out of scope. Whether it can take part in PERIOD analysis is a follow-up.

**Unspecified (TBD / data owner):** the revenue semantics (net or gross, currency, xpromo); the meaning
of `ad_on_inactivity` and `audio`, and why components do not reconcile exactly to Independent; the
meaning of the `users`, impressions and clears fields; the cause of the zero-revenue defect rows; the
intended D14 and D30 windows and the load schedule; the slight D-2 incompleteness; whether forward days
after a version ended still reflect it; what negative versions mean; what `rev_type` NULL rows are; why
rows with no forward users store NULL revenue instead of 0; the condition labels for a zero or NULL
denominator.

**Contract:** compute exactly the received `comparisons[]`, never re-derive the reference arm;
`NO_COMPARISON` returns descriptive values only (each variant's pooled value per metric over the mature
days, and its `dau`); `MISSING`, `UNOBSERVED` and `NOT_IN_TABLE` are explicit data conditions; shared
statistical methodology stays in `analysis-contract.md`; wording per `output-format.md`.
