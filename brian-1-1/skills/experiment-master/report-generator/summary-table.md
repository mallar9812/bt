# Results tables

The results tables of the templates (Template A's supporting and primary metric outcomes; the movement
rows of B and D), built from report records (`adapter.md`). One row per result; every result appears
exactly once. Rows are ordered by capability in registry order, then by metric. Breakdown cells are
shown under their parent, never as summary rows.

## Comparisons

- **One block per comparison** (`pair_id`), each with the same columns. The reference is the control when
  one exists (`explicit_control`), otherwise the lowest-numbered variant; with several variants there is
  one block per pair, e.g. "var1 vs control" and "var2 vs control", or, with no control, "var2 vs var1"
  and "var3 vs var1". The reference never gets a block of its own.
- **Labels:** variants are named as returned. A reference variant is never called control
  (`output-format.md` § Comparison language).
- **Units:** units are never pooled, averaged or combined, across variants or across versions.

## Columns

| Column | Source | When unavailable |
|---|---|---|
| Capability / metric | `producer.capability`, `metric.label` | — |
| Reference value | `values.reference_value` | its status, e.g. "not returned" |
| Comparator value | `values.comparator_value` | its status |
| Δ (signed) | `values.delta_abs`; sign kept (Economy spend stays negative) | its status |
| Relative change | `GENERAL`: `values.delta_pct` (%). `RETENTION`: `delta_abs` in bps, per `output-format.md` | `NOT_COMPUTABLE` with the returned reason (e.g. reference 0, Economy `REFERENCE_NON_POSITIVE`) |
| 95% CI | `statistics.interval`, exactly as returned | "no interval returned" with the statistics status (e.g. zero variance) |
| p-value | `statistics.p_value`, as returned; a separate significance statement, never worded as meaningfulness | "not computable" with the status |
| Meaningfulness | `meaningfulness`, with the line, the Conf bar and their source | its classification and reason (`NOT_CLASSIFIED`, `NOT_APPLICABLE`, …) |
| Reading | `meaningfulness.reading`: `Upside ↑`, `Downside ↓` or `Neutral`, with the class in brackets when it is not `MEANINGFUL` (`Neutral (insufficient evidence)`) | the state, e.g. `NOT_TESTED` |
| Power | `statistics.power` | "N/A — not configured" while the basis is `CONFIG_REQUIRED` |
| Reliability Score | — | "N/A — not defined" (no approved definition) |
| PAB movement | `pab.pab_value` | "PAB not supported for this capability" (†, observed), or the `pab[]` status |
| PAB-adjusted movement | `pab.adjusted_movement` (relative % or bps); observed with † when `adjusted.basis = OBSERVED_NO_PAB` | "not returned" |
| Conf | `pab.adjusted.conf`, as returned (§ PAB adjustment); shown as `Conf: 99.6%`, `>99.9%` above 0.999, `—` when missing | "not computable" with the statistics status |

The point estimate and the supplied 95% CI come before the meaningfulness classification. A
significance statement stays separate from meaningfulness (`output-format.md` § Results and
meaningfulness). Conf is the returned Conf of the adjusted effect (or of the observed effect where there is no PAB).

## Non-comparison rows

- **`DESCRIPTIVE`:** each variant's value as returned. No delta, interval, p-value, direction or
  classification (`NOT_APPLICABLE`).
- **`NOT_RUN`:** the state and reason (e.g. `NOT_TESTED: OUT_OF_BUDGET`, `NOT_IN_TABLE` with its
  probe). No value cells.

## New and old users

User-type results are cell results of the default cut set (`analysis-contract.md` § Default cut set), each
with its own paired test.
- **Separate columns or rows:** New users (installed in the window) are read observed (†, no PAB) and
  Old users (`user_type = old`) after PAB with the overall PAB, each as its own cell under the
  parent result. The two are one cut (user type) and are never mixed with another cut in a statement or a
  table.
- **No combined row:** no figure is ever computed by averaging the new-user and old-user results, and the whole-scope row is never relabelled as a mix of the two. (The old-user share used to weight PAB inside a mixed result is a different thing: see PAB caveat.)
- **Target audience:** when the owner stated one (`analysis-area-selection.md`) and it is a single cut, one extra block "Target audience: <label>" follows the all-users block, from the stored cells of that cut. A combined or multi-cohort audience is shown on the dashboard only, and the Summary says so in one line. Never mixed with the all-users block.
- **PAB caveat:** the PAB tables carry no `user_type`; old users take the overall PAB in full (`old_share = 1`) because the PAB population is exactly that group, new users have none, and any result that mixes the two (the all-users rows, payer cuts, puzzle types) takes old-user share × PAB (`analysis-contract.md` § PAB adjustment). State this once, with the old-user share of DAU-days.

## Headline table (high-level read)

The table of the high-level read (Standard Experiment Read, `template-population.md` § A). It shows
the Tier 1 and Tier 2 results of `evidence-selection.md` only; the Detailed Read table below remains
the complete record. One block per comparison pair; within a pair the `GENERAL` rows form one block and
the `RETENTION` rows a second, so the unit sits in the header. Columns, exactly:

`Metric | Control | Var (<variant>) | % change after PAB | Conf | Read`

- **Rows:** the Tier 1 and Tier 2 results in the order of `evidence-selection.md` § Order, one row
  each, labelled with the returned metric name. Under the table, one line states how many Tier 3 and
  Tier 4 results the Detailed Read holds; nothing is silently dropped.
- **Header labels:** as the Detailed Read table: `Control` exactly when
  `AnalysisResponse.explicit_control` is true for the pair, otherwise `Reference (<variant>)`.
- **% change after PAB:** `% change` for the `GENERAL` block (`adjusted.value`, relative %), `bps` for the
  `RETENTION` block, in the formats of `output-format.md` § Results and meaningfulness (`+1.28%`,
  `+65.6 bps`); a value with no PAB carries ` †`. An Economy row carries "in-game units"; cash spent is
  shown positive (stored sign kept in the data).
- **Conf:** as § Columns.
- **Read:** the same display word as the Detailed Read table.
- **No CI by default:** a CI line appears in the high-level read only when the user asks ("show CI",
  SR-2 override), as the Detailed Read's labelled CI line.
- Power and Reliability Score never appear here.

## Detailed Read table

Used only in a Detailed Read (`template-population.md` § Detailed Read). Columns, exactly:

`Metrics | Control | Var (<variant>) | Observed | PAB | % change after PAB | Conf | Reading`

- **Priority rows first.**
  - LTV: each LTV & LTDays or Rolling LTV result in its own row, or its state when not run.
  - Revenue / DAU: the `revenue` capability's `Revenue / DAU (overall, includes IAP)` result, in a row
    labelled with its returned metric name exactly as `metric.label` carries it, plus "net/gross not
    established". A returned metric is never relabelled to a display name and never called net revenue.
  - DAU: "not available — no registered capability returns a DAU comparison".
  Then every other result once, in the order of `evidence-selection.md` § Order (Tier 1, 2, 3, then 4,
  each tier in its own order). A result shown in a priority row is not repeated below; no result appears
  twice.
- **Header labels.** The `Control` header is used exactly when `AnalysisResponse.explicit_control` is
  true for the pair; otherwise it reads `Reference (<variant>)`. There is one block per pair, with
  `Var (<variant>)`, so variants stay distinct.
- **Observed:** the observed effect in the metric's own unit: `GENERAL` → `delta_pct_of_reference` in
  %; `RETENTION` → `delta_abs` × 10,000 in bps, as returned.
- **PAB:** `pab.pab_value` in the same unit; "—" with † on the % change when PAB does not exist for the
  result, or the `pab[]` status.
- **% change after PAB:** `pab.adjusted_movement` (observed minus PAB) in the same unit; for a result with
  no PAB the observed value with ` †`. A sign flipped by PAB is shown with the observed value and the
  pre-test gap in brackets (`−2.9% (observed −1.3%, pre-test gap +2.0%)`).
- **Conf:** `pab.adjusted.conf` (§ Columns): `Conf: 99.6%`, `>99.9%` above 0.999. It is a returned field,
  the Conf of the adjusted effect against its combined standard error, never `(1 − p)` of the observed test
  and never the CI. With no valid Conf no value is shown: "not computable" with the statistics status.
- **Reading:** `meaningfulness.reading`: `Upside ↑`, `Downside ↓` or `Neutral`, from the class and the
  sign of the adjusted value (`master-state.md` § Reading labels). The class goes in brackets when it
  is not `MEANINGFUL` (`Neutral (insufficient evidence)`); a Tier 4 row shows its recorded state or
  classification with its reason (for example `NOT_TESTED`, `NOT_CLASSIFIED: REFERENCE_ZERO`). The Reading
  cell never carries a number.
- **Unit labels:** each row's metric name carries its display-unit label from `adapter.md` § Display
  units, once per block, in parentheses after the name; a metric with no mapped label carries none.
- **CI after PAB:** for a result with `adjusted.basis = PAB_ADJUSTED`, the CI line is the adjusted
  interval, `<metric label>: 95% CI of the adjusted effect (<Var> vs <Reference>), after PAB: [low, high]`,
  in the unit of the `% change after PAB` column (relative % or bps), low first; for a result with no PAB it
  is the observed interval as below, marked ` †`. The unit tail of such a line is that unit.
- **Under the table, per result:** the CI on its own labelled line, `95% CI of the mean paired
  difference (<Var> − <Control>): [low, high]`, followed by its unit when known and "unit not returned"
  otherwise, or "no interval returned" with the statistics status. A display-unit label from
  `adapter.md` § Display units counts as a known unit for this line; it asserts no currency. Absolute
  CI bounds are never placed in the Confidence cell or beside a percentage Delta. Then the
  meaningfulness classification and the p-value, stated separately (`output-format.md` § Results and
  meaningfulness).
- **One CI line per result that reached statistics, naming its result:** each such result has its own CI
  line outside the table, in the form `<metric label>: 95% CI of the mean paired difference
  (<Var> − <Control>): [low, high]`, where `<metric label>` is the row's metric name as the table shows it,
  without its unit label. The label `95% CI of the mean paired difference (<Var> − <Control>)` is written
  on every such line, and one heading above a list of bounds does not replace it. `[low, high]` is
  `statistics.interval` exactly as returned, low first, in the unit the interval is returned in, for every
  metric: no bound is converted, rescaled or turned into a percentage or into bps. The conversion of a
  `RETENTION` result's Delta to bps (`delta_abs` × 10,000, above) applies to the Delta only and is never
  applied to a CI bound, and the bps label of that Delta is not the unit of a CI line (the line says "unit
  not returned" unless the interval returns its own unit). The meaningfulness classification and the p-value
  follow on their own lines and never appear inside the brackets; the Confidence column (`(1 − p) × 100`)
  stays a separate display that never carries a bound. A result that did not run (`NOT_IN_TABLE`, `NOT_RUN`,
  `NOT_TESTED`, …) has no CI line; its table row states why.
- **The metric label is on the CI line itself:** `<metric label>` is written at the start of each CI line, as in
  `Revenue / DAU: 95% CI of the mean paired difference (var1 − control): [low, high]`, so that every CI line
  reads on its own. A heading above the CI lines, or one heading per result, may be added for layout, but it
  does not replace the label on the line.
- **The unit tail of a CI line:** each CI line ends with the returned interval's own unit when one is supplied,
  or with the display-unit label of `adapter.md` § Display units when that label names no Delta unit (for
  example `per DAU`), or otherwise with exactly `unit not returned`; no unit is invented. A `RETENTION` CI line,
  whose display label (`rate; Δ in bps`) names the Delta's unit, ends with exactly `unit not returned` unless its
  interval returns its own unit. A CI line carries no conversion note and never names bps, a percentage (the
  `95%` of the fixed label aside) or any other Delta unit: those belong to the Delta metric only, and no CI
  bound is converted.
- **p-value as returned:** a p-value is written exactly as `statistics.p_value` is returned (for example
  `2.6324140193745213e-25`), never rounded and never converted to `× 10` or superscript notation; no digit
  is added.
- **A result with no interval:** when the statistics return no interval (a status other than computed, for
  example `NOT_COMPUTABLE_DF_LT_1`, or zero variance), the same line reads `<metric label>: 95% CI of the
  mean paired difference (<Var> − <Control>): no interval returned (<the returned statistics status>)`, as
  the 95% CI row of § Columns defines. No bound is estimated, filled in or implied, no brackets are shown,
  and nothing in the line suggests that an interval was computed.
- **Caveat, once under the table:** "Conf is 1 minus the two-sided p-value of the effect after PAB,
  against its combined standard error; it is not the probability that a variant is better. † marks a value
  with no PAB."


## Reading notes (dashboard summary table)

The dashboard's summary table carries one short `Reading` note per row where there is something to say
(`dashboard.md` § Summary table). A note is one sentence, built only from stored fields of that row and its
parent results; an empty note is fine, and a note never introduces a number that is not a stored field.
The four kinds:

- **PAB changed the picture:** "Observed +2.2%; the pre-test gap (PAB) runs the other way (−2.8%)."
- **What drives a total:** "Ads net out: W2E up, interstitial down." (from the signs of the component rows)
- **A base-size warning:** "About 5% of revenue, so a big percentage is a small amount." (from the stored
  reference value or share)
- **A maturity limit:** "Install dates up to Sep 29 only." (from `windows.mature_analysis_window`)
