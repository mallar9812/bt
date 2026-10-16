# Revenue analysis

**Source:** `experiment.revenue_without_xpromo` (Druid), measures `revenue_without_xpromo` and
`impressions`. Overall revenue includes ad revenue and IAP and excludes xpromo; the source does not
establish net or gross, so it is never labelled either. DAU comes from `experiment.dau` for the same
`exp_id`, `version`, `variant` and day, with matching dimensions where applicable. The revenue-table
`users` field is not a denominator: its meaning is unverified, so Impressions / User and Users / DAU are
not reported and no `users`-based metric is defined.

**Definition lock:** "revenue excl. xpromo" and "revenue excl. xpromo per DAU". Never blended with the
core revenue charts. Every reported metric has its own `definition_lock` entry, and each entry carries
`numerator`, `denominator`, `denominator_table`, `grain`, `table` and, where needed,
`definition_status`:

| Metric | numerator | denominator | denominator_table | grain | table | definition_status |
|---|---|---|---|---|---|---|
| Revenue / DAU (overall, includes IAP) | SUM(`revenue_without_xpromo`), every `rev_type` including IAP and NULL | SUM(`dau`) | `experiment.dau` | arm × day | `experiment.revenue_without_xpromo` | — |
| Ad Revenue / DAU | SUM(`revenue_without_xpromo`) over rows that are not IAP | SUM(`dau`) | `experiment.dau` | arm × day | `experiment.revenue_without_xpromo` | UNCONFIRMED |
| Impressions / DAU | SUM(`impressions`) over rows that are not IAP | SUM(`dau`) | `experiment.dau` | arm × day | `experiment.revenue_without_xpromo` | UNCONFIRMED |
| `<type>` Revenue / DAU | SUM(`revenue_without_xpromo`) for that `rev_type` | SUM(`dau`) | `experiment.dau` | arm × day | `experiment.revenue_without_xpromo` | — |
| `<type>` Impressions / DAU (non-IAP) | SUM(`impressions`) for that `rev_type` | SUM(`dau`) | `experiment.dau` | arm × day | `experiment.revenue_without_xpromo` | — |
| `<type>` eCPM (non-IAP) | SUM(`revenue_without_xpromo`) × 1000 for that `rev_type` | SUM(`impressions`) for that `rev_type` | `experiment.revenue_without_xpromo` | arm × day | `experiment.revenue_without_xpromo` | — |

- Every row uses the `ad_network = 'overall'` pin. Numerator and denominator are each summed over the
  pinned rows of the arm and day, then divided. Daily ratios are never averaged into a period rate.
  When a metric is cut, the grain is arm × day × cell, and the DAU is the cell's DAU where the cut has a
  DAU split.
- `exposure` per arm is that metric's own denominator and `denominator_table`. DAU is not the denominator
  of eCPM: an eCPM entry names impressions from the revenue table.
- There is no overall eCPM and none that mixes IAP with ad revenue. IAP gets Revenue / DAU only.
- Revenue / DAU, Impressions / DAU and eCPM are generally all important. They are not a rigid sequential
  tree: the path changes per experiment with the observed movement, contribution, weight and context.
  Revenue and impressions in one ratio come from the same pinned rows.

**Ad Revenue:** revenue excluding IAP, meaning rows whose `rev_type` is not `iap`. No allow-list or
deny-list of other `rev_type` values is defined. Rows with `rev_type IS NULL` exist and their business
meaning is unconfirmed (TBD). They are neither asserted to be ad revenue nor dropped from the source.
The row filter is written so that NULL rows are not removed by accident (a bare `<> 'iap'` comparison
removes them). So NULL `rev_type` rows sit inside the non-IAP set, stay in overall Revenue / DAU as
"unspecified", and are named as such in the response. Ad Revenue / DAU and Impressions / DAU carry
`definition_status: UNCONFIRMED` for this reason, and so do their PAB counterparts.

**Pins:** overall totals use `ad_network = 'overall'`. Never add network-specific rows to `overall`
rows: summing all rows counts ad revenue about twice. When cutting by `ad_network`, exclude `overall`.
IAP exists only under `overall` and has no network cut. `rev_type` has no rollup value; there is no
`rev_type` total row.

**Revenue types:** the mandatory Stage 1 set is BN, IT, W2E and IAP (observed source values `banner`,
`interstitial`, `w2e`, `iap`), whenever present. For BN, IT and W2E compute Revenue / DAU, Impressions /
DAU and eCPM (for example BN Revenue / DAU, BN Impressions / DAU, BN eCPM). IAP gets Revenue / DAU only.
Other `rev_type` values may be surfaced dynamically when materially relevant, judged from contribution,
weight, movement and context. They are not enumerated here, none is a mandatory Stage 1 metric, and no
business meaning is inferred from a value's name. An additional reported type gets its own
`definition_lock` entries and its Revenue / DAU when valid. It gets Impressions / DAU and eCPM only when
it is not `iap` and has valid impressions (impressions > 0). A type that is not surfaced stays inside the
overall and Ad totals: surfacing sets emphasis, and removes no evidence. `rev_type` is not a generic cut.

**Data conditions:** `MISSING`, `UNOBSERVED` and `NOT_IN_TABLE` are explicit data conditions reported in
the response's `data_conditions[]`. An absent value is never read as zero, never built from
`experiment.dau` or any other table, and never dropped silently. An aggregate (overall, Ad, or
arm-level) is the SUM of the rows that exist and does not zero-fill an absent row. The conditions below
apply where a day, `rev_type` or cut view requires that row.

| Case | scope | condition | effect |
|---|---|---|---|
| The revenue table has no row for a required variant-day | `VARIANT_DAY` | `MISSING` | `EXCLUDED_FROM_PAIR`: that day leaves every Revenue comparison |
| The variant-day is loaded but a required `rev_type` has no pinned row | `METRIC_DAY` | `NOT_IN_TABLE` | `EXCLUDED_FROM_PAIR`: that metric's day only, where the metric cannot be defined without the row; the bounded probe is quoted |
| A cut cell has DAU > 0 but no revenue row | `CUT_CELL` | `UNOBSERVED` | `NOT_READ_AS_ZERO`: the cell-day has no defined observation and contributes no pair to that cell's comparison; the evidence is reported, not deleted |
| A stored NULL `revenue_without_xpromo` or `impressions` | scope where it occurs | TBD | the metric's input is undefined, so its daily observation is not defined (see pairing); never zero |
| A `rev_type` has no row anywhere in the unit's analysis window | `METRIC` | `NOT_IN_TABLE` | `NOT_RUN` for that type, with the bounded probe quoted; not repeated per day |
| `(exp_id, version)` absent from the table | the Master's coverage result | `NOT_IN_TABLE` | with the bounded probe quoted |

- A variant-day is *loaded* when the revenue table has at least one pinned row for it.
- A stored `0` revenue or impressions value is an observed zero. An absent row or a stored NULL is never
  an observed zero.
- A required `rev_type` row is the pinned `overall` row of that type's metrics (`rev_type` is a metric
  identity here, not a cut). Its absence on a loaded variant-day is `NOT_IN_TABLE` at `METRIC_DAY`
  scope. `UNOBSERVED` is used only for cut cells.
- A stored NULL measure: no stored NULL revenue or impressions value has been observed. If one occurs,
  the relevant metric input is undefined and is never converted to zero. The shared contract has no
  condition for a NULL inside an existing row, so the exact condition label is TBD and is not invented
  here.
- A DAU row absent for a required variant-day is `MISSING` at `VARIANT_DAY` scope.

**Daily pairing:** one rule for every Revenue ratio metric. A daily observation exists only when every
numerator and denominator input the metric requires is defined:

- Revenue / DAU (overall, Ad, `<type>`): DAU > 0 and revenue observed.
- Impressions / DAU: DAU > 0 and impressions observed.
- eCPM: impressions > 0 and revenue observed.

If a required denominator is zero, absent or otherwise undefined, the ratio is not computed, no value is
manufactured, and the exclusion is reported. The contract has no dedicated condition for a *zero*
denominator and no Revenue case has been observed that needs one, so its label is TBD and is not
invented here. A stored NULL input likewise makes that input undefined, never zero. For each metric, compute the daily arm-level
ratio by its exact definition; pair reference and comparator only on days where both sides have a
defined observation; difference = comparator − reference. Each metric is its own metric and comparison,
with its own `definition_lock` entry. The statistics are those of `analysis-contract.md` only (the
paired daily test and its `n_paired_days`, `n_pairs` and `stat` fields). No SRM, minimum-sample,
multiple-testing, peeking or other significance rule is added.

**Default cuts (Stage 2, mandatory floor, `analysis-contract.md` § Default cut set):** for every metric
this analysis reports, one cell per value of install cohort, `user_type` and `payer_flag`, each cut
read alone, each cell with its own paired test, `pab[]` and `adjusted` block where a PAB counterpart exists.
The adaptive crossings below run in addition. Sparse cells are kept and labelled, never dropped.

**Cuts (Stage 2 — WHERE):** the primary dimensions are `cohort`, `user_type`, `payer_flag` and
`install_type`. There is no fixed traversal and no enumeration of every combination: the path changes per
experiment. A dimension can be investigated alone, crossed with another primary dimension when useful,
and crossed with the relevant Revenue metric. Revenue type and cohort are generally the first areas to
look at, but the meaningful unit is often their intersection (for example BN × D00, IT × D31-D60,
W2E × D00; cohort labels are the table's own, as returned). `user_type`, `payer_flag` and `install_type`
can be crossed with revenue type, with cohort and with each other when relevant. `install_type`
availability and values are probed for the requested experiment. `rev_type` and `ad_network` have no DAU
split: report them as revenue (and impressions) contribution over the arm's DAU at the cell's other
dimensions, labelled so, with no DAU weight.

**`user_type`:** a confirmed new-user experiment uses `user_type = new` and gets no old-vs-new split.
Otherwise start with the available population and use `user_type` as a deeper segmentation where
useful. How an experiment is identified as a new-user experiment is TBD: no repository rule defines it,
and the data does not establish a reliable universal definition.

**Movement, DAU weight and contribution:** three separate concepts, never collapsed into one number.
For a cell and a metric:

- *movement* = comparator metric − reference metric in the cell;
- *DAU weight* = the cell's DAU ÷ the arm's DAU, only where the cut has a DAU split;
- *numerator contribution* = the cell's numerator ÷ the arm's total numerator of that metric. For
  Revenue / DAU the numerator is revenue; for Impressions / DAU it is impressions.

No contribution formula is defined for eCPM: its cells carry movement, and emphasis is read from
movement and experiment context together with the contributions of the revenue and impressions metrics
it is built from. Contribution, weight, movement and experiment context set investigation emphasis and
interpretation only. They never filter or delete evidence, and no low-share, low-contribution or
low-movement cell is silently dropped. Example: A (2% of DAU, 15% of revenue, +20%) can matter more than
B (20% of DAU, 2% of revenue, +20%); both are valid findings, and B stays visible when relevant. For
revenue, revenue contribution matters most, including when inspecting impression movement.

**Adaptive grouping:** a small or low-relevance category may be clubbed for readability, with no fixed
threshold (for example a very small reinstall share clubbed with install). Grouping keeps the correct
numerator and denominator, never creates a new metric definition, and never deletes evidence or hides a
real movement. The same segmentation applies to Impressions / DAU, with combinations such as
`rev_type` × `cohort`, × `user_type`, × `payer_flag` and × `install_type`, chosen by movement,
contribution, weight and context, not by a fixed traversal.

**Last layer:** `country`, `install_bucket`, `lat_flag`, `device_type`, `build`, `payer_window`,
`ad_network` (excluding `overall`) and other lower-priority available dimensions. They are deeper
diagnostics, not more important than the primary dimensions, and are investigated only when the observed
movement gives a reason; network comes last. Only dimensions present in the schema are used.

**PAB:** a historical pre-experiment adjustment and explanatory check, not a segmentation dimension.
PAB runs in Stage 1 with the paired test (`analysis-contract.md` § PAB adjustment): the whole-scope result
and every default-cut cell with a pre-test counterpart get a `pab[]` entry with the `adjusted` block, using
the tables, key, window and formulas below. It is not a follow-up. Old users (`user_type = old`) take the overall PAB in full (`old_share = 1`); new users and the D00 to D30 cohorts have none and are returned observed (`OBSERVED_NO_PAB`); every result that mixes old and new users takes `old_share × PAB` (`analysis-contract.md` § PAB adjustment).

- *Method:* a pooled pre-experiment baseline per arm, with the experiment metric's formula applied to the
  `pre_*` measures and summed over the PAB window, under the same `ad_network = 'overall'` pin (the
  rollup is present in `pre_revenue_2`; checked on the inspected unit). The numerator comes from
  `experiment.pre_revenue_2` and the denominator from `experiment.pre_dau_2`. The `pre_users` field of
  `pre_revenue_2` is not the denominator.
  - *Revenue PAB* (all `rev_type` values, IAP included): PAB Revenue / DAU = SUM(`pre_revenue`) ÷
    SUM(`pre_dau`).
  - *Ad PAB* (ad-only; IAP is never mixed in): PAB Ad Revenue / DAU = SUM(`pre_revenue`, rows that are
    not IAP) ÷ SUM(`pre_dau`); PAB Impressions / DAU = SUM(`pre_impressions`, rows that are not IAP) ÷
    SUM(`pre_dau`). Both carry the same `UNCONFIRMED` status for NULL `rev_type` as their experiment
    counterparts.
  - *Per type:* PAB `<type>` Revenue / DAU = SUM(`pre_revenue` for that type) ÷ SUM(`pre_dau`); PAB
    `<type>` eCPM = SUM(`pre_revenue` for that type) × 1000 ÷ SUM(`pre_impressions` for that type),
    non-IAP types only. IAP eCPM is never calculated. A PAB ratio is not computed where its pooled
    denominator is not > 0.
- *Tables and identity:* `experiment.pre_revenue_2` and `experiment.pre_dau_2`; the other `pre_*` tables
  belong to their own capabilities. The PAB key is derived from the experiment-version, not equal to it.
  On every inspected unit where both sides exist, the PAB `exp_id` is the experiment `exp_id` with its
  fourth component replaced by the experiment `version`, followed by `::pre_version` (experiment
  `49::0::content_exp::16`, version `5` → PAB `49::0::content_exp::5::pre_version`); the PAB `version`
  is the experiment `version`; `allocation_type = 'pre_version'` and `pab_window = 'regular'`. Two
  versions of one experiment `exp_id` are separate PAB units. Appending the suffix to the experiment
  `exp_id` as it stands is wrong whenever its fourth component differs from the version. Rows are
  filtered to `build = 0`, a required filter and not a cut. The experiment `(exp_id, version)` is not
  itself a PAB key, and PAB coverage is established for the derived identity. A unit with no PAB rows
  (some games have none) is `NOT_IN_TABLE` for PAB, not an error.
- *Window:* the PAB rows are the days before the version start. `version_date` equals the version's
  first active day on every inspected unit, and the rows run nominally from `version_date` − 31 days
  through `version_date` − 1 day (`date_field` is the calendar day of each row). The actual first and
  last day, and the number of days with rows, are read from the rows: one inspected unit held 30 days
  of rows, and a sparse unit lacked its last day. Where the experiment-side first active day is known to
  be the version's true first day, it bounds the window before any PAB scan. Where it is not known (for
  example a requested period clipped discovery), `version_date` is read from the rows of the derived
  key first. A PAB ratio is pooled over the window's days that have rows; how a window day with no rows
  is treated is part of the TBD missing-row handling.
- *Known fields:* `pre_revenue_2`: `date_field`, `gid`, `cli`, `experiment`, `version`, `variant`,
  `country`, `install_bucket`, `payer_flag`, `build`, `rev_type`, `ad_network`, `pre_revenue`,
  `pre_impressions`, `pre_users`, `exp_id`, `allocation_type`, `inserted_at`, `lat_flag`, `pab_window`,
  `cohort`, `version_date`; `pre_dau_2`: `date_field`, `gid`, `cli`, `experiment`, `version`, `variant`,
  `country`, `install_bucket`, `payer_flag`, `build`, `pre_dau`, `exp_id`, `allocation_type`,
  `inserted_at`, `lat_flag`, `cohort`, `pab_window`, `version_date`. Do not assume a PAB dimension exists
  because the experiment table has it.
- *Supported cuts:* the confirmed analytical PAB cuts, from the inspected schema, are `cohort`,
  `country`, `install_bucket` and `lat_flag`. `payer_flag` is in both PAB tables, but its applicability
  is TBD. `rev_type` selects the metric (for example PAB IT Revenue / DAU) and is not a PAB cut. The PAB
  tables contain no `user_type`, `install_type`, `device_type`, `device_language` or `payer_window`, so
  none of these is a PAB cut.
- *Applicability:* generally mature or eligible cohorts, especially D30+. PAB cannot be used for new
  users, early cohorts or `ad_network` splits. Do not force a PAB adjustment where the methodology or
  data does not support the cut. The mapping between "early cohorts", D30+ and the cohort bucket labels
  is not defined.
- *Confidence and adjustment:* `pab_confidence_floor = ALWAYS_USE`: PAB is used wherever it exists, whatever its PAB confidence, scaled by the result's `old_share`. The adjusted effect is the observed movement minus `old_share × PAB`, its interval combines the observed half-width and the scaled PAB half-width, and Conf is taken from it
  (`analysis-contract.md` § PAB adjustment). Reading uses the 1% / 10 bps line and the 0.85 Conf bar
  (`master-state.md` § Results and meaningfulness).
- *Missing rows:* missing-row handling in the PAB tables is TBD.

**Maturity and freshness:** Revenue has no metric-specific maturity cutoff. `mature_analysis_window`
has one entry per underlying source measure the analysis actually uses (`revenue_without_xpromo`,
`impressions`), not one per derived or dynamically surfaced metric: Revenue / DAU, Ad, `<type>` and
eCPM metrics all read these same measures and add no entries. Each entry has
`basis = NO_CUTOFF_APPLIED` over the received `analysis_window`. D-2 freshness is not metric maturity.
The analysis ends no later than D-2, the latest day is partial, and the last five days may be
restated; days outside the received window are not read and are never dropped silently.

**Data handling:** the table is very large; every query is bounded by `exp_id`, `version` and time. PAB
reads use the historical pre-experiment window and `build = 0`.

**Unspecified (TBD):** net vs gross (the source is silent); the meaning of the revenue-table `users`
field, and so Impressions / User and Users / DAU; how a new-user experiment is identified; the business
meaning of NULL `rev_type`; whether `mediation` exists as a Revenue dimension (the inspected schema has
no such column, so it is not used); the condition label for a stored NULL measure and for a
zero-denominator ratio (no Revenue case observed needs either); the mapping of early cohorts and D30+ to cohort buckets; PAB `payer_flag`
applicability; missing-row handling in the PAB tables.

**Contract:** numbers come from bounded queries run in this conversation; every request is bounded by
`exp_id`, `version` and time, and versions are never pooled. Compute exactly the received
`comparisons[]`, never re-derive the reference arm; `NO_COMPARISON` returns descriptive values only.
Annotations are commentary, never metrics. MISSING, UNOBSERVED and NOT_IN_TABLE are data conditions,
never silent zeros or silent drops. Shared statistical methodology stays in `analysis-contract.md`;
wording per `output-format.md`.
