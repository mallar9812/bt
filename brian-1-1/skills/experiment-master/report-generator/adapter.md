# Adapter — AnalysisResponse + ResultEntry → report record

`AnalysisResponse` (`references/analysis-contract.md`) and `ResultEntry` (`references/master-state.md`
§ Results and meaningfulness) are the producer structures. The adapter reads them, field by field,
into a report record that uses the field names and availability statuses of
`experiment-contracts/references/capability-result.md`. A field is filled only when its source exists.
Nothing is computed.

## Conformance

The report record is a **partial** CapabilityResult. Two required contract fields have no producer
source, so a report record is never presented or validated as a conforming CapabilityResult:

| Gap | CapabilityResult field | Why it cannot be filled | Handling |
|---|---|---|---|
| M1 | `metric.unit` (required string) | `definition_lock` returns numerator, denominator and tables, not a unit | left empty and marked `NOT_RETURNED`. For display only, the label of § Display units is shown beside the metric; it asserts no currency and fills no field. Display units otherwise come only from existing rules: `GENERAL` relative %, `RETENTION` bps, Economy "in-game units" (`output-format.md`). |
| M2 | `pab.pooled`, `pab.movement_unit` | `pab[]` returns no per-group pooled values and no unit | `NOT_RETURNED` (pooled) and the unit of the result's own metric class (relative % or bps, as `adjusted` is returned in). The PAB window is returned (`pab[].window`) and copied. Economy's per-group values stated in prose are not parsed. |

## Display units (display only; M1 stays open)

The label is read from the capability's definition table (numerator and denominator) and shown beside
the metric name; it is a display label, never `metric.unit`, never a currency, and never a conversion.
No label names a currency (no "$", "USD" or "dollars"): revenue, LTV and Rolling LTV labels say
"currency unconfirmed". `analyses/sessions.md` states no time unit for `session_length`, `median`,
`perc_25` and `perc_75`, so their label says "time unit not stated"; no unit is guessed. A metric with
no row in the table shows no label (nothing is inferred from its name).

| Capability | Metrics | Source (numerator / denominator) | Display unit label |
|---|---|---|---|
| revenue | Revenue / DAU (overall, includes IAP); Ad Revenue / DAU; `<type>` Revenue / DAU | `revenue_without_xpromo` / `dau` | per DAU, currency unconfirmed |
| revenue | Impressions / DAU; `<type>` Impressions / DAU | `impressions` / `dau` | impressions per DAU |
| revenue | `<type>` eCPM | `revenue_without_xpromo` × 1000 / `impressions` | per 1,000 impressions, currency unconfirmed |
| retention | D1 rolling retention; D3 rolling retention | retained users / `users` | rate; Δ in bps |
| classic_retention | `classic_retention_dX` | `users` at `diff` = X / `installs` | rate; Δ in bps |
| engagement | Clear / DAU; Clear Users / DAU; `<diagnostic>` / DAU | `actions` or `users` / `dau` | per DAU |
| engagement | Clears / User | `actions` / clearing `users` | per clearing user |
| sessions | Session Time / DAU; Median Time / DAU; P25 Time / DAU; P75 Time / DAU | `session_length`, `median`, `perc_25`, `perc_75` / `dau` | time per DAU, time unit not stated |
| sessions | Sessions / DAU | `sessions` / `dau` | sessions per DAU |
| ltv_ltdays | `ltv_dX`; `ad_ltv_dX`; `iap_ltv_dX` | `recovery` / `installs` | per install, cumulative to day X, currency unconfirmed |
| ltv_ltdays | `ltdays_dX` | `active_dau_days` / `installs` | active days per install, to day X |
| rolling_ltv | `rolling_ltv_d7`; `iap_rolling_ltv_d7`; `ad_rolling_ltv_d7` | `d7_rev` / `dau` | per DAU, forward 7 days, currency unconfirmed |
| economy | `earn_per_dau`; `spend_per_dau`; `purchase_per_dau`; `net_per_dau` | `cash` / `dau` | in-game units per DAU, per currency; spend keeps its stored sign in the data and is shown positive in the report |
| economy | `earners_per_dau`; `spenders_per_dau` | `users` / `dau` | users per DAU (share) |

## Field mapping

| Report field | Source | Rule |
|---|---|---|
| `result_id` | `ResultEntry.result_id` | copied |
| `result_kind` | `ResultEntry.state` | `COMPUTED`, `INSUFFICIENT_DATA` → `COMPARISON`; `NO_COMPARISON` → `DESCRIPTIVE`; `NOT_TESTED`, `NOT_RUN`, `NOT_IN_TABLE`, `UNSUPPORTED_FOR_SCOPE`, `NO_SCOPED_EXPOSURE` → `NOT_RUN` |
| `state` | `ResultEntry.state` | copied |
| `not_run.status`, `not_run.reason` | `ResultEntry.state`, `ResultEntry.state_ref` (or the `not_tested[].reason`) | copied; `NOT_RUN` kind only |
| `producer.capability` | `ResultEntry.key.capability` | copied |
| `producer.component` | — | `experiment-master` |
| `producer.method_ref` | registry "Analysis file" column for the capability | copied |
| `producer.adapter` | — | `experiment-master/report-generator/adapter.md` |
| `experiment.exp_id`, `experiment.version` | `ResultEntry.key` | copied; versions never pooled |
| `experiment.name` | `MasterState.context` experiment name | copied when present |
| `comparison.pair_id` | `ResultEntry.key.pair_id` | copied |
| `comparison.reference.arm`, `comparison.comparator.arm` | `comparison_results[].reference`, `.comparator` | copied; the label is the variant name as returned, and a reference variant is never labelled control |
| `comparison.comparison_type` | `AnalysisResponse.comparison_type` | copied |
| `comparison.explicit_control` | `AnalysisResponse.explicit_control` | copied |
| `comparison.causal_scope` | request context `causal_scope` | copied |
| `descriptive[]` | `AnalysisResponse.descriptive[]` (`arm`, `value`, `exposure`) | copied as `AVAILABLE` values; `DESCRIPTIVE` kind only |
| `metric.id` | `ResultEntry.key.metric` | copied |
| `metric.label` | `definition_lock[].metric` | copied; no friendlier name is invented |
| `metric.definition_ref` | `definition_lock` entry of the metric, with the `request_id` | copied |
| `metric.definition_status` | `definition_lock[].definition_status` | copied when present |
| `metric.unit` | — | gap M1 |
| `metric.metric_class` | `ResultEntry.meaningfulness.metric_class` | copied |
| `metric.sign_convention` | capability | `STORED_SIGN` for every Economy metric (spend and net can be negative); `NON_NEGATIVE` for the others |
| `metric.intended_direction` | the user's explicit statement for this metric in this conversation (`input-resolution.md` I2); a confirmed plan's `expected_direction` once the Master holds one (none today) | `AVAILABLE` with the stated `UP`, `DOWN` or `NO_CHANGE`, labelled user-provided; otherwise `UNRESOLVED`. Never inferred from the metric name or the objective text, never taken from a result, and never used for `direction` or colour |
| `population.scope`, `population.cut` | `ResultEntry.key.scope`, `.cut` | copied |
| `population.user_type` | scope or cut | `NEW` or `OLD` when a single `user_type` value is in the scope or cut; `ALL` when the scope has no `user_type` filter; otherwise `UNSPECIFIED` |
| `population.source` | — | `CANONICAL` |
| `window.analysis`, `window.mature` | `AnalysisResponse.windows` | copied |
| `window.date_basis` | registry PERIOD column date axis | copied (`INSTALL_DATE` for Classic Retention and LTV & LTDays; `ACTIVITY_DATE` otherwise) |
| `window.observation_unit` | `comparison_results[].pairing_unit` | copied; absent means `CALENDAR_DAY` (contract default) |
| `values.reference_value`, `.comparator_value`, `.delta_abs` | `comparison_results[]` | `AVAILABLE` as returned, sign kept |
| `values.delta_pct` | `delta_pct_of_reference` | `AVAILABLE` when returned; `NOT_COMPUTABLE` with the returned reason when null (e.g. `REFERENCE_ZERO`, `REFERENCE_NON_POSITIVE`) |
| `statistics.method`, `.status`, `.n_pairs` | `stat.method`, `stat.status`, `stat.n_pairs` | copied |
| `statistics.mean_paired_diff`, `.p_value` | `stat` | `AVAILABLE` when returned; `NOT_COMPUTABLE` when `stat.status` is a `NOT_COMPUTABLE_*` status |
| `statistics.interval` | `stat.confidence` (`level`, `ci_low`, `ci_high`) | `AVAILABLE` only when returned; never computed |
| `statistics.power` | `stat.power.value` | `AVAILABLE` when not null; `CONFIG_REQUIRED` while `effect_size_basis` is `CONFIG_REQUIRED` |
| `observations` | `comparison_results[].observations` | `AVAILABLE` as returned; `NOT_RETURNED` when absent |
| `pab.run` | `pab[]` entry for the metric, pair and cut | `RUN` when present (every result of a PAB-capable capability, and every cell with a pre-test counterpart); `NOT_SUPPORTED` for Classic Retention, LTV & LTDays and Rolling LTV (observed †); `NOT_RUN` otherwise |
| `pab.result_ref`, `pab.status` | the response `request_id`; `pab[].status` | copied when `RUN` |
| `pab.pab_value`, `.observed_movement`, `.adjusted_movement` | `pab[]` | `AVAILABLE` when returned; `NOT_RETURNED` when absent; `NOT_RUN` when PAB did not run |
| `pab.adjusted` | `pab[].adjusted` (`value`, `ci_low`, `ci_high`, `basis`) | copied as returned; `basis = OBSERVED_NO_PAB` marks a value shown with † |
| `pab.window` | `pab[].window` | copied (`first_day`, `last_day`, `n_days`) |
| `pab.confidence` | `pab[].adjusted.conf` | `AVAILABLE` as returned (the Conf of the adjusted effect, or of the observed effect for `OBSERVED_NO_PAB`); otherwise the `pab[]` status; displayed as `Conf: xx%` per `summary-table.md` § Columns |
| `meaningfulness.reading` | `ResultEntry.meaningfulness.reading` | copied (`UPSIDE`, `DOWNSIDE`, `NEUTRAL`); the class beside it is kept for the tooltip |
| `pab.observations` | `pab[].observations` | each variant's series copied with `{x, value}` for days that have a `value`; numerator-only or denominator-only days are not plotted and keep their source entry; `NOT_RETURNED` when absent |
| `pab.daily_trend_available` | `pab.observations` | true only when both compared variants have at least one plotted day |
| `pab.excluded_days` | — | `NOT_RETURNED` (PAB missing-row handling is TBD) |
| `pab.window`, `pab.pooled`, `pab.movement_unit` | — | gap M2 |
| `meaningfulness` | `ResultEntry.meaningfulness` | copied |
| `limitations` | `data_conditions[]`, `excluded_cohorts[]`, `definition_status`, scope status | copied, each with its source |
| `provenance.queries_executed` | `AnalysisResponse.queries_executed` | `NOT_RETURNED` per result, because the count is per response; the response-level count is reported once per response |
| `provenance.tables` | `definition_lock[].table`, `denominator_table` | copied |
| `provenance.evidence_refs` | `ResultEntry.evidence_ref`, `result_id` | copied |

## Kept in their own sources (not forced into CapabilityResult)

- **Cut findings:** movement, share, weight and contribution of breakdown cells (`findings[]`, `cuts`),
  kept beside the cell statistics. A cell with no statistic keeps "movement shown descriptively; no
  cell-level statistic".
- **Cell statistics:** every capability's default-cut cell results (`analysis-contract.md` § Default cut
  set), including new-user and old-user cells, are ledger entries with a `parent_result_id`,
  adapted like any other result and reported under their parent.
- **PERIOD evidence:** trigger evidence, `correlation` labels (including `NOT_COMPARABLE`),
  game-level movement and lifecycle (`PeriodEvidenceRecord`, `master-state.md`).
- **Experiment Card fields:** `MasterState.context` and annotations (`report-templates.md` § Experiment
  Card).
