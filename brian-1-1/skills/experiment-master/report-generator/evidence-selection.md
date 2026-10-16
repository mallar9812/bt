# Evidence selection — tiers and order (presentation only)

Step 2b of `report-generator.md`. It gives every result a display tier and an order, so the Verdict and
the sections can lead with what matters. It reads recorded fields only. It removes, recomputes and
reclassifies nothing, and the tier is a display word that is never stored on a result. Every result
still appears exactly once in the Detailed Read (`summary-table.md` § Detailed Read table).

## Inputs (existing fields only)

- `result_ledger` entries (`master-state.md` § Results and meaningfulness): `state`, `descriptive`,
  `parent_result_id`, `key`, and `meaningfulness` (`classification`, `reason`, `metric_class`,
  `threshold_applied.band`).
- `direction` as `visual-evidence.md` § Direction defines it from the returned statistics.
- The stored `AnalysisResponse` values: `delta_pct_of_reference`, `delta_abs`, `windows`, `pab[]`.
- The capability order of `capability-registry.md` and each capability's `definition_lock` order.
- The primary metric: the metric the user named as primary in this conversation (`report-templates.md`
  § A); when none was named, the metric inferred from the test type (§ Primary metric). It is always
  labelled "inferred" or "assumed" when it was not named.
- The adjusted result: `meaningfulness.adjusted`, `basis` (`PAB_ADJUSTED` or `OBSERVED_NO_PAB`) and
  `reading` (`UPSIDE`, `DOWNSIDE`, `NEUTRAL`) from `master-state.md` § Results and meaningfulness.

## Scope

Only whole-scope results are tiered. A breakdown cell (`parent_result_id` present) stays under its
parent, as returned. Stage 3 hypotheses and association-only findings are not results: they are never
tiered and never presented as findings.

## Tiers

Every whole-scope result gets exactly one tier, the first rule that matches:

| Tier | Rule |
|---|---|
| 1 Headline | the primary metric (named or inferred), `MEANINGFUL`, `direction` established |
| 2 Supporting | `MEANINGFUL` on any other metric; or `INSUFFICIENT_EVIDENCE` on the primary metric, labelled "unresolved" |
| 3 Held | `NO_MEANINGFUL_MOVEMENT` or `INSUFFICIENT_EVIDENCE` on a non-primary metric; both read Neutral, and the class stays in the tooltip and the Reading-class column |
| 4 Not established | every other result: `state` other than `COMPUTED`, `descriptive = true`, `NOT_CLASSIFIED` or `NOT_APPLICABLE` (with its `reason`, e.g. `REFERENCE_ZERO`) |

A Tier 4 result keeps its own recorded state and reason, so not tested, not run, unsupported,
descriptive-only, reference-zero and unresolved results stay distinguishable.

## Order

The order is total and deterministic; the order in which results arrive is never used.

- **Unit groups.** `GENERAL` results (relative change in % of the reference) and `RETENTION` results
  (basis points) are separate groups. `GENERAL` comes before `RETENTION` as a fixed display order, not a
  ranking. A percentage is never compared with basis points.
- **Tiers 1 and 2:** the primary metric first; then by unit group; then by the size of the returned
  change within the group, largest first (`GENERAL`: the absolute value of `delta_pct_of_reference`;
  `RETENTION`: the absolute value of `delta_abs` × 10,000). A result whose change was not returned comes
  after the results in its group that have one.
- **Tier 3:** by unit group, then by the tie-breaks; size is not used.
- **Tier 4:** by state, in this order: `NOT_TESTED`, `NOT_RUN`, `NOT_IN_TABLE`, `NO_SCOPED_EXPOSURE`,
  `UNSUPPORTED_FOR_SCOPE`, `INSUFFICIENT_DATA`, `NO_COMPARISON`, then computed results that are not
  classified, by `reason`; then by the tie-breaks.
- **Tie-breaks**, in this order: capability registry order, `definition_lock` metric order, `pair_id`,
  scope signature, `result_id` (unique, so the order is complete).

## Primary metric

When the user named none, the primary metric is inferred from the test type, from the experiment name,
the Experiment Card objective and the user's own words, and is labelled "(inferred from the test type)":

| Test type | Primary metric | Guardrail |
|---|---|---|
| Unlock, engagement, level or content tests | retention (Rolling D1 and D3, then classic D1 and D7) | revenue (Rev/DAU) |
| Monetisation, pricing or ads tests | Rev/DAU | retention |

When the type cannot be told, retention is used and labelled "(assumed)". The inference only picks which
result is read first; it changes no result, tier or classification, and a user-named primary metric always
wins.

## Verdict rows

For the Verdict (`template-population.md` § Verdict composition; the dashboard's rows are the same,
`dashboard.md` § Verdict rows). Each row is filled from recorded results only; a row with none is left out.
A row is about one section or cut only. There is no Scope row: the context windows, reference variant, PAB window,
versions and annotation status are shown in the Experiment card and Method only, never as a Verdict row or bullet.

| # | Row | Results it reads |
|---|---|---|
| 1 | Recommendation | composed from rows 2 to 8; no result of its own |
| 2 | Primary metric | the primary metric's whole-scope results, then the retention family (Rolling D1, D3, classic D1, D3, D7, D14) |
| 3 | Value of the installs | LTV (D1, D3, D7, D15, ad, IAP), LTDays, Rolling LTV (total, IAP, ad); D30 horizons not matured are named |
| 4 | Mechanism | Clear/DAU and its components, the puzzle split, Use_hint, Category_hint, View, W2E and interstitial impressions and eCPM |
| 5 | New users | the `user_type = new` cells |
| 6 | Old users | the `user_type = old` cells |
| 7 | Revenue guardrail | whole-scope revenue results, the payer and non-payer cells, and the ad types |
| 8 | In-game economy | spent, purchased, earned, earners, spenders, net (not classified) |
| 9 | Discount | the Caveat below |

The chip of a row follows its results: `Neutral` when no result in it reads Upside or Downside; `Lift`
when its results read Upside; `Cost` when they read Downside; `Mixed` when both; `Shift` for the mechanism
row when its results move in different directions; `Up` or `Down` for the economy row by its signed
reading; `Caution` as stated. The chip is a presentation word, never stored.

- **Caveat:** the first that applies, in this order:
  1. the PAB window overlaps an earlier version, or PAB covers only pre-existing users while the test is
     new-user heavy (stated with the new-user share of DAU-days);
  2. the primary metric is unresolved (`INSUFFICIENT_EVIDENCE`) or not computed;
  3. a material maturity limitation on a Tier 1 or 2 result: its recorded mature window is shorter
     than its analysis window;
  4. PAB not available for a Tier 1 or 2 result (`NOT_IN_TABLE`, so observed †);
  5. other results not tested, not run or unsupported (Tier 4 states `NOT_TESTED`, `NOT_RUN`,
     `UNSUPPORTED_FOR_SCOPE`, `NOT_IN_TABLE`), with their count;
  6. none: no caveat.
