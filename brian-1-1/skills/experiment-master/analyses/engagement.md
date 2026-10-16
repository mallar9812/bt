# Engagement analysis

**Source:** `experiment.engagement` (Druid), measures `actions` and `users`. A row is one variant, day,
dimension cell, `action_type` and `puzzle_type` for an `(exp_id, version)`. DAU comes from
`experiment.dau` for the same `exp_id`, `version`, `variant` and day, with matching shared dimensions
where the cut has a DAU split. `experiment.dau` also carries `ignite_flag` and `payer_window`; in the
checked data summing DAU over them reproduced the arm total. `experiment.dau` has no `puzzle_type` and
no `action_type`, so a DAU-normalized metric for a puzzle type or group divides by the DAU of the arm (or
of the non-puzzle cell), never by a puzzle-specific DAU.

**Model: Clear-first.** The primary Engagement behavior is `clear`. `view`, `use_hint` and `w_clear` are
supporting behavioral diagnostics, used only to understand a Clear movement at the same scope and
period. They are not separate primary Engagement reads. `action_type` is metric identity, not a cut and
not an aggregate: actions are never summed across `action_type`, there is no generic "actions per DAU"
metric, no top-N default, and no other `action_type` is a primary or diagnostic metric. The primary
action is fixed by this methodology; the request does not choose it. Action names are exact
data values: `w_clear_player` and `w_clear_bot` are separate action types and are not mapped to
`w_clear` unless an explicit mapping is established later. Action availability is game- and
unit-specific (a unit can lack any of the four, and a game can carry dozens of other `action_type`
values), so no diagnostic is assumed to exist for a unit. Rows with a NULL `action_type` are never `clear`
or a diagnostic action: they are excluded from every metric and noted, and count only as evidence that a
variant-day is loaded.

**Investigation path (adaptive, no mandatory traversal):**

```text
Overall Clear / DAU
  -> puzzle type / puzzle group
  -> view / use_hint / w_clear diagnostics (same puzzle scope, same period)
  -> cohort / user_type / payer_flag / install_type
  -> country / install_bucket / lat_flag / device_type / build / other populated dimensions
```

Start from the overall movement, find where it is concentrated, cross dimensions where useful, and
drill deeper only where the evidence justifies it. Nothing forces cohort → user_type → payer_flag or
any other fixed sequence, and not every dimension or crossing is run.

**Definition lock:** every reported metric has its own `definition_lock` entry. Each is a ratio of
summed stored values: numerator and denominator are each summed over the rows of the arm and day (and
cell, when cut), then divided. `P` is the selected puzzle scope: one puzzle type, or an analytical group
of puzzle types. `overall` is never part of `P`.

| # | Metric | numerator | denominator | denominator_table | grain | table | definition_status |
|---|---|---|---|---|---|---|---|
| 1 | Clear / DAU (overall) | SUM(`actions`), `action_type = 'clear'`, `puzzle_type = 'overall'` | SUM(`experiment.dau.dau`) | `experiment.dau` | arm × day | `experiment.engagement` | CONFIRMED |
| 2 | Clear / DAU (`P`) | SUM(`actions`), `action_type = 'clear'`, `puzzle_type` in `P` | SUM(`experiment.dau.dau`) | `experiment.dau` | arm × day | `experiment.engagement` | CONFIRMED |
| 3 | Clears / User (`P`) | SUM(`actions`), `action_type = 'clear'`, `puzzle_type` in `P` | SUM(`users`), `action_type = 'clear'`, `puzzle_type` in `P` | `experiment.engagement` | arm × day | `experiment.engagement` | CONFIRMED |
| 4 | Clear Users / DAU (`P`) | SUM(`users`), `action_type = 'clear'`, `puzzle_type` in `P` | SUM(`experiment.dau.dau`) | `experiment.dau` | arm × day | `experiment.engagement` | CONFIRMED |
| 5 | `<diagnostic>` / DAU, overall or `P` | SUM(`actions`) for `view`, `use_hint` or `w_clear`, at the same `puzzle_type` scope as the Clear metric | SUM(`experiment.dau.dau`) | `experiment.dau` | arm × day | `experiment.engagement` | CONFIRMED |

Metric 5 is one `definition_lock` entry per available diagnostic action (`view`, `use_hint`, `w_clear`).
Metrics 2–4 are reported together for every individual puzzle type or group, as three separate metrics.
They are never collapsed into one "contribution" number. When a metric is cut, the grain is arm × day ×
cell, and the DAU denominator is the DAU of that non-puzzle cell. For a group, the clear-action
numerators are summed across the selected puzzle types, the clear-user denominator of `Clears / User`
is summed across them, and the DAU-normalized metrics use the arm-level DAU denominator. The
`overall` row is never included.

**Definition status and raw `users`:** the formulas above are CONFIRMED. The semantics of the raw
`users` field are separately UNCONFIRMED and do not block the mechanical formulas. Clear users are the
as-stored values of `users` on the `clear` rows; distinct-user semantics are not established. In the
checked data the stored `overall` `users` was lower than the sum of the puzzle rows' `users` in many
cells and never higher, `users` exceeded DAU in a few small cells, and some `use_hint` rows stored
`users` > 0 with `actions` = 0. A group's clear-user sum is therefore a sum of stored values, not a count
of distinct users, and `Clears / User` and `Clear Users / DAU` are described as ratios of stored values.
`users` is never the denominator of a `/ DAU` metric.

**Pins:** `puzzle_type = 'overall'` is the stored total and the pin for arm-level totals; it already
contains all puzzle types. Never add `overall` to puzzle rows or to a group, never double-count it, and
never reconstruct it from puzzle rows. When analyzing puzzle types, exclude `overall`. In the checked data
the stored `overall` clear `actions` equalled the sum of the other puzzle rows, but that is an
observation, not a schema guarantee. If the `overall` row is absent for an
`(exp_id, version, variant, day, action_type)`, that metric-day is `NOT_IN_TABLE` at metric-day scope: it
is excluded from the paired comparison and reported with the bounded probe quoted, and is never rebuilt
from puzzle rows. `action_type` has no rollup value. `puzzle_type` values are game-specific and used as
returned (including their spelling and casing). An empty-string `puzzle_type` is preserved as the raw
value and may be displayed as UNSPECIFIED; that is a presentation label only, not a claim about the
business meaning of the raw source value.

**Supporting action diagnostic:** after the overall or puzzle-scope Clear movement is found and before
segmenting by cohort, `user_type`, `payer_flag` or `install_type`, compute `view`, `use_hint` and
`w_clear` per DAU for the same puzzle scope and the same period, where those exact action types are
available. The question is whether those behaviors also moved alongside Clear. They are directional
context only: no causal claim is made from co-movement. Examples of reading: Clear ↓ with View ↓ means the
Clear movement occurred alongside reduced viewing activity; Clear ↓ with View stable means reduced views do
not explain the movement by themselves; `use_hint` or `w_clear` moving the same way is supporting
behavioral evidence; divergence between the metrics is a potentially useful signal, not a conclusion.
Each diagnostic is its own metric and comparison with its own `definition_lock` entry. A diagnostic that
is unavailable for the unit is reported as unavailable (`NOT_IN_TABLE`), never as unchanged and never as
zero. A missing diagnostic does not invalidate the primary Clear metric. The diagnostics exist only to
explain a Clear movement: if `clear` is `NOT_IN_TABLE` / `NOT_RUN` for the unit, they are not run, and no
other action takes the primary role.

**Missing, zero and NULL:** the table is sparse. An absent row is never read as zero, never built from
`experiment.dau` or any other table, and never dropped silently. An arm-level total is the SUM of the
pinned rows that exist and does not zero-fill an absent cell row. Stored `actions` = 0 is a valid observed
zero.

| Case | scope | condition | effect |
|---|---|---|---|
| Variant-day with DAU > 0 and no engagement row of any `action_type` (including a NULL one) | `VARIANT_DAY` | `MISSING` | `EXCLUDED_FROM_PAIR`: that day leaves every Engagement comparison |
| Loaded variant-day, a Clear or diagnostic action has no row at arm level, i.e. its pinned `overall` row is absent | `METRIC_DAY` | `NOT_IN_TABLE` | `EXCLUDED_FROM_PAIR`: that metric's day only; the bounded probe is quoted; never zero. The shared contract reserves `NOT_IN_TABLE` for an absent pinned row and `UNOBSERVED` for cut-level cells, so the arm-level absence takes the former label; either way it is not an observation |
| Cut cell (any dimension, or the selected puzzle scope `P` in an arm-day) with DAU > 0 and the action's row absent | `CUT_CELL` | `UNOBSERVED` | `NOT_READ_AS_ZERO`: the cell-day has no defined observation and contributes no pair to that cell's comparison; the evidence is reported, not deleted |
| `clear` has no row anywhere in the unit's analysis window | `METRIC` | `NOT_IN_TABLE` | `NOT_RUN` for the Clear analysis, with the bounded probe quoted; no other action is substituted as the primary metric, and the supporting diagnostic layer is skipped (no Clear movement to diagnose) |
| A diagnostic action (`view`, `use_hint`, `w_clear`) has no row anywhere in the unit's analysis window | `METRIC` | `NOT_IN_TABLE` | `NOT_RUN` for that diagnostic only, reported as unavailable; the primary Clear metric is unaffected |
| `(exp_id, version)` absent from the table | the Master's coverage result | `NOT_IN_TABLE` | with the bounded probe quoted |

- A variant-day is *loaded* when DAU > 0 and at least one engagement row of any `action_type`, including
  a NULL one, exists for it.
- A stored NULL `actions` makes that action's observation undefined, never zero. A NULL or absent DAU makes
  a DAU-normalized metric undefined, never zero. A NULL or absent clear `users` makes `Clears / User` and
  `Clear Users / DAU` undefined, never zero, and a zero SUM of clear users leaves `Clears / User`
  undefined. A zero DAU likewise leaves a `/ DAU` ratio undefined. The rows of an arm-day are never
  silently summed over only their non-NULL values and the result called complete. The ratio is not
  computed, no value is manufactured, and only the affected metric's observation is excluded, with the
  exclusion reported. The exact condition labels for these cases are TBD until the shared analysis
  contract fixes its vocabulary; the handling applies now. No stored NULL `actions` or `users` has been
  observed in the inspected data.
- A DAU row absent for a required variant-day is `MISSING` at `VARIANT_DAY` scope.
- Whether the table is exhaustive for a cut dimension, so that an absent cut-level cell could have a
  defined zero meaning, is not established and stays TBD.

**Duplicate loads:** the same unit-day can be loaded more than once into `experiment.engagement` (more
than one distinct `inserted_at` for the same `(exp_id, version, date_field)`). In the sampled data,
`2026-09-20` was loaded twice for every checked unit with identical content, which doubles any summed
measure. Before any aggregation, per unit-day:

- If the loads are identical (same rows and the same `actions` and `users` per cell), use only the
  rows of the latest `inserted_at`, report the duplicate-load condition, and never sum the copies.
- If the loads differ materially, do not silently choose one: neither is used, the day is reported as
  needing a data-condition decision, and it is not paired until that decision is made.
- The condition label is TBD until the shared analysis contract fixes its vocabulary.

**Paired observation:** per day, per arm, per metric: the metric's numerator ÷ its denominator, for days
where both sides have a defined observation (the metric's own numerator inputs present and not NULL, and
its denominator present and, for DAU, > 0); difference = comparator − reference. Each metric (Clear / DAU,
Clears / User, Clear Users / DAU and each available diagnostic) is its own comparison with its own
`definition_lock` entry.

**Default cuts (Stage 2, mandatory floor, `analysis-contract.md` § Default cut set):** for Clear / DAU,
Clears / User, Clear Users / DAU and each supporting diagnostic, one cell per value of install cohort,
`user_type`, `payer_flag` and `puzzle_type`, each read alone, each cell with its own paired test, `pab[]`
and `adjusted` block where a PAB counterpart exists. `puzzle_type` cells report each puzzle type's share of
the reference variant's clears and its contribution to the overall Clear / DAU effect, in percentage
points (share × adjusted effect), so the rows add up to the overall row. The adaptive crossings below run
in addition.

**Puzzle type and group (Stage 2, first drill):** the puzzle split runs whether or not the overall Clear / DAU
moves; drill into puzzle types. A puzzle type can be analyzed individually, or several can be clubbed into an analytical group
when that is useful; `overall` is never part of the group, and an empty-string `puzzle_type` (displayed
as UNSPECIFIED) may be a member like any other puzzle row. For every individual puzzle type or group,
report Clear / DAU, Clears / User and Clear Users / DAU as the three separate metrics defined above, with
the supporting diagnostics at the same scope. `puzzle_type` is not in `experiment.dau` and has no DAU
split, so these metrics use the arm-level (or non-puzzle cell) DAU as the denominator, labelled so, and a
puzzle scope has no DAU weight.

**Segmentation (Stage 2, adaptive):** once the puzzle scope and the supporting-action context are
established, continue into `cohort`, `user_type`, `payer_flag` and `install_type`, each alone, crossed with
each other, or crossed with `puzzle_type` where relevant — for example clear × puzzle group × cohort;
clear × puzzle type × user_type. Do not enumerate every combination. `action_type` is not a cut. Cohort
uses the existing experiment cohort definitions. Sparsity is not by itself a reason to remove a
dimension; a dimension whose only value in the unit is `NA` yields no split, which is reported, not
treated as an error.

**`user_type`:** a new-user experiment uses `user_type = new` and gets no old-vs-new split. Otherwise
start with new and old together, then use `user_type` as a deeper segmentation where useful. How an
experiment is identified as a new-user experiment is TBD; no repository rule defines it.

**Last layer:** `country`, `install_bucket`, `lat_flag`, `device_type`, `build` and other populated
dimensions. They are not more important than the primary dimensions and are investigated only when the
observed movement gives a reason.

**Movement, contribution and weight:** separate signals, never collapsed into one number and never used
to filter cells or evidence out. *Movement* = comparator metric − reference metric. *DAU weight* = the
cell's DAU ÷ the arm's DAU, only for a cut that has a DAU split (not for `puzzle_type`). *Clear-action
contribution* = the cell's clear actions ÷ the arm's total clear actions (the pinned `overall` total).
Clear-action contribution must be read together with DAU weight and the cell's population: in the
inspected data a single-user or very small cell can carry a large action count (most visibly for
`w_clear`), and a small cell is not a major driver merely because its count is large. Example: A (10% of
DAU, 40% of clear actions, +15%) and B (40% of DAU, 5% of clear actions, +15%) are both valid findings; A
generally explains more of the aggregate movement, and B stays visible when relevant. A puzzle scope
uses clear-action contribution and movement without a DAU weight. No contribution-to-lift formula and no
other contribution formula is defined here.

**Adaptive grouping:** a small or low-relevance category (a dimension value or a puzzle type) may be
clubbed when its standalone interpretation would be noise. This is contextual, with no fixed threshold,
and keeps the correct numerator and denominator. Grouping is for readability, never for deleting
evidence: a real movement is not hidden because its contribution is small.

**PAB:** an adjustment and explanatory check, not a segmentation dimension. It applies the same
Clear-first model. PAB runs in Stage 1 with the paired test (`analysis-contract.md` § PAB adjustment): the whole-scope result
and every default-cut cell with a pre-test counterpart get a `pab[]` entry with the `adjusted` block, using
the tables, key, window and formulas below. It is not a follow-up. Old users (`user_type = old`) take the overall PAB in full (`old_share = 1`); new users and the D00 to D30 cohorts have none and are returned observed (`OBSERVED_NO_PAB`); every result that mixes old and new users takes `old_share × PAB` (`analysis-contract.md` § PAB adjustment). The puzzle split (`puzzle_type`) uses the
same PAB table with the puzzle type as its selector.

- *Method:* the same definitions as the experiment metrics, using the `pre_*` measures, pooled per arm
  over the actual PAB historical window (numerator and denominator each summed, then divided). The
  numerator comes from `experiment.pre_engagement_2` and the denominator from `experiment.pre_dau_2`
  (`table` = `experiment.pre_engagement_2`, `denominator_table` = `experiment.pre_dau_2`). The underlying
  rows are arm × day (× cell); that is not the grain of the PAB output. A PAB ratio is not computed
  where its pooled denominator is not > 0.
  - PAB Clear / DAU (overall) = SUM(`pre_actions`, `action_type = 'clear'`, `puzzle_type = 'overall'`) ÷
    SUM(`pre_dau`).
  - For a puzzle type or group `P` (never including `overall`): PAB Clear / DAU = SUM(`pre_actions`,
    clear, `P`) ÷ SUM(`pre_dau`); PAB Clears / User = SUM(`pre_actions`, clear, `P`) ÷ SUM(`pre_users`,
    clear, `P`); PAB Clear Users / DAU = SUM(`pre_users`, clear, `P`) ÷ SUM(`pre_dau`). `pre_users` is the
    PAB field for clear users: as-stored, with the same unestablished distinct-user semantics, and never
    the denominator of a `/ DAU` metric. `pre_dau` has no `puzzle_type`, so the DAU denominator is the
    arm-level (or non-puzzle cell) `pre_dau`, labelled so.
  - Supporting `view`, `use_hint` and `w_clear` diagnostics may be used in PAB where the exact action
    type is available; `w_clear_player` and `w_clear_bot` are not mapped to `w_clear`.
  - The same pins, the same exclusion of `overall` from groups and the same no-reconstruction rule apply.
    In the checked PAB data `overall` clear `pre_actions` equalled the sum of the puzzle rows; that is an
    observation, not a schema guarantee.
- *Tables and identity:* `experiment.pre_engagement_2` with `experiment.pre_dau_2` (`gid` and `cli` are
  BIGINT in both). Rows are filtered to `build = 0`, a required filter and not a cut. The PAB key is
  derived from the experiment-version, not equal to it. On every inspected unit where both sides exist,
  the PAB `exp_id` is the experiment `exp_id` with its fourth component replaced by the experiment
  `version`, followed by `::pre_version` (experiment `49::0::content_exp::16`, version `5` → PAB
  `49::0::content_exp::5::pre_version`); the PAB `version` is the experiment `version`;
  `allocation_type = 'pre_version'` and `pab_window = 'regular'`. Two versions of one experiment `exp_id`
  are separate PAB units. The experiment `(exp_id, version)` is not itself a PAB key. A unit with no
  matching PAB rows is `NOT_IN_TABLE` for PAB, not an error.
- *Window:* the PAB rows are the days preceding the version start: `version_date` equals the version's
  first active day on every inspected unit, and the history ends the day before `version_date`. Its
  length is never hardcoded: the actual first and last day and the number of days available are read from
  the PAB rows. Where the experiment-side first active day is known to be the version's true first day,
  it gives the upper bound of the scan; where it is not known (for example a requested period clipped
  discovery), `version_date` is read from the rows of the derived key first. The lower bound is set wide
  enough to contain the history and is not a fixed length.
- *Known fields:* `pre_engagement_2`: `date_field`, `gid`, `cli`, `experiment`, `version`, `variant`,
  `country`, `install_bucket`, `payer_flag`, `action_type`, `puzzle_type`, `build`, `exp_id`,
  `inserted_at`, `install_type`, `device_type`, `allocation_type`, `lat_flag`, `pab_window`, `cohort`,
  `version_date`, `pre_actions`, `pre_users`; `pre_dau_2`: `date_field`, `gid`, `cli`, `experiment`,
  `version`, `variant`, `country`, `install_bucket`, `payer_flag`, `build`, `pre_dau`, `exp_id`,
  `allocation_type`, `inserted_at`, `lat_flag`, `cohort`, `pab_window`, `version_date`.
- *Supported cuts:* the denominator-backed PAB cuts, present in both the numerator and the denominator
  table, are `cohort`, `country`, `install_bucket` and `lat_flag`. `payer_flag` is in both tables, but its
  applicability is TBD. `build = 0` is a PAB constraint, not a cut. `user_type` is unavailable in the PAB
  schema (it is in neither table). `install_type` and `device_type` are only in `pre_engagement_2`, so
  neither is a normalized PAB cut unless a valid matching denominator is established. `puzzle_type` is
  allowed for PAB puzzle-type and group analysis because the same `overall` and puzzle-row structure
  exists in `pre_engagement_2`, with the arm-level `pre_dau` denominator. Do not assume a PAB dimension
  exists because the experiment table has it.
- *Cohort labels:* PAB cohort labels observed in the checked data are `D31-D60` and older buckets plus
  `PAB-Smaller-Cohorts`. `PAB-Smaller-Cohorts` is a PAB-only label with no established experiment-side
  mapping: no mapping and no eligibility rule is invented for it, and the experiment-side labels without
  a PAB counterpart are not matched to it.
- *Applicability:* TBD beyond the schema and data constraints stated here. No blanket restriction to
  mature or D30+ cohorts and no categorical exclusion of new users, early cohorts or `payer_flag` splits
  is established; none is assumed. Do not force a PAB adjustment where the methodology or data does not
  support the cut.
- *Confidence and adjustment:* `pab_confidence_floor = ALWAYS_USE`: PAB is used wherever it exists, whatever its PAB confidence, scaled by the result's `old_share`. The adjusted effect is the observed movement minus `old_share × PAB`, its interval combines the observed half-width and the scaled PAB half-width, and Conf is taken from it
  (`analysis-contract.md` § PAB adjustment). Reading uses the 1% / 10 bps line and the 0.85 Conf bar
  (`master-state.md` § Results and meaningfulness).
- *Missing and NULL rows:* a stored NULL `pre_*` value is undefined and never read as zero. Missing-row
  and stored-NULL handling in the PAB tables is TBD. The duplicate-load rule applies if a PAB unit-day is
  found loaded more than once.

**Maturity and freshness:** Engagement has no demonstrated maturity cutoff requirement.
`mature_analysis_window` has entries for the action measure only (`actions`) with
`basis = NO_CUTOFF_APPLIED` over the received `analysis_window`; no separate maturity rule is invented for
the external DAU denominator. D-2 freshness is not metric maturity. The analysis ends no later than D-2,
the latest day is partial, and the last five days are restated; days outside the received window are not
read and are never dropped silently.

**Coverage and data handling:** the largest table; always bound by `exp_id`, `version`, the Clear and
diagnostic `action_type` values and time; versions are never pooled. An `(exp_id, version)` absent from
the table is `NOT_IN_TABLE` with the bounded probe quoted. An absent `clear` or diagnostic action in an
otherwise present unit is `NOT_IN_TABLE` for that action (metric scope), not for the unit, and a Clear or
diagnostic action missing on one variant-day of a present unit follows the missing rules above. PAB reads
use the historical pre-experiment period and `build = 0`.

**Unspecified (TBD):** the meaning of the raw `users` field (the mechanical formulas above are not
blocked by it); how a new-user experiment is identified; whether the table is exhaustive for each cut
dimension; the condition labels for a NULL numerator, a NULL or zero DAU or clear-user denominator, a
stored NULL and a duplicate load; whether `overall` equalling the puzzle sums is a schema guarantee
(observed only); handling of a NULL `puzzle_type` (none observed); an explicit mapping, if ever
established, of `w_clear_player` or `w_clear_bot` to `w_clear`; PAB applicability beyond the schema and data constraints (any cohort or user eligibility, including
`payer_flag`); the meaning of and any mapping for `PAB-Smaller-Cohorts`; missing-row and stored-NULL
handling in the PAB tables; any PAB adjustment beyond the concept.

**Contract:** compute exactly the received `comparisons[]`, never re-derive the reference arm;
`NO_COMPARISON` returns descriptive values only; MISSING and UNOBSERVED are explicit data conditions,
never silent zeros or silent drops; `n_comparisons_in_experiment` counts each metric separately (Clear /
DAU, Clears / User, Clear Users / DAU and each diagnostic); shared statistical methodology stays in
`analysis-contract.md` (paired daily observations, comparator − reference, paired daily t-test, two-sided
p-value, 95% confidence interval; no additional significance rule is defined in this file); wording per
`output-format.md`.
