# Sessions analysis

**Source:** `experiment.sessions` (Druid); `gid` and `cli` are VARCHAR — quote literals. Measures:
`dau`, `sessions`, `session_length`, `perc_25`, `median`, `perc_75`. A row is one variant, day and
dimension cell for an `(exp_id, version)`. The reported metrics are the five below, in priority order.
All of them are normalized by this table's own `dau`.

**Definition lock:** every reported metric has its own `definition_lock` entry. The definitions of all
five metrics are CONFIRMED. That status refers to each metric's definition and formula; the semantic
interpretation of the raw fields is separately UNCONFIRMED (below) and does not block the confirmed
metrics:

| # | Metric | numerator | denominator | denominator_table | grain | table | definition_status |
|---|---|---|---|---|---|---|---|
| 1 | Session Time / DAU | SUM(`session_length`) | SUM(`dau`) | `experiment.sessions` | arm × day | `experiment.sessions` | CONFIRMED |
| 2 | Median Time / DAU | SUM(`median`) | SUM(`dau`) | `experiment.sessions` | arm × day | `experiment.sessions` | CONFIRMED |
| 3 | P25 Time / DAU | SUM(`perc_25`) | SUM(`dau`) | `experiment.sessions` | arm × day | `experiment.sessions` | CONFIRMED |
| 4 | P75 Time / DAU | SUM(`perc_75`) | SUM(`dau`) | `experiment.sessions` | arm × day | `experiment.sessions` | CONFIRMED |
| 5 | Sessions / DAU | SUM(`sessions`) | SUM(`dau`) | `experiment.sessions` | arm × day | `experiment.sessions` | CONFIRMED |

All five are required and none is marked not reported. The priority order is the order above. Each
metric is its own metric and comparison. When a metric is cut, the grain is arm × day × cell, and the
denominator is the cell's `dau` from this table.

**Denominator:** the table's own `dau`, for every Sessions metric. `experiment.dau` is never a
denominator here. The two DAU values differ slightly, and they are never mixed in one ratio. Numerator
and denominator come from the same rows and the same cell.

**Raw `session_length`, `perc_25`, `median`, `perc_75` (semantics UNCONFIRMED):** the evidence shows
these fields are statistics over a scaled population representation. Their unit and exact meaning are
TBD; these open questions are documentation items and do not block the confirmed metrics. Metrics 1–4
are ratios of summed stored values divided by summed `dau`. They are not described as population-level,
user-level or session-level percentiles, and a percentile metric is not a percentile of the arm's users
or sessions. Never average raw percentile rows, never calculate a weighted percentile, never merge
percentile distributions, and never infer or aggregate a population size from the table. Observed in
the inspected data: no NULL, negative or out-of-order percentile values (`perc_25` > `median` or
`median` > `perc_75`), and a row with `session_length` = 0 has all three percentile fields at 0. A
stored zero is a valid observed value.

**Daily pairing:** for each metric, compute the daily arm-level ratio by its exact definition: the
metric's numerator measure summed over the rows of the arm and day, divided by the summed `dau` of the
same rows. Pair reference and comparator only on days where both sides have a defined observation for that
metric. A defined observation needs the metric's own numerator inputs defined (present and not NULL)
and `dau` present and > 0. Difference = comparator − reference. The statistics are those of
`analysis-contract.md` only. No SRM, minimum-sample, multiple-testing, peeking or other significance
rule is added. Handling is metric-specific: if a required input of one metric is undefined on an
arm-day, the ratio is not computed, no value is manufactured, that arm-day leaves only that metric's
paired comparison, and the exclusion is reported. The other metrics are unaffected when their own
inputs are defined. The exact condition labels for a NULL numerator and for a zero or absent
denominator are TBD until the shared analysis contract fixes its vocabulary; the handling above applies
now.

**Missing rows:** an absent Sessions row is never read as zero. If a required variant-day has no
Sessions row, that day is MISSING: it is excluded from the paired comparison and reported. A missing
day for either arm removes that paired day. `experiment.dau` is not consulted to create a zero
observation or a denominator.

A cut-level cell (for example a `cohort`, `user_type`, `payer_flag` or `install_type` cell) with no row
on a variant-day that does have rows is unobserved: it is not read as zero, not built from
`experiment.dau` and not inherited from the variant-day. Whether the table is exhaustive for a
dimension, so that absence would have a defined zero meaning, is not established; until it is, how an
unobserved cell enters that cell's paired comparison is TBD. This never changes the rule above for a
completely absent variant-day.

**Stored NULL measures:** a stored NULL measure is undefined and never read as zero, and the rows of an
arm-day are never silently summed over only their non-NULL values. A NULL `sessions` input makes the
Sessions / DAU numerator undefined for that arm-day: the arm-day is excluded from the Sessions / DAU
paired comparison and the exclusion is reported. The same rule applies to a NULL `session_length`,
`median`, `perc_25` or `perc_75` for its own metric only. The rule is metric-specific: a row with NULL
`sessions` keeps its own `session_length` and percentile values, and the other four metrics stay
computable when their own numerator inputs and `dau` are defined. At cut level the same rule applies to
the cell-day. Stored NULL `sessions` rows are observed in the data (a small share of rows); no NULL
`session_length` or percentile value has been observed. A stored zero is an observed value, not a
NULL.

**Default cuts (Stage 2, mandatory floor, `analysis-contract.md` § Default cut set):** for every metric
this analysis reports, one cell per value of install cohort, `user_type` and `payer_flag`, each cut
read alone, each cell with its own paired test, `pab[]` and `adjusted` block where a PAB counterpart exists.
The adaptive crossings below run in addition. Sparse cells are kept and labelled, never dropped.

**Cuts (Stage 2 — WHERE):** the primary dimensions are `cohort`, `user_type`, `payer_flag` and
`install_type`. There is no fixed traversal: the path changes per experiment. Each can be investigated
independently and crossed with other primary dimensions when useful. Do not enumerate every
combination. Every cut has a DAU split from the table's own `dau`. `puzzle_type` and other
table-specific dimensions do not exist here.

**`user_type`:** a new-user experiment uses `user_type = new` and gets no old-vs-new split. Otherwise
start with new and old together, then use `user_type` as a deeper segmentation where useful. How an
experiment is identified as a new-user experiment is TBD; no repository rule defines it.

**Movement, DAU weight and contribution:** three separate concepts, never collapsed into one number.
For a cell and a metric: *movement* = comparator − reference in the cell's metric; *DAU weight* = the
cell's `dau` ÷ the arm's `dau`. For Sessions / DAU only, *sessions contribution* = the cell's `sessions`
÷ the arm's total `sessions` (the numerator contribution). No contribution formula is defined for the
Time metrics (1–4): their cells carry movement and DAU weight only. Movement, contribution, DAU weight
and experiment context together set emphasis and interpretation; they never filter cells out. Example:
A (10% of DAU, 40% of sessions, +15%) and B (40% of DAU, 5% of sessions, +15%) are both valid findings;
A generally explains more of the aggregate movement, and B stays visible when relevant. No other
contribution formula is defined here.

**Adaptive grouping:** a small or low-relevance category may be clubbed when its standalone
interpretation would be noise. This is contextual, with no fixed threshold, and keeps the correct
numerator and denominator. Grouping is for readability, never for deleting evidence.

**Last layer:** `country`, `install_bucket`, `lat_flag`, `device_type`, `build` and other
lower-priority available dimensions. They are deeper diagnostics, not more important than the primary
dimensions, and are investigated only when the observed movement gives a reason.

**PAB:** an adjustment and explanatory check, not a segmentation dimension. PAB runs in Stage 1 with the paired test (`analysis-contract.md` § PAB adjustment): the whole-scope result
and every default-cut cell with a pre-test counterpart get a `pab[]` entry with the `adjusted` block, using
the tables, key, window and formulas below. It is not a follow-up. Old users (`user_type = old`) take the overall PAB in full (`old_share = 1`); new users and the D00 to D30 cohorts have none and are returned observed (`OBSERVED_NO_PAB`); every result that mixes old and new users takes `old_share × PAB` (`analysis-contract.md` § PAB adjustment).

- *Method:* the same definitions and priority as the experiment metrics, using the `pre_*` measures of
  one table, `experiment.pre_sessions_2`. The PAB denominator is its own `pre_dau`, for every metric,
  never `experiment.dau`, `pre_dau_2` or any other field. The underlying rows are arm × day (× cell);
  that is not the grain of the PAB output. The PAB output is pooled per arm: the numerator summed over
  the PAB historical window divided by the denominator summed over the same window.

  | PAB metric | numerator | denominator | denominator_table | table | definition_status |
  |---|---|---|---|---|---|
  | Session Time / DAU | SUM(`pre_session_length`) | SUM(`pre_dau`) | `experiment.pre_sessions_2` | `experiment.pre_sessions_2` | CONFIRMED |
  | Median Time / DAU | SUM(`pre_median`) | SUM(`pre_dau`) | `experiment.pre_sessions_2` | `experiment.pre_sessions_2` | CONFIRMED |
  | P25 Time / DAU | SUM(`pre_perc_25`) | SUM(`pre_dau`) | `experiment.pre_sessions_2` | `experiment.pre_sessions_2` | CONFIRMED |
  | P75 Time / DAU | SUM(`pre_perc_75`) | SUM(`pre_dau`) | `experiment.pre_sessions_2` | `experiment.pre_sessions_2` | CONFIRMED |
  | Sessions / DAU | SUM(`pre_sessions`) | SUM(`pre_dau`) | `experiment.pre_sessions_2` | `experiment.pre_sessions_2` | CONFIRMED |

  CONFIRMED refers to the metric definition and formula. The percentile guardrails above apply
  unchanged: the `pre_*` percentile fields are semantically UNCONFIRMED like their experiment
  counterparts, the Time metrics are ratios of summed stored statistics and not population percentiles,
  and no averaging of raw percentile rows, weighted percentile, merging of distributions or
  population-size inference is done. A PAB ratio is not computed where its pooled denominator is not
  > 0.
- *Table and identity:* `experiment.pre_sessions_2` (`gid` and `cli` are BIGINT here). Rows are filtered
  to `build = 0`, a required filter and not a cut. The PAB key is derived from the experiment-version,
  not equal to it. On every inspected unit where both sides exist, the PAB `exp_id` is the experiment
  `exp_id` with its fourth component replaced by the experiment `version`, followed by `::pre_version`
  (experiment `49::0::content_exp::16`, version `5` → PAB `49::0::content_exp::5::pre_version`); the PAB
  `version` is the experiment `version`; `allocation_type = 'pre_version'` and `pab_window = 'regular'`.
  Two versions of one experiment `exp_id` are separate PAB units. The experiment `(exp_id, version)` is
  not itself a PAB key. A unit with no PAB rows is `NOT_IN_TABLE` for PAB, not an error.
- *Window:* the PAB rows are the days preceding the version start: `version_date` equals the version's
  first active day on every inspected unit, and the history ends the day before `version_date`. Its
  length is never hardcoded: the actual first and last day and the number of days available are read
  from the PAB rows (the inspected units held about a month of history). Where the experiment-side first
  active day is known to be the version's true first day, it gives the upper bound of the scan; where it
  is not known (for example a requested period clipped discovery), `version_date` is read from the rows
  of the derived key first. The lower bound is set wide enough to contain the history and is not a fixed
  length.
- *Known fields:* `date_field`, `gid`, `cli`, `experiment`, `version`, `variant`, `payer_flag`,
  `country`, `install_bucket`, `build`, `exp_id`, `allocation_type`, `inserted_at`, `lat_flag`,
  `pab_window`, `cohort`, `version_date`, `pre_dau`, `pre_sessions`, `pre_session_length`,
  `pre_perc_25`, `pre_median`, `pre_perc_75`.
- *Supported cuts:* only analytical dimensions present in the PAB table: `cohort`, `country`,
  `install_bucket`, `lat_flag`. `payer_flag` is in the PAB table, but its applicability is TBD.
  `build = 0` is a PAB constraint, not a supported cut. `user_type`, `install_type` and `device_type`
  are not in the PAB table and are not PAB-supported. Do not assume a PAB dimension exists because the
  experiment table has it.
- *Applicability:* TBD beyond the schema and data constraints stated here. No blanket restriction to
  mature or D30+ cohorts and no categorical exclusion of new users, early cohorts or `payer_flag` splits
  is established; none is assumed. Do not force a PAB adjustment where the methodology or data does not
  support the cut.
- *Confidence and adjustment:* `pab_confidence_floor = ALWAYS_USE`: PAB is used wherever it exists, whatever its PAB confidence, scaled by the result's `old_share`. The adjusted effect is the observed movement minus `old_share × PAB`, its interval combines the observed half-width and the scaled PAB half-width, and Conf is taken from it
  (`analysis-contract.md` § PAB adjustment). Reading uses the 1% / 10 bps line and the 0.85 Conf bar
  (`master-state.md` § Results and meaningfulness).
- *Missing and NULL rows:* a stored NULL `pre_*` value is undefined and never read as zero. Missing-row
  and stored-NULL handling in the PAB table is TBD.

**Coverage:** absence is decided by a live bounded probe on `(exp_id, version)` for the requested
Sessions unit. No matching rows observed in that bounded coverage probe makes the unit `NOT_IN_TABLE`,
with the probe quoted. Any such statement is tied to the probe that produced it, not to an earlier
snapshot.

**Maturity and freshness:** Sessions has no metric-specific maturity cutoff. `mature_analysis_window`
has one entry per underlying source measure of this table that the analysis actually uses (`sessions`,
`session_length`, `perc_25`, `median`, `perc_75`, `dau`), each with `basis = NO_CUTOFF_APPLIED` over the
received `analysis_window`. D-2 freshness is not metric maturity. The analysis ends no later than D-2,
the latest day is partial, and the last five days are restated; days outside the received window are
not read and are never dropped silently.

**Data handling:** bound by `exp_id`, `version` and time; versions are never pooled. PAB reads use the
historical pre-experiment period and `build = 0`.

**Unspecified (TBD):** the unit and exact meaning of the raw `session_length`, `perc_25`, `median` and
`perc_75` fields and the ETL questions around them (documentation items that do not block the five
confirmed metrics); any aggregation of the raw percentile fields beyond SUM(field) ÷ SUM(`dau`); the
condition labels for a NULL numerator and for a zero or absent denominator; how a new-user experiment
is identified; PAB applicability beyond the schema and data
constraints (any cohort or user eligibility, including `payer_flag`); missing-row and stored-NULL
handling in the PAB table; whether the table is exhaustive for each cut dimension, and so how an
unobserved cell enters a paired comparison; any PAB adjustment beyond the concept.

**Contract:** compute exactly the received `comparisons[]`, never re-derive the reference arm;
`NO_COMPARISON` returns descriptive values only; MISSING and UNOBSERVED are explicit data conditions,
never silent zeros or silent drops; shared statistical methodology stays in `analysis-contract.md`;
wording per `output-format.md`.
