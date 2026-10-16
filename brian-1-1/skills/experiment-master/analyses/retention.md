# Rolling Retention analysis

**Source:** `experiment.rolling_retention` (Druid); `gid` and `cli` are VARCHAR here — quote literals.
Measures: `users`, `d1_retained_users`, `d3_retained_users`. A row is one variant, day and dimension
cell for an `(exp_id, version)`.

**Definition lock:** "rolling retention (experiment tables), D1 / D3". Never blended with classic dX
retention or with the rolling series of `investigate-rolling-retention`. D1 and D3 are each their own
metric and comparison, with their own `definition_lock` entry:

| Metric | numerator | denominator | denominator_table | grain | table | definition_status |
|---|---|---|---|---|---|---|
| D1 rolling retention | SUM(`d1_retained_users`) | SUM(`users`) | `experiment.rolling_retention` | arm × day | `experiment.rolling_retention` | UNCONFIRMED |
| D3 rolling retention | SUM(`d3_retained_users`) | SUM(`users`) | `experiment.rolling_retention` | arm × day | `experiment.rolling_retention` | UNCONFIRMED |

Numerator and denominator are collapsed separately, then divided. When a metric is cut, the grain is
arm × day × cell. `definition_status: UNCONFIRMED` — the nesting semantics of D1 and D3 are not
established. Report results with that caveat and assume nothing about the nesting until the ETL owner
confirms.

**Observed D3 vs D1 behaviour (evidence, not a rule):** D3 retained users can exceed D1 retained users,
and this occurs with non-trivial frequency in the datasource: at row level, less often at arm-day level,
and also in the PAB table. It is observed behaviour of the datasource, not an exclusion rule and not a
data-quality rule: no row, cell or arm-day is excluded or flagged as invalid solely because D3 > D1, it
does not invalidate any observation, and no nesting is assumed. Retained users never exceeded `users` in
the inspected data.

**Denominator:** the table's own `users` (`experiment.rolling_retention.users`), never
`experiment.dau`; the two are never mixed in one ratio. (On the inspected units the two were equal, which
does not make `experiment.dau` a substitute.)

**Maturity (calendar-based):** the datasource carries no maturity flag, and an unmatured day holds `0`,
not NULL. Maturity is therefore set by the calendar, separately for each measure, and is never inferred
from the last non-zero day or from all-zero rows. `D-n` counts days back from the current date, as in the
D-2 freshness rule.

- D1 is mature through D-3: only days on or before D-3 are used for D1.
- D3 is mature through D-5: only days on or before D-5 are used for D3.
- The cutoff is applied to every cut. It is never re-derived from small cut-level cells. Unmatured days
  are dropped from both sides of the pair, and the cutoff is stated.
- `mature_analysis_window` has one entry per measure, `d1_retained_users` and `d3_retained_users` only
  (not `users`), each with `basis = CUTOFF_APPLIED`. Each entry spans the received `analysis_window` up to
  that measure's cutoff. If the cutoff leaves no day, that measure has no matured days and nothing is
  computed for it.
- D1 and D3 can have different paired-day sets.

**Paired observation:** per day, per arm, the daily Rolling Retention ratio for each measure; difference
= comparator − reference, on that measure's matured days only. Each measure is paired only on days where
both sides have a defined observation. The statistics are those of `analysis-contract.md` only; no SRM,
minimum-sample, multiple-testing, peeking or other significance rule is added.

**Missing, zero and NULL:** keep these distinct from the unmatured zero above.

- A present mature-day row with retained users = 0 is a valid observed zero.
- A completely absent variant-day is MISSING: it is excluded from the paired comparison and reported. A
  missing day for either arm removes that paired day.
- An absent cut-level cell on a variant-day that does have other rows is unobserved: it is not read as
  zero, not built from `experiment.dau` and not inherited from the variant-day. Whether the table is
  exhaustive enough to read such an absence as zero is not established, so it stays TBD.
- A stored NULL measure is undefined and never read as zero, and the rows of an arm-day are never silently
  summed over only their non-NULL values. NULL `users` makes the denominator undefined, so both metrics for
  that arm-day (or cell-day) are undefined. NULL `d1_retained_users` makes the D1 observation undefined;
  NULL `d3_retained_users` makes the D3 observation undefined. Only the affected metric's observation is
  excluded from the paired analysis, and the exclusion is reported. A zero or absent `users` likewise
  leaves the ratio undefined: it is not computed and no value is manufactured. The exact condition labels
  are TBD until the shared analysis contract fixes its vocabulary; the handling applies now. No stored
  NULL has been observed in the inspected data.

**Default cuts (Stage 2, mandatory floor, `analysis-contract.md` § Default cut set):** for every metric
this analysis reports, one cell per value of install cohort, `user_type` and `payer_flag`, each cut
read alone, each cell with its own paired test, `pab[]` and `adjusted` block where a PAB counterpart exists.
The adaptive crossings below run in addition. Sparse cells are kept and labelled, never dropped.

**Cuts (Stage 2 — WHERE):** the primary dimensions are `cohort`, `user_type`, `payer_flag` and
`install_type`. There is no fixed traversal: the path changes per experiment. Each can be investigated
independently and crossed with other primary dimensions when useful. Do not enumerate every combination.
Every cut has a population from the table's own `users`. `install_type` stays a primary dimension even
when it is sparse or `NA` in the requested experiment; its availability and values are probed per
experiment, and sparsity is reported separately and is never a reason to drop a dimension.

**`user_type`:** a new-user experiment uses `user_type = new` and gets no old-vs-new split. Otherwise
start with new and old together, then use `user_type` as a deeper segmentation where useful. How an
experiment is identified as a new-user experiment is TBD; no repository rule defines it.

**Movement, retained-user share and user weight:** three separate concepts, never collapsed into one
number. For D1 or D3: *movement* = comparator retention − reference retention in the cell;
*retained-user share* = the cell's `dX_retained_users` ÷ the arm's total `dX_retained_users`; *user
weight* = the cell's `users` ÷ the arm's total `users`. No generalized formula for "contribution to
retention lift" is defined. Numerator volume, denominator population weight, movement and experiment
context are read together to set emphasis and interpretation; they never filter cells or evidence out.

**Adaptive grouping:** a small or low-relevance category may be clubbed when its standalone
interpretation would be noise. This is contextual, with no fixed threshold, and keeps the correct
numerator and denominator. Grouping is for readability, never for deleting evidence.

**Last layer:** `device_language`, `country`, `install_bucket`, `lat_flag`, `device_type`, `build` and
other lower-priority available dimensions. They are deeper diagnostics, not more important than the
primary dimensions, and are investigated only when the observed movement gives a reason.

**PAB:** an adjustment and explanatory check, not a segmentation dimension. PAB runs in Stage 1 with the paired test (`analysis-contract.md` § PAB adjustment): the whole-scope result
and every default-cut cell with a pre-test counterpart get a `pab[]` entry with the `adjusted` block, using
the tables, key, window and formulas below. It is not a follow-up. Old users (`user_type = old`) take the overall PAB in full (`old_share = 1`); new users and the D00 to D30 cohorts have none and are returned observed (`OBSERVED_NO_PAB`); every result that mixes old and new users takes `old_share × PAB` (`analysis-contract.md` § PAB adjustment).

- *Method:* the same definitions as the experiment metrics, using the `pre_*` measures of one table,
  `experiment.pre_rolling_retention_2`, and pooled per arm. The numerator and the denominator are each
  summed over the actual PAB historical window, then divided: PAB D1 = SUM(`pre_d1_retained_users`) ÷
  SUM(`pre_users`); PAB D3 = SUM(`pre_d3_retained_users`) ÷ SUM(`pre_users`). Its own `pre_users` is the
  denominator, never `pre_dau_2` or `experiment.dau`. The underlying rows are arm × day (× cell); that is
  not the grain of the PAB output. The D1 / D3 nesting caveat applies unchanged, and D3 > D1 is not a
  reason to exclude PAB rows. A PAB ratio is not computed where its pooled denominator is not > 0.
- *Table and identity:* `experiment.pre_rolling_retention_2` (`gid` and `cli` are BIGINT here). Rows are
  filtered to `build = 0`, a required filter and not a cut. The PAB key is derived from the
  experiment-version, not equal to it. On every inspected unit where both sides exist, the PAB `exp_id`
  is the experiment `exp_id` with its fourth component replaced by the experiment `version`, followed by
  `::pre_version` (experiment `49::0::content_exp::16`, version `5` → PAB
  `49::0::content_exp::5::pre_version`); the PAB `version` is the experiment `version`;
  `allocation_type = 'pre_version'` and `pab_window = 'regular'`. Two versions of one experiment `exp_id`
  are separate PAB units. The experiment `(exp_id, version)` is not itself a PAB key. A unit with no
  matching PAB rows (for example a recently started version) is `NOT_IN_TABLE` for PAB, not an error.
- *Window:* the PAB rows are the days preceding the version start: `version_date` equals the version's
  first active day on every inspected unit, and the history ends the day before `version_date`. Its
  length is never hardcoded: the actual first and last day and the number of days available are read from
  the PAB rows. Where the experiment-side first active day is known to be the version's true first day,
  it gives the upper bound of the scan; where it is not known (for example a requested period clipped
  discovery), `version_date` is read from the rows of the derived key first. The lower bound is set wide
  enough to contain the history and is not a fixed length. PAB rows are historical rows preceding
  `version_date` and are expected to be mature by construction. The experiment-level D-3 / D-5 cutoffs
  are not applied to the PAB window, and the PAB methodology does not depend on them.
- *Known fields:* `date_field`, `gid`, `cli`, `experiment`, `version`, `variant`, `country`,
  `install_bucket`, `payer_flag`, `build`, `exp_id`, `allocation_type`, `inserted_at`, `lat_flag`,
  `pab_window`, `cohort`, `version_date`, `pre_users`, `pre_d1_retained_users`, `pre_d3_retained_users`.
- *Supported cuts:* the supported analytical PAB cuts are `cohort`, `country`, `install_bucket` and
  `lat_flag`. `payer_flag` is in the PAB table, but its applicability is TBD. `build = 0` is a PAB
  constraint, not a cut. `user_type`, `install_type`, `device_type` and `device_language` are not in the
  PAB table, so they cannot be PAB cuts. Do not assume a PAB dimension exists because the experiment
  table has it.
- *Applicability:* TBD beyond the schema and data constraints stated here. No blanket restriction to
  mature or D30+ cohorts and no categorical exclusion of new users or early cohorts is established; none
  is assumed. Do not force a PAB adjustment where the methodology or data does not support the cut.
- *Confidence and adjustment:* `pab_confidence_floor = ALWAYS_USE`: PAB is used wherever it exists, whatever its PAB confidence, scaled by the result's `old_share`. The adjusted effect is the observed movement minus `old_share × PAB`, its interval combines the observed half-width and the scaled PAB half-width, and Conf is taken from it
  (`analysis-contract.md` § PAB adjustment). Reading uses the 1% / 10 bps line and the 0.85 Conf bar
  (`master-state.md` § Results and meaningfulness).
- *Missing and NULL rows:* a stored NULL `pre_*` value is undefined and never read as zero. A present PAB
  row with a retained count of 0 is a valid zero. Missing-row and stored-NULL handling in the PAB table is
  TBD.

**Coverage:** an `(exp_id, version)` absent from the table after a live bounded probe on
`(exp_id, version)` is `NOT_IN_TABLE` with the probe quoted.

**Data handling:** bound by `exp_id`, `version` and time; versions are never pooled. The latest day is
partial and the last five days are restated; experiment-level maturity is handled by the calendar cutoffs
above, not by freshness. PAB reads use the historical pre-experiment period and `build = 0`.

**Unspecified (TBD):** the nesting of D1 and D3 (`UNCONFIRMED`, pending the ETL owner); how a new-user
experiment is identified; whether the table is exhaustive for each cut dimension, so that an absent
cut-level cell could be read as zero; the condition labels for a NULL numerator or denominator and for a
zero or absent `users`; PAB applicability beyond the schema
and data constraints (any cohort or user eligibility, including `payer_flag`); missing-row and
stored-NULL handling in the PAB table.

**Contract:** compute exactly the received `comparisons[]`, never re-derive the reference arm;
`NO_COMPARISON` returns descriptive values only; MISSING and UNOBSERVED are explicit data conditions,
never silent zeros or silent drops; shared statistical methodology stays in `analysis-contract.md`;
wording per `output-format.md`.
