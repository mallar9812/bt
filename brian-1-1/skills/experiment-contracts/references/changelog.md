# Changelog

## 2026-10-15 — 1.0, additive (PAB-adjusted results)

Follows the experiment-master update that makes PAB part of Stage 1 and the read pattern PAB-adjusted
(`experiment-master/references/analysis-contract.md` § PAB adjustment). No field is removed or renamed.

- **`pab.adjusted`:** new object `{value, ci_low, ci_high, half_width_obs, half_width_pab, conf, basis}`,
  copied from `pab[].adjusted`; `pab.adjusted_movement` is its `value`.
- **`pab.confidence`:** `value` carries the adjusted Conf; the default PAB confidence floor is `ALWAYS_USE`.
- **`meaningfulness`:** records the class (observed and adjusted) and the reader label
  (Upside / Downside / Neutral). Line 1% (10 bps for retention) and Conf bar 0.85 live in experiment-master.
- **Combination status:** the read pattern gives established users the overall PAB; the New/Old
  combination contract itself is unchanged and its definitions stay unapproved.

## 2026-10-09 — 1.0, revised before first use (Phase 1b)

No consumer existed yet, so the version stays 1.0.

- **G1 units:** `pab.movement_unit`, `components[].used_delta_unit` and `unit_comparability`. A unit
  label alone never establishes comparability.
- **G2 PAB provenance:** `pab.result_ref`, `components[].pab_result_ref` and
  `components[].pab_confidence_outcome` (copied, never filled in). The PAB confidence `outcome` values
  are listed, with no threshold defined.
- **G3 approval:** `weight_definition` and `unit_comparability` must cite § Approved definitions
  (empty today). `provenance_class` separates `PRODUCTION` from `SYNTHETIC_FIXTURE`.
- **G4 component checks:** a combination's component results must match on metric, comparison,
  experiment, window, date basis, observation unit and population, except `user_type`, which must match
  the component. Copied values must equal their sources.
- **G5 result kinds:** `result_kind` is `COMPARISON`, `DESCRIPTIVE` or `NOT_RUN`. `DESCRIPTIVE` adds
  `descriptive[]`; `NOT_RUN` adds `not_run`. Statistics fields are allowed only on `COMPARISON`.
- **G6 display and exclusions:** `(1 − p) × 100%` is a display transformation, shown only for a
  computed p-value, and is not the probability that a variant is better. `pab.excluded_days` lists
  exclusions only with a reason and a source.

## 2026-10-09 — 1.0 (all three contracts)

- **`investigation-plan` 1.0:**
  - Fact-based plan (CONFIRMED / INFERRED / USER_PROVIDED / CORRECTED / MISSING);
  - metrics with roles and expected direction;
  - user-selected segments and cohorts;
  - funnels, drilldowns, and questions with coverage;
  - missing information and corrections;
  - `execution.queries_executed = 0`.
- **`capability-result` 1.0:**
  - common result envelope with `Avail` statuses;
  - raw p-value, interval, PAB confidence and power kept separate;
  - group-specific experiment observations;
  - PAB run status, pooled values, window and adjusted movement;
  - group-specific PAB observations (`NOT_RETURNED` today).
- **`summary-combination` 1.0:** New/Old combination with raw vs used deltas; weight definition
  `UNRESOLVED`.
- **Compatibility rules:**
  - major-version gate;
  - reserved fields;
  - availability and fact consistency;
  - compatibility key for combining results.
- No change to any existing BRIAN file, methodology, routing, budget or output.
