# Economy analysis

**Label:** "Economy (in-game)". Capability `economy`, domain `ECONOMY`.

**Scope of the capability: the in-game economy only.** Economy measures in-game currencies and resources
that players earn, spend and acquire inside the game (`cash`, `spin`, `hint`, `hints`, `lives`,
`skipit`, `inventory` and any other stored `cash_type`). Every value is in in-game units, never money.
"Spend" here is in-game spending of a resource, never acquisition spend; "purchase" is in-game currency or
resources acquired inside the game's economy, never IAP revenue. Monetary revenue belongs to Revenue,
LTV & LTDays and Rolling LTV; acquisition spend belongs to no experiment capability.

**Sources:** `experiment.economy` (Druid; numerators) and `experiment.dau` (Druid; denominator). In both
`gid` and `cli` are BIGINT (integer literals) and `__time` is the **activity date** (`date_field` holds the
same date). An `experiment.economy` row is one activity date, variant, dimension cell, `cash_type`,
`earn_type` and `category` for an `(exp_id, version)`, with `cash`, `users` and `actions`:

- `cash_type` is the currency or resource; its values differ by game.
- `earn_type` is `earn`, `purchase`, `spend` or `spend - earn`. `earn` and `purchase` are stored
  positive or 0. `spend` is stored **negative** or 0 for most currencies (every `cash` and `hints` row
  inspected), but not for every one: `lives` spend was stored positive on an inspected gid 37 unit. The
  stored sign is kept whatever it is (E3). The row labelled `spend - earn` holds earn + spend (as
  stored), with purchase excluded; its label is never read as literal arithmetic. On every
  inspected variant-day it equalled the `earn` row plus the `spend` row exactly.
- `category` = `'overall'` is a rollup: on every inspected variant-day it equalled the sum of the named
  categories exactly (cash and actions). It is never added to the named categories.
- `users` are distinct users per slice (not additive across categories or `earn_type`; semantics
  otherwise UNCONFIRMED, as in Engagement). `actions` is not used by any metric.
- Values are daily flows by activity date: not cumulative and not forward-looking.

DAU comes from `experiment.dau` for the same `exp_id`, `version`, `variant`, day and cell; `user_type`,
`cohort` and `payer_flag` labels match `experiment.economy` exactly. `experiment.wallet_balance` is not
read (balances are not a V1 metric).

**Currencies are never pooled.** Each `cash_type` present for the unit is its own set of metrics; no
total-currency, pooled or combined-resource metric exists, and none is built. A `cash_type` absent for a
unit is `NOT_IN_TABLE` for that currency.

**Definition lock:** "Economy (experiment.economy), in-game, per `cash_type`". Each metric for each
`cash_type` C has its own `definition_lock` entry, named `<metric>:<C>` (for example `spend_per_dau:cash`,
`earn_per_dau:hints`), and its own results; that name is the result's `metric`, so the existing result
identity separates currencies without any other field (`cash_type` is never a scope or cut value). Every
numerator reads the `category = 'overall'` row of C:

| Metric | numerator | denominator | denominator_table | grain | table | definition_status |
|---|---|---|---|---|---|---|
| `earn_per_dau` (C) | SUM(`cash`) WHERE `earn_type` = 'earn' | SUM(`dau`) | `experiment.dau` | variant × activity date | `experiment.economy` | CONFIRMED |
| `spend_per_dau` (C) | SUM(`cash`) WHERE `earn_type` = 'spend' (**source sign kept**; negative for most currencies) | SUM(`dau`) | `experiment.dau` | variant × activity date | `experiment.economy` | CONFIRMED |
| `purchase_per_dau` (C) | SUM(`cash`) WHERE `earn_type` = 'purchase' | SUM(`dau`) | `experiment.dau` | variant × activity date | `experiment.economy` | UNCONFIRMED (meaning of in-game purchase) |
| `net_per_dau` (C) | SUM(`cash`) WHERE `earn_type` = 'spend - earn' (= earn + spend; purchase excluded) | SUM(`dau`) | `experiment.dau` | variant × activity date | `experiment.economy` | CONFIRMED |
| `earners_per_dau` (C) | SUM(`users`) WHERE `earn_type` = 'earn' | SUM(`dau`) | `experiment.dau` | variant × activity date | `experiment.economy` | UNCONFIRMED (`users` semantics) |
| `spenders_per_dau` (C) | SUM(`users`) WHERE `earn_type` = 'spend' | SUM(`dau`) | `experiment.dau` | variant × activity date | `experiment.economy` | UNCONFIRMED (`users` semantics) |

- Numerator and denominator are matched on `exp_id`, `version`, `variant`, day and the requested scope
  (and the cell when cut), each summed separately, then divided. Daily ratios are never averaged into a
  period rate.
- **Spend sign (capability-level exception E3: the source sign is kept).** `spend_per_dau` keeps the
  stored sign (negative for most currencies). It is never multiplied by −1 and no absolute value is
  taken, and no magnitude metric is created. Its relative change uses the signed reference: `delta_pct_of_reference = delta_abs ÷
  reference_value`, so control −90 and variant −100 give `delta_abs` −10 and +11.1%, meaning spend rose
  in magnitude (a negative relative change means it fell in magnitude). A currency whose spend is stored
  positive is read with the ordinary `GENERAL` sign. Net is earn + spend as stored; spend is never negated
  first (earn 124, spend −94 → net 30).
- No per-user currency rate (per earner, per spender, per user) is a V1 metric. Named categories are not
  V1 metrics (see Cuts).

**Analysis window and maturity.** The received `analysis_window` is a window of activity dates
(`requested_period ∩ experiment_active_window ∩ stable_window`, within D-2); no exception applies. The
values are daily flows with no forward window, so there is no metric-specific maturity cutoff:
`mature_analysis_window` has one entry per measure with `basis = NO_CUTOFF_APPLIED` over the received
window (D-2 freshness is not metric maturity). The source rewrites each activity date on each daily load
for about five days and then freezes it; this is recorded, and no extra rule is added.

**Missing data** (`data_conditions[]`; nothing is zero-filled):

| Situation | `data_conditions` entry | Effect |
|---|---|---|
| no `experiment.economy` row for a required variant-day | scope `VARIANT_DAY`, condition `MISSING` | `EXCLUDED_FROM_PAIR` for every metric |
| no `experiment.dau` row for a required variant-day | scope `VARIANT_DAY`, condition `MISSING` | `EXCLUDED_FROM_PAIR` for every metric |
| the variant-day is loaded but the `category = 'overall'` row of the metric's `earn_type` and `cash_type` is absent | scope `METRIC_DAY`, condition `NOT_IN_TABLE` | that metric's day only; the bounded probe is quoted |
| a `cash_type` (or one `earn_type` of it) with no row anywhere in the unit's analysis window, for one variant or both | scope `METRIC`, condition `NOT_IN_TABLE`, `variant` when only one side lacks it | that metric `NOT_RUN` for the currency; not repeated per day (for example `skipit` present for control only, or `lives` with no purchase rows) |
| a cut cell with DAU > 0 but no economy row | scope `CUT_CELL`, condition `UNOBSERVED` | `NOT_READ_AS_ZERO` |

- A stored `0` is an observed zero (rows with 0 cash and users present exist, for example free rewards or
  auto-applied spends; their meaning is unestablished). A stored NULL `cash`, `users` or `dau` is
  undefined and never zero; a DAU of 0 leaves the ratio undefined. Both exclude only the affected
  observation and are reported; their exact condition labels stay TBD, as in Revenue. No NULL was found
  in the inspected unit.

**Paired observation (pairing unit: calendar day).** For each metric, each `cash_type` and each pair from
the received `comparisons[]`, a paired unit is one activity date in `analysis_window` on which both the
reference and the comparator have a defined ratio within the requested scope. The observation is
`comparator − reference`. The statistics are those of `analysis-contract.md` § Paired test, unchanged
(`pairing_unit = CALENDAR_DAY`, `stat.method = paired_t_daily`, `n_paired_days`). `reference_value` and
`comparator_value` are pooled over the paired days; `exposure` is each side's DAU. No SRM,
minimum-sample, multiple-testing, power, peeking or other significance rule is added, and this analysis
never classifies meaningfulness.

**Meaningfulness inputs** (the Master classifies; `master-state.md` § Results and meaningfulness). Every
Economy metric is `GENERAL`.

- **E1 — net with a non-positive reference (capability-level exception).** When `net_per_dau`'s
  `reference_value` is ≤ 0, the analysis still returns `delta_abs`, its CI and p-value, returns
  `delta_pct_of_reference` as null with reason `REFERENCE_NON_POSITIVE`, and the Master records
  `NOT_CLASSIFIED` / `REFERENCE_NON_POSITIVE`. With a reference > 0, net uses the `GENERAL` rule
  unchanged. Net is ≤ 0 on a large share of variant-days in the inspected data.
- **E3 — spend with its signed reference.** `spend_per_dau` uses the `GENERAL` rule with its negative
  reference: each CI bound divided by the negative `reference_value` reverses their order, so the two
  relative bounds are reordered (low ≤ high) before the existing classification; the thresholds are
  unchanged. A spend reference of exactly 0 uses the existing `REFERENCE_ZERO`.
- The other four metrics are never below 0; a reference of exactly 0 uses `REFERENCE_ZERO`.

**Scope.** A requested scope is applied as a fixed cell to `experiment.economy` and `experiment.dau`.
Supported scope dimensions: `cohort`, `user_type`, `payer_flag`, `country`, `install_bucket`, and
`lat_flag` and `install_type` only where the unit has values other than `NA`. Any other dimension —
`device_type` (not in `experiment.economy`), `build`, `cli`, `category`, `earn_type`, `cash_type` and the
rest — makes every metric `UNSUPPORTED_FOR_SCOPE`. Scoped values with no rows for the unit make the scope
`UNAVAILABLE`. A dimension is never dropped and nothing is computed at a broader scope.

**Cuts (Stage 2 — WHERE).** One dimension at a time from the supported dimensions, with
`cohort`, `user_type` and `payer_flag` first (the default cut set); no crossed cuts; `NA`, empty and NULL
are never cut values.

- **Cell statistics: this analysis produces cell-level statistics** for the default cut set
  (`analysis-contract.md` § Breakdown cells). A cell gets its own `comparison_results[]` entry per metric
  with `cut: [{dimension, value}]`, built exactly as the whole-scope entry (same paired test on the cell's
  daily values, the cell's own DAU), with `pab[]` and `adjusted` where a PAB counterpart exists. E1 and E3
  apply inside the cell unchanged. Cell values, DAU and movement also stay in `cuts` and `findings`.
- **Category, descriptive only:** for a moved metric, each named category's contribution to that
  metric's `overall` numerator (its share and its movement) may be shown in `findings`. Categories are
  not metrics, cuts or results, and `overall` is never added to them.

**PAB (required).** A pre-version in-game Economy baseline: how the experiment variants differed on the
same in-game Economy metric before the version started. It is not revenue, IAP, acquisition spend or
monetisation, and it never implies causation. The mechanics are those of the existing Revenue and
Engagement PAB methodology; the meaning is Economy's own.

- *Tables and identity:* numerator `experiment.pre_economy_2` (`pre_cash`, `pre_users`), denominator
  `experiment.pre_dau_2` (`pre_dau`); `gid` and `cli` are BIGINT. The PAB key is derived from the
  experiment-version, not equal to it: the experiment `exp_id` with its fourth component replaced by the
  experiment `version`, followed by `::pre_version` (experiment `22::0::adwall::128`, version `6` → PAB
  `22::0::adwall::6::pre_version`); the PAB `version` is the experiment `version`; `allocation_type =
  'pre_version'`, `pab_window = 'regular'`, and rows filtered to `build = 0` (a required filter, not a
  cut). Two versions of one experiment `exp_id` are separate PAB units; versions are never pooled.
- *Source facts (inspected unit):* one row per `date_field` day, variant, cell, `cash_type`, `earn_type`
  (`earn`, `purchase`, `spend` only — there is no net row) and `category`; daily values, not cumulative;
  `category = 'overall'` equalled the sum of the named categories exactly; `cash` spend stored negative;
  `pre_users` ≤ `pre_dau`; no NULL found. `pre_users` keeps the as-stored distinct-user semantics and is
  never summed across categories.
- *Window:* the days before `version_date` (the version's first active day), read from the rows; its
  length is never hardcoded (31 days on the inspected unit). The first day, last day and number of days
  are reported. As in the existing PAB contract, the PAB rows are the days immediately preceding the
  version start, so a derived key's rows are used only when they are tied to this version: `version_date`
  is present, the rows end on the day before it, and, where the version's true first active day is
  known, `version_date` equals it. Otherwise the PAB status is `NOT_APPLICABLE` with reason "PAB window
  not aligned to this version's start" and the rows' dates quoted; nothing is computed from them. (One
  inspected key, `37::0::admon_latency_api::1::pre_version`, held three days from 2024 with a NULL
  `version_date`.) A window with fewer days is pooled over the days that exist, with their number stated; no
  minimum is defined. How allocation changes inside the PAB window are treated is TBD.
- *PAB metrics, per `cash_type` (currencies never pooled):* the six V1 metrics computed from the `overall`
  PAB rows of that currency, pooled per variant over the window (numerator and denominator each summed,
  then divided):
  - PAB `earn_per_dau` = SUM(`pre_cash`, earn) ÷ SUM(`pre_dau`);
  - PAB `spend_per_dau` = SUM(`pre_cash`, spend) ÷ SUM(`pre_dau`) — **source sign kept** (E3);
  - PAB `purchase_per_dau` = SUM(`pre_cash`, purchase) ÷ SUM(`pre_dau`);
  - PAB `net_per_dau` = PAB earn + PAB spend = (SUM(`pre_cash`, earn) + SUM(`pre_cash`, spend)) ÷
    SUM(`pre_dau`), purchase excluded — **a derived PAB metric (E2)**, labelled "derived", never presented
    as a stored net row;
  - PAB `earners_per_dau` = SUM(`pre_users`, earn) ÷ SUM(`pre_dau`);
  - PAB `spenders_per_dau` = SUM(`pre_users`, spend) ÷ SUM(`pre_dau`).
  A PAB ratio is not computed where its pooled `pre_dau` is not > 0. E1 applies to PAB net when its pooled
  reference is ≤ 0, and E3 to PAB spend.
- *Output:* `pab_value` is the **pre-version in-game Economy movement** (comparator vs reference over the
  PAB window, with each side's pooled PAB value); `observed_movement` is the **experiment-period in-game
  Economy movement** of the result. `adjusted` is returned (`analysis-contract.md` § PAB adjustment):
  observed minus `old_share × PAB`, with the combined interval and Conf, for the whole-scope result and every default-cut
  cell that has a PAB counterpart. PAB is used whatever its confidence (`ALWAYS_USE`), scaled by `old_share` (`analysis-contract.md` § PAB adjustment). The PAB half-width comes from the daily
  pre-test differences; no other statistical test is applied to PAB.
- *Supported PAB cuts:* `cohort`, `country`, `install_bucket` and `lat_flag` (present in both PAB tables).
  `payer_flag` is in both tables but its PAB applicability is unresolved (TBD), so it is not a supported
  PAB cut. `user_type` and `install_type` are in neither PAB table. PAB cohort labels are `D31-D60` and
  older buckets plus `PAB-Smaller-Cohorts`; `D00`, `D01`, `D02-D07`, `D08-D14` and `D15-D30` have no PAB
  counterpart, and nothing is mapped to or from `PAB-Smaller-Cohorts`. The PAB population is pre-existing
  users only (no new installs), and this is stated with every PAB result.
- *Statuses (`pab[]`):* `COMPUTED` (data available, including a shorter window with its day count);
  `NOT_IN_TABLE` (no PAB rows for the derived key, the variant or the currency, after the bounded
  `COVERAGE` probe); `NOT_APPLICABLE` (pooled `pre_dau` not > 0, a cut without PAB support, a cohort
  without a PAB counterpart, or a PAB window not aligned to this version's start); `TBD` (missing-row handling). Missing PAB days, rows
  or values are never zero; a stored NULL `pre_*` value is undefined.
- *When it runs:* in Stage 1 with the paired test, for every metric, currency, pair and default-cut cell with a
  PAB counterpart (`capability-registry.md` § PAB). A user-requested `PAB_CHECK` re-runs one existing result
  (`master-state.md` § Follow-ups).

**Coverage:** an `(exp_id, version)` with no `experiment.economy` rows after a live bounded probe is
`NOT_IN_TABLE`; with none in `experiment.dau` it is `NOT_IN_TABLE` with reason `DEPENDENCY`.

**Data handling:** every statement is bounded by `exp_id`, `version` and `__time` (activity date);
versions are never pooled. Stage 1 issues two statements: `experiment.economy` grouped by variant, day,
`cash_type` and `earn_type` with `category = 'overall'`, over `analysis_window`; and `experiment.dau`
grouped by variant and day over the same window. A Stage 2 step adds the cut dimension to both. PAB
issues two statements in Stage 1 (`pre_economy_2` and `pre_dau_2`, bounded by the derived key, `version`,
`build = 0` and the PAB window), and the same two grouped by the cut dimension for the default-cut cells. Count with `GROUP BY`, never `COUNT(DISTINCT)`.

**Negative versions (E4):** the Master never dispatches this analysis for a version whose stored value
starts with `-`: an explicitly requested one is `UNSUPPORTED` / `VERSION_SEMANTICS_UNKNOWN`, and one the
shared rules selected without a request is never auto-selected (`SKIPPED_NOT_AUTO_SELECTED`,
`capability-registry.md` § Selection by mode), in every mode including PERIOD; the same holds for its
PAB. If one is received anyway, the
analysis returns `BLOCKED` with reason `VERSION_SEMANTICS_UNKNOWN` and computes nothing.

**PERIOD:** Economy supports PERIOD (date axis `ACTIVITY_DATE`), as trigger or as cross-capability
evidence (`period-evidence.md` § Trigger, scope and evidence), with exactly the methodology of this file:
no separate PERIOD method. In PERIOD the received `analysis_window` is the unit's
`experiment_evidence_window`; everything else is unchanged (variant × activity date, ratio of sums,
`paired_t_daily`, currencies separate, signed spend, E1, E3). As the trigger, the result for the trigger
metric `<metric>:<cash_type>` is the trigger evidence; every other Economy result is cross-capability
evidence. `focus` (`TRIGGER` or `CROSS_CAPABILITY`) changes nothing in the analysis, and a result is
computed once whatever its role. PAB runs in a PERIOD run exactly as in any other mode
(`analysis-contract.md` § PAB adjustment).

**Unspecified (TBD / data owner):** the meaning of in-game purchase and of the earn category `purchase`;
rows with 0 cash and users present; what `actions` counts; `users` semantics; whether the PAB window has a
minimum length and how allocation changes inside it are treated; `payer_flag` PAB applicability; PAB
confidence and adjustment; balances (`experiment.wallet_balance`: no `cash_type`, a different DAU
population, stacked `overall` rollups, coarser age buckets, percentiles that cannot be pooled) as a
future metric; the condition labels for NULL values and zero DAU.

**Contract:** compute exactly the received `comparisons[]`, never re-derive the reference variant;
`NO_COMPARISON` returns descriptive values only (each variant's pooled value per metric and currency, and
its DAU); `MISSING`, `UNOBSERVED` and `NOT_IN_TABLE` are explicit data conditions; shared statistical
methodology stays in `analysis-contract.md`; wording per `output-format.md`.
